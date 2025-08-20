<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\Document;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Auth;

class DashboardSystemController extends Controller
{
    /**
     * Get system status and health metrics
     */
    public function systemStatus(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check if user has permission to view system status
            if (!$user || !$user->hasAnyRole(['SuperAdmin', 'RegionAdmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sistem statusuna baxmaq üçün icazəniz yoxdur'
                ], 403);
            }

            // Cache system status for 2 minutes for performance
            $cacheKey = 'system_status_' . ($user->hasRole('SuperAdmin') ? 'global' : 'regional_' . $user->institution_id);
            
            $systemStatus = Cache::remember($cacheKey, 120, function () use ($user) {
                return [
                    'database' => $this->getDatabaseStatus(),
                    'storage' => $this->getStorageStatus(),
                    'cache' => $this->getCacheStatus(),
                    'services' => $this->getServicesStatus(),
                    'performance' => $this->getPerformanceStatus(),
                    'security' => $this->getSecurityStatus(),
                    'maintenance' => $this->getMaintenanceStatus(),
                    'alerts' => $this->getSystemAlerts($user),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $systemStatus,
                'timestamp' => now(),
                'cache_duration' => 120,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sistem statusu alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activity logs
     */
    public function recentActivity(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Giriş tələb olunur'
                ], 401);
            }

            $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'type' => 'nullable|string|in:login,survey,task,document,user,institution',
                'level' => 'nullable|string|in:info,warning,error,success',
                'since' => 'nullable|date',
            ]);

            $limit = $request->get('limit', 20);
            $type = $request->get('type');
            $level = $request->get('level');
            $since = $request->get('since', now()->subDays(7));

            $query = ActivityLog::with(['user:id,name,email', 'institution:id,name'])
                ->where('created_at', '>=', $since)
                ->orderBy('created_at', 'desc');

            // Apply user-based filtering
            if (!$user->hasRole('SuperAdmin')) {
                $query = $this->applyUserActivityFilter($query, $user);
            }

            // Apply filters
            if ($type) {
                $query->where('type', $type);
            }

            if ($level) {
                $query->where('level', $level);
            }

            $activities = $query->limit($limit)->get();

