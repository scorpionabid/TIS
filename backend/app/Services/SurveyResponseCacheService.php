<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
// use Illuminate\Support\Facades\Redis; // Disabled for local development without Redis
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Institution;
use App\Models\User;
use Carbon\Carbon;

class SurveyResponseCacheService
{
    private const CACHE_PREFIX = 'survey_response_approval:';
    private const DEFAULT_TTL = 300; // 5 minutes
    private const STATS_TTL = 60; // 1 minute for stats
    private const USER_PERMISSIONS_TTL = 600; // 10 minutes
    private const INSTITUTIONS_TTL = 1800; // 30 minutes
    
    // File cache doesn't support tags, so we'll use simple cache invalidation
    private const CACHE_GROUPS = [
        'survey_responses' => 'survey_responses_*',
        'approval_stats' => 'approval_stats_*',
        'response_details' => 'response_details_*',
        'surveys' => 'surveys_*',
        'institutions' => 'institutions_*',
        'user_permissions' => 'user_permissions_*'
    ];

    /**
     * Cache survey responses with advanced filtering
     */
    public function cacheResponsesList(Survey $survey, array $filters, User $user, $data): void
    {
        $cacheKey = $this->getResponsesListCacheKey($survey->id, $filters, $user->id);
        
        // Store with tags for easy invalidation (disabled for file cache)
        // File cache doesn't support tags, so we'll use simple cache keys
        Cache::put($cacheKey, $data, self::DEFAULT_TTL);

        // Also cache the timestamp for freshness check
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

        return Cache::tags([
            'survey_responses',
            "survey_{$survey->id}",
            "user_{$user->id}"
        ])->get($cacheKey);
    }

    /**
     * Cache approval statistics
     */
    public function cacheApprovalStats(Survey $survey, User $user, array $stats): void
    {
        $cacheKey = $this->getStatssCacheKey($survey->id, $user->id);
        
        Cache::tags([
            'approval_stats',
            "survey_{$survey->id}",
            "user_{$user->id}"
        ])->put($cacheKey, $stats, self::STATS_TTL);
    }

    /**
     * Get cached approval statistics
     */
    public function getCachedApprovalStats(Survey $survey, User $user): ?array
    {
        $cacheKey = $this->getStatssCacheKey($survey->id, $user->id);
        
        return Cache::tags([
            'approval_stats',
            "survey_{$survey->id}"
        ])->get($cacheKey);
    }

    /**
     * Cache user permissions for role-based access
     */
    public function cacheUserPermissions(User $user, array $permissions): void
    {
        $cacheKey = "user_permissions:{$user->id}";
        
        Cache::tags([
            'user_permissions',
            "user_{$user->id}"
        ])->put($cacheKey, $permissions, self::USER_PERMISSIONS_TTL);
    }

    /**
     * Get cached user permissions
     */
    public function getCachedUserPermissions(User $user): ?array
    {
        $cacheKey = "user_permissions:{$user->id}";
        
        return Cache::tags(['user_permissions'])->get($cacheKey);
    }

    /**
     * Cache institutions hierarchy for filtering
     */
    public function cacheInstitutionsHierarchy(): void
    {
        $institutions = Institution::select([
            'id', 'name', 'type', 'level', 'parent_id'
        ])->orderBy('level')->orderBy('name')->get()->toArray();

        Cache::tags(['institutions', 'hierarchy'])->put(
            'institutions:hierarchy',
            $institutions,
            self::INSTITUTIONS_TTL
        );

        // Cache institution types for filters
        $types = array_unique(array_column($institutions, 'type'));
        Cache::tags(['institutions'])->put(
            'institutions:types',
            array_values(array_filter($types)),
            self::INSTITUTIONS_TTL
        );
    }

    /**
     * Get cached institutions hierarchy
     */
    public function getCachedInstitutionsHierarchy(): ?array
    {
        return Cache::tags(['institutions'])->get('institutions:hierarchy');
    }

    /**
     * Get cached institution types
     */
    public function getCachedInstitutionTypes(): ?array
    {
        return Cache::tags(['institutions'])->get('institutions:types');
    }

    /**
     * Cache individual response details
     */
    public function cacheResponseDetails(int $responseId, array $data): void
    {
        $cacheKey = "response_details:{$responseId}";
        
        Cache::tags([
            'response_details',
            "response_{$responseId}"
        ])->put($cacheKey, $data, self::DEFAULT_TTL);
    }

