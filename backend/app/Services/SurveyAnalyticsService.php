<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Survey;
use App\Services\Survey\SurveyStatisticsCalculatorService;
use App\Services\Survey\SurveyDataExportService;
use App\Services\Survey\SurveyInsightsGeneratorService;
use App\Services\Survey\SurveyDashboardAnalyticsService;
use App\Services\Survey\Domains\Question\QuestionAnalyticsService;
use App\Services\Analytics\HierarchicalAnalyticsService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class SurveyAnalyticsServiceRefactored
{
    protected SurveyStatisticsCalculatorService $statisticsService;
    protected SurveyDataExportService $exportService;
    protected SurveyInsightsGeneratorService $insightsService;
    protected SurveyDashboardAnalyticsService $dashboardService;
    protected QuestionAnalyticsService $questionService;
    protected HierarchicalAnalyticsService $hierarchicalService;
    protected SurveyTargetingService $targetingService;

    public function __construct(
        SurveyStatisticsCalculatorService $statisticsService,
        SurveyDataExportService $exportService,
        SurveyInsightsGeneratorService $insightsService,
        SurveyDashboardAnalyticsService $dashboardService,
        QuestionAnalyticsService $questionService,
        HierarchicalAnalyticsService $hierarchicalService,
        SurveyTargetingService $targetingService
    ) {
        $this->statisticsService = $statisticsService;
        $this->exportService = $exportService;
        $this->insightsService = $insightsService;
        $this->dashboardService = $dashboardService;
        $this->questionService = $questionService;
        $this->hierarchicalService = $hierarchicalService;
        $this->targetingService = $targetingService;
    }

    /**
     * Get comprehensive survey statistics
     */
    public function getSurveyStatistics(Survey $survey): array
    {
        $survey->load(['responses.respondent', 'creator']);

        return [
            'basic_stats' => $this->getBasicStats($survey),
            'response_stats' => $this->getResponseStats($survey),
            'demographic_stats' => $this->getDemographicStats($survey),
            'temporal_stats' => $this->statisticsService->getTemporalStats($survey),
            'completion_stats' => $this->statisticsService->getCompletionStats($survey),
            'question_stats' => $this->getQuestionStats($survey),
            'performance_metrics' => $this->getPerformanceMetrics($survey),
        ];
    }

    /**
     * Get survey analytics with insights
     */
    public function getSurveyAnalytics(Survey $survey): array
    {
        $survey->load(['responses' => function ($query) {
            $query->with(['respondent.role', 'respondent.institution'])->latest();
        }]);

        return [
            'overview' => $this->getAnalyticsOverview($survey),
            'response_analysis' => $this->getResponseAnalysis($survey),
            'question_analysis' => $this->getQuestionAnalysis($survey),
            'user_engagement' => $this->getUserEngagement($survey),
            'trend_analysis' => $this->insightsService->getTrendAnalysis($survey),
            'insights' => $this->insightsService->generateInsights($survey),
            'recommendations' => $this->insightsService->generateRecommendations($survey),
        ];
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStatistics(): array
    {
        return $this->dashboardService->getDashboardStatistics();
    }

    /**
     * Estimate survey recipients
     */
    public function estimateRecipients(array $targetingRules): array
    {
        $user = Auth::user();

        // Delegate to SurveyTargetingService for recipient estimation
        $result = $this->targetingService->estimateRecipients($targetingRules, $user);

        // Add analytics-specific calculations
        $totalCount = $result['total_users'] ?? 0;

        return array_merge($result, [
            'estimated_responses' => $this->estimateResponseCount($totalCount, $targetingRules),
            'estimated_duration' => $this->estimateSurveyDuration($totalCount),
        ]);
    }

    /**
     * Export survey data for analysis
     */
    public function exportSurveyData(Survey $survey, string $format = 'json'): array
    {
        return $this->exportService->exportSurveyData($survey, $format);
    }

    /**
     * Get basic survey stats
     */
    protected function getBasicStats(Survey $survey): array
    {
        return [
            'total_responses' => $survey->responses->count(),
            'unique_respondents' => $survey->responses->unique('user_id')->count(),
            'response_rate' => $this->statisticsService->calculateResponseRate($survey),
            'completion_rate' => $this->statisticsService->calculateCompletionRate($survey),
            'average_completion_time' => $this->statisticsService->calculateAverageCompletionTime($survey),
            'first_response_at' => $survey->responses->min('created_at'),
            'last_response_at' => $survey->responses->max('created_at'),
        ];
    }

    /**
     * Get response statistics
     */
    protected function getResponseStats(Survey $survey): array
    {
        return [
            'total_responses' => $survey->responses->count(),
            'complete_responses' => $survey->responses->where('is_complete', true)->count(),
            'partial_responses' => $survey->responses->where('is_complete', false)->count(),
            'anonymous_responses' => $survey->responses->whereNull('user_id')->count(),
            'responses_per_day' => $this->statisticsService->getResponsesPerDay($survey),
            'response_distribution' => $this->statisticsService->getResponseDistribution($survey),
        ];
    }

    /**
     * Get demographic statistics
     */
    protected function getDemographicStats(Survey $survey): array
    {
        return [
            'by_role' => $this->statisticsService->getDemographicByRole($survey),
            'by_institution' => $this->statisticsService->getDemographicByInstitution($survey),
            'by_institution_type' => $this->getDemographicByInstitutionType($survey),
        ];
    }

    /**
     * Get demographic breakdown by institution type
     */
    protected function getDemographicByInstitutionType(Survey $survey): array
    {
        $responses = $survey->responses()->with(['respondent.institution'])->get();

        return $responses
            ->groupBy('respondent.institution.type')
            ->map->count()
            ->toArray();
    }

    /**
     * Get question-level statistics
     */
    protected function getQuestionStats(Survey $survey): array
    {
        return $this->questionService->getQuestionStats($survey);
    }

    /**
     * Get performance metrics
     */
    protected function getPerformanceMetrics(Survey $survey): array
    {
        return [
            'engagement_score' => $this->statisticsService->calculateEngagementScore($survey),
            'response_quality_score' => $this->calculateResponseQualityScore($survey),
            'participation_score' => $this->calculateParticipationScore($survey),
            'retention_score' => $this->calculateRetentionScore($survey),
        ];
    }

    /**
     * Get analytics overview
     */
    protected function getAnalyticsOverview(Survey $survey): array
    {
        return [
            'summary' => $this->insightsService->getPerformanceSummary($survey),
            'key_metrics' => $this->getKeyMetrics($survey),
            'status' => $this->getSurveyStatus($survey),
        ];
    }

    /**
     * Get response analysis
     */
    protected function getResponseAnalysis(Survey $survey): array
    {
        return [
            'response_patterns' => $this->getResponsePatterns($survey),
            'completion_analysis' => $this->getCompletionAnalysis($survey),
            'time_analysis' => $this->getTimeAnalysis($survey),
        ];
    }

    /**
     * Get question analysis
     */
    protected function getQuestionAnalysis(Survey $survey): array
    {
        return [
            'question_performance' => $this->getQuestionPerformance($survey),
            'answer_patterns' => $this->getAnswerPatterns($survey),
            'difficulty_analysis' => $this->getDifficultyAnalysis($survey),
        ];
    }

    /**
     * Get user engagement metrics
     */
    protected function getUserEngagement(Survey $survey): array
    {
        return [
            'engagement_trends' => $this->getEngagementTrends($survey),
            'user_satisfaction' => $this->getUserSatisfaction($survey),
            'drop_off_points' => $this->getDropOffPoints($survey),
        ];
    }

    /**
     * Get institution-level breakdown for survey responses
     */
    public function getInstitutionBreakdown(Survey $survey): array
    {
        $user = Auth::user();
        $allowedInstitutionIds = \App\Helpers\DataIsolationHelper::getAllowedInstitutionIds($user);

        $responses = $survey->responses()
            ->with(['respondent', 'institution'])
            ->whereHas('institution', function ($query) use ($allowedInstitutionIds) {
                $query->whereIn('id', $allowedInstitutionIds);
            })
            ->get();

        // Group by institution with statistics
        $breakdown = $responses->groupBy('institution_id')->map(function ($instResponses, $instId) use ($survey) {
            $institution = $instResponses->first()->institution;

            if (!$institution) {
                return null;
            }

            return [
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                ],
                'statistics' => [
                    'total_responses' => $instResponses->count(),
                    'complete_responses' => $instResponses->where('is_complete', true)->count(),
                    'completion_rate' => $instResponses->count() > 0 ? 
                        round(($instResponses->where('is_complete', true)->count() / $instResponses->count()) * 100, 2) : 0,
                    'avg_completion_time' => $this->calculateAverageCompletionTime($instResponses),
                ],
                'respondents' => $instResponses->pluck('respondent_id')->unique()->values(),
            ];
        })->filter()->values();

        return [
            'breakdown' => $breakdown,
            'summary' => [
                'total_institutions' => $breakdown->count(),
                'total_responses' => $responses->count(),
                'avg_completion_rate' => $breakdown->avg('statistics.completion_rate'),
            ],
        ];
    }

    /**
     * Get hierarchical breakdown for survey responses (sector > schools)
     */
    public function getHierarchicalBreakdown(Survey $survey): array
    {
        $user = Auth::user();
        $allowedInstitutionIds = \App\Helpers\DataIsolationHelper::getAllowedInstitutionIds($user);

        $responses = $survey->responses()
            ->with(['respondent', 'institution'])
            ->whereHas('institution', function ($query) use ($allowedInstitutionIds) {
                $query->whereIn('id', $allowedInstitutionIds);
            })
            ->get();

        $hierarchy = $this->buildRegionHierarchy($survey, $responses, $user);

        return [
            'hierarchy' => $hierarchy,
            'summary' => [
                'total_regions' => $hierarchy->count(),
                'total_schools' => $hierarchy->sum('schools_count'),
                'total_responses' => $responses->count(),
            ],
        ];
    }

    /**
     * Build region hierarchy (sectors with schools)
     */
    protected function buildRegionHierarchy(Survey $survey, $responses, User $user): Collection
    {
        $userRegion = $user->institution;

        if (!$userRegion) {
            return collect([]);
        }

        // Get all sectors under this region
        $sectors = Institution::where('parent_id', $userRegion->id)
            ->whereIn('id', \App\Helpers\DataIsolationHelper::getAllowedInstitutionIds($user))
            ->get();

        return $sectors->map(function ($sector) use ($survey, $responses) {
            $sectorResponses = $responses->filter(function ($response) use ($sector) {
                return $response->institution && $response->institution->parent_id === $sector->id;
            });

            $schools = $sectorResponses->groupBy('institution_id')->map(function ($schoolResponses) {
                $school = $schoolResponses->first()->institution;

                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'responses' => $schoolResponses->count(),
                    'completion_rate' => $schoolResponses->count() > 0 ? 
                        round(($schoolResponses->where('is_complete', true)->count() / $schoolResponses->count()) * 100, 2) : 0,
                ];
            });

            return [
                'id' => $sector->id,
                'name' => $sector->name,
                'responses' => $sectorResponses->count(),
                'completion_rate' => $sectorResponses->count() > 0 ? 
                    round(($sectorResponses->where('is_complete', true)->count() / $sectorResponses->count()) * 100, 2) : 0,
                'schools_count' => $schools->count(),
                'schools' => $schools->values(),
            ];
        });
    }

    /**
     * Enhanced hierarchical institution analytics
     */
    public function getHierarchicalInstitutionAnalyticsEnhanced(Survey $survey): array
    {
        return $this->hierarchicalService->getHierarchicalInstitutionAnalyticsEnhanced($survey);
    }

    /**
     * Get non-responding institutions
     */
    public function getNonRespondingInstitutions(Survey $survey): array
    {
        return $this->hierarchicalService->getNonRespondingInstitutions($survey);
    }

    // Helper methods for analytics calculations
    protected function calculateResponseQualityScore(Survey $survey): float
    {
        // Implementation for response quality calculation
        return 75.0; // Placeholder
    }

    protected function calculateParticipationScore(Survey $survey): float
    {
        return $this->statisticsService->calculateResponseRate($survey);
    }

    protected function calculateRetentionScore(Survey $survey): float
    {
        return $this->statisticsService->calculateCompletionRate($survey);
    }

    protected function getKeyMetrics(Survey $survey): array
    {
        return [
            'response_rate' => $this->statisticsService->calculateResponseRate($survey),
            'completion_rate' => $this->statisticsService->calculateCompletionRate($survey),
            'engagement_score' => $this->statisticsService->calculateEngagementScore($survey),
        ];
    }

    protected function getSurveyStatus(Survey $survey): array
    {
        return [
            'status' => $survey->status,
            'is_active' => in_array($survey->status, ['published', 'active']),
            'is_completed' => $survey->status === 'completed',
        ];
    }

    protected function getResponsePatterns(Survey $survey): array
    {
        // Implementation for response pattern analysis
        return [];
    }

    protected function getCompletionAnalysis(Survey $survey): array
    {
        return $this->statisticsService->getCompletionStats($survey);
    }

    protected function getTimeAnalysis(Survey $survey): array
    {
        return [
            'avg_completion_time' => $this->statisticsService->calculateAverageCompletionTime($survey),
            'temporal_stats' => $this->statisticsService->getTemporalStats($survey),
        ];
    }

    protected function getQuestionPerformance(Survey $survey): array
    {
        return $this->questionService->getQuestionStats($survey);
    }

    protected function getAnswerPatterns(Survey $survey): array
    {
        // Implementation for answer pattern analysis
        return [];
    }

    protected function getDifficultyAnalysis(Survey $survey): array
    {
        // Implementation for difficulty analysis
        return [];
    }

    protected function getEngagementTrends(Survey $survey): array
    {
        return $this->insightsService->getTrendAnalysis($survey);
    }

    protected function getUserSatisfaction(Survey $survey): array
    {
        // Implementation for user satisfaction analysis
        return [];
    }

    protected function getDropOffPoints(Survey $survey): array
    {
        // Implementation for drop-off point analysis
        return [];
    }

    protected function calculateAverageCompletionTime($responses): int
    {
        $completedResponses = $responses->whereNotNull('started_at')
            ->whereNotNull('submitted_at');

        if ($completedResponses->isEmpty()) {
            return 0;
        }

        $totalTime = $completedResponses->sum(function ($response) {
            return $response->started_at->diffInSeconds($response->submitted_at);
        });

        return round($totalTime / $completedResponses->count());
    }

    protected function estimateResponseCount(int $totalRecipients, array $targetingRules): array
    {
        // Base response rates by role
        $responseRates = [
            'superadmin' => 90,
            'regionadmin' => 80,
            'sektoradmin' => 75,
            'schooladmin' => 70,
            'teacher' => 60,
            'student' => 50,
        ];

        $estimatedCount = $totalRecipients * 0.65; // Average 65% response rate

        return [
            'min_estimated' => round($estimatedCount * 0.8),
            'max_estimated' => round($estimatedCount * 1.2),
            'most_likely' => round($estimatedCount),
            'confidence_level' => 'medium',
        ];
    }

    protected function estimateSurveyDuration(int $totalRecipients): array
    {
        $baseDuration = 7; // 7 days
        $additionalDays = min(14, ceil($totalRecipients / 100)); // Additional days based on recipients

        return [
            'min_days' => $baseDuration,
            'max_days' => $baseDuration + $additionalDays,
            'recommended_duration' => $baseDuration + ceil($additionalDays / 2),
        ];
    }
}
