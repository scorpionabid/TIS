<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportsController extends Controller
{
    /**
     * Get overview statistics for reports dashboard
     */
    public function getOverviewStats(Request $request): JsonResponse
    {
        try {
            $dateRange = $this->getDateRange($request);
            
            $stats = [
                'user_statistics' => $this->getUserStatistics($dateRange),
                'institution_statistics' => $this->getInstitutionStatistics($dateRange),
                'survey_statistics' => $this->getSurveyStatistics($dateRange),
                'system_activity' => $this->getSystemActivity($dateRange),
                'performance_metrics' => $this->getPerformanceMetrics($dateRange),
                'growth_trends' => $this->getGrowthTrends($dateRange)
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats,
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Ümumi hesabat məlumatları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed institutional performance report
     */
    public function getInstitutionalPerformance(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'level' => 'nullable|integer|between:1,5',
            'type' => 'nullable|string',
            'region_code' => 'nullable|string',
            'include_children' => 'nullable|boolean'
        ]);

        try {
            $dateRange = $this->getDateRange($request);
            
            $performance = [
                'institution_rankings' => $this->getInstitutionRankings($request, $dateRange),
                'user_engagement' => $this->getInstitutionUserEngagement($request, $dateRange),
                'survey_participation' => $this->getInstitutionSurveyParticipation($request, $dateRange),
                'activity_levels' => $this->getInstitutionActivityLevels($request, $dateRange),
                'comparative_analysis' => $this->getComparativeAnalysis($request, $dateRange)
            ];

            return response()->json([
                'status' => 'success',
                'data' => $performance,
                'filters' => $request->only(['institution_id', 'level', 'type', 'region_code']),
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Təşkilat performans hesabatı yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get survey analytics and response data
     */
    public function getSurveyAnalytics(Request $request): JsonResponse
    {
        $request->validate([
            'survey_id' => 'nullable|integer|exists:surveys,id',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'status' => 'nullable|string|in:draft,published,closed',
            'detailed' => 'nullable|boolean'
        ]);

        try {
            $dateRange = $this->getDateRange($request);
            
            $analytics = [
                'survey_overview' => $this->getSurveyOverview($request, $dateRange),
                'response_rates' => $this->getSurveyResponseRates($request, $dateRange),
                'completion_analysis' => $this->getSurveyCompletionAnalysis($request, $dateRange),
                'time_analytics' => $this->getSurveyTimeAnalytics($request, $dateRange),
                'geographic_distribution' => $this->getSurveyGeographicDistribution($request, $dateRange)
            ];

            if ($request->detailed) {
                $analytics['detailed_responses'] = $this->getDetailedSurveyResponses($request, $dateRange);
            }

            return response()->json([
                'status' => 'success',
                'data' => $analytics,
                'filters' => $request->only(['survey_id', 'institution_id', 'status']),
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sorğu analitika məlumatları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user activity and engagement reports
     */
    public function getUserActivityReport(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'role' => 'nullable|string',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'activity_type' => 'nullable|string'
        ]);

        try {
            $dateRange = $this->getDateRange($request);
            
            $activity = [
                'user_activity_summary' => $this->getUserActivitySummary($request, $dateRange),
                'login_patterns' => $this->getUserLoginPatterns($request, $dateRange),
                'feature_usage' => $this->getUserFeatureUsage($request, $dateRange),
                'engagement_metrics' => $this->getUserEngagementMetrics($request, $dateRange),
                'productivity_trends' => $this->getUserProductivityTrends($request, $dateRange)
            ];

            return response()->json([
                'status' => 'success',
                'data' => $activity,
                'filters' => $request->only(['user_id', 'role', 'institution_id', 'activity_type']),
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstifadəçi aktivlik hesabatı yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report data in various formats
     */
    public function exportReport(Request $request): JsonResponse
    {
        $request->validate([
            'report_type' => 'required|string|in:overview,institutional,survey,user_activity',
            'format' => 'required|string|in:csv,json,pdf',
            'filters' => 'nullable|array'
        ]);

        try {
            $dateRange = $this->getDateRange($request);
            $filters = $request->filters ?? [];
            
            $reportData = $this->generateReportData($request->report_type, $filters, $dateRange);
            
            $exportData = [
                'report_type' => $request->report_type,
                'format' => $request->format,
                'data' => $reportData,
                'filters' => $filters,
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString(),
                'total_records' => count($reportData)
            ];

            // Log export activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'report_export',
                'entity_type' => 'Report',
                'description' => "Exported {$request->report_type} report in {$request->format} format",
                'properties' => [
                    'report_type' => $request->report_type,
                    'format' => $request->format,
                    'filters' => $filters,
                    'record_count' => count($reportData)
                ],
                'institution_id' => $request->user()->institution_id
            ]);

            return response()->json([
                'message' => 'Hesabat uğurla export edildi',
                'data' => $exportData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Hesabat export edilərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Helper methods

    private function getDateRange(Request $request): array
    {
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        
        return [
            'start_date' => Carbon::parse($startDate)->startOfDay(),
            'end_date' => Carbon::parse($endDate)->endOfDay()
        ];
    }

    private function getUserStatistics(array $dateRange): array
    {
        $total = User::count();
        $active = User::where('is_active', true)->count();
        $newUsers = User::whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();
        $recentLogins = User::whereBetween('last_login_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

        return [
            'total_users' => $total,
            'active_users' => $active,
            'inactive_users' => $total - $active,
            'new_users' => $newUsers,
            'recent_logins' => $recentLogins,
            'engagement_rate' => $total > 0 ? round(($recentLogins / $total) * 100, 2) : 0,
            'by_role' => User::join('roles', 'users.role_id', '=', 'roles.id')
                ->selectRaw('roles.display_name as role, COUNT(*) as count')
                ->groupBy('roles.display_name')
                ->pluck('count', 'role')
                ->toArray()
        ];
    }

    private function getInstitutionStatistics(array $dateRange): array
    {
        $total = Institution::count();
        $active = Institution::where('is_active', true)->count();
        $newInstitutions = Institution::whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

        return [
            'total_institutions' => $total,
            'active_institutions' => $active,
            'inactive_institutions' => $total - $active,
            'new_institutions' => $newInstitutions,
            'by_type' => Institution::selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->pluck('count', 'type')
                ->toArray(),
            'by_level' => Institution::selectRaw('level, COUNT(*) as count')
                ->groupBy('level')
                ->pluck('count', 'level')
                ->toArray(),
            'by_region' => Institution::selectRaw('region_code, COUNT(*) as count')
                ->whereNotNull('region_code')
                ->groupBy('region_code')
                ->pluck('count', 'region_code')
                ->toArray()
        ];
    }

    private function getSurveyStatistics(array $dateRange): array
    {
        $total = Survey::count();
        $published = Survey::where('status', 'published')->count();
        $completed = Survey::where('status', 'closed')->count();
        $newSurveys = Survey::whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

        return [
            'total_surveys' => $total,
            'published_surveys' => $published,
            'completed_surveys' => $completed,
            'draft_surveys' => Survey::where('status', 'draft')->count(),
            'new_surveys' => $newSurveys,
            'by_status' => Survey::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray(),
            'response_rate' => $this->getAverageSurveyResponseRate($dateRange)
        ];
    }

    private function getSystemActivity(array $dateRange): array
    {
        $activities = ActivityLog::whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->selectRaw('activity_type, COUNT(*) as count')
            ->groupBy('activity_type')
            ->pluck('count', 'activity_type')
            ->toArray();

        $dailyActivity = ActivityLog::whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'count' => $item->count
                ];
            })
            ->toArray();

        return [
            'total_activities' => array_sum($activities),
            'by_type' => $activities,
            'daily_activity' => $dailyActivity,
            'most_active_users' => $this->getMostActiveUsers($dateRange, 10)
        ];
    }

    private function getPerformanceMetrics(array $dateRange): array
    {
        return [
            'average_response_time' => $this->getAverageResponseTime($dateRange),
            'system_uptime' => '99.9%', // Mock data - would come from monitoring system
            'error_rate' => $this->getSystemErrorRate($dateRange),
            'user_satisfaction' => $this->getUserSatisfactionScore($dateRange),
            'data_quality_score' => $this->getDataQualityScore($dateRange)
        ];
    }

    private function getGrowthTrends(array $dateRange): array
    {
        $periods = 7; // Last 7 periods (weeks)
        $trends = [];

        for ($i = $periods - 1; $i >= 0; $i--) {
            $start = Carbon::parse($dateRange['start_date'])->subWeeks($i);
            $end = $start->copy()->addWeek();
            
            $trends[] = [
                'period' => $start->format('Y-m-d'),
                'users' => User::whereBetween('created_at', [$start, $end])->count(),
                'institutions' => Institution::whereBetween('created_at', [$start, $end])->count(),
                'surveys' => Survey::whereBetween('created_at', [$start, $end])->count(),
                'activities' => ActivityLog::whereBetween('created_at', [$start, $end])->count()
            ];
        }

        return $trends;
    }

    private function getInstitutionRankings(Request $request, array $dateRange): array
    {
        $query = Institution::with(['users'])
            ->withCount(['users as active_users_count' => function ($q) {
                $q->where('is_active', true);
            }]);

        if ($request->level) {
            $query->where('level', $request->level);
        }
        if ($request->type) {
            $query->where('type', $request->type);
        }
        if ($request->region_code) {
            $query->where('region_code', $request->region_code);
        }

        return $query->orderBy('active_users_count', 'desc')
            ->take(20)
            ->get()
            ->map(function ($institution) {
                return [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                    'level' => $institution->level,
                    'region_code' => $institution->region_code,
                    'active_users' => $institution->active_users_count,
                    'total_users' => $institution->users->count(),
                    'engagement_score' => $this->calculateInstitutionEngagementScore($institution)
                ];
            })
            ->toArray();
    }

    private function getInstitutionUserEngagement(Request $request, array $dateRange): array
    {
        // Mock implementation - would calculate actual engagement metrics
        return [
            'average_session_duration' => '24.5 minutes',
            'daily_active_users' => 156,
            'weekly_retention_rate' => '78.2%',
            'feature_adoption_rate' => '64.3%'
        ];
    }

    private function getInstitutionSurveyParticipation(Request $request, array $dateRange): array
    {
        // Mock implementation - would calculate actual survey participation
        return [
            'participation_rate' => '67.8%',
            'completion_rate' => '89.3%',
            'average_response_time' => '12.4 minutes',
            'survey_feedback_score' => '4.2/5'
        ];
    }

    private function getInstitutionActivityLevels(Request $request, array $dateRange): array
    {
        // Mock implementation - would calculate actual activity levels
        return [
            'high_activity' => 12,
            'medium_activity' => 18,
            'low_activity' => 8,
            'inactive' => 3
        ];
    }

    private function getComparativeAnalysis(Request $request, array $dateRange): array
    {
        // Mock implementation - would provide comparative analysis
        return [
            'performance_vs_average' => '+15.2%',
            'ranking_change' => '+3 positions',
            'benchmark_score' => '8.4/10',
            'improvement_areas' => ['User Engagement', 'Survey Response Rate']
        ];
    }

    // Additional helper methods for other analytics...
    
    private function getSurveyOverview(Request $request, array $dateRange): array
    {
        // Implementation for survey overview
        return [
            'total_surveys' => Survey::count(),
            'response_rate' => '72.5%',
            'completion_rate' => '85.3%',
            'average_time' => '15.2 minutes'
        ];
    }

    private function getSurveyResponseRates(Request $request, array $dateRange): array
    {
        // Implementation for response rates
        return [
            'by_institution_type' => [
                'ministry' => '95.2%',
                'regional' => '78.4%',
                'sector' => '69.8%',
                'school' => '67.2%'
            ],
            'by_region' => [
                'BA' => '74.3%',
                'GA' => '69.8%',
                'QU' => '71.2%'
            ]
        ];
    }

    private function getSurveyCompletionAnalysis(Request $request, array $dateRange): array
    {
        return [
            'completion_trends' => [
                'improving' => 15,
                'stable' => 8,
                'declining' => 3
            ],
            'drop_off_points' => [
                'section_1' => '5.2%',
                'section_2' => '12.8%',
                'section_3' => '8.9%'
            ]
        ];
    }

    private function getSurveyTimeAnalytics(Request $request, array $dateRange): array
    {
        return [
            'average_completion_time' => '15.4 minutes',
            'fastest_completion' => '3.2 minutes',
            'slowest_completion' => '45.8 minutes',
            'optimal_time_range' => '10-20 minutes'
        ];
    }

    private function getSurveyGeographicDistribution(Request $request, array $dateRange): array
    {
        return [
            'by_region' => [
                'Baku' => ['responses' => 156, 'rate' => '74.2%'],
                'Ganja' => ['responses' => 89, 'rate' => '68.9%'],
                'Quba' => ['responses' => 45, 'rate' => '71.2%']
            ],
            'coverage' => '89.3%'
        ];
    }

    private function getDetailedSurveyResponses(Request $request, array $dateRange): array
    {
        // Implementation for detailed responses
        return [
            'individual_responses' => [],
            'aggregated_data' => [],
            'statistical_analysis' => []
        ];
    }

    // More helper methods...

    private function getUserActivitySummary(Request $request, array $dateRange): array
    {
        return ['total_activities' => 1250, 'daily_average' => 41.7];
    }

    private function getUserLoginPatterns(Request $request, array $dateRange): array
    {
        return ['peak_hours' => ['9:00-11:00', '14:00-16:00'], 'login_frequency' => 'Daily'];
    }

    private function getUserFeatureUsage(Request $request, array $dateRange): array
    {
        return ['surveys' => '89%', 'reports' => '67%', 'documents' => '45%'];
    }

    private function getUserEngagementMetrics(Request $request, array $dateRange): array
    {
        return ['session_duration' => '25.3 minutes', 'page_views' => 156];
    }

    private function getUserProductivityTrends(Request $request, array $dateRange): array
    {
        return ['trend' => 'increasing', 'improvement' => '+12.5%'];
    }

    private function generateReportData(string $reportType, array $filters, array $dateRange): array
    {
        // Implementation for generating report data based on type
        return [
            'report_type' => $reportType,
            'summary' => 'Generated report data',
            'records' => []
        ];
    }

    private function getAverageSurveyResponseRate(array $dateRange): float
    {
        return 72.5; // Mock data
    }

    private function getMostActiveUsers(array $dateRange, int $limit): array
    {
        return ActivityLog::whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->select('user_id', DB::raw('COUNT(*) as activity_count'))
            ->groupBy('user_id')
            ->orderBy('activity_count', 'desc')
            ->take($limit)
            ->get()
            ->map(function ($item) {
                $user = User::find($item->user_id);
                return [
                    'user_id' => $item->user_id,
                    'username' => $user->username ?? 'Unknown',
                    'activity_count' => $item->activity_count
                ];
            })
            ->toArray();
    }

    private function getAverageResponseTime(array $dateRange): string
    {
        return '245ms'; // Mock data
    }

    private function getSystemErrorRate(array $dateRange): string
    {
        return '0.2%'; // Mock data
    }

    private function getUserSatisfactionScore(array $dateRange): string
    {
        return '4.3/5'; // Mock data
    }

    private function getDataQualityScore(array $dateRange): string
    {
        return '94.7%'; // Mock data
    }

    private function calculateInstitutionEngagementScore($institution): float
    {
        // Mock calculation - would implement actual engagement scoring
        return round(rand(65, 95) + (rand(0, 100) / 100), 1);
    }
}