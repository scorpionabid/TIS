<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class MigrateSqliteToPostgres extends Command
{
    protected $signature = 'migrate:sqlite-to-postgres
        {--source=sqlite : Source database connection name}
        {--target=pgsql : Target database connection name}
        {--batch-size=1000 : Number of rows per batch}
        {--verify : Verify row counts after migration}
        {--tables=* : Specific tables to migrate (default: all)}
        {--skip=* : Tables to skip (default: migrations)}';

    protected $description = 'Copy data from a SQLite connection to PostgreSQL while preserving IDs and sequences.';

    /**
     * @var array<int, string>
     */
    protected array $defaultSkipTables = [
        'migrations',
        'telescope_entries',
        'telescope_entries_tags',
    ];

    /**
     * Normalize localized task enums to match PostgreSQL constraints.
     *
     * @var array<string, array<string, string>>
     */
    protected array $taskEnumMaps = [
        'category' => [
            'hesabat' => 'report',
            'temir' => 'maintenance',
            'tedbir' => 'event',
            'audit' => 'audit',
            'telimat' => 'instruction',
        ],
        'priority' => [
            'asagi' => 'low',
            'orta' => 'medium',
            'yuksek' => 'high',
            'tecili' => 'urgent',
        ],
        'target_scope' => [
            'sectoral' => 'sector',
        ],
    ];

    public function handle(): int
    {
        $source = (string) $this->option('source');
        $target = (string) $this->option('target');
        $batchSize = max(1, (int) $this->option('batch-size'));
        $tables = $this->option('tables');
        $skipTables = $this->getSkipTables();

        $this->components->info("Migrating data from [{$source}] to [{$target}]");

        if (empty($tables)) {
            $tables = $this->getAllTables($source);
        }

        if (! empty($skipTables)) {
            $this->components->info('Skipping tables: ' . implode(', ', $skipTables));

            $tables = collect($tables)
                ->reject(fn ($table) => in_array($table, $skipTables, true))
                ->values()
                ->all();
        }

        if (empty($tables)) {
            $this->components->error('No tables detected – aborting.');

            return self::FAILURE;
        }

        $progressBar = $this->output->createProgressBar(count($tables));
        $progressBar->setFormat('verbose');

        foreach ($tables as $table) {
            $progressBar->setMessage("Migrating {$table}");

            try {
                $this->migrateTable($table, $source, $target, $batchSize);
            } catch (\Throwable $e) {
                $this->components->error("Failed migrating {$table}: {$e->getMessage()}");

                return self::FAILURE;
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        if ($this->option('verify')) {
            $this->verifyTables($tables, $source, $target);
        }

        $this->components->info('Migration completed successfully.');

        return self::SUCCESS;
    }

    /**
     * @return array<int, string>
     */
    protected function getAllTables(string $connection): array
    {
        $driver = DB::connection($connection)->getDriverName();

        if ($driver === 'sqlite') {
            $tables = DB::connection($connection)->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

            return collect($tables)->pluck('name')->sort()->values()->all();
        }

        if ($driver === 'pgsql') {
            $tables = DB::connection($connection)->select('
                SELECT tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname = current_schema()
            ');

            return collect($tables)->pluck('tablename')->sort()->values()->all();
        }

        return [];
    }

    protected function migrateTable(string $table, string $source, string $target, int $batchSize): void
    {
        $this->components->twoColumnDetail($table, 'starting');

        $total = DB::connection($source)->table($table)->count();
        if ($total === 0) {
            $this->components->twoColumnDetail($table, 'skipped (empty)');

            return;
        }

        $targetHasRows = DB::connection($target)->table($table)->exists();
        if ($targetHasRows) {
            $this->components->warn("Target table {$table} already contains data.");
        }

        $this->toggleConstraints($target, disable: true);

        // Get columns from both source and target
        $sourceColumns = array_keys($this->getColumnTypes($source, $table));
        $targetColumns = array_keys($this->getColumnTypes($target, $table));

        // Only copy columns that exist in both databases
        $commonColumns = array_intersect($sourceColumns, $targetColumns);

        if (empty($commonColumns)) {
            $this->components->warn("No common columns found for table {$table}");

            return;
        }

        $columnTypes = $this->getColumnTypes($target, $table);
        $sourcePk = $this->getPrimaryKeyColumn($source, $table) ?? 'rowid';
        $migrated = 0;

        while ($migrated < $total) {
            $rows = DB::connection($source)
                ->table($table)
                ->select($commonColumns) // Only select common columns
                ->when($sourcePk === 'rowid', fn ($query) => $query->orderByRaw('rowid'))
                ->when($sourcePk !== 'rowid', fn ($query) => $query->orderBy($sourcePk))
                ->offset($migrated)
                ->limit($batchSize)
                ->get();

            if ($rows->isEmpty()) {
                break;
            }

            $payload = $rows->map(function ($row) use ($columnTypes, $table) {
                $converted = $this->convertRow((array) $row, $columnTypes);

                return $this->convertSpecialCases($table, $converted);
            })->toArray();

            DB::connection($target)->table($table)->insert($payload);

            $migrated += count($payload);
            $this->components->twoColumnDetail($table, "{$migrated}/{$total}");
        }

        $this->resetSequence($target, $table);
        $this->toggleConstraints($target, disable: false);
        $this->components->twoColumnDetail($table, 'done');
    }

    /**
     * @param array<string, string> $columnTypes
     */
    protected function convertRow(array $row, array $columnTypes): array
    {
        foreach ($row as $column => $value) {
            $type = $columnTypes[$column] ?? null;

            if ($type && $this->isBooleanType($type) && $value !== null) {
                $row[$column] = $this->castBoolean($value);
            }
        }

        return $row;
    }

    protected function castBoolean(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (in_array($value, [1, '1', 'true', 'TRUE'], true)) {
            return true;
        }

        if (in_array($value, [0, '0', 'false', 'FALSE'], true)) {
            return false;
        }

        return (bool) $value;
    }

    /**
     * @return array<string, string>
     */
    protected function getColumnTypes(string $connection, string $table): array
    {
        $driver = DB::connection($connection)->getDriverName();

        if ($driver === 'pgsql') {
            $rows = DB::connection($connection)->select('
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = ? AND table_schema = current_schema()
            ', [$table]);

            return collect($rows)
                ->mapWithKeys(fn ($row) => [$row->column_name => strtolower($row->data_type)])
                ->all();
        }

        if ($driver === 'sqlite') {
            $rows = DB::connection($connection)->select("PRAGMA table_info(\"{$table}\")");

            return collect($rows)
                ->mapWithKeys(fn ($row) => [$row->name => strtolower($row->type)])
                ->all();
        }

        return [];
    }

    protected function getPrimaryKeyColumn(string $connection, string $table): ?string
    {
        $driver = DB::connection($connection)->getDriverName();

        if ($driver === 'sqlite') {
            $row = Arr::first(DB::connection($connection)->select("PRAGMA table_info(\"{$table}\")"), fn ($col) => $col->pk == 1);

            return $row->name ?? null;
        }

        if ($driver === 'pgsql') {
            $row = DB::connection($connection)->selectOne("
                SELECT kc.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kc
                    ON kc.constraint_name = tc.constraint_name
                   AND kc.table_name = tc.table_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_name = ?
                  AND tc.table_schema = current_schema()
                ORDER BY kc.ordinal_position
                LIMIT 1
            ", [$table]);

            return $row->column_name ?? null;
        }

        return null;
    }

    protected function resetSequence(string $connection, string $table): void
    {
        $driver = DB::connection($connection)->getDriverName();
        if ($driver !== 'pgsql') {
            return;
        }

        $primaryKey = $this->getPrimaryKeyColumn($connection, $table) ?? 'id';
        $sequence = DB::connection($connection)
            ->selectOne('SELECT pg_get_serial_sequence(?, ?) as seq', [$table, $primaryKey]);

        if ($sequence && $sequence->seq) {
            $maxValue = DB::connection($connection)->table($table)->max($primaryKey);

            if ($maxValue === null) {
                return;
            }

            DB::connection($connection)->statement('SELECT setval(?, ?, true)', [$sequence->seq, $maxValue]);
        }
    }

    protected function toggleConstraints(string $connection, bool $disable): void
    {
        $driver = DB::connection($connection)->getDriverName();

        if ($driver === 'pgsql') {
            $mode = $disable ? 'replica' : 'DEFAULT';
            DB::connection($connection)->statement("SET session_replication_role = {$mode}");
        } elseif ($driver === 'sqlite') {
            $mode = $disable ? 'OFF' : 'ON';
            DB::connection($connection)->statement("PRAGMA foreign_keys = {$mode}");
        }
    }

    protected function verifyTables(array $tables, string $source, string $target): void
    {
        $this->components->info('Verifying table counts...');
        $mismatches = [];

        foreach ($tables as $table) {
            $sourceCount = DB::connection($source)->table($table)->count();
            $targetCount = DB::connection($target)->table($table)->count();

            if ($sourceCount !== $targetCount) {
                $mismatches[] = "{$table}: source={$sourceCount}, target={$targetCount}";
            }
        }

        if (empty($mismatches)) {
            $this->components->info('Verification passed – row counts match.');
        } else {
            $this->components->error('Verification failed:');
            foreach ($mismatches as $message) {
                $this->line(" - {$message}");
            }
        }
    }

    /**
     * Handle per-table data fixes.
     *
     * @param  array<string, mixed> $row
     * @return array<string, mixed>
     */
    protected function convertSpecialCases(string $table, array $row): array
    {
        if ($table === 'tasks') {
            foreach (['category', 'priority', 'target_scope'] as $field) {
                if (isset($row[$field]) && $row[$field] !== null) {
                    $map = $this->taskEnumMaps[$field] ?? [];
                    $value = (string) $row[$field];

                    if (array_key_exists($value, $map)) {
                        $row[$field] = $map[$value];
                    }
                }
            }
        }

        return $row;
    }

    protected function isBooleanType(string $type): bool
    {
        return str_contains($type, 'bool');
    }

    /**
     * @return array<int, string>
     */
    protected function getSkipTables(): array
    {
        $option = Arr::wrap($this->option('skip'));

        return collect($option)
            ->filter(fn ($table) => filled($table))
            ->map(fn ($table) => (string) $table)
            ->merge($this->defaultSkipTables)
            ->unique()
            ->values()
            ->all();
    }
}
