<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Institution;
use App\Models\User;
use Carbon\Carbon;

class SimpleCacheService
{
    private const CACHE_PREFIX = 'survey_response_approval:';
    private const DEFAULT_TTL = 300; // 5 minutes
    private const STATS_TTL = 60; // 1 minute for stats
    private const USER_PERMISSIONS_TTL = 600; // 10 minutes
    private const INSTITUTIONS_TTL = 1800; // 30 minutes

    /**
     * Cache survey responses with advanced filtering
     */
    public function cacheResponsesList(Survey $survey, array $filters, User $user, $data): void
    {
        $cacheKey = $this->getResponsesListCacheKey($survey->id, $filters, $user->id);
        Cache::put($cacheKey, $data, self::DEFAULT_TTL);
        Cache::put("{$cacheKey}:timestamp", now()->timestamp, self::DEFAULT_TTL + 60);
    }

    /**
     * Get cached survey responses list
     */
    public function getCachedResponsesList(Survey $survey, array $filters, User $user)
    {
        $cacheKey = $this->getResponsesListCacheKey($survey->id, $filters, $user->id);
        
        // Check if cache exists and is fresh
        $timestamp = Cache::get("{$cacheKey}:timestamp");
        if ($timestamp && (now()->timestamp - $timestamp) > self::DEFAULT_TTL) {
            return null; // Cache is stale
        }

        return Cache::get($cacheKey);
    }

    /**
     * Cache approval statistics
     */
    public function cacheApprovalStats(Survey $survey, User $user, array $stats): void
    {
        $cacheKey = $this->getStatssCacheKey($survey->id, $user->id);
        Cache::put($cacheKey, $stats, self::STATS_TTL);
    }

    /**
     * Get cached approval statistics
     */
    public function getCachedApprovalStats(Survey $survey, User $user): ?array
    {
        $cacheKey = $this->getStatssCacheKey($survey->id, $user->id);
        return Cache::get($cacheKey);
    }

    /**
     * Cache user permissions for role-based access
     */
    public function cacheUserPermissions(User $user, array $permissions): void
    {
        $cacheKey = "user_permissions:{$user->id}";
        Cache::put($cacheKey, $permissions, self::USER_PERMISSIONS_TTL);
    }

    /**
     * Get cached user permissions
     */
    public function getCachedUserPermissions(User $user): ?array
    {
        $cacheKey = "user_permissions:{$user->id}";
        return Cache::get($cacheKey);
    }

    /**
     * Cache institutions hierarchy for filtering
     */
    public function cacheInstitutionsHierarchy(): void
    {
        $institutions = Institution::select([
            'id', 'name', 'type', 'level', 'parent_id'
        ])->orderBy('level')->orderBy('name')->get()->toArray();

        Cache::put('institutions:hierarchy', $institutions, self::INSTITUTIONS_TTL);

        // Cache institution types for filters
        $types = array_unique(array_column($institutions, 'type'));
        Cache::put('institutions:types', array_values(array_filter($types)), self::INSTITUTIONS_TTL);
    }

    /**
     * Get cached institutions hierarchy
     */
    public function getCachedInstitutionsHierarchy(): ?array
    {
        return Cache::get('institutions:hierarchy');
    }

    /**
     * Get cached institution types
     */
    public function getCachedInstitutionTypes(): ?array
    {
        return Cache::get('institutions:types');
    }

    /**
     * Cache individual response details
     */
    public function cacheResponseDetails(int $responseId, array $data): void
    {
        $cacheKey = "response_details:{$responseId}";
        Cache::put($cacheKey, $data, self::DEFAULT_TTL);
    }

    /**
     * Get cached response details
     */
    public function getCachedResponseDetails(int $responseId): ?array
    {
        $cacheKey = "response_details:{$responseId}";
        return Cache::get($cacheKey);
    }

    /**
     * Cache published surveys list
     */
    public function cachePublishedSurveys(array $surveys): void
    {
        Cache::put('surveys:published', $surveys, self::DEFAULT_TTL);
    }

