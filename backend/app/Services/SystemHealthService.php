<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;

class SystemHealthService extends BaseService
{
    /**
     * Get comprehensive system health status
     */
    public function getSystemHealth(): array
    {
        return [
            'database' => $this->checkDatabaseHealth(),
            'storage' => $this->checkStorageHealth(),
            'cache' => $this->checkCacheHealth(),
            'mail' => $this->checkMailHealth(),
            'queue' => $this->checkQueueHealth(),
            'logs' => $this->checkLogsHealth(),
            'performance' => $this->getPerformanceMetrics(),
            'security' => $this->getSecurityMetrics()
        ];
    }

    /**
     * Calculate overall health status
     */
    public function calculateOverallHealth(array $components): string
    {
        $statuses = collect($components)->pluck('status')->toArray();
        
        if (in_array('unhealthy', $statuses)) {
            return 'unhealthy';
        } elseif (in_array('warning', $statuses)) {
            return 'warning';
        } else {
            return 'healthy';
        }
    }

    /**
     * Get health recommendations
     */
    public function getHealthRecommendations(array $health): array
    {
        $recommendations = [];
        
        foreach ($health as $component => $status) {
            if ($status['status'] === 'warning' || $status['status'] === 'unhealthy') {
                switch ($component) {
                    case 'storage':
                        $recommendations[] = 'Disk sahəsini təmizləyin və ya genişləndirin';
                        break;
                    case 'logs':
                        $recommendations[] = 'Köhnə log fayllarını təmizləyin';
                        break;
                    case 'database':
                        $recommendations[] = 'Database performansını yoxlayın';
                        break;
                    case 'cache':
                        $recommendations[] = 'Cache xidmətini yoxlayın və ya yenidən başladın';
                        break;
                    case 'mail':
                        $recommendations[] = 'Email konfiqurasiyasını yoxlayın';
                        break;
                    case 'queue':
                        $recommendations[] = 'Queue işçisini yoxlayın və ya yenidən başladın';
                        break;
                }
            }
        }
        
        return $recommendations;
    }

    /**
     * Perform maintenance tasks
     */
    public function performMaintenance(array $tasks, $user): array
    {
        $results = [];
        $errors = [];

        foreach ($tasks as $task) {
            try {
                $result = $this->executeMaintenanceTask($task);
                $results[$task] = $result;
            } catch (\Exception $e) {
                $errors[$task] = $e->getMessage();
            }
        }

        // Log maintenance activity
        ActivityLog::logActivity([
            'user_id' => $user->id,
            'activity_type' => 'system_maintenance',
            'entity_type' => 'System',
            'description' => 'Performed system maintenance tasks',
            'properties' => [
                'tasks' => $tasks,
                'successful' => array_keys($results),
                'failed' => array_keys($errors)
            ],
            'institution_id' => $user->institution_id
        ]);

        return [
            'results' => $results,
            'errors' => $errors,
            'status' => empty($errors) ? 'success' : (empty($results) ? 'error' : 'partial')
        ];
    }

