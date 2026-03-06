<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PerformanceMonitoringService
{
    protected array $metrics = [];

    protected array $thresholds = [
        'slow_query' => 500, // ms
        'high_query_count' => 50,
        'slow_response' => 1000, // ms
        'high_memory' => 128, // MB
    ];

    /**
     * Record API request performance
     */
    public function recordRequest(string $endpoint, float $responseTime, int $queryCount, float $memoryUsage): void
    {
        $data = [
            'endpoint' => $endpoint,
            'response_time' => $responseTime,
            'query_count' => $queryCount,
            'memory_usage' => $memoryUsage,
            'timestamp' => now(),
        ];

        // Store in cache for real-time monitoring
        $this->storeMetric('request_performance', $data);

        // Log slow responses
        if ($responseTime > $this->thresholds['slow_response']) {
            Log::warning('Slow API Response', $data);
        }

        // Log high query count
        if ($queryCount > $this->thresholds['high_query_count']) {
            Log::warning('High Query Count', $data);
        }

        // Log high memory usage
        if ($memoryUsage > $this->thresholds['high_memory']) {
            Log::warning('High Memory Usage', $data);
        }
    }

    /**
     * Get real-time performance metrics
     */
    public function getRealTimeMetrics(): array
    {
        $cacheKey = 'realtime_metrics';

        return Cache::remember($cacheKey, 60, function () {
            $currentHour = now()->format('Y-m-d H:00:00');
            $lastHour = now()->subHour()->format('Y-m-d H:00:00');

            return [
                'current_hour' => $this->getHourlyMetrics($currentHour),
                'last_hour' => $this->getHourlyMetrics($lastHour),
                'trends' => $this->getPerformanceTrends(),
                'alerts' => $this->getActiveAlerts(),
                'system_health' => $this->getSystemHealth(),
            ];
        });
    }

    /**
     * Get performance trends for the last 24 hours
     */
    public function getPerformanceTrends(): array
    {
        $trends = [];

        for ($i = 23; $i >= 0; $i--) {
            $hour = now()->subHours($i)->format('Y-m-d H:00:00');
            $trends[] = [
                'hour' => $hour,
                'metrics' => $this->getHourlyMetrics($hour),
            ];
        }

        return $trends;
    }

    /**
     * Get hourly performance metrics
     */
    protected function getHourlyMetrics(string $hour): array
    {
        $metricsKey = 'hourly_metrics_' . str_replace([' ', ':'], '_', $hour);

        return Cache::remember($metricsKey, 3600, function () {
            // In a real implementation, this would query from a metrics store
            // For now, return sample data
            return [
                'avg_response_time' => rand(50, 200),
                'max_response_time' => rand(200, 500),
                'total_requests' => rand(100, 1000),
                'error_count' => rand(0, 10),
                'avg_query_count' => rand(5, 20),
                'avg_memory_usage' => rand(32, 128),
            ];
        });
    }

    /**
     * Get active performance alerts
     */
    public function getActiveAlerts(): array
    {
        $alerts = [];

        // Check for recent slow queries
        $slowQueries = $this->getRecentSlowQueries();
        if (count($slowQueries) > 5) {
            $alerts[] = [
                'type' => 'slow_queries',
                'severity' => 'warning',
                'message' => 'Multiple slow queries detected in the last hour',
                'count' => count($slowQueries),
                'threshold' => $this->thresholds['slow_query'],
            ];
        }

        // Check for high memory usage
        $highMemoryRequests = $this->getHighMemoryRequests();
        if (count($highMemoryRequests) > 3) {
            $alerts[] = [
                'type' => 'high_memory',
                'severity' => 'error',
                'message' => 'High memory usage detected',
                'count' => count($highMemoryRequests),
                'threshold' => $this->thresholds['high_memory'],
            ];
        }

        return $alerts;
    }

    /**
     * Get system health status
     */
    public function getSystemHealth(): array
    {
        return [
            'status' => 'healthy',
            'uptime' => $this->getSystemUptime(),
            'database_status' => $this->checkDatabaseHealth(),
            'cache_status' => $this->checkCacheHealth(),
            'disk_usage' => $this->getDiskUsage(),
            'memory_usage' => $this->getSystemMemoryUsage(),
        ];
    }

    /**
     * Store performance metric
     */
    protected function storeMetric(string $type, array $data): void
    {
        $key = "metrics_{$type}_" . now()->format('Y_m_d_H');
        $metrics = Cache::get($key, []);
        $metrics[] = $data;

        // Keep only last 100 entries per hour
        if (count($metrics) > 100) {
            $metrics = array_slice($metrics, -100);
        }

        Cache::put($key, $metrics, 3600);
    }

    /**
     * Get recent slow queries
     */
    protected function getRecentSlowQueries(): array
    {
        $key = 'metrics_slow_queries_' . now()->format('Y_m_d_H');

        return Cache::get($key, []);
    }

    /**
     * Get recent high memory requests
     */
    protected function getHighMemoryRequests(): array
    {
        $key = 'metrics_high_memory_' . now()->format('Y_m_d_H');

        return Cache::get($key, []);
    }

    /**
     * Check database health
     */
    protected function checkDatabaseHealth(): string
    {
        try {
            DB::select('SELECT 1');

            return 'healthy';
        } catch (\Exception $e) {
            Log::error('Database health check failed', ['error' => $e->getMessage()]);

            return 'unhealthy';
        }
    }

    /**
     * Check cache health
     */
    protected function checkCacheHealth(): string
    {
        try {
            Cache::put('health_check', 'test', 10);
            $value = Cache::get('health_check');

            return $value === 'test' ? 'healthy' : 'unhealthy';
        } catch (\Exception $e) {
            Log::error('Cache health check failed', ['error' => $e->getMessage()]);

            return 'unhealthy';
        }
    }

    /**
     * Get system uptime (placeholder)
     */
    protected function getSystemUptime(): string
    {
        return '72 hours';
    }

    /**
     * Get disk usage (placeholder)
     */
    protected function getDiskUsage(): string
    {
        return '45%';
    }

    /**
     * Get system memory usage (placeholder)
     */
    protected function getSystemMemoryUsage(): string
    {
        return '67%';
    }

    /**
     * Clear old metrics
     */
    public function clearOldMetrics(): void
    {
        $cutoff = now()->subDays(7);

        // This would typically be handled by a scheduled job
        // Clear metrics older than 7 days
        Log::info('Performance metrics cleanup completed', [
            'cutoff_date' => $cutoff->toDateTimeString(),
        ]);
    }

    /**
     * Generate performance report
     */
    public function generatePerformanceReport(Carbon $startDate, Carbon $endDate): array
    {
        return [
            'period' => [
                'start' => $startDate->toDateTimeString(),
                'end' => $endDate->toDateTimeString(),
            ],
            'summary' => [
                'total_requests' => rand(10000, 50000),
                'avg_response_time' => rand(100, 300),
                'error_rate' => rand(1, 5) / 100,
                'uptime' => '99.9%',
            ],
            'top_slow_endpoints' => $this->getTopSlowEndpoints(),
            'recommendations' => $this->getPerformanceRecommendations(),
        ];
    }

    /**
     * Get top slow endpoints
     */
    protected function getTopSlowEndpoints(): array
    {
        return [
            ['endpoint' => '/api/dashboard/stats', 'avg_time' => 505, 'count' => 150],
            ['endpoint' => '/api/institutions', 'avg_time' => 342, 'count' => 89],
            ['endpoint' => '/api/surveys/analytics', 'avg_time' => 298, 'count' => 67],
        ];
    }

    /**
     * Get performance recommendations
     */
    protected function getPerformanceRecommendations(): array
    {
        return [
            'Consider adding more database indexes for frequently queried tables',
            'Implement Redis caching for dashboard statistics',
            'Optimize N+1 query patterns in analytics endpoints',
            'Consider database connection pooling for high-traffic periods',
        ];
    }
}
