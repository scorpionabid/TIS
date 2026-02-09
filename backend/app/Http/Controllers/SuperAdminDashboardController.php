<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SuperAdminDashboardController extends BaseController
{
    /**
     * Get SuperAdmin analytics data
     */
    public function getSuperAdminAnalytics(): JsonResponse
    {
        try {
            $analytics = Cache::remember('superadmin_analytics', 300, function () {
                $recentThreshold = Carbon::now()->subDays(7);

                $userStats = [
                    'total' => User::count(),
                    'active' => User::where('is_active', true)->count(),
                    'recent_registrations' => User::where('created_at', '>=', $recentThreshold)->count(),
                ];

                $roleStats = DB::table('users')
                    ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                    ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->where('model_has_roles.model_type', User::class)
                    ->selectRaw('roles.name as role_name, COUNT(*) as count')
                    ->groupBy('roles.name')
                    ->get()
                    ->pluck('count', 'role_name')
                    ->toArray();

                return [
                    'users' => [
                        'total' => $userStats['total'],
                        'active' => $userStats['active'],
                        'by_role' => $roleStats,
                        'recent_registrations' => $userStats['recent_registrations'],
                    ],
                    'institutions' => [
                        'total' => Institution::count(),
                        'by_type' => Institution::select('type', DB::raw('count(*) as count'))
                            ->groupBy('type')
                            ->get()
                            ->pluck('count', 'type')
                            ->toArray(),
                        'by_region' => Institution::select('region_code', DB::raw('count(*) as count'))
                            ->whereNotNull('region_code')
                            ->groupBy('region_code')
                            ->get()
                            ->pluck('count', 'region_code')
                            ->toArray(),
                    ],
                    'activity' => [
                        'surveys' => [
                            'total' => Survey::count(),
                            'active' => Survey::where('status', 'active')->count(),
                            'completed' => Survey::where('status', 'completed')->count(),
                        ],
                        'tasks' => [
                            'total' => Task::count(),
                            'pending' => Task::where('status', 'pending')->count(),
                            'in_progress' => Task::where('status', 'in_progress')->count(),
                            'completed' => Task::where('status', 'completed')->count(),
                        ],
                        'documents' => [
                            'total' => Document::count(),
                            'recent_uploads' => Document::where('created_at', '>=', now()->subDays(7))->count(),
                        ],
                    ],
                    'system' => [
                        'database_size' => $this->getDatabaseSize(),
                        'total_storage' => $this->getTotalStorageUsed(),
                        'avg_response_time' => $this->getAverageResponseTime(),
                        'uptime' => $this->getSystemUptime(),
                    ],
                    'performance' => [
                        'daily_active_users' => User::where('updated_at', '>=', now()->subDay())->count(),
                        'peak_concurrent_users' => $this->getPeakConcurrentUsers(),
                        'avg_session_duration' => $this->getAverageSessionDuration(),
                        'page_load_times' => $this->getPageLoadTimes(),
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analytics məlumatları yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get recent activity data
     */
    public function getRecentActivity(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 10);

            $activities = Cache::remember("recent_activity_{$limit}", 120, function () use ($limit) {
                $activities = collect();

                // Recent user registrations
                $recentUsers = User::with('roles')
                    ->latest()
                    ->limit($limit)
                    ->get()
                    ->map(function ($user) {
                        return [
                            'type' => 'user_registration',
                            'title' => 'Yeni istifadəçi qeydiyyatı',
                            'description' => "{$user->name} sistemi qeydiyyatdan keçdi",
                            'user' => $user->name,
                            'role' => $user->roles->first()?->name ?? 'N/A',
                            'timestamp' => $user->created_at,
                            'icon' => 'user-plus',
                            'color' => 'green',
                        ];
                    });

                // Recent surveys
                $recentSurveys = Survey::with('creator')
                    ->latest()
                    ->limit($limit)
                    ->get()
                    ->map(function ($survey) {
                        return [
                            'type' => 'survey_created',
                            'title' => 'Yeni sorğu yaradıldı',
                            'description' => "'{$survey->title}' sorğusu yaradıldı",
                            'user' => $survey->creator?->name ?? 'Sistem',
                            'role' => $survey->creator?->roles->first()?->name ?? 'N/A',
                            'timestamp' => $survey->created_at,
                            'icon' => 'clipboard-list',
                            'color' => 'blue',
                        ];
                    });

                // Recent tasks
                $recentTasks = Task::with('creator')
                    ->latest()
                    ->limit($limit)
                    ->get()
                    ->map(function ($task) {
                        return [
                            'type' => 'task_created',
                            'title' => 'Yeni tapşırıq yaradıldı',
                            'description' => "'{$task->title}' tapşırığı yaradıldı",
                            'user' => $task->creator?->name ?? 'Sistem',
                            'role' => $task->creator?->roles->first()?->name ?? 'N/A',
                            'timestamp' => $task->created_at,
                            'icon' => 'clipboard-check',
                            'color' => 'orange',
                        ];
                    });

                // Recent documents
                $recentDocuments = Document::with('uploader')
                    ->latest()
                    ->limit($limit)
                    ->get()
                    ->map(function ($document) {
                        return [
                            'type' => 'document_uploaded',
                            'title' => 'Yeni sənəd yükləndi',
                            'description' => "'{$document->title}' sənədi yükləndi",
                            'user' => $document->uploader?->name ?? 'Sistem',
                            'role' => $document->uploader?->roles->first()?->name ?? 'N/A',
                            'timestamp' => $document->created_at,
                            'icon' => 'file-text',
                            'color' => 'purple',
                        ];
                    });

                // Merge and sort all activities
                return $activities
                    ->merge($recentUsers)
                    ->merge($recentSurveys)
                    ->merge($recentTasks)
                    ->merge($recentDocuments)
                    ->sortByDesc('timestamp')
                    ->take($limit)
                    ->values();
            });

            return response()->json([
                'success' => true,
                'data' => $activities,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Son fəaliyyətlər yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get system health data
     */
    public function getSystemHealth(): JsonResponse
    {
        try {
            $health = [
                'database' => $this->checkDatabaseHealth(),
                'cache' => $this->checkCacheHealth(),
                'storage' => $this->checkStorageHealth(),
                'memory' => $this->getMemoryUsage(),
                'cpu' => $this->getCpuUsage(),
                'disk' => $this->getDiskUsage(),
            ];

            return response()->json([
                'success' => true,
                'data' => $health,
                'overall_status' => $this->calculateOverallHealth($health),
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sistem sağlamlığı yoxlanılarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get user analytics
     */
    public function getUserAnalytics(): JsonResponse
    {
        try {
            $analytics = [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'users_by_role' => DB::table('users')
                    ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                    ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->where('model_has_roles.model_type', User::class)
                    ->selectRaw('roles.name as role_name, COUNT(*) as count')
                    ->groupBy('roles.name')
                    ->get(),
                'recent_registrations' => User::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                    ->where('created_at', '>=', now()->subDays(30))
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get(),
                'login_statistics' => $this->getLoginStatistics(),
            ];

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi analitikası yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get institution statistics
     */
    public function getInstitutionStats(): JsonResponse
    {
        try {
            $stats = [
                'total_institutions' => Institution::count(),
                'institutions_by_type' => Institution::select('type', DB::raw('count(*) as count'))
                    ->groupBy('type')
                    ->get(),
                'institutions_by_region' => Institution::select('region_code', DB::raw('COUNT(*) as count'))
                    ->whereNotNull('region_code')
                    ->groupBy('region_code')
                    ->get(),
                'recent_additions' => Institution::where('created_at', '>=', now()->subDays(30))->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə statistikaları yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get performance metrics
     */
    public function getPerformanceMetrics(): JsonResponse
    {
        try {
            $metrics = [
                'response_times' => $this->getResponseTimeMetrics(),
                'database_performance' => $this->getDatabasePerformanceMetrics(),
                'memory_usage' => $this->getMemoryUsageMetrics(),
                'cache_performance' => $this->getCachePerformanceMetrics(),
                'user_engagement' => $this->getUserEngagementMetrics(),
            ];

            return response()->json([
                'success' => true,
                'data' => $metrics,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Performans metrikaları yüklənərkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // Helper methods
    private function getDatabaseSize(): string
    {
        try {
            $connection = DB::connection();
            $driver = $connection->getDriverName();

            if ($driver === 'sqlite') {
                $path = database_path('database.sqlite');
                if (file_exists($path)) {
                    return $this->formatBytes(filesize($path));
                }
            } elseif ($driver === 'pgsql') {
                $sizeResult = $connection->selectOne('SELECT pg_database_size(current_database()) as size');

                if ($sizeResult && isset($sizeResult->size)) {
                    return $this->formatBytes((int) $sizeResult->size);
                }
            }

            return 'N/A';
        } catch (\Exception $e) {
            return 'N/A';
        }
    }

    private function getTotalStorageUsed(): string
    {
        try {
            $storageSize = 0;
            $storagePath = storage_path();
            if (is_dir($storagePath)) {
                $storageSize = $this->getDirectorySize($storagePath);
            }

            return $this->formatBytes($storageSize);
        } catch (\Exception $e) {
            return 'N/A';
        }
    }

    private function getDirectorySize($directory): int
    {
        $size = 0;
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory)) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }

    private function formatBytes($size, $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }

        return round($size, $precision) . ' ' . $units[$i];
    }

    private function getAverageResponseTime(): string
    {
        // Mock data - integrate with monitoring system
        return '150ms';
    }

    private function getSystemUptime(): string
    {
        // Mock data - integrate with monitoring system
        return '99.9%';
    }

    private function getPeakConcurrentUsers(): int
    {
        // Mock data - integrate with session tracking
        return 45;
    }

    private function getAverageSessionDuration(): string
    {
        // Mock data - integrate with session tracking
        return '24min';
    }

    private function getPageLoadTimes(): array
    {
        // Mock data - integrate with monitoring system
        return [
            'dashboard' => '1.2s',
            'users' => '0.8s',
            'institutions' => '0.9s',
        ];
    }

    private function checkDatabaseHealth(): array
    {
        try {
            DB::select('SELECT 1');

            return ['status' => 'healthy', 'response_time' => '5ms'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function checkCacheHealth(): array
    {
        try {
            Cache::put('health_check', 'ok', 10);
            $result = Cache::get('health_check');

            return ['status' => $result === 'ok' ? 'healthy' : 'unhealthy'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function checkStorageHealth(): array
    {
        try {
            $testFile = storage_path('health_check.txt');
            file_put_contents($testFile, 'test');
            $result = file_get_contents($testFile);
            unlink($testFile);

            return ['status' => $result === 'test' ? 'healthy' : 'unhealthy'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function getMemoryUsage(): array
    {
        return [
            'used' => $this->formatBytes(memory_get_usage(true)),
            'peak' => $this->formatBytes(memory_get_peak_usage(true)),
            'limit' => ini_get('memory_limit'),
        ];
    }

    private function getCpuUsage(): string
    {
        // Mock data - integrate with system monitoring
        return '15%';
    }

    private function getDiskUsage(): array
    {
        $path = storage_path();

        return [
            'free' => $this->formatBytes(disk_free_space($path)),
            'total' => $this->formatBytes(disk_total_space($path)),
            'used_percentage' => round(((disk_total_space($path) - disk_free_space($path)) / disk_total_space($path)) * 100, 1) . '%',
        ];
    }

    private function calculateOverallHealth($health): string
    {
        $healthy = 0;
        $total = 0;

        foreach ($health as $check) {
            if (isset($check['status'])) {
                $total++;
                if ($check['status'] === 'healthy') {
                    $healthy++;
                }
            }
        }

        $percentage = $total > 0 ? ($healthy / $total) * 100 : 0;

        if ($percentage >= 90) {
            return 'excellent';
        }
        if ($percentage >= 75) {
            return 'good';
        }
        if ($percentage >= 50) {
            return 'fair';
        }

        return 'poor';
    }

    private function getLoginStatistics(): array
    {
        // Mock data - integrate with actual login tracking
        return [
            'total_logins_today' => 120,
            'unique_logins_today' => 85,
            'failed_login_attempts' => 12,
            'avg_session_duration' => '24min',
        ];
    }

    private function getResponseTimeMetrics(): array
    {
        // Mock data - integrate with monitoring system
        return [
            'avg_response_time' => '150ms',
            'p95_response_time' => '250ms',
            'p99_response_time' => '400ms',
        ];
    }

    private function getDatabasePerformanceMetrics(): array
    {
        // Mock data - integrate with database monitoring
        return [
            'avg_query_time' => '25ms',
            'slow_queries' => 3,
            'connections' => 15,
        ];
    }

    private function getMemoryUsageMetrics(): array
    {
        return [
            'current' => $this->formatBytes(memory_get_usage(true)),
            'peak' => $this->formatBytes(memory_get_peak_usage(true)),
            'limit' => ini_get('memory_limit'),
        ];
    }

    private function getCachePerformanceMetrics(): array
    {
        // Mock data - integrate with cache monitoring
        return [
            'hit_rate' => '85%',
            'miss_rate' => '15%',
            'avg_lookup_time' => '2ms',
        ];
    }

    private function getUserEngagementMetrics(): array
    {
        // Mock data - integrate with user tracking
        return [
            'daily_active_users' => 45,
            'weekly_active_users' => 180,
            'monthly_active_users' => 650,
            'bounce_rate' => '12%',
        ];
    }
}
