<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class PerformanceReportCommand extends Command
{
    protected $signature = 'performance:report {--format=json : Output format (json, markdown)}';
    protected $description = 'Generate performance report for ATİS backend';

    public function handle()
    {
        $format = $this->option('format');
        
        $this->info('🔍 Generating ATİS Backend Performance Report...');
        
        // Collect performance metrics
        $metrics = $this->collectPerformanceMetrics();
        
        // Generate report
        if ($format === 'markdown') {
            $report = $this->generateMarkdownReport($metrics);
            $this->line($report);
        } else {
            $report = $this->generateJsonReport($metrics);
            $this->line(json_encode($report, JSON_PRETTY_PRINT));
        }
        
        $this->info('✅ Performance report generated successfully');
    }

    private function collectPerformanceMetrics()
    {
        $metrics = [
            'timestamp' => Carbon::now()->toISOString(),
            'database' => $this->getDatabaseMetrics(),
            'cache' => $this->getCacheMetrics(),
            'authentication' => $this->getAuthMetrics(),
            'memory' => $this->getMemoryMetrics(),
            'queries' => $this->getQueryMetrics(),
            'system' => $this->getSystemMetrics()
        ];

        return $metrics;
    }

    private function getDatabaseMetrics()
    {
        $startTime = microtime(true);
        
        // Test database connection and query performance
        try {
            $connectionTime = microtime(true);
            DB::connection()->getPdo();
            $connectionTime = (microtime(true) - $connectionTime) * 1000;

            $queryTime = microtime(true);
            $userCount = DB::table('users')->count();
            $queryTime = (microtime(true) - $queryTime) * 1000;

            $complexQueryTime = microtime(true);
            $complexResult = DB::table('users')
                ->join('institutions', 'users.institution_id', '=', 'institutions.id')
                ->select('users.id', 'users.username', 'institutions.name')
                ->limit(100)
                ->get();
            $complexQueryTime = (microtime(true) - $complexQueryTime) * 1000;

            return [
                'connection_time' => $connectionTime,
                'simple_query_time' => $queryTime,
                'complex_query_time' => $complexQueryTime,
                'user_count' => $userCount,
                'complex_result_count' => $complexResult->count(),
                'status' => 'healthy'
            ];
        } catch (\Exception $e) {
            return [
                'connection_time' => null,
                'simple_query_time' => null,
                'complex_query_time' => null,
                'error' => $e->getMessage(),
                'status' => 'error'
            ];
        }
    }

    private function getCacheMetrics()
    {
        $startTime = microtime(true);
        
        try {
            // Test cache write performance
            $writeTime = microtime(true);
            Cache::put('performance_test', 'test_value', 60);
            $writeTime = (microtime(true) - $writeTime) * 1000;

            // Test cache read performance
            $readTime = microtime(true);
            $value = Cache::get('performance_test');
            $readTime = (microtime(true) - $readTime) * 1000;

            // Test cache delete performance
            $deleteTime = microtime(true);
            Cache::forget('performance_test');
            $deleteTime = (microtime(true) - $deleteTime) * 1000;

            return [
                'write_time' => $writeTime,
                'read_time' => $readTime,
                'delete_time' => $deleteTime,
                'driver' => config('cache.default'),
                'status' => 'healthy'
            ];
        } catch (\Exception $e) {
            return [
                'write_time' => null,
                'read_time' => null,
                'delete_time' => null,
                'error' => $e->getMessage(),
                'status' => 'error'
            ];
        }
    }

    private function getAuthMetrics()
    {
        try {
            // Simulate authentication performance
            $authTime = microtime(true);
            
            // Test user lookup performance
            $user = DB::table('users')->where('username', 'superadmin')->first();
            
            $authTime = (microtime(true) - $authTime) * 1000;

            return [
                'average_time' => $authTime,
                'user_lookup_time' => $authTime,
                'status' => 'healthy'
            ];
        } catch (\Exception $e) {
            return [
                'average_time' => null,
                'error' => $e->getMessage(),
                'status' => 'error'
            ];
        }
    }

    private function getMemoryMetrics()
    {
        return [
            'peak_usage' => memory_get_peak_usage(true) / 1024 / 1024, // MB
            'current_usage' => memory_get_usage(true) / 1024 / 1024, // MB
            'limit' => ini_get('memory_limit'),
            'status' => 'healthy'
        ];
    }

    private function getQueryMetrics()
    {
        // Enable query logging temporarily
        DB::enableQueryLog();
        
        $startTime = microtime(true);
        
        // Run some typical queries
        DB::table('users')->count();
        DB::table('institutions')->count();
        DB::table('surveys')->count();
        DB::table('users')
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->select('users.id', 'users.username', 'institutions.name')
            ->limit(10)
            ->get();
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        $queries = DB::getQueryLog();
        
        DB::disableQueryLog();
        
        return [
            'total_time' => $totalTime,
            'query_count' => count($queries),
            'average_time' => $totalTime / count($queries),
            'queries' => array_map(function($query) {
                return [
                    'sql' => $query['query'],
                    'time' => $query['time'],
                    'bindings' => count($query['bindings'])
                ];
            }, $queries)
        ];
    }

    private function getSystemMetrics()
    {
        return [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'server_load' => sys_getloadavg(),
            'disk_usage' => $this->getDiskUsage(),
            'timestamp' => Carbon::now()->toISOString()
        ];
    }

    private function getDiskUsage()
    {
        $bytes = disk_free_space('.');
        $total = disk_total_space('.');
        
        return [
            'free' => $bytes / 1024 / 1024 / 1024, // GB
            'total' => $total / 1024 / 1024 / 1024, // GB
            'used' => ($total - $bytes) / 1024 / 1024 / 1024, // GB
            'percentage' => round((($total - $bytes) / $total) * 100, 2)
        ];
    }

    private function generateJsonReport($metrics)
    {
        return [
            'report_type' => 'performance',
            'application' => 'ATİS Backend',
            'timestamp' => $metrics['timestamp'],
            'metrics' => $metrics,
            'summary' => [
                'database_healthy' => $metrics['database']['status'] === 'healthy',
                'cache_healthy' => $metrics['cache']['status'] === 'healthy',
                'memory_usage_mb' => $metrics['memory']['current_usage'],
                'average_query_time' => $metrics['queries']['average_time'],
                'total_queries' => $metrics['queries']['query_count']
            ],
            'recommendations' => $this->generateRecommendations($metrics)
        ];
    }

    private function generateMarkdownReport($metrics)
    {
        $markdown = "# ATİS Backend Performance Report\n\n";
        $markdown .= "**Generated:** " . $metrics['timestamp'] . "\n\n";
        
        $markdown .= "## Summary\n\n";
        $markdown .= "| Metric | Value | Status |\n";
        $markdown .= "|--------|-------|--------|\n";
        $markdown .= "| Database | " . number_format($metrics['database']['simple_query_time'], 2) . "ms | " . 
                    ($metrics['database']['status'] === 'healthy' ? '✅' : '❌') . " |\n";
        $markdown .= "| Cache | " . number_format($metrics['cache']['read_time'], 2) . "ms | " . 
                    ($metrics['cache']['status'] === 'healthy' ? '✅' : '❌') . " |\n";
        $markdown .= "| Memory Usage | " . number_format($metrics['memory']['current_usage'], 2) . "MB | ✅ |\n";
        $markdown .= "| Average Query Time | " . number_format($metrics['queries']['average_time'], 2) . "ms | ✅ |\n";
        
        $markdown .= "\n## Database Performance\n\n";
        $markdown .= "- **Connection Time:** " . number_format($metrics['database']['connection_time'], 2) . "ms\n";
        $markdown .= "- **Simple Query Time:** " . number_format($metrics['database']['simple_query_time'], 2) . "ms\n";
        $markdown .= "- **Complex Query Time:** " . number_format($metrics['database']['complex_query_time'], 2) . "ms\n";
        $markdown .= "- **User Count:** " . number_format($metrics['database']['user_count']) . "\n";
        
        $markdown .= "\n## Cache Performance\n\n";
        $markdown .= "- **Write Time:** " . number_format($metrics['cache']['write_time'], 2) . "ms\n";
        $markdown .= "- **Read Time:** " . number_format($metrics['cache']['read_time'], 2) . "ms\n";
        $markdown .= "- **Delete Time:** " . number_format($metrics['cache']['delete_time'], 2) . "ms\n";
        $markdown .= "- **Driver:** " . $metrics['cache']['driver'] . "\n";
        
        $markdown .= "\n## Memory Usage\n\n";
        $markdown .= "- **Current Usage:** " . number_format($metrics['memory']['current_usage'], 2) . "MB\n";
        $markdown .= "- **Peak Usage:** " . number_format($metrics['memory']['peak_usage'], 2) . "MB\n";
        $markdown .= "- **Memory Limit:** " . $metrics['memory']['limit'] . "\n";
        
        $markdown .= "\n## Query Performance\n\n";
        $markdown .= "- **Total Time:** " . number_format($metrics['queries']['total_time'], 2) . "ms\n";
        $markdown .= "- **Query Count:** " . $metrics['queries']['query_count'] . "\n";
        $markdown .= "- **Average Time:** " . number_format($metrics['queries']['average_time'], 2) . "ms\n";
        
        $markdown .= "\n## System Information\n\n";
        $markdown .= "- **PHP Version:** " . $metrics['system']['php_version'] . "\n";
        $markdown .= "- **Laravel Version:** " . $metrics['system']['laravel_version'] . "\n";
        $markdown .= "- **Disk Usage:** " . number_format($metrics['system']['disk_usage']['percentage'], 2) . "%\n";
        
        $recommendations = $this->generateRecommendations($metrics);
        if (!empty($recommendations)) {
            $markdown .= "\n## Recommendations\n\n";
            foreach ($recommendations as $rec) {
                $priority = $rec['priority'] === 'high' ? '🔴' : ($rec['priority'] === 'medium' ? '🟡' : '🟢');
                $markdown .= $priority . " **" . $rec['category'] . ":** " . $rec['message'] . "\n\n";
            }
        }
        
        return $markdown;
    }

    private function generateRecommendations($metrics)
    {
        $recommendations = [];
        
        // Database performance recommendations
        if ($metrics['database']['simple_query_time'] > 100) {
            $recommendations[] = [
                'priority' => 'high',
                'category' => 'Database',
                'message' => 'Simple queries are taking too long. Consider optimizing database indexes.'
            ];
        }
        
        if ($metrics['database']['complex_query_time'] > 500) {
            $recommendations[] = [
                'priority' => 'medium',
                'category' => 'Database',
                'message' => 'Complex queries are slow. Consider query optimization and proper indexing.'
            ];
        }
        
        // Cache performance recommendations
        if ($metrics['cache']['read_time'] > 10) {
            $recommendations[] = [
                'priority' => 'medium',
                'category' => 'Cache',
                'message' => 'Cache read performance is suboptimal. Consider using Redis or Memcached.'
            ];
        }
        
        // Memory usage recommendations
        if ($metrics['memory']['current_usage'] > 100) {
            $recommendations[] = [
                'priority' => 'medium',
                'category' => 'Memory',
                'message' => 'Memory usage is high. Consider optimizing memory-intensive operations.'
            ];
        }
        
        // Query performance recommendations
        if ($metrics['queries']['average_time'] > 50) {
            $recommendations[] = [
                'priority' => 'high',
                'category' => 'Queries',
                'message' => 'Average query time is high. Review slow queries and optimize them.'
            ];
        }
        
        return $recommendations;
    }
}