    /**
     * Get cached response details
     */
    public function getCachedResponseDetails(int $responseId): ?array
    {
        $cacheKey = "response_details:{$responseId}";
        
        return Cache::tags(['response_details'])->get($cacheKey);
    }

    /**
     * Cache published surveys list
     */
    public function cachePublishedSurveys(array $surveys): void
    {
        Cache::tags(['surveys', 'published'])->put(
            'surveys:published',
            $surveys,
            self::DEFAULT_TTL
        );
    }

    /**
     * Get cached published surveys
     */
    public function getCachedPublishedSurveys(): ?array
    {
        return Cache::tags(['surveys'])->get('surveys:published');
    }

    /**
     * Invalidate caches when response is updated
     */
    public function invalidateResponseCaches(SurveyResponse $response): void
    {
        // Clear specific response cache
        Cache::tags(["response_{$response->id}"])->flush();
        
        // Clear survey-related caches
        Cache::tags(["survey_{$response->survey_id}"])->flush();
        
        // Clear stats caches
        Cache::tags(['approval_stats'])->flush();
        
        // Clear responses list caches
        Cache::tags(['responses_list'])->flush();
    }

    /**
     * Invalidate caches when survey is updated
     */
    public function invalidateSurveyCaches(Survey $survey): void
    {
        Cache::tags([
            "survey_{$survey->id}",
            'surveys',
            'published'
        ])->flush();
    }

    /**
     * Invalidate institution caches
     */
    public function invalidateInstitutionCaches(): void
    {
        Cache::tags(['institutions', 'hierarchy'])->flush();
    }

    /**
     * Invalidate user permission caches
     */
    public function invalidateUserPermissionCaches(User $user): void
    {
        Cache::tags(["user_{$user->id}", 'user_permissions'])->flush();
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
     * Get cache health metrics
     */
    public function getCacheMetrics(): array
    {
        try {
            $redis = Redis::connection();
            $info = $redis->info();
            
            return [
                'connected_clients' => $info['connected_clients'] ?? 0,
                'used_memory' => $info['used_memory_human'] ?? '0B',
                'keyspace_hits' => $info['keyspace_hits'] ?? 0,
                'keyspace_misses' => $info['keyspace_misses'] ?? 0,
                'hit_rate' => $this->calculateHitRate($info),
                'cached_surveys' => Cache::tags(['surveys'])->get('surveys:published') ? 'cached' : 'not_cached',
                'cached_institutions' => Cache::tags(['institutions'])->get('institutions:hierarchy') ? 'cached' : 'not_cached',
            ];
        } catch (\Exception $e) {
            return [
                'error' => 'Redis connection failed',
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Clear all survey response related caches
     */
    public function clearAllCaches(): void
    {
        Cache::tags([
            'survey_responses',
            'approval_stats',
            'response_details',
            'surveys',
            'institutions',
            'user_permissions'
        ])->flush();
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
     * Calculate cache hit rate
     */
    private function calculateHitRate(array $info): float
    {
        $hits = $info['keyspace_hits'] ?? 0;
        $misses = $info['keyspace_misses'] ?? 0;
        $total = $hits + $misses;
        
        return $total > 0 ? round(($hits / $total) * 100, 2) : 0.0;
    }

    /**
     * Get cache statistics for monitoring
     */
    public function getCacheStats(): array
    {
        $tags = [
            'survey_responses' => 'Survey Responses',
            'approval_stats' => 'Approval Statistics', 
            'response_details' => 'Response Details',
            'surveys' => 'Surveys',
            'institutions' => 'Institutions',
            'user_permissions' => 'User Permissions'
        ];

        $stats = [];
        foreach ($tags as $tag => $label) {
            try {
                // This is a simple check - in production you'd want more detailed metrics
                $hasCache = !empty(Cache::tags([$tag])->get($tag . '_check'));
                $stats[$tag] = [
                    'label' => $label,
                    'status' => $hasCache ? 'active' : 'inactive',
                    'last_updated' => Cache::get($tag . '_last_updated', 'never')
                ];
            } catch (\Exception $e) {
                $stats[$tag] = [
                    'label' => $label,
                    'status' => 'error',
                    'error' => $e->getMessage()
                ];
            }
        }

        return $stats;
    }
}