            $formattedActivities = $activities->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'type' => $activity->type,
                    'level' => $activity->level,
                    'message' => $activity->message,
                    'description' => $activity->description,
                    'user' => $activity->user ? [
                        'id' => $activity->user->id,
                        'name' => $activity->user->name,
                        'email' => $activity->user->email,
                    ] : null,
                    'institution' => $activity->institution ? [
                        'id' => $activity->institution->id,
                        'name' => $activity->institution->name,
                    ] : null,
                    'metadata' => $activity->metadata ?? [],
                    'ip_address' => $activity->ip_address,
                    'user_agent' => $activity->user_agent,
                    'created_at' => $activity->created_at,
                ];
            });

            // Get activity summary
            $summary = $this->getActivitySummary($user, $since);

            return response()->json([
                'success' => true,
                'data' => [
                    'activities' => $formattedActivities,
                    'summary' => $summary,
                    'total' => $activities->count(),
                    'filters' => [
                        'type' => $type,
                        'level' => $level,
                        'since' => $since,
                        'limit' => $limit,
                    ]
                ],
                'message' => 'Son aktivitələr alındı'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Aktivitələr alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system monitoring metrics
     */
    public function monitoringMetrics(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('SuperAdmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara giriş icazəniz yoxdur'
                ], 403);
            }

            $metrics = Cache::remember('monitoring_metrics', 60, function () {
                return [
                    'system_load' => $this->getSystemLoad(),
                    'memory_usage' => $this->getMemoryUsage(),
                    'disk_usage' => $this->getDiskUsage(),
                    'response_times' => $this->getResponseTimes(),
                    'error_rates' => $this->getErrorRates(),
                    'active_connections' => $this->getActiveConnections(),
                    'queue_status' => $this->getQueueStatus(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $metrics,
                'timestamp' => now(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Monitoring metrics alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get database status
     */
    private function getDatabaseStatus(): array
    {
        try {
            $startTime = microtime(true);
            DB::connection()->getPdo();
            $connectionTime = (microtime(true) - $startTime) * 1000;

            $tableCount = DB::select("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()")[0]->count ?? 0;
            
            return [
                'status' => 'healthy',
                'connection_time' => round($connectionTime, 2) . 'ms',
                'tables_count' => $tableCount,
                'last_backup' => $this->getLastBackupTime(),
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get storage status
     */
    private function getStorageStatus(): array
    {
        try {
            $storagePath = storage_path();
            $totalSpace = disk_total_space($storagePath);
            $freeSpace = disk_free_space($storagePath);
            $usedSpace = $totalSpace - $freeSpace;
            $usagePercentage = ($usedSpace / $totalSpace) * 100;

            return [
                'status' => $usagePercentage > 90 ? 'warning' : 'healthy',
                'total_space' => $this->formatBytes($totalSpace),
                'used_space' => $this->formatBytes($usedSpace),
                'free_space' => $this->formatBytes($freeSpace),
                'usage_percentage' => round($usagePercentage, 1),
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get cache status
     */
    private function getCacheStatus(): array
    {
        try {
            $startTime = microtime(true);
            Cache::put('health_check', 'ok', 10);
            $cacheValue = Cache::get('health_check');
            $responseTime = (microtime(true) - $startTime) * 1000;

            return [
                'status' => $cacheValue === 'ok' ? 'healthy' : 'error',
                'response_time' => round($responseTime, 2) . 'ms',
                'driver' => config('cache.default'),
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get services status
     */
    private function getServicesStatus(): array
    {
        return [
            'web_server' => ['status' => 'healthy', 'uptime' => '99.9%'],
            'queue_worker' => $this->getQueueWorkerStatus(),
            'scheduler' => $this->getSchedulerStatus(),
            'mail_service' => $this->getMailServiceStatus(),
        ];
    }

    /**
     * Get performance status
     */
    private function getPerformanceStatus(): array
    {
        return [
            'average_response_time' => '120ms',
            'requests_per_minute' => 150,
            'memory_usage' => $this->getCurrentMemoryUsage(),
            'cpu_usage' => $this->getCurrentCpuUsage(),
        ];
    }

    /**
     * Get security status
     */
    private function getSecurityStatus(): array
    {
        return [
            'failed_login_attempts' => $this->getRecentFailedLogins(),
            'suspicious_activity' => $this->getSuspiciousActivity(),
            'ssl_certificate' => $this->getSSLStatus(),
            'firewall_status' => 'active',
        ];
    }

    /**
     * Get maintenance status
     */
    private function getMaintenanceStatus(): array
    {
        return [
            'scheduled_maintenance' => $this->getScheduledMaintenance(),
            'last_update' => $this->getLastSystemUpdate(),
            'backup_status' => $this->getBackupStatus(),
            'log_cleanup' => $this->getLogCleanupStatus(),
        ];
    }

    /**
     * Get system alerts based on user role
     */
    private function getSystemAlerts($user): array
    {
        $alerts = [];

        if ($user->hasRole('SuperAdmin')) {
            $alerts = $this->getGlobalSystemAlerts();
        } elseif ($user->hasRole('RegionAdmin')) {
            $alerts = $this->getRegionalSystemAlerts($user->institution_id);
        }

        return $alerts;
    }

    /**
     * Apply user-based filtering to activity query
     */
    private function applyUserActivityFilter($query, $user)
    {
        if ($user->hasRole('RegionAdmin')) {
            $regionId = $user->institution_id;
            return $query->where(function($q) use ($regionId) {
                $q->where('institution_id', $regionId)
                  ->orWhereHas('institution', function($iq) use ($regionId) {
                      $iq->where('parent_id', $regionId)
                        ->orWhereHas('parent', function($pq) use ($regionId) {
                            $pq->where('parent_id', $regionId);
                        });
                  });
            });
        } elseif ($user->hasRole('SektorAdmin')) {
            return $query->where(function($q) use ($user) {
                $q->where('institution_id', $user->institution_id)
                  ->orWhereHas('institution', function($iq) use ($user) {
                      $iq->where('parent_id', $user->institution_id);
                  });
            });
        } elseif ($user->hasRole('SchoolAdmin')) {
            return $query->where('institution_id', $user->institution_id);
        }

        return $query;
    }

    /**
     * Get activity summary for the period
     */
    private function getActivitySummary($user, $since): array
    {
        $query = ActivityLog::where('created_at', '>=', $since);
        
        if (!$user->hasRole('SuperAdmin')) {
            $query = $this->applyUserActivityFilter($query, $user);
        }

        return [
            'total_activities' => $query->count(),
            'by_type' => $query->groupBy('type')->pluck(DB::raw('count(*) as count'), 'type')->toArray(),
            'by_level' => $query->groupBy('level')->pluck(DB::raw('count(*) as count'), 'level')->toArray(),
            'unique_users' => $query->distinct('user_id')->count('user_id'),
        ];
    }

    // Helper methods
    private function formatBytes($size, $precision = 2): string
    {
        $base = log($size, 1024);
        $suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
        return round(pow(1024, $base - floor($base)), $precision) .' '. $suffixes[floor($base)];
    }

    // Placeholder methods for complex system metrics
    private function getLastBackupTime(): string { return now()->subHours(6)->toDateTimeString(); }
    private function getQueueWorkerStatus(): array { return ['status' => 'healthy']; }
    private function getSchedulerStatus(): array { return ['status' => 'healthy']; }
    private function getMailServiceStatus(): array { return ['status' => 'healthy']; }
    private function getCurrentMemoryUsage(): string { return '45%'; }
    private function getCurrentCpuUsage(): string { return '23%'; }
    private function getRecentFailedLogins(): int { return 3; }
    private function getSuspiciousActivity(): int { return 0; }
    private function getSSLStatus(): array { return ['status' => 'valid', 'expires' => '2025-12-31']; }
    private function getScheduledMaintenance(): array { return ['next' => null]; }
    private function getLastSystemUpdate(): string { return now()->subDays(3)->toDateString(); }
    private function getBackupStatus(): array { return ['status' => 'completed', 'last_run' => now()->subHours(6)]; }
    private function getLogCleanupStatus(): array { return ['status' => 'scheduled']; }
    private function getGlobalSystemAlerts(): array { return []; }
    private function getRegionalSystemAlerts($regionId): array { return []; }
    private function getSystemLoad(): array { return []; }
    private function getMemoryUsage(): array { return []; }
    private function getDiskUsage(): array { return []; }
    private function getResponseTimes(): array { return []; }
    private function getErrorRates(): array { return []; }
    private function getActiveConnections(): int { return 150; }
    private function getQueueStatus(): array { return ['pending' => 0, 'failed' => 0]; }
}