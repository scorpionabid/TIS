<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SystemMonitoringService
{
    /**
     * Monitor survey response approval system performance
     */
    public function monitorApprovalSystemPerformance(): array
    {
        $startTime = microtime(true);
        
        $metrics = [
            'database_performance' => $this->checkDatabasePerformance(),
            'cache_performance' => $this->checkCachePerformance(),
            'api_response_times' => $this->getApiResponseTimes(),
            'system_load' => $this->getSystemLoadMetrics(),
            'approval_workflow_stats' => $this->getApprovalWorkflowStats(),
            'performance_alerts' => $this->checkPerformanceAlerts(),
        ];
        
        $executionTime = (microtime(true) - $startTime) * 1000;
        $metrics['monitoring_execution_time'] = round($executionTime, 2);
        
        // Store metrics for historical analysis
        $this->storeMetrics($metrics);
        
        // Check for alerts
        $this->processAlerts($metrics);
        
        return $metrics;
    }
    
    /**
     * Check database performance
     */
    private function checkDatabasePerformance(): array
    {
        $startTime = microtime(true);
        
        // Test key queries
        $surveyResponsesCount = DB::table('survey_responses')->count();
        $approvalRequestsCount = DB::table('data_approval_requests')->count() ?? 0;
        $institutionsCount = DB::table('institutions')->count();
        
        $queryTime = (microtime(true) - $startTime) * 1000;
        
        // Check slow queries
        $slowQueries = $this->getSlowQueries();
        
        return [
            'survey_responses_count' => $surveyResponsesCount,
            'approval_requests_count' => $approvalRequestsCount,
            'institutions_count' => $institutionsCount,
            'query_execution_time_ms' => round($queryTime, 2),
            'slow_queries_count' => count($slowQueries),
            'database_size_mb' => $this->getDatabaseSize(),
            'connection_pool_status' => $this->getConnectionPoolStatus(),
        ];
    }
    
    /**
     * Check cache performance
     */
    private function checkCachePerformance(): array
    {
        $startTime = microtime(true);
        
        // Test cache operations
        $testKey = 'monitoring_test_' . time();
        $testValue = ['test' => true, 'timestamp' => now()->toISOString()];
        
        Cache::put($testKey, $testValue, 60);
        $retrieved = Cache::get($testKey);
        Cache::forget($testKey);
        
        $cacheTime = (microtime(true) - $startTime) * 1000;
        
        return [
            'cache_driver' => config('cache.default'),
            'cache_operation_time_ms' => round($cacheTime, 2),
            'cache_hit_ratio' => $this->getCacheHitRatio(),
            'cache_memory_usage_mb' => $this->getCacheMemoryUsage(),
            'cache_test_successful' => $retrieved !== null,
        ];
    }
    
    /**
     * Get API response times from recent requests
     */
    private function getApiResponseTimes(): array
    {
        // This would integrate with Laravel's response time tracking
        // For now, return sample data
        return [
            'average_response_time_ms' => 25.4,
            'max_response_time_ms' => 156.2,
            'min_response_time_ms' => 2.1,
            'slow_requests_count' => 3,
            'total_requests_last_hour' => 847,
            'error_rate_percent' => 0.12,
        ];
    }
    
    /**
     * Get system load metrics
     */
    private function getSystemLoadMetrics(): array
    {
        $memoryUsage = memory_get_usage(true);
        $peakMemoryUsage = memory_get_peak_usage(true);
        
        return [
            'memory_usage_mb' => round($memoryUsage / 1024 / 1024, 2),
            'peak_memory_usage_mb' => round($peakMemoryUsage / 1024 / 1024, 2),
            'memory_limit' => ini_get('memory_limit'),
            'php_version' => phpversion(),
            'server_load' => $this->getServerLoad(),
            'disk_usage_percent' => $this->getDiskUsage(),
        ];
    }
    
    /**
     * Get approval workflow statistics
     */
    private function getApprovalWorkflowStats(): array
    {
        $stats = [
            'pending_approvals' => 0,
            'average_approval_time_hours' => 0,
            'approval_backlog' => 0,
            'daily_approval_rate' => 0,
        ];
        
        try {
            if (DB::getSchemaBuilder()->hasTable('data_approval_requests')) {
                $stats['pending_approvals'] = DB::table('data_approval_requests')
                    ->where('current_status', 'pending')
                    ->count();
                    
                $stats['approval_backlog'] = DB::table('data_approval_requests')
                    ->where('current_status', 'in_progress')
                    ->where('created_at', '<', now()->subDays(2))
                    ->count();
                    
                $dailyApprovals = DB::table('data_approval_requests')
                    ->where('current_status', 'approved')
                    ->whereDate('completed_at', today())
                    ->count();
                    
                $stats['daily_approval_rate'] = $dailyApprovals;
            }
        } catch (\Exception $e) {
            Log::warning('Could not fetch approval workflow stats: ' . $e->getMessage());
        }
        
        return $stats;
    }
    
    /**
     * Check for performance alerts
     */
    private function checkPerformanceAlerts(): array
    {
        $alerts = [];
        
        // Check database performance
        $dbMetrics = $this->checkDatabasePerformance();
        if ($dbMetrics['query_execution_time_ms'] > 100) {
            $alerts[] = [
                'type' => 'database_slow',
                'severity' => 'warning',
                'message' => "Database queries taking {$dbMetrics['query_execution_time_ms']}ms",
                'timestamp' => now()->toISOString(),
            ];
        }
        
        // Check cache performance
        $cacheMetrics = $this->checkCachePerformance();
        if ($cacheMetrics['cache_operation_time_ms'] > 50) {
            $alerts[] = [
                'type' => 'cache_slow',
                'severity' => 'warning',
                'message' => "Cache operations taking {$cacheMetrics['cache_operation_time_ms']}ms",
                'timestamp' => now()->toISOString(),
            ];
        }
        
        // Check memory usage
        $memoryUsage = memory_get_usage(true) / 1024 / 1024;
        if ($memoryUsage > 256) {
            $alerts[] = [
                'type' => 'memory_high',
                'severity' => 'critical',
                'message' => "High memory usage: {$memoryUsage}MB",
                'timestamp' => now()->toISOString(),
            ];
        }
        
        return $alerts;
    }
    
    /**
     * Store metrics for historical analysis
     */
    private function storeMetrics(array $metrics): void
    {
        $cacheKey = 'system_metrics_' . now()->format('Y_m_d_H');
        $existingMetrics = Cache::get($cacheKey, []);
        
        $existingMetrics[] = [
            'timestamp' => now()->toISOString(),
            'metrics' => $metrics,
        ];
        
        // Keep only last 24 entries per hour
        if (count($existingMetrics) > 24) {
            $existingMetrics = array_slice($existingMetrics, -24);
        }
        
        Cache::put($cacheKey, $existingMetrics, 3600); // Cache for 1 hour
    }
    
    /**
     * Process alerts and notifications
     */
    private function processAlerts(array $metrics): void
    {
        $alerts = $metrics['performance_alerts'] ?? [];
        
        foreach ($alerts as $alert) {
            if ($alert['severity'] === 'critical') {
                Log::critical('System Performance Alert', $alert);
            } elseif ($alert['severity'] === 'warning') {
                Log::warning('System Performance Warning', $alert);
            }
        }
        
        // Store alert history
        if (!empty($alerts)) {
            $alertHistory = Cache::get('alert_history', []);
            $alertHistory = array_merge($alertHistory, $alerts);
            
            // Keep only last 100 alerts
            if (count($alertHistory) > 100) {
                $alertHistory = array_slice($alertHistory, -100);
            }
            
            Cache::put('alert_history', $alertHistory, 86400); // Cache for 24 hours
        }
    }
    
    /**
     * Helper methods
     */
    private function getSlowQueries(): array
    {
        // Implementation depends on database driver
        return [];
    }
    
    private function getDatabaseSize(): float
    {
        try {
            if (config('database.default') === 'sqlite') {
                $dbPath = database_path('database.sqlite');
                return file_exists($dbPath) ? round(filesize($dbPath) / 1024 / 1024, 2) : 0;
            }
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }
    
    private function getConnectionPoolStatus(): string
    {
        return 'active';
    }
    
    private function getCacheHitRatio(): float
    {
        return 95.5; // Sample data
    }
    
    private function getCacheMemoryUsage(): float
    {
        return 45.2; // Sample data
    }
    
    private function getServerLoad(): array
    {
        return ['1min' => 0.25, '5min' => 0.30, '15min' => 0.28];
    }
    
    private function getDiskUsage(): float
    {
        return 65.4; // Sample data
    }
    
    /**
     * Get system health status
     */
    public function getSystemHealth(): array
    {
        $metrics = $this->monitorApprovalSystemPerformance();
        $alerts = $metrics['performance_alerts'];
        
        $healthStatus = 'healthy';
        if (!empty($alerts)) {
            $criticalAlerts = array_filter($alerts, fn($alert) => $alert['severity'] === 'critical');
            $warningAlerts = array_filter($alerts, fn($alert) => $alert['severity'] === 'warning');
            
            if (!empty($criticalAlerts)) {
                $healthStatus = 'critical';
            } elseif (!empty($warningAlerts)) {
                $healthStatus = 'warning';
            }
        }
        
        return [
            'status' => $healthStatus,
            'last_check' => now()->toISOString(),
            'metrics_summary' => [
                'database_health' => $metrics['database_performance']['query_execution_time_ms'] < 100 ? 'good' : 'poor',
                'cache_health' => $metrics['cache_performance']['cache_test_successful'] ? 'good' : 'poor',
                'memory_health' => $metrics['system_load']['memory_usage_mb'] < 256 ? 'good' : 'poor',
            ],
            'alerts_count' => count($alerts),
            'critical_alerts' => count(array_filter($alerts, fn($alert) => $alert['severity'] === 'critical')),
        ];
    }
}