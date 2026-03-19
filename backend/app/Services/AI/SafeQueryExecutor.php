<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SafeQueryExecutor
{
    private const MAX_ROWS = 5000;
    private const TIMEOUT_MS = 10000; // 10 saniyə

    public function __construct(
        private QueryValidator $validator
    ) {}

    /**
     * Validated SQL sorğusunu icra edir
     *
     * @return array{data: array, columns: array, row_count: int, execution_ms: int, sql_used: string}
     * @throws \InvalidArgumentException Validation xətası
     * @throws \RuntimeException İcra xətası
     */
    public function execute(string $sql): array
    {
        // Validation
        $this->validator->validate($sql);

        // LIMIT yoxla/əlavə et
        $sql = $this->ensureLimit($sql);

        $startTime = microtime(true);

        try {
            DB::statement('SET statement_timeout = ' . self::TIMEOUT_MS);

            $results = DB::select($sql);

            DB::statement('SET statement_timeout = 0'); // Reset

            $executionMs = (int) ((microtime(true) - $startTime) * 1000);

            if (empty($results)) {
                return [
                    'data' => [],
                    'columns' => [],
                    'row_count' => 0,
                    'execution_ms' => $executionMs,
                    'sql_used' => $sql,
                ];
            }

            $columns = array_keys((array) $results[0]);
            $data = array_map(fn ($row) => (array) $row, $results);

            return [
                'data' => $data,
                'columns' => $columns,
                'row_count' => count($data),
                'execution_ms' => $executionMs,
                'sql_used' => $sql,
            ];
        } catch (\Exception $e) {
            DB::statement('SET statement_timeout = 0');

            Log::error('SafeQueryExecutor xətası: ' . $e->getMessage(), [
                'sql' => $sql,
            ]);

            // Timeout xətasını user-friendly mesaja çevir
            if (str_contains($e->getMessage(), 'statement timeout')) {
                throw new \RuntimeException('Sorğu vaxt limitini aşdı (10 saniyə). Daha konkret sorğu yazmağa çalışın.');
            }

            throw new \RuntimeException('Sorğu icrasında xəta: ' . $e->getMessage());
        }
    }

    private function ensureLimit(string $sql): string
    {
        // Artıq LIMIT varsa yoxla, çox böyüksə azalt
        if (preg_match('/LIMIT\s+(\d+)/i', $sql, $matches)) {
            $limit = (int) $matches[1];
            if ($limit > self::MAX_ROWS) {
                $sql = preg_replace('/LIMIT\s+\d+/i', 'LIMIT ' . self::MAX_ROWS, $sql);
            }
            return $sql;
        }

        // LIMIT yoxdursa əlavə et (sonda)
        $sql = rtrim($sql, '; ');
        return $sql . ' LIMIT ' . self::MAX_ROWS;
    }
}