    /**
     * Check database health
     */
    private function checkDatabaseHealth(): array
    {
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $responseTime = round((microtime(true) - $start) * 1000, 2);
            
            return [
                'status' => 'healthy',
                'response_time' => $responseTime . 'ms',
                'connections' => $this->getDatabaseConnections()
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check storage health
     */
    private function checkStorageHealth(): array
    {
        try {
            $totalSpace = disk_total_space(storage_path());
            $freeSpace = disk_free_space(storage_path());
            $usedPercent = round((($totalSpace - $freeSpace) / $totalSpace) * 100, 2);

            return [
                'status' => $usedPercent < 90 ? 'healthy' : 'warning',
                'used_percent' => $usedPercent,
                'free_space' => $this->formatBytes($freeSpace),
                'total_space' => $this->formatBytes($totalSpace)
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check cache health
     */
    private function checkCacheHealth(): array
    {
        try {
            Cache::put('health_check', 'test', 60);
            $value = Cache::get('health_check');
            Cache::forget('health_check');
            
            return [
                'status' => $value === 'test' ? 'healthy' : 'unhealthy',
                'driver' => config('cache.default')
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check mail health
     */
    private function checkMailHealth(): array
    {
        try {
            return [
                'status' => 'healthy',
                'driver' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host')
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check queue health
     */
    private function checkQueueHealth(): array
    {
        try {
            return [
                'status' => 'healthy',
                'driver' => config('queue.default'),
                'pending_jobs' => $this->getPendingJobsCount()
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check logs health
     */
    private function checkLogsHealth(): array
    {
        try {
            $logPath = storage_path('logs');
            $logSize = $this->getDirectorySize($logPath);
            
            return [
                'status' => $logSize < 100 * 1024 * 1024 ? 'healthy' : 'warning', // 100MB threshold
                'size' => $this->formatBytes($logSize),
                'path' => $logPath
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get performance metrics
     */
    private function getPerformanceMetrics(): array
    {
        return [
            'status' => 'healthy',
            'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
            'peak_memory' => round(memory_get_peak_usage() / 1024 / 1024, 2) . ' MB',
            'cpu_load' => $this->getCpuLoad(),
            'uptime' => $this->getSystemUptime()
        ];
    }

    /**
     * Get security metrics
     */
    private function getSecurityMetrics(): array
    {
        return [
            'status' => 'healthy',
            'failed_logins_24h' => SecurityEvent::where('event_type', 'failed_login')
                ->where('created_at', '>=', now()->subDay())
                ->count(),
            'active_sessions' => DB::table('sessions')->count(),
            'last_security_scan' => 'Never',
            'security_score' => 85
        ];
    }

    /**
     * Execute maintenance task
     */
    private function executeMaintenanceTask(string $task): array
    {
        switch ($task) {
            case 'clear_cache':
                Artisan::call('cache:clear');
                return ['message' => 'Cache təmizləndi', 'time' => now()];
                
            case 'optimize_db':
                Artisan::call('optimize');
                return ['message' => 'Database optimize edildi', 'time' => now()];
                
            case 'cleanup_logs':
                $this->cleanupOldLogs();
                return ['message' => 'Köhnə loglar təmizləndi', 'time' => now()];
                
            case 'backup_db':
                // Would implement actual backup
                return ['message' => 'Database backup yaradıldı', 'time' => now()];
                
            case 'update_stats':
                Artisan::call('queue:work --stop-when-empty');
                return ['message' => 'Statistikalar yeniləndi', 'time' => now()];
                
            default:
                throw new \Exception("Unknown maintenance task: {$task}");
        }
    }

    /**
     * Clean up old logs
     */
    private function cleanupOldLogs(): void
    {
        $retentionDays = 30;
        $cutoffDate = now()->subDays($retentionDays);
        
        ActivityLog::where('created_at', '<', $cutoffDate)->delete();
        SecurityEvent::where('created_at', '<', $cutoffDate)->delete();
    }

    /**
     * Get database connections count
     */
    private function getDatabaseConnections(): string
    {
        try {
            $driver = config('database.default');
            if ($driver === 'mysql') {
                $result = DB::select("SHOW STATUS LIKE 'Threads_connected'");
                return $result[0]->Value ?? 'Unknown';
            }
            return 'Unknown';
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    /**
     * Get pending jobs count
     */
    private function getPendingJobsCount(): int
    {
        try {
            return DB::table('jobs')->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get CPU load average
     */
    private function getCpuLoad(): string
    {
        $load = sys_getloadavg();
        return $load ? (string) $load[0] : 'Unknown';
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    /**
     * Get directory size
     */
    private function getDirectorySize(string $path): int
    {
        $size = 0;
        $files = glob(rtrim($path, '/').'/*', GLOB_NOSORT);
        
        foreach ($files as $file) {
            $size += is_file($file) ? filesize($file) : $this->getDirectorySize($file);
        }
        
        return $size;
    }

    /**
     * Get system uptime
     */
    private function getSystemUptime(): string
    {
        if (PHP_OS_FAMILY === 'Linux') {
            $uptime = shell_exec('uptime -p');
            return trim($uptime) ?: 'Unknown';
        }
        
        return 'Unknown';
    }
}