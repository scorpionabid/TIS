<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\Schedule;
use App\Models\ScheduleSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class RegionalScheduleController extends Controller
{
    /**
     * Get regional dashboard overview data
     */
    public function getDashboardOverview(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $cacheKey = "regional_dashboard_" . $user->id;

            $dashboardData = Cache::remember($cacheKey, 1800, function () use ($user) {
                // Get institutions based on user's hierarchy level
                $institutions = $this->getUserAccessibleInstitutions($user);
                
                // Regional statistics
                $regionalStats = $this->calculateRegionalStatistics($institutions);
                
                // Institution performance overview
                $institutionPerformance = $this->getInstitutionPerformanceOverview($institutions);
                
                // Recent activities
                $recentActivities = $this->getRecentScheduleActivities($institutions);
                
                // Critical issues
                $criticalIssues = $this->getCriticalIssues($institutions);

                return [
                    'regional_stats' => $regionalStats,
                    'institutions' => $institutionPerformance,
                    'recent_activities' => $recentActivities,
                    'critical_issues' => $criticalIssues,
                    'performance_trends' => $this->getPerformanceTrends($institutions)
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $dashboardData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dashboard məlumatları yüklənə bilmədi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed institution schedules list
     */
    public function getInstitutionSchedules(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $institutionId = $request->query('institution_id');
            $status = $request->query('status', 'all');
            $search = $request->query('search');
            $page = $request->query('page', 1);
            $limit = min($request->query('limit', 20), 100);

            $query = Schedule::query()
                ->with(['institution', 'createdBy', 'sessions'])
                ->whereHas('institution', function ($q) use ($user) {
                    $this->applyInstitutionHierarchyFilter($q, $user);
                });

            // Apply filters
            if ($institutionId) {
                $query->where('institution_id', $institutionId);
            }

            if ($status !== 'all') {
                $query->where('status', $status);
            }

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhereHas('institution', function ($subQ) use ($search) {
                          $subQ->where('name', 'like', "%{$search}%");
                      });
                });
            }

            $schedules = $query->orderBy('created_at', 'desc')
                ->paginate($limit, ['*'], 'page', $page);

            // Enrich schedules with additional data
            $enrichedSchedules = $schedules->getCollection()->map(function ($schedule) {
                return $this->enrichScheduleData($schedule);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'schedules' => $enrichedSchedules,
                    'pagination' => [
                        'current_page' => $schedules->currentPage(),
                        'last_page' => $schedules->lastPage(),
                        'total' => $schedules->total(),
                        'per_page' => $schedules->perPage()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cədvəllər yüklənə bilmədi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get institution performance analytics
     */
    public function getInstitutionAnalytics(Request $request, int $institutionId): JsonResponse
    {
        try {
            $user = $request->user();
            
            // Check access permission
            if (!$this->canAccessInstitution($user, $institutionId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu müəssisəyə giriş icazəniz yoxdur'
                ], 403);
            }

            $institution = Institution::findOrFail($institutionId);
            
            $analytics = [
                'institution_info' => $this->getInstitutionInfo($institution),
                'schedule_performance' => $this->getSchedulePerformanceAnalytics($institutionId),
                'teacher_analytics' => $this->getTeacherAnalytics($institutionId),
                'resource_utilization' => $this->getResourceUtilizationAnalytics($institutionId),
                'trend_analysis' => $this->getTrendAnalysis($institutionId),
                'benchmarking' => $this->getBenchmarkingData($institution),
                'improvement_suggestions' => $this->getImprovementSuggestions($institutionId)
            ];

            return response()->json([
                'success' => true,
                'data' => $analytics
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analitika məlumatları yüklənə bilmədi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Compare multiple institutions
     */
    public function compareInstitutions(Request $request): JsonResponse
    {
        $request->validate([
            'institution_ids' => 'required|array|min:2|max:5',
            'institution_ids.*' => 'integer|exists:institutions,id',
            'comparison_metrics' => 'array'
        ]);

        try {
            $user = $request->user();
            $institutionIds = $request->input('institution_ids');
            $metrics = $request->input('comparison_metrics', [
                'performance',
                'teacher_satisfaction',
                'resource_utilization',
                'schedule_efficiency'
            ]);

            // Check access to all institutions
            foreach ($institutionIds as $institutionId) {
                if (!$this->canAccessInstitution($user, $institutionId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bəzi müəssisələrə giriş icazəniz yoxdur'
                    ], 403);
                }
            }

            $comparisonData = [
                'institutions' => $this->getComparisonInstitutionData($institutionIds),
                'metrics_comparison' => $this->getMetricsComparison($institutionIds, $metrics),
                'ranking' => $this->getRankingData($institutionIds, $metrics),
                'insights' => $this->generateComparisonInsights($institutionIds, $metrics),
                'recommendations' => $this->generateComparisonRecommendations($institutionIds, $metrics)
            ];

            return response()->json([
                'success' => true,
                'data' => $comparisonData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müqayisə məlumatları hazırlana bilmədi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get regional performance trends
     */
    public function getRegionalTrends(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $period = $request->query('period', '6months');
            $metric = $request->query('metric', 'performance');

            $trendsData = Cache::remember(
                "regional_trends_{$user->id}_{$period}_{$metric}",
                3600,
                function () use ($user, $period, $metric) {
                    $institutions = $this->getUserAccessibleInstitutions($user);
                    
                    return [
                        'time_series' => $this->getTimeSeriesData($institutions, $period, $metric),
                        'institution_trends' => $this->getInstitutionTrends($institutions, $period, $metric),
                        'regional_averages' => $this->getRegionalAverages($institutions, $period, $metric),
                        'forecast' => $this->generateForecast($institutions, $period, $metric),
                        'seasonal_patterns' => $this->analyzeSeasonalPatterns($institutions, $period, $metric)
                    ];
                }
            );

            return response()->json([
                'success' => true,
                'data' => $trendsData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Trend məlumatları yüklənə bilmədi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export regional report
     */
    public function exportRegionalReport(Request $request): JsonResponse
    {
        $request->validate([
            'format' => 'required|in:pdf,excel,csv',
            'report_type' => 'required|in:summary,detailed,comparison',
            'institution_ids' => 'sometimes|array',
            'date_range' => 'sometimes|array'
        ]);

        try {
            $user = $request->user();
            $format = $request->input('format');
            $reportType = $request->input('report_type');
            $institutionIds = $request->input('institution_ids');
            
            // Generate report data
            $reportData = $this->generateReportData($user, $reportType, $institutionIds);
            
            // Export to requested format
            $exportUrl = $this->exportToFormat($reportData, $format, $reportType);

            return response()->json([
                'success' => true,
                'data' => [
                    'download_url' => $exportUrl,
                    'file_name' => $this->generateFileName($reportType, $format),
                    'file_size' => $this->getFileSize($exportUrl)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Hesabat ixrac edilə bilmədi: ' . $e->getMessage()
            ], 500);
        }
    }

    // Protected helper methods

    protected function getUserAccessibleInstitutions(User $user)
    {
        $query = Institution::query();

        if ($user->hasRole('superadmin')) {
            // SuperAdmin sees all institutions
            return $query->get();
        } elseif ($user->hasRole(['regionadmin', 'regionoperator'])) {
            // Regional admins see institutions in their region
            return $query->where('parent_institution_id', $user->institution_id)
                ->orWhere('id', $user->institution_id)
                ->get();
        } elseif ($user->hasRole(['sektoradmin'])) {
            // Sector admins see institutions in their sector
            return $query->where('parent_institution_id', $user->institution_id)
                ->get();
        } else {
            // School admins see only their institution
            return $query->where('id', $user->institution_id)->get();
        }
    }

    protected function calculateRegionalStatistics($institutions)
    {
        $totalInstitutions = $institutions->count();
        
        $scheduleStats = Schedule::whereIn('institution_id', $institutions->pluck('id'))
            ->select([
                DB::raw('COUNT(*) as total_schedules'),
                DB::raw('COUNT(CASE WHEN status = "active" THEN 1 END) as active_schedules'),
                DB::raw('AVG(performance_rating) as average_performance'),
                DB::raw('COUNT(CASE WHEN performance_rating < 3 THEN 1 END) as critical_issues')
            ])
            ->first();

        $teacherSatisfaction = ScheduleSession::whereHas('schedule', function ($q) use ($institutions) {
                $q->whereIn('institution_id', $institutions->pluck('id'));
            })
            ->whereNotNull('teacher_satisfaction_rating')
            ->avg('teacher_satisfaction_rating');

        return [
            'total_institutions' => $totalInstitutions,
            'total_schedules' => $scheduleStats->total_schedules ?? 0,
            'active_schedules' => $scheduleStats->active_schedules ?? 0,
            'average_performance' => round($scheduleStats->average_performance ?? 0, 1),
            'critical_issues' => $scheduleStats->critical_issues ?? 0,
            'teacher_satisfaction_avg' => round($teacherSatisfaction ?? 0, 1),
            'improvement_rate' => $this->calculateImprovementRate($institutions),
            'schedule_completion_rate' => $this->calculateCompletionRate($institutions)
        ];
    }

    protected function getInstitutionPerformanceOverview($institutions)
    {
        return $institutions->map(function ($institution) {
            $scheduleStats = Schedule::where('institution_id', $institution->id)
                ->select([
                    DB::raw('COUNT(*) as total_schedules'),
                    DB::raw('COUNT(CASE WHEN status = "active" THEN 1 END) as active_schedules'),
                    DB::raw('AVG(performance_rating) as avg_performance'),
                    DB::raw('MAX(updated_at) as last_update')
                ])
                ->first();

            $performanceScore = round($scheduleStats->avg_performance * 20, 0); // Convert to 100-point scale

            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->type,
                'region' => $institution->parent_institution->name ?? 'N/A',
                'total_schedules' => $scheduleStats->total_schedules ?? 0,
                'active_schedules' => $scheduleStats->active_schedules ?? 0,
                'last_update' => $scheduleStats->last_update,
                'performance_score' => $performanceScore,
                'status' => $this->determineInstitutionStatus($performanceScore)
            ];
        });
    }

    protected function determineInstitutionStatus($performanceScore): string
    {
        if ($performanceScore >= 90) return 'excellent';
        if ($performanceScore >= 80) return 'good';
        if ($performanceScore >= 60) return 'needs_attention';
        return 'critical';
    }

    protected function canAccessInstitution(User $user, int $institutionId): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
        return $accessibleInstitutions->contains('id', $institutionId);
    }

    protected function enrichScheduleData($schedule)
    {
        $sessionStats = $schedule->sessions()
            ->select([
                DB::raw('COUNT(*) as total_sessions'),
                DB::raw('COUNT(DISTINCT teacher_id) as unique_teachers'),
                DB::raw('AVG(CASE WHEN conflicts_resolved THEN 1 ELSE 0 END) as resolution_rate')
            ])
            ->first();

        return [
            'id' => $schedule->id,
            'name' => $schedule->name,
            'institution' => [
                'id' => $schedule->institution->id,
                'name' => $schedule->institution->name,
                'type' => $schedule->institution->type
            ],
            'status' => $schedule->status,
            'created_at' => $schedule->created_at,
            'performance_rating' => $schedule->performance_rating ?? 0,
            'sessions_count' => $sessionStats->total_sessions ?? 0,
            'unique_teachers' => $sessionStats->unique_teachers ?? 0,
            'conflicts_count' => $schedule->conflicts_count ?? 0,
            'teacher_satisfaction' => $this->getScheduleTeacherSatisfaction($schedule->id),
            'utilization_rate' => $this->calculateUtilizationRate($schedule->id)
        ];
    }

    protected function getScheduleTeacherSatisfaction($scheduleId): float
    {
        return ScheduleSession::where('schedule_id', $scheduleId)
            ->whereNotNull('teacher_satisfaction_rating')
            ->avg('teacher_satisfaction_rating') ?? 0;
    }

    protected function calculateUtilizationRate($scheduleId): float
    {
        // Calculate schedule utilization rate based on time slots and sessions
        $schedule = Schedule::find($scheduleId);
        if (!$schedule) return 0;

        $totalSlots = $this->getTotalAvailableSlots($schedule);
        $usedSlots = $schedule->sessions()->count();

        return $totalSlots > 0 ? round(($usedSlots / $totalSlots) * 100, 1) : 0;
    }

    protected function getTotalAvailableSlots($schedule): int
    {
        // Calculate based on working days, daily periods, and duration
        $settings = $schedule->generation_settings ?? [];
        $workingDays = count($settings['working_days'] ?? [5]);
        $dailyPeriods = $settings['daily_periods'] ?? 7;
        
        return $workingDays * $dailyPeriods;
    }
}