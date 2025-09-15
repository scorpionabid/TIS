<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class InstitutionDeleteProgressService
{
    const CACHE_PREFIX = 'institution_delete_progress_';
    const CACHE_TTL = 3600; // 1 hour

    /**
     * Initialize progress tracking for a delete operation
     */
    public function initializeProgress(string $operationId, array $metadata = []): void
    {
        $progressData = [
            'operation_id' => $operationId,
            'status' => 'started',
            'progress' => 0,
            'current_stage' => 'Başlanılır...',
            'stages_completed' => 0,
            'total_stages' => $this->estimateTotalStages($metadata),
            'started_at' => now()->toISOString(),
            'metadata' => $metadata,
            'errors' => [],
            'warnings' => []
        ];

        Cache::put(
            self::CACHE_PREFIX . $operationId,
            $progressData,
            self::CACHE_TTL
        );

        Log::info("Delete progress initialized", [
            'operation_id' => $operationId,
            'metadata' => $metadata
        ]);
    }

    /**
     * Update progress for a delete operation
     */
    public function updateProgress(
        string $operationId,
        int $progress,
        string $stage,
        array $additionalData = []
    ): void {
        $cacheKey = self::CACHE_PREFIX . $operationId;
        $progressData = Cache::get($cacheKey, []);

        if (empty($progressData)) {
            Log::warning("Progress data not found for operation", ['operation_id' => $operationId]);
            return;
        }

        $progressData = array_merge($progressData, [
            'progress' => max(0, min(100, $progress)),
            'current_stage' => $stage,
            'stages_completed' => $progressData['stages_completed'] + 1,
            'updated_at' => now()->toISOString()
        ], $additionalData);

        Cache::put($cacheKey, $progressData, self::CACHE_TTL);

        Log::info("Delete progress updated", [
            'operation_id' => $operationId,
            'progress' => $progress,
            'stage' => $stage
        ]);
    }

    /**
     * Mark operation as completed
     */
    public function completeProgress(string $operationId, array $finalData = []): void
    {
        $cacheKey = self::CACHE_PREFIX . $operationId;
        $progressData = Cache::get($cacheKey, []);

        if (empty($progressData)) {
            Log::warning("Progress data not found for completion", ['operation_id' => $operationId]);
            return;
        }

        $progressData = array_merge($progressData, [
            'status' => 'completed',
            'progress' => 100,
            'current_stage' => 'Tamamlandı',
            'completed_at' => now()->toISOString()
        ], $finalData);

        Cache::put($cacheKey, $progressData, self::CACHE_TTL);

        Log::info("Delete progress completed", [
            'operation_id' => $operationId,
            'final_data' => $finalData
        ]);
    }

    /**
     * Mark operation as failed
     */
    public function failProgress(string $operationId, string $error, array $context = []): void
    {
        $cacheKey = self::CACHE_PREFIX . $operationId;
        $progressData = Cache::get($cacheKey, []);

        if (empty($progressData)) {
            $progressData = [
                'operation_id' => $operationId,
                'started_at' => now()->toISOString()
            ];
        }

        $progressData = array_merge($progressData, [
            'status' => 'failed',
            'current_stage' => 'Xəta baş verdi',
            'error' => $error,
            'failed_at' => now()->toISOString(),
            'context' => $context
        ]);

        Cache::put($cacheKey, $progressData, self::CACHE_TTL);

        Log::error("Delete progress failed", [
            'operation_id' => $operationId,
            'error' => $error,
            'context' => $context
        ]);
    }

    /**
     * Get current progress
     */
    public function getProgress(string $operationId): ?array
    {
        return Cache::get(self::CACHE_PREFIX . $operationId);
    }

    /**
     * Add warning to progress
     */
    public function addWarning(string $operationId, string $warning): void
    {
        $cacheKey = self::CACHE_PREFIX . $operationId;
        $progressData = Cache::get($cacheKey, []);

        if (empty($progressData)) {
            return;
        }

        $progressData['warnings'][] = [
            'message' => $warning,
            'timestamp' => now()->toISOString()
        ];

        Cache::put($cacheKey, $progressData, self::CACHE_TTL);
    }

    /**
     * Add error to progress
     */
    public function addError(string $operationId, string $error): void
    {
        $cacheKey = self::CACHE_PREFIX . $operationId;
        $progressData = Cache::get($cacheKey, []);

        if (empty($progressData)) {
            return;
        }

        $progressData['errors'][] = [
            'message' => $error,
            'timestamp' => now()->toISOString()
        ];

        Cache::put($cacheKey, $progressData, self::CACHE_TTL);
    }

    /**
     * Clear progress data
     */
    public function clearProgress(string $operationId): void
    {
        Cache::forget(self::CACHE_PREFIX . $operationId);
    }

    /**
     * Estimate total stages based on delete operation metadata
     */
    private function estimateTotalStages(array $metadata): int
    {
        $baseStages = 3; // Initialize, Process, Complete

        if (isset($metadata['children_count'])) {
            $baseStages += $metadata['children_count'];
        }

        if (isset($metadata['users_count']) && $metadata['users_count'] > 0) {
            $baseStages += 2; // User cleanup stages
        }

        if (isset($metadata['delete_type']) && $metadata['delete_type'] === 'hard') {
            $baseStages += 5; // Additional cleanup stages for hard delete
        }

        return $baseStages;
    }

    /**
     * Generate unique operation ID
     */
    public static function generateOperationId(): string
    {
        return 'del_' . uniqid() . '_' . time();
    }
}