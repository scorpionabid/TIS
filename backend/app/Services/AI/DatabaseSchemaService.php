<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class DatabaseSchemaService
{
    private const CACHE_KEY = 'ai_analysis_db_schema';
    private const CACHE_TTL = 6 * 3600; // 6 saat

    public function __construct(
        private TableLabelService $labelService
    ) {}

    // Göstərilməyəcək sistem cədvəlləri
    private const EXCLUDED_TABLES = [
        'migrations',
        'password_reset_tokens',
        'failed_jobs',
        'personal_access_tokens',
        'telescope_entries',
        'telescope_entries_tags',
        'telescope_monitoring',
        'ai_analysis_logs', // özü göstərilməsin
    ];

    public function getSchema(bool $forceRefresh = false): array
    {
        if ($forceRefresh) {
            Cache::forget(self::CACHE_KEY);
        }

        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return $this->buildSchema();
        });
    }

    private function buildSchema(): array
    {
        $tables = $this->getTables();
        $schema = [];

        foreach ($tables as $table) {
            $tableName = $table->table_name;

            if (in_array($tableName, self::EXCLUDED_TABLES)) {
                continue;
            }

            $columns = $this->getColumns($tableName);
            $sampleData = $this->getSampleData($tableName, $columns);
            $rowCount = $this->getRowCount($tableName);

            $schema[] = [
                'table_name' => $tableName,
                'label'      => $this->labelService->getTableLabel($tableName),
                'row_count'  => $rowCount,
                'columns'    => $columns,
                'sample_data' => $sampleData,
            ];
        }

        return $schema;
    }

    private function getTables(): \Illuminate\Support\Collection
    {
        return collect(DB::select("
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name
        "));
    }

    private function getColumns(string $tableName): array
    {
        $columns = DB::select("
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ?
            ORDER BY ordinal_position
        ", [$tableName]);

        return array_map(fn ($col) => [
            'name'       => $col->column_name,
            'label'      => $this->labelService->getColumnLabel($col->column_name),
            'type'       => $col->data_type,
            'nullable'   => $col->is_nullable === 'YES',
            'default'    => $col->column_default,
            'max_length' => $col->character_maximum_length,
        ], $columns);
    }

    private function getSampleData(string $tableName, array $columns): array
    {
        try {
            // Həssas sütunları çıxar (password, token, secret)
            $sensitiveCols = ['password', 'remember_token', 'token', 'secret', 'api_key', 'private_key'];
            $safeCols = array_filter($columns, fn ($col) => !in_array($col['name'], $sensitiveCols));

            if (empty($safeCols)) {
                return [];
            }

            $colNames = implode(', ', array_map(fn ($c) => '"' . $c['name'] . '"', $safeCols));

            $rows = DB::select(
                "SELECT {$colNames} FROM \"{$tableName}\" LIMIT 3"
            );

            return array_map(fn ($row) => (array) $row, $rows);
        } catch (\Exception $e) {
            Log::warning("AI Schema: sample data xətası [{$tableName}]: " . $e->getMessage());
            return [];
        }
    }

    private function getRowCount(string $tableName): int
    {
        try {
            $result = DB::selectOne(
                "SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = ?",
                [$tableName]
            );
            return (int) ($result->estimate ?? 0);
        } catch (\Exception $e) {
            return 0;
        }
    }

    public function getCondensedSchema(): string
    {
        $schema = $this->getSchema();
        $lines = [];

        foreach ($schema as $table) {
            $colDefs = array_map(
                fn ($c) => $c['name'] . '(' . $c['type'] . ($c['nullable'] ? ',null' : '') . ')',
                $table['columns']
            );
            $lines[] = $table['table_name'] . ': ' . implode(', ', $colDefs);
        }

        return implode("\n", $lines);
    }
}
