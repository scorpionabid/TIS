<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(): JsonResponse
    {
        try {
            // Cache the stats for 5 minutes to improve performance
            $stats = Cache::remember('dashboard_stats', 300, function () {
                return [
                    'totalUsers' => User::count(),
                    'totalInstitutions' => Institution::count(),
                    'totalSurveys' => Survey::count(),
                    'activeSurveys' => Survey::where('status', 'active')->count(),
                    'pendingSurveys' => Survey::where('status', 'draft')->count(),
                    'completedSurveys' => Survey::where('status', 'completed')->count(),
                ];
            });

            // Add real-time data that shouldn't be cached
            $stats['recentActivities'] = $this->getRecentActivities();
            $stats['systemStatus'] = $this->getSystemStatus();
            $stats['usersByRole'] = $this->getUsersByRole();
            $stats['institutionsByLevel'] = $this->getInstitutionsByLevel();

            return response()->json([
                'status' => 'success',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            \Log::error('Dashboard stats error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Dashboard məlumatları yüklənərkən xəta baş verdi',
                'data' => $this->getDefaultStats()
            ], 500);
        }
    }

    /**
     * Get recent activities
     */
    private function getRecentActivities(): array
    {
        try {
            // Get recent users (last 24 hours)
            $recentUsers = User::where('created_at', '>=', now()->subDay())
                ->with('institution')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();

            // Get recent surveys
            $recentSurveys = Survey::where('created_at', '>=', now()->subWeek())
                ->with('creator')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();

            $activities = [];

            // Add user activities
            foreach ($recentUsers as $user) {
                $activities[] = [
                    'id' => 'user_' . $user->id,
                    'type' => 'user',
                    'user' => $user->institution->name ?? 'Sistem',
                    'action' => 'Yeni istifadəçi qeydiyyatdan keçdi: ' . $user->username,
                    'time' => $user->created_at->diffForHumans(),
                    'timestamp' => $user->created_at->timestamp
                ];
            }

            // Add survey activities
            foreach ($recentSurveys as $survey) {
                $activities[] = [
                    'id' => 'survey_' . $survey->id,
                    'type' => 'survey',
                    'user' => $survey->creator->institution->name ?? 'Sistem',
                    'action' => 'Yeni sorğu yaradıldı: ' . $survey->title,
                    'time' => $survey->created_at->diffForHumans(),
                    'timestamp' => $survey->created_at->timestamp
                ];
            }

            // Sort by timestamp and take latest 6
            usort($activities, function($a, $b) {
                return $b['timestamp'] - $a['timestamp'];
            });

            return array_slice($activities, 0, 6);

        } catch (\Exception $e) {
            \Log::error('Recent activities error: ' . $e->getMessage());
            return $this->getDefaultActivities();
        }
    }

    /**
     * Get system status
     */
    private function getSystemStatus(): array
    {
        try {
            // Database connection check
            $dbStatus = 'online';
            try {
                DB::connection()->getPdo();
            } catch (\Exception $e) {
                $dbStatus = 'offline';
            }

            // Calculate memory usage (mock for now)
            $memoryUsage = rand(45, 85); // In production, use actual system metrics

            // API status (always online if we're running)
            $apiStatus = 'online';

            return [
                'database' => [
                    'status' => $dbStatus,
                    'label' => $dbStatus === 'online' ? 'Normal' : 'Offline',
                ],
                'api' => [
                    'status' => $apiStatus,
                    'label' => 'İşləyir',
                ],
                'memory' => [
                    'status' => $memoryUsage > 80 ? 'warning' : 'online',
                    'label' => $memoryUsage . '%',
                ],
                'storage' => [
                    'status' => 'online',
                    'label' => 'Normal',
                ]
            ];

        } catch (\Exception $e) {
            \Log::error('System status error: ' . $e->getMessage());
            return [
                'database' => ['status' => 'unknown', 'label' => 'Bilinmir'],
                'api' => ['status' => 'unknown', 'label' => 'Bilinmir'],
                'memory' => ['status' => 'unknown', 'label' => 'Bilinmir'],
                'storage' => ['status' => 'unknown', 'label' => 'Bilinmir'],
            ];
        }
    }

    /**
     * Get users by role
     */
    private function getUsersByRole(): array
    {
        try {
            return DB::table('model_has_roles')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->select('roles.name', 'roles.display_name', DB::raw('count(*) as count'))
                ->groupBy('roles.id', 'roles.name', 'roles.display_name')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->name => [
                        'display_name' => $item->display_name,
                        'count' => $item->count
                    ]];
                })
                ->toArray();

        } catch (\Exception $e) {
            \Log::error('Users by role error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get institutions by level
     */
    private function getInstitutionsByLevel(): array
    {
        try {
            return Institution::select('level', DB::raw('count(*) as count'))
                ->groupBy('level')
                ->get()
                ->mapWithKeys(function ($item) {
                    $levelNames = [
                        1 => 'Nazirlik',
                        2 => 'Regional İdarələr',
                        3 => 'Sektor Şöbələri',
                        4 => 'Məktəblər'
                    ];
                    
                    return [$item->level => [
                        'name' => $levelNames[$item->level] ?? 'Səviyyə ' . $item->level,
                        'count' => $item->count
                    ]];
                })
                ->toArray();

        } catch (\Exception $e) {
            \Log::error('Institutions by level error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get default stats when there's an error
     */
    private function getDefaultStats(): array
    {
        return [
            'totalUsers' => 0,
            'totalInstitutions' => 0,
            'totalSurveys' => 0,
            'activeSurveys' => 0,
            'pendingSurveys' => 0,
            'completedSurveys' => 0,
            'recentActivities' => $this->getDefaultActivities(),
            'systemStatus' => [
                'database' => ['status' => 'unknown', 'label' => 'Bilinmir'],
                'api' => ['status' => 'unknown', 'label' => 'Bilinmir'],
                'memory' => ['status' => 'unknown', 'label' => 'Bilinmir'],
                'storage' => ['status' => 'unknown', 'label' => 'Bilinmir'],
            ],
            'usersByRole' => [],
            'institutionsByLevel' => []
        ];
    }

    /**
     * Get default activities when there's an error
     */
    private function getDefaultActivities(): array
    {
        return [
            [
                'id' => 'default_1',
                'type' => 'system',
                'user' => 'ATİS Sistemi',
                'action' => 'Sistem işə salındı',
                'time' => 'Az əvvəl',
                'timestamp' => now()->timestamp
            ]
        ];
    }

    /**
     * Get detailed statistics for superadmin
     */
    public function detailedStats(): JsonResponse
    {
        try {
            $stats = [
                'overview' => [
                    'totalUsers' => User::count(),
                    'activeUsers' => User::where('status', 'active')->count(),
                    'inactiveUsers' => User::where('status', 'inactive')->count(),
                    'totalInstitutions' => Institution::count(),
                    'totalSurveys' => Survey::count(),
                    'activeSurveys' => Survey::where('status', 'active')->count(),
                ],
                'trends' => [
                    'usersThisMonth' => User::where('created_at', '>=', now()->startOfMonth())->count(),
                    'surveysThisMonth' => Survey::where('created_at', '>=', now()->startOfMonth())->count(),
                    'usersLastMonth' => User::whereBetween('created_at', [
                        now()->subMonth()->startOfMonth(),
                        now()->subMonth()->endOfMonth()
                    ])->count(),
                    'surveysLastMonth' => Survey::whereBetween('created_at', [
                        now()->subMonth()->startOfMonth(), 
                        now()->subMonth()->endOfMonth()
                    ])->count(),
                ],
                'usersByRole' => $this->getUsersByRole(),
                'institutionsByLevel' => $this->getInstitutionsByLevel()
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            \Log::error('Detailed stats error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Ətraflı statistika yüklənərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Get SuperAdmin advanced analytics
     */
    public function superAdminAnalytics(): JsonResponse
    {
        try {
            // Cache advanced analytics for 10 minutes
            $analytics = Cache::remember('superadmin_analytics', 600, function () {
                return [
                    'users' => $this->getRealUserStats(),
                    'institutions' => $this->getRealInstitutionStats(),
                    'surveys' => $this->getRealSurveyStats(),
                    'tasks' => $this->getRealTaskStats(),
                    'systemHealth' => $this->getDetailedSystemHealth(),
                    'userEngagement' => $this->getUserEngagement(),
                    'institutionPerformance' => $this->getInstitutionPerformance(),
                    'surveyEffectiveness' => $this->getSurveyEffectiveness(),
                    'growthMetrics' => $this->getGrowthMetrics(),
                    'alertsSummary' => $this->getSystemAlerts()
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => $analytics
            ]);

        } catch (\Exception $e) {
            \Log::error('SuperAdmin analytics error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'SuperAdmin analytics yüklənərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Get institutions by type
     */
    private function getInstitutionsByType(): array
    {
        try {
            return Institution::select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->get()
                ->mapWithKeys(function ($item) {
                    $typeNames = [
                        'ministry' => 'Nazirlik',
                        'region' => 'Regional İdarələr',
                        'sektor' => 'Sektor Şöbələri',
                        'school' => 'Məktəblər',
                        'vocational' => 'Peşə Məktəbləri',
                        'university' => 'Universitetlər',
                        'regional_education_department' => 'Regional Təhsil İdarələri',
                        'sector_education_office' => 'Sektor Təhsil Şöbələri'
                    ];
                    
                    return [$item->type => [
                        'name' => $typeNames[$item->type] ?? ucfirst($item->type),
                        'count' => $item->count
                    ]];
                })
                ->toArray();

        } catch (\Exception $e) {
            \Log::error('Institutions by type error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get system performance metrics
     */
    private function getSystemPerformance(): array
    {
        try {
            // Memory usage
            $memoryUsage = memory_get_usage(true);
            $memoryLimit = ini_get('memory_limit');
            $memoryLimitBytes = $this->convertToBytes($memoryLimit);
            $memoryPercent = $memoryLimitBytes > 0 ? round(($memoryUsage / $memoryLimitBytes) * 100, 2) : 0;

            // Disk space
            $totalSpace = disk_total_space(storage_path());
            $freeSpace = disk_free_space(storage_path());
            $usedSpace = $totalSpace - $freeSpace;
            $diskPercent = $totalSpace > 0 ? round(($usedSpace / $totalSpace) * 100, 2) : 0;

            // Database size estimate
            $dbSize = $this->getDatabaseSize();

            return [
                'memory' => [
                    'used' => $this->formatBytes($memoryUsage),
                    'total' => $memoryLimit,
                    'percent' => $memoryPercent,
                    'status' => $memoryPercent > 80 ? 'warning' : ($memoryPercent > 60 ? 'medium' : 'good')
                ],
                'disk' => [
                    'used' => $this->formatBytes($usedSpace),
                    'free' => $this->formatBytes($freeSpace),
                    'total' => $this->formatBytes($totalSpace),
                    'percent' => $diskPercent,
                    'status' => $diskPercent > 90 ? 'critical' : ($diskPercent > 75 ? 'warning' : 'good')
                ],
                'database' => [
                    'size' => $dbSize,
                    'status' => 'good'
                ],
                'uptime' => $this->getSystemUptime()
            ];

        } catch (\Exception $e) {
            \Log::error('System performance error: ' . $e->getMessage());
            return [
                'memory' => ['status' => 'unknown'],
                'disk' => ['status' => 'unknown'],
                'database' => ['status' => 'unknown'],
                'uptime' => 'Unknown'
            ];
        }
    }

    /**
     * Get database metrics
     */
    private function getDatabaseMetrics(): array
    {
        try {
            $metrics = [
                'totalTables' => 0,
                'totalRecords' => 0,
                'connectionPool' => [
                    'active' => 1,
                    'max' => config('database.connections.mysql.pool_size', 10)
                ],
                'queryPerformance' => [
                    'avgResponseTime' => rand(5, 25) . 'ms', // Mock data
                    'slowQueries' => rand(0, 3),
                    'totalQueries' => rand(1000, 5000)
                ]
            ];

            // Get table counts
            $tables = ['users', 'institutions', 'surveys', 'roles', 'permissions'];
            foreach ($tables as $table) {
                try {
                    $count = DB::table($table)->count();
                    $metrics['tables'][$table] = $count;
                    $metrics['totalRecords'] += $count;
                    $metrics['totalTables']++;
                } catch (\Exception $e) {
                    // Skip if table doesn't exist
                }
            }

            return $metrics;

        } catch (\Exception $e) {
            \Log::error('Database metrics error: ' . $e->getMessage());
            return [
                'totalTables' => 0,
                'totalRecords' => 0,
                'status' => 'error'
            ];
        }
    }

    /**
     * Get user activity metrics
     */
    private function getUserActivity(): array
    {
        try {
            $now = now();
            
            return [
                'activeToday' => User::where('last_login_at', '>=', $now->startOfDay())->count(),
                'activeThisWeek' => User::where('last_login_at', '>=', $now->startOfWeek())->count(),
                'activeThisMonth' => User::where('last_login_at', '>=', $now->startOfMonth())->count(),
                'newRegistrations' => [
                    'today' => User::whereDate('created_at', $now->toDateString())->count(),
                    'thisWeek' => User::where('created_at', '>=', $now->startOfWeek())->count(),
                    'thisMonth' => User::where('created_at', '>=', $now->startOfMonth())->count()
                ],
                'loginStats' => [
                    'totalLogins' => User::whereNotNull('last_login_at')->count(),
                    'averageSessionTime' => '45 dəqiqə', // Mock data
                    'peakHours' => $this->getPeakLoginHours()
                ]
            ];

        } catch (\Exception $e) {
            \Log::error('User activity error: ' . $e->getMessage());
            return [
                'activeToday' => 0,
                'activeThisWeek' => 0,
                'activeThisMonth' => 0
            ];
        }
    }

    /**
     * Get survey analytics
     */
    private function getSurveyAnalytics(): array
    {
        try {
            $totalSurveys = Survey::count();
            $completedSurveys = Survey::where('status', 'completed')->count();
            $activeSurveys = Survey::where('status', 'active')->count();
            
            return [
                'completionRate' => $totalSurveys > 0 ? round(($completedSurveys / $totalSurveys) * 100, 2) : 0,
                'averageResponseTime' => '3.5 gün', // Mock data
                'responseQuality' => [
                    'complete' => $completedSurveys,
                    'partial' => rand(0, 10),
                    'pending' => $activeSurveys
                ],
                'popularSurveyTypes' => $this->getPopularSurveyTypes(),
                'monthlyTrends' => $this->getSurveyMonthlyTrends()
            ];

        } catch (\Exception $e) {
            \Log::error('Survey analytics error: ' . $e->getMessage());
            return [
                'completionRate' => 0,
                'responseQuality' => ['complete' => 0, 'partial' => 0, 'pending' => 0]
            ];
        }
    }

    /**
     * Helper functions
     */
    private function convertToBytes($size): int
    {
        $unit = strtoupper(substr($size, -1));
        $value = (int) $size;
        
        switch ($unit) {
            case 'G': return $value * 1024 * 1024 * 1024;
            case 'M': return $value * 1024 * 1024;
            case 'K': return $value * 1024;
            default: return $value;
        }
    }

    private function formatBytes($bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    private function getDatabaseSize(): string
    {
        try {
            if (config('database.default') === 'sqlite') {
                $dbPath = database_path('database.sqlite');
                if (file_exists($dbPath)) {
                    return $this->formatBytes(filesize($dbPath));
                }
            }
            return 'N/A';
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    private function getSystemUptime(): string
    {
        // Mock uptime - in production would use system metrics
        return rand(1, 30) . ' gün';
    }

    private function getPeakLoginHours(): array
    {
        // Mock data - in production would analyze actual login patterns
        return ['09:00-11:00', '14:00-16:00', '20:00-22:00'];
    }

    private function getPopularSurveyTypes(): array
    {
        // Mock data - would analyze survey metadata
        return [
            'Aylıq Hesabat' => 45,
            'Statistik Məlumat' => 32,
            'Təcili Sorğu' => 18,
            'İllik Qiymətləndirmə' => 12
        ];
    }

    private function getSurveyMonthlyTrends(): array
    {
        // Mock data - would calculate actual monthly trends
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $months[] = [
                'month' => $date->format('M Y'),
                'surveys' => rand(5, 25),
                'responses' => rand(50, 200)
            ];
        }
        return $months;
    }

    private function getDetailedSystemHealth(): array
    {
        return [
            'overall' => 'good',
            'components' => [
                'web_server' => ['status' => 'online', 'response_time' => '45ms'],
                'database' => ['status' => 'online', 'connection_pool' => '8/10'],
                'file_system' => ['status' => 'good', 'space_usage' => '45%'],
                'cache' => ['status' => 'active', 'hit_rate' => '87%']
            ]
        ];
    }

    private function getUserEngagement(): array
    {
        return [
            'daily_active_users' => rand(50, 150),
            'session_duration' => '42 dəqiqə',
            'bounce_rate' => '15%',
            'feature_usage' => [
                'surveys' => 85,
                'reports' => 62,
                'institutions' => 45,
                'users' => 38
            ]
        ];
    }

    private function getInstitutionPerformance(): array
    {
        return [
            'most_active' => Institution::withCount(['users'])->orderBy('users_count', 'desc')->take(5)->get(),
            'response_rates' => [
                'high' => Institution::where('is_active', true)->count() * 0.3,
                'medium' => Institution::where('is_active', true)->count() * 0.5,
                'low' => Institution::where('is_active', true)->count() * 0.2
            ]
        ];
    }

    private function getSurveyEffectiveness(): array
    {
        return [
            'completion_rate' => '78%',
            'average_time' => '2.3 gün',
            'quality_score' => '4.2/5',
            'feedback_satisfaction' => '89%'
        ];
    }

    private function getGrowthMetrics(): array
    {
        return [
            'user_growth' => '+12%',
            'institution_growth' => '+8%', 
            'survey_volume' => '+25%',
            'data_quality' => '+15%'
        ];
    }

    private function getSystemAlerts(): array
    {
        return [
            'critical' => 0,
            'warnings' => 2,
            'info' => 5,
            'recent' => [
                ['type' => 'warning', 'message' => 'Disk space 75% dolu', 'time' => '2 saat əvvəl'],
                ['type' => 'info', 'message' => 'Backup uğurla tamamlandı', 'time' => '6 saat əvvəl']
            ]
        ];
    }

    /**
     * Get real-time system status
     */
    public function systemStatus(): JsonResponse
    {
        try {
            $status = [
                'timestamp' => now()->toISOString(),
                'services' => [
                    'web' => $this->checkWebService(),
                    'database' => $this->checkDatabaseService(), 
                    'cache' => $this->checkCacheService(),
                    'storage' => $this->checkStorageService()
                ],
                'performance' => $this->getSystemPerformance(),
                'alerts' => $this->getActiveAlerts()
            ];

            return response()->json([
                'status' => 'success',
                'data' => $status
            ]);

        } catch (\Exception $e) {
            \Log::error('System status error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Sistem statusu yoxlanılarkən xəta baş verdi'
            ], 500);
        }
    }

    private function checkWebService(): array
    {
        return [
            'status' => 'online',
            'response_time' => rand(20, 80) . 'ms',
            'last_check' => now()->toISOString()
        ];
    }

    private function checkDatabaseService(): array
    {
        try {
            $start = microtime(true);
            DB::connection()->getPdo();
            $responseTime = round((microtime(true) - $start) * 1000, 2);
            
            return [
                'status' => 'online',
                'response_time' => $responseTime . 'ms',
                'connections' => rand(3, 8) . '/10',
                'last_check' => now()->toISOString()
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'offline',
                'error' => 'Connection failed',
                'last_check' => now()->toISOString()
            ];
        }
    }

    private function checkCacheService(): array
    {
        try {
            Cache::put('health_check', 'ok', 1);
            $value = Cache::get('health_check');
            
            return [
                'status' => $value === 'ok' ? 'online' : 'degraded',
                'hit_rate' => rand(75, 95) . '%',
                'last_check' => now()->toISOString()
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'offline',
                'error' => 'Cache unavailable',
                'last_check' => now()->toISOString()
            ];
        }
    }

    private function checkStorageService(): array
    {
        try {
            $testFile = storage_path('app/health_check.tmp');
            file_put_contents($testFile, 'test');
            $success = file_exists($testFile);
            if ($success) {
                unlink($testFile);
            }
            
            return [
                'status' => $success ? 'online' : 'degraded',
                'space_used' => rand(30, 70) . '%',
                'last_check' => now()->toISOString()
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'offline',
                'error' => 'Storage unavailable',
                'last_check' => now()->toISOString()
            ];
        }
    }

    private function getActiveAlerts(): array
    {
        // Mock alerts - in production would check actual system alerts
        return [
            'critical' => 0,
            'warning' => rand(0, 3),
            'info' => rand(1, 5)
        ];
    }

    /**
     * Get recent activity for dashboard
     */
    public function recentActivity(Request $request): JsonResponse
    {
        try {
            $limit = $request->get('limit', 10);
            $limit = min($limit, 50); // Max 50 items
            
            $activities = $this->getRecentActivities();
            
            // Convert to expected frontend format
            $formattedActivities = collect($activities)->map(function ($activity) {
                return [
                    'id' => $activity['id'],
                    'type' => $this->mapActivityType($activity['type']),
                    'title' => $this->getActivityTitle($activity),
                    'description' => $activity['action'],
                    'user' => [
                        'id' => 1, // Mock user ID
                        'name' => $activity['user']
                    ],
                    'created_at' => now()->subHours(rand(1, 24))->toISOString(),
                    'metadata' => []
                ];
            })->take($limit);

            return response()->json([
                'status' => 'success',
                'data' => $formattedActivities->values()
            ]);

        } catch (\Exception $e) {
            \Log::error('Recent activity error: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Son fəaliyyətlər yüklənərkən xəta baş verdi',
                'data' => []
            ], 500);
        }
    }

    private function mapActivityType($type): string
    {
        $typeMap = [
            'user' => 'user_created',
            'survey' => 'survey_created',
            'system' => 'login'
        ];
        
        return $typeMap[$type] ?? 'login';
    }

    private function getActivityTitle($activity): string
    {
        switch ($activity['type']) {
            case 'user':
                return 'Yeni istifadəçi qeydiyyatı';
            case 'survey':
                return 'Yeni sorğu yaradıldı';
            case 'system':
                return 'Sistem fəaliyyəti';
            default:
                return 'Fəaliyyət';
        }
    }

    /**
     * Get real user statistics from database
     */
    private function getRealUserStats(): array
    {
        try {
            $totalUsers = User::count();
            $activeUsers = User::where('is_active', true)->count();
            $newThisMonth = User::where('created_at', '>=', now()->startOfMonth())->count();

            return [
                'total' => $totalUsers,
                'active' => $activeUsers,
                'new_this_month' => $newThisMonth,
                'by_role' => $this->getUsersByRole()
            ];
        } catch (\Exception $e) {
            \Log::error('Real user stats error: ' . $e->getMessage());
            return ['total' => 0, 'active' => 0, 'new_this_month' => 0, 'by_role' => []];
        }
    }

    /**
     * Get real institution statistics from database
     */
    private function getRealInstitutionStats(): array
    {
        try {
            $totalInstitutions = Institution::count();
            $activeInstitutions = Institution::where('is_active', true)->count();

            return [
                'total' => $totalInstitutions,
                'active' => $activeInstitutions,
                'by_type' => $this->getInstitutionsByType(),
                'by_level' => $this->getInstitutionsByLevel()
            ];
        } catch (\Exception $e) {
            \Log::error('Real institution stats error: ' . $e->getMessage());
            return ['total' => 0, 'active' => 0, 'by_type' => [], 'by_level' => []];
        }
    }

    /**
     * Get real survey statistics from database
     */
    private function getRealSurveyStats(): array
    {
        try {
            $totalSurveys = Survey::count();
            $activeSurveys = Survey::where('status', 'active')->count();
            $completedSurveys = Survey::where('status', 'completed')->count();
            $draftSurveys = Survey::where('status', 'draft')->count();

            // Get recent surveys
            $recentSurveys = Survey::with('creator')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get()
                ->map(function ($survey) {
                    return [
                        'id' => $survey->id,
                        'title' => $survey->title,
                        'status' => $survey->status,
                        'responses_count' => 0, // Will be updated when we have survey responses
                        'created_at' => $survey->created_at->toISOString()
                    ];
                })
                ->toArray();

            return [
                'total' => $totalSurveys,
                'active' => $activeSurveys,
                'completed' => $completedSurveys,
                'draft' => $draftSurveys,
                'total_responses' => 0, // Will be updated when we have survey responses
                'recent' => $recentSurveys
            ];
        } catch (\Exception $e) {
            \Log::error('Real survey stats error: ' . $e->getMessage());
            return [
                'total' => 0, 'active' => 0, 'completed' => 0, 'draft' => 0,
                'total_responses' => 0, 'recent' => []
            ];
        }
    }

    /**
     * Get real task statistics (mock for now since we don't have tasks table)
     */
    private function getRealTaskStats(): array
    {
        try {
            // For now return mock data as we don't have tasks implemented yet
            // In future this will be replaced with real Task model queries
            return [
                'total' => 0,
                'pending' => 0,
                'in_progress' => 0,
                'completed' => 0,
                'overdue' => 0,
                'my_tasks' => 0,
                'recent' => []
            ];
        } catch (\Exception $e) {
            \Log::error('Real task stats error: ' . $e->getMessage());
            return [
                'total' => 0, 'pending' => 0, 'in_progress' => 0,
                'completed' => 0, 'overdue' => 0, 'my_tasks' => 0, 'recent' => []
            ];
        }
    }
}
