<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CreatePostgresSchemaFromSqlite extends Command
{
    protected $signature = 'db:create-postgres-schema-from-sqlite
        {--source=sqlite : Source SQLite connection}
        {--target=pgsql : Target PostgreSQL connection}';

    protected $description = 'Create PostgreSQL schema by reading SQLite database structure (bypasses migration files)';

    public function handle(): int
    {
        $source = $this->option('source');
        $target = $this->option('target');

        $this->components->info('Creating PostgreSQL schema from SQLite database structure');

        try {
            // Get all tables from SQLite
            $tables = $this->getTablesFromSqlite($source);

            if (empty($tables)) {
                $this->components->error('No tables found in SQLite database');

                return self::FAILURE;
            }

            $this->components->info('Found ' . count($tables) . ' tables in SQLite');

            $progressBar = $this->output->createProgressBar(count($tables));
            $progressBar->setFormat('verbose');

            foreach ($tables as $table) {
                $progressBar->setMessage("Creating table: {$table}");

                // Get table structure from SQLite
                $columns = $this->getTableStructure($source, $table);

                // Create table in PostgreSQL
                $this->createTableInPostgres($target, $table, $columns);

                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine(2);

            $this->components->info('Schema created successfully!');

            // Show summary
            $this->showSummary($target);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->components->error("Failed: {$e->getMessage()}");

            return self::FAILURE;
        }
    }

    protected function getTablesFromSqlite(string $connection): array
    {
        $tables = DB::connection($connection)->select(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );

        return collect($tables)->pluck('name')->all();
    }

    protected function getTableStructure(string $connection, string $table): array
    {
        $pragma = DB::connection($connection)->select("PRAGMA table_info(\"{$table}\")");

        return collect($pragma)->map(function ($column) {
            return [
                'name' => $column->name,
                'type' => $column->type,
                'notnull' => $column->notnull,
                'default' => $column->dflt_value,
                'pk' => $column->pk,
            ];
        })->all();
    }

    protected function createTableInPostgres(string $connection, string $table, array $columns): void
    {
        $columnDefinitions = [];

        foreach ($columns as $column) {
            $def = "\"{$column['name']}\" ";

            // Convert SQLite types to PostgreSQL types
            $pgType = $this->convertType($column['type']);
            $def .= $pgType;

            // Handle NOT NULL
            if ($column['notnull'] && ! $column['pk']) {
                $def .= ' NOT NULL';
            }

            // Handle DEFAULT
            if ($column['default'] !== null && $column['default'] !== 'NULL') {
                $default = $column['default'];

                // Handle special defaults
                if (str_contains(strtoupper($default), 'CURRENT_TIMESTAMP')) {
                    $def .= ' DEFAULT CURRENT_TIMESTAMP';
                } else {
                    $def .= " DEFAULT {$default}";
                }
            }

            $columnDefinitions[] = $def;
        }

        // Add primary key
        $pkColumns = collect($columns)->filter(fn ($col) => $col['pk'])->pluck('name')->all();
        if (! empty($pkColumns)) {
            $columnDefinitions[] = 'PRIMARY KEY ("' . implode('", "', $pkColumns) . '")';
        }

        $sql = 'CREATE TABLE IF NOT EXISTS "' . $table . '" (' . PHP_EOL;
        $sql .= '  ' . implode(',' . PHP_EOL . '  ', $columnDefinitions) . PHP_EOL;
        $sql .= ')';

        DB::connection($connection)->statement($sql);
    }

    protected function convertType(string $sqliteType): string
    {
        $sqliteType = strtoupper($sqliteType);

        // Common type mappings
        $typeMap = [
            'INTEGER' => 'INTEGER',
            'BIGINT' => 'BIGINT',
            'TINYINT' => 'SMALLINT',
            'SMALLINT' => 'SMALLINT',
            'MEDIUMINT' => 'INTEGER',
            'INT' => 'INTEGER',
            'UNSIGNED BIG INT' => 'BIGINT',
            'TEXT' => 'TEXT',
            'VARCHAR' => 'VARCHAR',
            'CHARACTER' => 'VARCHAR',
            'CLOB' => 'TEXT',
            'BLOB' => 'BYTEA',
            'REAL' => 'REAL',
            'DOUBLE' => 'DOUBLE PRECISION',
            'FLOAT' => 'REAL',
            'NUMERIC' => 'NUMERIC',
            'DECIMAL' => 'DECIMAL',
            'BOOLEAN' => 'BOOLEAN',
            'DATE' => 'DATE',
            'DATETIME' => 'TIMESTAMP',
            'TIMESTAMP' => 'TIMESTAMP',
        ];

        // Extract base type (e.g., VARCHAR(255) -> VARCHAR)
        $baseType = preg_replace('/\(.*?\)/', '', $sqliteType);

        if (isset($typeMap[$baseType])) {
            // Preserve length/precision if present
            preg_match('/\((.*?)\)/', $sqliteType, $matches);
            $precision = $matches[1] ?? null;

            if ($precision && in_array($baseType, ['VARCHAR', 'CHARACTER', 'DECIMAL', 'NUMERIC'])) {
                return $typeMap[$baseType] . "({$precision})";
            }

            return $typeMap[$baseType];
        }

        // Default to TEXT for unknown types
        return 'TEXT';
    }

    protected function showSummary(string $connection): void
    {
        $tables = DB::connection($connection)->select(
            'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = current_schema()'
        );

        $this->components->info('Total tables in PostgreSQL: ' . count($tables));
    }
}
