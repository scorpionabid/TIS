<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Verilənlər bazası sxemasını yükləyir və Redis-də cache-ləyir.
 *
 * Batch Optimizasiyası (P1):
 *   Köhnə: getTables(1) + getColumns×N + getSampleData×N + getRowCount×N = 3N+1 sorğu
 *   Yeni:  getTableNames(1) + getAllColumns(1) + getAllRowCounts(1) + getSampleData(top-30)
 *   183 cədvəl üçün: 551 → ~33 sorğu (~94% azalma, cache miss halında)
 */
class DatabaseSchemaService
{
    private const CACHE_KEY = 'ai_analysis_db_schema';

    private const CACHE_TTL = 6 * 3600; // 6 saat

    /**
     * Sample data yalnız ən çox sətirli bu qədər cədvəl üçün alınır.
     * Qalan cədvəllərin sütun strukturu eyni qaydada göstərilir, sample olmur.
     */
    private const SAMPLE_DATA_LIMIT = 30;

    private const EXCLUDED_TABLES = [
        'migrations',
        'password_reset_tokens',
        'failed_jobs',
        'personal_access_tokens',
        'telescope_entries',
        'telescope_entries_tags',
        'telescope_monitoring',
        'ai_analysis_logs',
        'ai_llm_settings',
    ];

    public function __construct(
        private TableLabelService $labelService
    ) {}

    public function getSchema(bool $forceRefresh = false): array
    {
        if ($forceRefresh) {
            Cache::forget(self::CACHE_KEY);
        }

        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, fn () => $this->buildSchema());
    }

    /**
     * Sxemanı 3+N mərhələdə qurur:
     *  1. Bütün cədvəl adları  → 1 sorğu
     *  2. Bütün sütunlar       → 1 batch sorğu (köhnə N əvəzinə)
     *  3. Bütün row count-lar  → 1 batch sorğu (köhnə N əvəzinə)
     *  4. Sample data          → yalnız top-30 cədvəl (~30 sorğu)
     *  Cəmi: ~33 sorğu (köhnədə 551)
     */
    private function buildSchema(): array
    {
        $tableNames = $this->getTableNames();
        if (empty($tableNames)) {
            return [];
        }

        $allColumns = $this->getAllColumnsBatch($tableNames);
        $rowCounts = $this->getAllRowCountsBatch($tableNames);

        // Row count-a görə sırala → ən dolğun top-30 cədvəl sample data alır
        $sortedByRows = $tableNames;
        usort($sortedByRows, fn ($a, $b) => ($rowCounts[$b] ?? 0) <=> ($rowCounts[$a] ?? 0));
        $sampleTargets = array_flip(array_slice($sortedByRows, 0, self::SAMPLE_DATA_LIMIT));

        $schema = [];
        foreach ($tableNames as $tableName) {
            $columns = $allColumns[$tableName] ?? [];
            $rowCount = $rowCounts[$tableName] ?? 0;

            $sampleData = isset($sampleTargets[$tableName])
                ? $this->getSampleData($tableName, $columns)
                : [];

            $schema[] = [
                'table_name' => $tableName,
                'label' => $this->labelService->getTableLabel($tableName),
                'row_count' => $rowCount,
                'columns' => $columns,
                'sample_data' => $sampleData,
            ];
        }

        return $schema;
    }

    /**
     * Sistemdəki bütün istifadəçi cədvəllərini qaytarır (excluded-lar çıxılmaqla).
     * → 1 sorğu
     */
    private function getTableNames(): array
    {
        $tables = DB::select("
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type   = 'BASE TABLE'
            ORDER BY table_name
        ");

        return array_values(array_filter(
            array_map(fn ($t) => $t->table_name, $tables),
            fn ($name) => ! in_array($name, self::EXCLUDED_TABLES, true)
        ));
    }

    /**
     * Bütün cədvəllərin sütunlarını TEK sorğuda alır.
     * Köhnə: N sorğu → Yeni: 1 sorğu
     *
     * @param  string[]             $tableNames
     * @return array<string, array> table_name => columns[]
     */
    private function getAllColumnsBatch(array $tableNames): array
    {
        if (empty($tableNames)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($tableNames), '?'));

        $rows = DB::select("
            SELECT
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name   = ANY(ARRAY[{$placeholders}]::text[])
            ORDER BY table_name, ordinal_position
        ", $tableNames);

        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row->table_name][] = [
                'name' => $row->column_name,
                'label' => $this->labelService->getColumnLabel($row->column_name),
                'type' => $row->data_type,
                'nullable' => $row->is_nullable === 'YES',
                'default' => $row->column_default,
                'max_length' => $row->character_maximum_length,
            ];
        }

        return $grouped;
    }

    /**
     * Bütün cədvəllərin sətir sayını TEK pg_class sorğusunda alır.
     * Köhnə: N sorğu → Yeni: 1 sorğu
     *
     * @param  string[]           $tableNames
     * @return array<string, int> table_name => estimated_row_count
     */
    private function getAllRowCountsBatch(array $tableNames): array
    {
        if (empty($tableNames)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($tableNames), '?'));

        $rows = DB::select("
            SELECT relname, reltuples::bigint AS estimate
            FROM pg_class
            WHERE relkind = 'r'
              AND relname  = ANY(ARRAY[{$placeholders}]::text[])
        ", $tableNames);

        $counts = [];
        foreach ($rows as $row) {
            $counts[$row->relname] = (int) $row->estimate;
        }

        return $counts;
    }

    /**
     * Tək cədvəl üçün sample data alır (yalnız top-30 cədvəl üçün çağırılır).
     * Həssas sütunlar (password, token, secret) çıxarılır.
     * Köhnə: LIMIT 3 → Yeni: LIMIT 1 (token qənaəti + sürət)
     */
    private function getSampleData(string $tableName, array $columns): array
    {
        try {
            $sensitiveCols = ['password', 'remember_token', 'token', 'secret', 'api_key', 'private_key'];
            $safeCols = array_filter($columns, fn ($col) => ! in_array($col['name'], $sensitiveCols, true));

            if (empty($safeCols)) {
                return [];
            }

            $colNames = implode(', ', array_map(fn ($c) => '"' . $c['name'] . '"', $safeCols));
            $rows = DB::select("SELECT {$colNames} FROM \"{$tableName}\" LIMIT 1");

            return array_map(fn ($row) => (array) $row, $rows);
        } catch (\Exception $e) {
            Log::warning("AI Schema: sample data xətası [{$tableName}]: " . $e->getMessage());

            return [];
        }
    }

    /**
     * AI prompt-ları üçün kondensə sxema mətni (cache-dən).
     */
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