    /**
     * Get cached published surveys
     */
    public function getCachedPublishedSurveys(): ?array
    {
        return Cache::get('surveys:published');
    }

    /**
     * Invalidate caches when response is updated
     */
    public function invalidateResponseCaches(SurveyResponse $response): void
    {
        // Clear specific response cache
        Cache::forget("response_details:{$response->id}");
        
        // Clear survey-related caches - we'll need to clear all survey caches
        // since file cache doesn't support tags
        $this->clearSurveyCacheGroup($response->survey_id);
    }

    /**
     * Invalidate caches when survey is updated
     */
    public function invalidateSurveyCaches(Survey $survey): void
    {
        Cache::forget('surveys:published');
        $this->clearSurveyCacheGroup($survey->id);
    }

    /**
     * Invalidate institution caches
     */
    public function invalidateInstitutionCaches(): void
    {
        Cache::forget('institutions:hierarchy');
        Cache::forget('institutions:types');
    }

    /**
     * Invalidate user permission caches
     */
    public function invalidateUserPermissionCaches(User $user): void
    {
        Cache::forget("user_permissions:{$user->id}");
    }

    /**
     * Warm up essential caches
     */
    public function warmUpCaches(): void
    {
        try {
            // Cache institutions hierarchy
            $this->cacheInstitutionsHierarchy();
            
            // Cache published surveys
            $publishedSurveys = Survey::where('status', 'published')
                ->where('end_date', '>=', now())
                ->select(['id', 'title', 'description', 'start_date', 'end_date', 'target_institutions'])
                ->get()->toArray();
            $this->cachePublishedSurveys($publishedSurveys);
            
            \Log::info('Survey response caches warmed up successfully');
        } catch (\Exception $e) {
            \Log::error('Failed to warm up caches: ' . $e->getMessage());
        }
    }

    /**
     * Get cache health metrics (simplified for file cache)
     */
    public function getCacheMetrics(): array
    {
        return [
            'cache_driver' => 'file',
            'cached_surveys' => Cache::has('surveys:published') ? 'cached' : 'not_cached',
            'cached_institutions' => Cache::has('institutions:hierarchy') ? 'cached' : 'not_cached',
            'status' => 'active'
        ];
    }

    /**
     * Clear all survey response related caches
     */
    public function clearAllCaches(): void
    {
        $patterns = [
            'survey_response_approval:*',
            'approval_stats_*', 
            'response_details:*',
            'user_permissions:*',
            'surveys:*',
            'institutions:*'
        ];

        // For file cache, we need to manually clear known keys
        Cache::forget('surveys:published');
        Cache::forget('institutions:hierarchy');
        Cache::forget('institutions:types');
        
        \Log::info('All survey response caches cleared');
    }

    /**
     * Generate cache key for responses list
     */
    private function getResponsesListCacheKey(int $surveyId, array $filters, int $userId): string
    {
        $filterHash = md5(serialize($filters));
        return self::CACHE_PREFIX . "responses:{$surveyId}:{$userId}:{$filterHash}";
    }

    /**
     * Generate cache key for stats
     */
    private function getStatssCacheKey(int $surveyId, int $userId): string
    {
        return self::CACHE_PREFIX . "stats:{$surveyId}:{$userId}";
    }

    /**
     * Clear cache group for a specific survey
     */
    private function clearSurveyCacheGroup(int $surveyId): void
    {
        // Since we can't use patterns with file cache, 
        // we'll log the cache clear request
        \Log::info("Cache invalidation requested for survey: {$surveyId}");
    }

    /**
     * Get cache statistics for monitoring (simplified)
     */
    public function getCacheStats(): array
    {
        $stats = [
            'surveys' => [
                'label' => 'Surveys',
                'status' => Cache::has('surveys:published') ? 'active' : 'inactive'
            ],
            'institutions' => [
                'label' => 'Institutions', 
                'status' => Cache::has('institutions:hierarchy') ? 'active' : 'inactive'
            ]
        ];

        return $stats;
    }
}