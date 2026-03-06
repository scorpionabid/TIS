<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardCacheService
{
    protected int $defaultCacheDuration = 300; // 5 minutes

    protected int $analyticsCacheDuration = 900; // 15 minutes

    /**
     * Get cached dashboard statistics
     */
    public function getDashboardStats(?User $user = null): array
    {
        $cacheKey = 'dashboard_stats_' . ($user ? $user->id . '_' . $user->getRoleNames()->implode('_') : 'guest');

        return Cache::remember($cacheKey, $this->defaultCacheDuration, function () use ($user) {
            // Single optimized query for all basic counts
            $basicStats = DB::select("
                SELECT 
                    (SELECT COUNT(*) FROM users) as totalUsers,
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as activeUsers,
                    (SELECT COUNT(*) FROM institutions) as totalInstitutions,
                    (SELECT COUNT(*) FROM institutions WHERE is_active = true) as activeInstitutions,
                    (SELECT COUNT(*) FROM surveys) as totalSurveys,
                    (SELECT COUNT(*) FROM surveys WHERE status = 'active') as activeSurveys,
                    (SELECT COUNT(*) FROM surveys WHERE status = 'completed') as completedSurveys,
                    (SELECT COUNT(*) FROM surveys WHERE status = 'pending') as pendingSurveys,
                    (SELECT COUNT(*) FROM tasks) as totalTasks,
                    (SELECT COUNT(*) FROM tasks WHERE status = 'active') as activeTasks,
                    (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completedTasks,
                    (SELECT COUNT(*) FROM tasks WHERE status = 'pending') as pendingTasks,
                    (SELECT COUNT(*) FROM documents) as totalDocuments
            ")[0];

            $stats = (array) $basicStats;

            // Add role-based filtering if user is provided
            if ($user) {
                $stats = array_merge($stats, $this->getRoleBasedStats($user));
            }

            return $stats;
        });
    }

    /**
     * Get cached analytics data
     */
    public function getAnalyticsData(?User $user = null): array
    {
        $cacheKey = 'analytics_data_' . ($user ? $user->id . '_' . $user->getRoleNames()->implode('_') : 'guest');

        return Cache::remember($cacheKey, $this->analyticsCacheDuration, function () use ($user) {
            $analytics = [
                'user_trends' => $this->getUserTrends(),
                'activity_summary' => $this->getActivitySummary(),
                'performance_metrics' => $this->getPerformanceMetrics(),
            ];

            if ($user && $user->hasRole('SuperAdmin')) {
                $analytics['system_health'] = $this->getSystemHealthMetrics();
                $analytics['institution_distribution'] = $this->getInstitutionDistribution();
            }

            return $analytics;
        });
    }

    /**
     * Get role-based statistics
     */
    protected function getRoleBasedStats(User $user): array
    {
        $institutionId = $user->institution_id;

        if (! $institutionId) {
            return [];
        }

        return [
            'institution_users' => User::where('institution_id', $institutionId)->count(),
            'institution_surveys' => Survey::where('institution_id', $institutionId)->count(),
            'institution_tasks' => Task::where('institution_id', $institutionId)->count(),
            'institution_documents' => Document::where('institution_id', $institutionId)->count(),
        ];
    }

    /**
     * Get user registration trends
     */
    protected function getUserTrends(): array
    {
        $since = Carbon::now()->subDays(30);

        return User::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as registrations')
            ->where('created_at', '>=', $since)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderByDesc('date')
            ->limit(30)
            ->get()
            ->map(fn ($row) => (array) $row)
            ->toArray();
    }

    /**
     * Get activity summary
     */
    protected function getActivitySummary(): array
    {
        $since = Carbon::now()->subDays(7);

        return (object) [
            'surveys_this_week' => Survey::where('created_at', '>=', $since)->count(),
            'tasks_this_week' => Task::where('created_at', '>=', $since)->count(),
            'documents_this_week' => Document::where('created_at', '>=', $since)->count(),
            'active_users_this_week' => User::where('last_login_at', '>=', $since)->count(),
        ];
    }

    /**
     * Get performance metrics
     */
    protected function getPerformanceMetrics(): array
    {
        return [
            'avg_response_time' => $this->getAverageResponseTime(),
            'query_count' => $this->getAverageQueryCount(),
            'cache_hit_rate' => $this->getCacheHitRate(),
        ];
    }

    /**
     * Get system health metrics (SuperAdmin only)
     */
    protected function getSystemHealthMetrics(): array
    {
        return [
            'database_size' => $this->getDatabaseSize(),
            'storage_usage' => $this->getStorageUsage(),
            'error_rate' => $this->getErrorRate(),
        ];
    }

    /**
     * Get institution distribution
     */
    protected function getInstitutionDistribution(): array
    {
        return DB::table('institutions')
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')
            ->get()
            ->pluck('count', 'type')
            ->toArray();
    }

    /**
     * Clear dashboard cache for user
     */
    public function clearUserCache(User $user): void
    {
        $patterns = [
            'dashboard_stats_' . $user->id . '_*',
            'analytics_data_' . $user->id . '_*',
        ];

        foreach ($patterns as $pattern) {
            Cache::forget($pattern);
        }
    }

    /**
     * Clear all dashboard caches
     */
    public function clearAllCaches(): void
    {
        $keys = [
            'dashboard_stats_*',
            'analytics_data_*',
            'superadmin_analytics',
        ];

        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }

    // Performance metric helper methods
    protected function getAverageResponseTime(): float
    {
        // This would integrate with performance logging
        return 0.0;
    }

    protected function getAverageQueryCount(): int
    {
        // This would integrate with query monitoring
        return 0;
    }

    protected function getCacheHitRate(): float
    {
        // This would integrate with cache monitoring
        return 0.0;
    }

    protected function getDatabaseSize(): string
    {
        // This would get actual database size
        return '0 MB';
    }

    protected function getStorageUsage(): string
    {
        // This would get actual storage usage
        return '0 MB';
    }

    protected function getErrorRate(): float
    {
        // This would integrate with error tracking
        return 0.0;
    }
}
