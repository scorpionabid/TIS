<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\Document;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;

class DashboardStatsController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Create cache key based on user role and institution
            $cacheKey = 'dashboard_stats_' . ($user ? $user->id . '_' . $user->getRoleNames()->implode('_') : 'guest');
            
            // Cache the stats for 5 minutes to improve performance
            $stats = Cache::remember($cacheKey, 300, function () use ($user) {
                $baseStats = [
                    'totalUsers' => User::count(),
                    'totalInstitutions' => Institution::count(),
                    'totalSurveys' => Survey::count(),
                    'activeSurveys' => Survey::where('status', 'active')->count(),
                    'completedSurveys' => Survey::where('status', 'completed')->count(),
                    'pendingSurveys' => Survey::where('status', 'pending')->count(),
                    'totalTasks' => Task::count(),
                    'activeTasks' => Task::where('status', 'active')->count(),
                    'completedTasks' => Task::where('status', 'completed')->count(),
                    'totalDocuments' => Document::count(),
                ];

                // Role-based statistics
                if ($user) {
                    $roleStats = $this->getRoleBasedStats($user);
                    $baseStats = array_merge($baseStats, $roleStats);
                }

                // Institution hierarchy stats
                $hierarchyStats = $this->getInstitutionHierarchyStats($user);
                $baseStats = array_merge($baseStats, $hierarchyStats);

                // Recent activity counts
                $recentStats = $this->getRecentActivityStats();
                $baseStats = array_merge($baseStats, $recentStats);

                return $baseStats;
            });

            return response()->json([
                'success' => true,
                'data' => $stats,
                'cached_at' => Cache::get($cacheKey . '_timestamp', now()),
                'user_role' => $user?->getRoleNames()->first(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dashboard statistikaları alınarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed statistics
     */
    public function detailedStats(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasAnyRole(['SuperAdmin', 'RegionAdmin', 'SektorAdmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara giriş icazəniz yoxdur'
                ], 403);
            }

            $cacheKey = 'detailed_stats_' . $user->id;
            
            $detailedStats = Cache::remember($cacheKey, 600, function () use ($user) {
                return [
                    'user_distribution' => $this->getUserDistribution($user),
                    'institution_metrics' => $this->getInstitutionMetrics($user),
                    'survey_analytics' => $this->getSurveyAnalytics($user),
                    'task_performance' => $this->getTaskPerformance($user),
                    'document_usage' => $this->getDocumentUsage($user),
                    'monthly_trends' => $this->getMonthlyTrends($user),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $detailedStats,
                'generated_at' => now(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ətraflı statistikalar alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get role-based statistics for user
     */
    private function getRoleBasedStats($user): array
    {
        if (!$user) {
            return [];
        }

        $stats = [];

        if ($user->hasRole('SuperAdmin')) {
            $stats['superadmin'] = [
                'total_regions' => Institution::where('level', 2)->count(),
                'total_sectors' => Institution::where('level', 3)->count(),
                'total_schools' => Institution::where('level', 4)->count(),
                'active_admins' => User::whereHas('roles', function($q) {
                    $q->whereIn('name', ['RegionAdmin', 'SektorAdmin', 'SchoolAdmin']);
                })->where('is_active', true)->count(),
            ];
        } elseif ($user->hasRole('RegionAdmin') && $user->institution) {
            $regionId = $user->institution_id;
            $stats['region'] = [
                'sectors_count' => Institution::where('parent_id', $regionId)->count(),
                'schools_count' => Institution::whereHas('parent', function($q) use ($regionId) {
                    $q->where('parent_id', $regionId);
                })->count(),
                'total_students' => User::whereHas('institution', function($q) use ($regionId) {
                    $q->where('parent_id', $regionId)->orWhereHas('parent', function($pq) use ($regionId) {
                        $pq->where('parent_id', $regionId);
                    });
                })->whereHas('roles', function($q) {
                    $q->where('name', 'şagird');
                })->count(),
            ];
        } elseif ($user->hasRole('SchoolAdmin') && $user->institution) {
            $schoolId = $user->institution_id;
            $stats['school'] = [
                'students_count' => User::where('institution_id', $schoolId)
                    ->whereHas('roles', function($q) {
                        $q->where('name', 'şagird');
                    })->count(),
                'teachers_count' => User::where('institution_id', $schoolId)
                    ->whereHas('roles', function($q) {
                        $q->where('name', 'müəllim');
                    })->count(),
                'pending_surveys' => Survey::where('status', 'active')
                    ->whereJsonContains('target_institutions', $schoolId)
                    ->whereDoesntHave('responses', function($q) use ($schoolId) {
                        $q->where('institution_id', $schoolId);
                    })->count(),
            ];
        }

        return $stats;
    }

    /**
     * Get institution hierarchy statistics
     */
    private function getInstitutionHierarchyStats($user): array
    {
        $query = Institution::query();
        
        // Apply user-based filtering
        if ($user && !$user->hasRole('SuperAdmin')) {
            if ($user->hasRole('RegionAdmin')) {
                $regionId = $user->institution_id;
                $query->where(function($q) use ($regionId) {
                    $q->where('id', $regionId)
                      ->orWhere('parent_id', $regionId)
                      ->orWhereHas('parent', function($pq) use ($regionId) {
                          $pq->where('parent_id', $regionId);
                      });
                });
            } elseif ($user->hasRole('SektorAdmin')) {
                $sectorId = $user->institution_id;
                $query->where(function($q) use ($sectorId) {
                    $q->where('id', $sectorId)->orWhere('parent_id', $sectorId);
                });
            }
        }

        return [
            'hierarchy_stats' => [
                'level_1' => $query->where('level', 1)->count(), // Ministry
                'level_2' => $query->where('level', 2)->count(), // Regions
                'level_3' => $query->where('level', 3)->count(), // Sectors
                'level_4' => $query->where('level', 4)->count(), // Schools
                'active_institutions' => $query->where('is_active', true)->count(),
                'inactive_institutions' => $query->where('is_active', false)->count(),
            ]
        ];
    }

    /**
     * Get recent activity statistics
     */
    private function getRecentActivityStats(): array
    {
        $thirtyDaysAgo = now()->subDays(30);
        $sevenDaysAgo = now()->subDays(7);
        $today = now()->startOfDay();

        return [
            'recent_activity' => [
                'new_users_30d' => User::where('created_at', '>=', $thirtyDaysAgo)->count(),
                'new_users_7d' => User::where('created_at', '>=', $sevenDaysAgo)->count(),
                'new_users_today' => User::where('created_at', '>=', $today)->count(),
                'active_surveys_30d' => Survey::where('status', 'active')
                    ->where('created_at', '>=', $thirtyDaysAgo)->count(),
                'completed_tasks_7d' => Task::where('status', 'completed')
                    ->where('updated_at', '>=', $sevenDaysAgo)->count(),
                'documents_uploaded_30d' => Document::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ]
        ];
    }

    /**
     * Get user distribution by roles
     */
    private function getUserDistribution($user): array
    {
        $query = User::query();
        
        // Apply user-based filtering
        if (!$user->hasRole('SuperAdmin')) {
            if ($user->hasRole('RegionAdmin')) {
                $regionId = $user->institution_id;
                $query->whereHas('institution', function($q) use ($regionId) {
                    $q->where('parent_id', $regionId)
                      ->orWhereHas('parent', function($pq) use ($regionId) {
                          $pq->where('parent_id', $regionId);
                      });
                });
            }
        }

        $roleDistribution = $query->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->select('roles.name', DB::raw('count(*) as count'))
            ->groupBy('roles.name')
            ->pluck('count', 'name')
            ->toArray();

        return $roleDistribution;
    }

    /**
     * Get institution metrics
     */
    private function getInstitutionMetrics($user): array
    {
        $query = Institution::query();
        
        if (!$user->hasRole('SuperAdmin')) {
            if ($user->hasRole('RegionAdmin')) {
                $regionId = $user->institution_id;
                $query->where(function($q) use ($regionId) {
                    $q->where('id', $regionId)
                      ->orWhere('parent_id', $regionId)
                      ->orWhereHas('parent', function($pq) use ($regionId) {
                          $pq->where('parent_id', $regionId);
                      });
                });
            }
        }

        $typeDistribution = $query->join('institution_types', 'institutions.institution_type_id', '=', 'institution_types.id')
            ->select('institution_types.name', DB::raw('count(*) as count'))
            ->groupBy('institution_types.name')
            ->pluck('count', 'name')
            ->toArray();

        return [
            'by_type' => $typeDistribution,
            'active_vs_inactive' => [
                'active' => $query->where('is_active', true)->count(),
                'inactive' => $query->where('is_active', false)->count(),
            ]
        ];
    }

    /**
     * Get survey analytics
     */
    private function getSurveyAnalytics($user): array
    {
        // Implementation for survey analytics
        return [
            'response_rates' => [],
            'completion_times' => [],
            'category_distribution' => [],
        ];
    }

    /**
     * Get task performance metrics
     */
    private function getTaskPerformance($user): array
    {
        // Implementation for task performance
        return [
            'completion_rates' => [],
            'average_completion_time' => 0,
            'overdue_tasks' => 0,
        ];
    }

    /**
     * Get document usage statistics
     */
    private function getDocumentUsage($user): array
    {
        // Implementation for document usage
        return [
            'total_size' => 0,
            'download_counts' => [],
            'popular_documents' => [],
        ];
    }

    /**
     * Get monthly trends
     */
    private function getMonthlyTrends($user): array
    {
        // Implementation for monthly trends
        return [
            'user_growth' => [],
            'survey_completion' => [],
            'task_completion' => [],
        ];
    }
}