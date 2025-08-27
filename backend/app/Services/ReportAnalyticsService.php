<?php

namespace App\Services;

use App\Models\Report;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Institution;
use App\Models\User;
use App\Services\BaseService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportAnalyticsService extends BaseService
{
    /**
     * Get comprehensive analytics dashboard data
     */
    public function getAnalyticsDashboard($user, array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? Carbon::now()->subDays(30);
        $dateTo = $filters['date_to'] ?? Carbon::now();

        return [
            'overview' => $this->getOverviewAnalytics($user, $dateFrom, $dateTo),
            'timeline' => $this->getTimelineData($user, $dateFrom, $dateTo),
            'top_surveys' => $this->getTopSurveys($user, $filters),
            'institution_performance' => $this->getInstitutionPerformance($user, $filters),
            'institution_analytics' => $this->getInstitutionAnalytics($user, $filters),
            'response_patterns' => $this->getResponsePatterns($user, $dateFrom, $dateTo),
            'user_engagement' => $this->getUserEngagement($user, $dateFrom, $dateTo),
            'report_usage' => $this->getReportUsage($user, $dateFrom, $dateTo)
        ];
    }

    /**
     * Get overview analytics
     */
    private function getOverviewAnalytics($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $surveysQuery = Survey::whereBetween('created_at', [$dateFrom, $dateTo]);
        $responsesQuery = SurveyResponse::whereBetween('created_at', [$dateFrom, $dateTo]);
        $reportsQuery = Report::whereBetween('created_at', [$dateFrom, $dateTo]);

        // Apply user-based filtering if needed
        $this->applyUserAccessControl($surveysQuery, $user);
        $this->applyUserAccessControl($responsesQuery, $user, 'survey');
        $this->applyUserAccessControl($reportsQuery, $user);

        $totalSurveys = $surveysQuery->count();
        $totalResponses = $responsesQuery->count();
        $totalReports = $reportsQuery->count();
        
        $completedResponses = $responsesQuery->where('status', 'completed')->count();
        $overallResponseRate = $this->calculateOverallResponseRate($dateFrom, $dateTo, $user);

        // Previous period for comparison
        $previousPeriod = $dateFrom->diffInDays($dateTo);
        $prevDateFrom = $dateFrom->copy()->subDays($previousPeriod);
        $prevDateTo = $dateFrom->copy();

        $prevSurveys = $this->getPreviousPeriodCount('surveys', $prevDateFrom, $prevDateTo, $user);
        $prevResponses = $this->getPreviousPeriodCount('survey_responses', $prevDateFrom, $prevDateTo, $user);
        $prevReports = $this->getPreviousPeriodCount('reports', $prevDateFrom, $prevDateTo, $user);

        return [
            'total_surveys' => $totalSurveys,
            'total_responses' => $totalResponses,
            'completed_responses' => $completedResponses,
            'total_reports' => $totalReports,
            'overall_response_rate' => $overallResponseRate,
            'trends' => [
                'surveys_change' => $this->calculatePercentageChange($totalSurveys, $prevSurveys),
                'responses_change' => $this->calculatePercentageChange($totalResponses, $prevResponses),
                'reports_change' => $this->calculatePercentageChange($totalReports, $prevReports)
            ],
            'completion_rate' => $totalResponses > 0 ? round(($completedResponses / $totalResponses) * 100, 2) : 0
        ];
    }

    /**
     * Get timeline data for charts
     */
    private function getTimelineData($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $period = $dateFrom->diffInDays($dateTo);
        $groupBy = $period > 30 ? 'week' : 'day';

        $dateFormat = $groupBy === 'week' ? '%Y-%u' : '%Y-%m-%d';

        // Survey creation timeline
        $surveysQuery = Survey::selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as period, COUNT(*) as count")
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('period')
            ->orderBy('period');
        
        $this->applyUserAccessControl($surveysQuery, $user);
        $surveyTimeline = $surveysQuery->get()->pluck('count', 'period')->toArray();

        // Response timeline
        $responsesQuery = SurveyResponse::selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as period, COUNT(*) as count")
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('period')
            ->orderBy('period');
        
        $this->applyUserAccessControl($responsesQuery, $user, 'survey');
        $responseTimeline = $responsesQuery->get()->pluck('count', 'period')->toArray();

        // Report generation timeline
        $reportsQuery = Report::selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as period, COUNT(*) as count")
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('period')
            ->orderBy('period');
        
        $this->applyUserAccessControl($reportsQuery, $user);
        $reportTimeline = $reportsQuery->get()->pluck('count', 'period')->toArray();

        return [
            'period_type' => $groupBy,
            'surveys' => $surveyTimeline,
            'responses' => $responseTimeline,
            'reports' => $reportTimeline,
            'combined_activity' => $this->combineTimelineData([$surveyTimeline, $responseTimeline, $reportTimeline])
        ];
    }

    /**
     * Get top performing surveys
     */
    private function getTopSurveys($user, array $filters = []): array
    {
        $limit = $filters['limit'] ?? 10;
        $orderBy = $filters['order_by'] ?? 'response_count';

        $query = Survey::with(['institution', 'creator'])
            ->withCount(['responses as response_count', 'responses as completed_count' => function($q) {
                $q->where('status', 'completed');
            }]);

        // Apply date filter if provided
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $this->applyUserAccessControl($query, $user);

        switch ($orderBy) {
            case 'completion_rate':
                $query->orderByRaw('(completed_count / GREATEST(response_count, 1)) DESC');
                break;
            case 'created_at':
                $query->orderByDesc('created_at');
                break;
            default:
                $query->orderByDesc('response_count');
        }

        $surveys = $query->limit($limit)->get();

        return $surveys->map(function($survey) {
            return [
                'id' => $survey->id,
                'title' => $survey->title,
                'institution' => $survey->institution?->name,
                'creator' => $survey->creator?->name,
                'response_count' => $survey->response_count,
                'completed_count' => $survey->completed_count,
                'completion_rate' => $survey->response_count > 0 ? 
                    round(($survey->completed_count / $survey->response_count) * 100, 2) : 0,
                'created_at' => $survey->created_at,
                'status' => $survey->status
            ];
        })->toArray();
    }

    /**
     * Get institution performance metrics
     */
    private function getInstitutionPerformance($user, array $filters = []): array
    {
        $query = Institution::with(['surveys', 'users'])
            ->withCount(['surveys as survey_count', 'users as user_count']);

        // Apply filters
        if (!empty($filters['institution_type'])) {
            $query->where('type', $filters['institution_type']);
        }
        if (!empty($filters['level'])) {
            $query->where('level', $filters['level']);
        }

        $this->applyInstitutionAccessControl($query, $user);

        $institutions = $query->limit(20)->get();

        return $institutions->map(function($institution) {
            $totalResponses = $this->getTotalResponsesForInstitution($institution);
            $completedResponses = $this->getCompletedResponsesForInstitution($institution);
            
            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->type,
                'level' => $institution->level,
                'survey_count' => $institution->survey_count,
                'user_count' => $institution->user_count,
                'total_responses' => $totalResponses,
                'completed_responses' => $completedResponses,
                'response_rate' => $totalResponses > 0 ? 
                    round(($completedResponses / $totalResponses) * 100, 2) : 0,
                'activity_score' => $this->calculateActivityScore($institution)
            ];
        })->sortByDesc('activity_score')->values()->toArray();
    }

    /**
     * Get institution-specific analytics
     */
    private function getInstitutionAnalytics($user, array $filters = []): array
    {
        $institutionId = $filters['institution_id'] ?? $user->institution_id;
        
        if (!$institutionId) {
            return ['error' => 'Müəssisə ID-si tapılmadı'];
        }

        $institution = Institution::with(['surveys', 'users', 'children'])->find($institutionId);
        
        if (!$institution) {
            return ['error' => 'Müəssisə tapılmadı'];
        }

        $dateFrom = $filters['date_from'] ?? Carbon::now()->subDays(30);
        $dateTo = $filters['date_to'] ?? Carbon::now();

        return [
            'institution' => [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->type,
                'level' => $institution->level
            ],
            'surveys' => [
                'total' => $institution->surveys()->count(),
                'active' => $institution->surveys()->where('status', 'active')->count(),
                'recent' => $institution->surveys()->whereBetween('created_at', [$dateFrom, $dateTo])->count()
            ],
            'responses' => [
                'total' => $this->getTotalResponsesForInstitution($institution, $dateFrom, $dateTo),
                'completed' => $this->getCompletedResponsesForInstitution($institution, $dateFrom, $dateTo),
                'in_progress' => $this->getInProgressResponsesForInstitution($institution, $dateFrom, $dateTo)
            ],
            'users' => [
                'total' => $institution->users()->count(),
                'active' => $institution->users()->where('is_active', true)->count(),
                'by_role' => $this->getUsersByRole($institution)
            ],
            'children' => [
                'count' => $institution->children->count(),
                'active' => $institution->children->where('is_active', true)->count(),
                'performance_summary' => $this->getChildrenPerformanceSummary($institution)
            ]
        ];
    }

    /**
     * Get response patterns analysis
     */
    private function getResponsePatterns($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $responsesQuery = SurveyResponse::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->applyUserAccessControl($responsesQuery, $user, 'survey');

        return [
            'by_hour' => $this->getResponsesByHour($responsesQuery),
            'by_day_of_week' => $this->getResponsesByDayOfWeek($responsesQuery),
            'by_status' => $this->getResponsesByStatus($responsesQuery),
            'completion_time_distribution' => $this->getCompletionTimeDistribution($responsesQuery)
        ];
    }

    /**
     * Get user engagement metrics
     */
    private function getUserEngagement($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $usersQuery = User::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->applyUserAccessControl($usersQuery, $user);

        $totalUsers = $usersQuery->count();
        $activeUsers = $usersQuery->where('is_active', true)->count();
        
        return [
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'activation_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 2) : 0,
            'new_registrations' => $totalUsers,
            'engagement_by_role' => $this->getEngagementByRole($usersQuery),
            'login_frequency' => $this->getLoginFrequencyData($user, $dateFrom, $dateTo)
        ];
    }

    /**
     * Get report usage analytics
     */
    private function getReportUsage($user, Carbon $dateFrom, Carbon $dateTo): array
    {
        $reportsQuery = Report::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->applyUserAccessControl($reportsQuery, $user);

        $reports = $reportsQuery->get();
        
        return [
            'total_reports' => $reports->count(),
            'by_type' => $reports->groupBy('type')->map->count()->toArray(),
            'by_status' => $reports->groupBy('status')->map->count()->toArray(),
            'generation_time_stats' => $this->calculateGenerationTimeStats($reports),
            'most_popular_types' => $this->getMostPopularReportTypes($reports),
            'usage_trends' => $this->getReportUsageTrends($user, $dateFrom, $dateTo)
        ];
    }

    /**
     * Calculate overall response rate
     */
    private function calculateOverallResponseRate(Carbon $dateFrom, Carbon $dateTo, $user): float
    {
        $surveysQuery = Survey::whereBetween('created_at', [$dateFrom, $dateTo]);
        $this->applyUserAccessControl($surveysQuery, $user);
        
        $totalSurveys = $surveysQuery->count();
        
        if ($totalSurveys === 0) {
            return 0.0;
        }

        $totalPossibleResponses = $surveysQuery->sum('target_responses') ?: $totalSurveys * 10; // Default assumption
        
        $responsesQuery = SurveyResponse::whereHas('survey', function($q) use ($dateFrom, $dateTo, $user) {
            $q->whereBetween('created_at', [$dateFrom, $dateTo]);
            $this->applyUserAccessControl($q, $user);
        });
        
        $actualResponses = $responsesQuery->count();
        
        return round(($actualResponses / $totalPossibleResponses) * 100, 2);
    }

    /**
     * Apply user-based access control
     */
    private function applyUserAccessControl($query, $user, string $relation = null): void
    {
        if ($user->hasRole('superadmin')) {
            return; // SuperAdmin can see all
        }

        $userInstitution = $user->institution;
        
        if (!$userInstitution) {
            $query->whereRaw('1 = 0'); // No access
            return;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            if ($relation === 'survey') {
                $query->whereHas('survey', function($q) use ($childIds) {
                    $q->whereIn('institution_id', $childIds);
                });
            } else {
                $query->whereIn('institution_id', $childIds);
            }
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            if ($relation === 'survey') {
                $query->whereHas('survey', function($q) use ($childIds) {
                    $q->whereIn('institution_id', $childIds);
                });
            } else {
                $query->whereIn('institution_id', $childIds);
            }
        } else {
            // School level or other roles
            if ($relation === 'survey') {
                $query->whereHas('survey', function($q) use ($userInstitution) {
                    $q->where('institution_id', $userInstitution->id);
                });
            } else {
                $query->where('institution_id', $userInstitution->id);
            }
        }
    }

    /**
     * Additional helper methods for analytics calculations
     */
    private function calculatePercentageChange($current, $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }
        
        return round((($current - $previous) / $previous) * 100, 2);
    }

    private function combineTimelineData(array $timelines): array
    {
        $combined = [];
        
        foreach ($timelines as $timeline) {
            foreach ($timeline as $period => $value) {
                $combined[$period] = ($combined[$period] ?? 0) + $value;
            }
        }
        
        return $combined;
    }

    private function calculateActivityScore(Institution $institution): float
    {
        $surveyScore = min(100, $institution->survey_count * 10);
        $userScore = min(100, $institution->user_count * 5);
        $responseScore = min(100, $this->getTotalResponsesForInstitution($institution) * 2);
        
        return round(($surveyScore + $userScore + $responseScore) / 3, 2);
    }

    /**
     * Get total responses for institution
     */
    private function getTotalResponsesForInstitution(Institution $institution, Carbon $dateFrom = null, Carbon $dateTo = null): int
    {
        $query = SurveyResponse::whereHas('survey', function($q) use ($institution) {
            $q->where('institution_id', $institution->id);
        });

        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [$dateFrom, $dateTo]);
        }

        return $query->count();
    }

    /**
     * Get completed responses for institution
     */
    private function getCompletedResponsesForInstitution(Institution $institution, Carbon $dateFrom = null, Carbon $dateTo = null): int
    {
        $query = SurveyResponse::where('status', 'completed')
            ->whereHas('survey', function($q) use ($institution) {
                $q->where('institution_id', $institution->id);
            });

        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [$dateFrom, $dateTo]);
        }

        return $query->count();
    }

    /**
     * Additional helper methods would be implemented here
     */
}