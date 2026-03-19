<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SafeQueryExecutor
{
    private const MAX_ROWS   = 5000;
    private const TIMEOUT_MS = 10000; // 10 saniyə
    private const CACHE_TTL  = 600;   // 10 dəqiqə (eyni SQL yenidən DB-yə getməsin)

    public function __construct(
        private QueryValidator $validator
    ) {}

    /**
     * Validated SQL sorğusunu icra edir.
     *
     * Optimizasiyalar (Faza 3):
     *  - Query result cache: eyni SQL → 10 dəq Redis cache (DB yükü sıfır)
     *  - from_cache: true → Frontend "⚡ Cache" badge göstərir
     *
     * @return array{data: array, columns: array, row_count: int,
     *               execution_ms: int, sql_used: string, from_cache: bool}
     * @throws \InvalidArgumentException Validation xətası (422)
     * @throws \RuntimeException         İcra xətası (500)
     */
    public function execute(string $sql): array
    {
        $this->validator->validate($sql);
        $sql = $this->ensureLimit($sql);

        $cacheKey = 'ai_query_' . hash('sha256', $sql);

        // Cache hit → DB-yə getmə
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return array_merge($cached, ['from_cache' => true]);
        }

        // DB icra
        $startTime = microtime(true);

        try {
            DB::statement('SET statement_timeout = ' . self::TIMEOUT_MS);
            $results = DB::select($sql);
            DB::statement('SET statement_timeout = 0');
        } catch (\Exception $e) {
            DB::statement('SET statement_timeout = 0');

            Log::error('SafeQueryExecutor xətası: ' . $e->getMessage(), ['sql' => $sql]);

            if (str_contains($e->getMessage(), 'statement timeout')) {
                throw new \RuntimeException(
                    'Sorğu vaxt limitini aşdı (10 saniyə). Daha konkret sorğu yazmağa çalışın.'
                );
            }

            throw new \RuntimeException('Sorğu icrasında xəta: ' . $e->getMessage());
        }

        $executionMs = (int) ((microtime(true) - $startTime) * 1000);

        if (empty($results)) {
            $result = [
                'data'         => [],
                'columns'      => [],
                'row_count'    => 0,
                'execution_ms' => $executionMs,
                'sql_used'     => $sql,
            ];
            Cache::put($cacheKey, $result, self::CACHE_TTL);
            return array_merge($result, ['from_cache' => false]);
        }

        $columns = array_keys((array) $results[0]);
        $data    = array_map(fn ($row) => (array) $row, $results);

        $result = [
            'data'         => $data,
            'columns'      => $columns,
            'row_count'    => count($data),
            'execution_ms' => $executionMs,
            'sql_used'     => $sql,
        ];

        Cache::put($cacheKey, $result, self::CACHE_TTL);

        return array_merge($result, ['from_cache' => false]);
    }

    private function ensureLimit(string $sql): string
    {
        if (preg_match('/LIMIT\s+(\d+)/i', $sql, $matches)) {
            if ((int) $matches[1] > self::MAX_ROWS) {
                return preg_replace('/LIMIT\s+\d+/i', 'LIMIT ' . self::MAX_ROWS, $sql);
            }
            return $sql;
        }
        return rtrim($sql, '; ') . ' LIMIT ' . self::MAX_ROWS;
    }
}
