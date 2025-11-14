<?php

namespace App\Services\SurveyAnalytics;

use App\Models\Survey;
use App\Services\SurveyAnalytics\Domains\Basic\BasicStatsService;
use App\Services\SurveyAnalytics\Domains\Response\ResponseAnalyticsService;
use App\Services\SurveyAnalytics\Domains\Demographic\DemographicAnalyticsService;
use App\Services\SurveyAnalytics\Domains\Temporal\TemporalAnalyticsService;
use App\Services\SurveyAnalytics\Domains\Completion\CompletionAnalyticsService;
use App\Services\SurveyAnalytics\Domains\Performance\PerformanceMetricsService;
use App\Services\SurveyAnalytics\Domains\Question\QuestionAnalyticsService;
use App\Services\SurveyTargetingService;
use App\Services\Analytics\HierarchicalAnalyticsService;
use Illuminate\Support\Facades\Auth;

/**
 * Survey Analytics Facade
 *
 * Coordinates all analytics domain services with a unified API.
 * This facade pattern provides backward compatibility while using the new modular architecture.
 *
 * ARCHITECTURE:
 * - Delegates to specialized domain services
 * - Maintains same API as monolithic SurveyAnalyticsService
 * - Enables gradual migration and testing
 *
 * REFACTORED: 2025-11-14
 * FROM: Monolithic SurveyAnalyticsService (1,227 lines)
 * TO: Modular domain-driven architecture (7 services, ~150-250 lines each)
 *
 * @package App\Services\SurveyAnalytics
 */
class SurveyAnalyticsFacade
{
    protected BasicStatsService $basicStatsService;
    protected ResponseAnalyticsService $responseService;
    protected DemographicAnalyticsService $demographicService;
    protected TemporalAnalyticsService $temporalService;
    protected CompletionAnalyticsService $completionService;
    protected PerformanceMetricsService $performanceService;
    protected QuestionAnalyticsService $questionService;
    protected SurveyTargetingService $targetingService;
    protected HierarchicalAnalyticsService $hierarchicalService;

    public function __construct(
        BasicStatsService $basicStatsService,
        ResponseAnalyticsService $responseService,
        DemographicAnalyticsService $demographicService,
        TemporalAnalyticsService $temporalService,
        CompletionAnalyticsService $completionService,
        PerformanceMetricsService $performanceService,
        QuestionAnalyticsService $questionService,
        SurveyTargetingService $targetingService,
        HierarchicalAnalyticsService $hierarchicalService
    ) {
        $this->basicStatsService = $basicStatsService;
        $this->responseService = $responseService;
        $this->demographicService = $demographicService;
        $this->temporalService = $temporalService;
        $this->completionService = $completionService;
        $this->performanceService = $performanceService;
        $this->questionService = $questionService;
        $this->targetingService = $targetingService;
        $this->hierarchicalService = $hierarchicalService;
    }

    /**
     * Get comprehensive survey statistics
     *
     * BACKWARD COMPATIBLE: Matches original SurveyAnalyticsService::getSurveyStatistics()
     *
     * @param Survey $survey
     * @return array
     */
    public function getSurveyStatistics(Survey $survey): array
    {
        $survey->load(['responses.respondent', 'creator']);

        return [
            'basic_stats' => $this->basicStatsService->getBasicStats($survey),
            'response_stats' => $this->responseService->getResponseStats($survey),
            'demographic_stats' => $this->demographicService->getDemographicStats($survey),
            'temporal_stats' => $this->temporalService->getTemporalStats($survey),
            'completion_stats' => $this->completionService->getCompletionStats($survey),
            'question_stats' => $this->questionService->getQuestionStats($survey),
            'performance_metrics' => $this->performanceService->getPerformanceMetrics($survey)
        ];
    }

    /**
     * Get survey analytics with insights
     *
     * BACKWARD COMPATIBLE: Matches original SurveyAnalyticsService::getSurveyAnalytics()
     *
     * @param Survey $survey
     * @return array
     */
    public function getSurveyAnalytics(Survey $survey): array
    {
        $survey->load(['responses' => function ($query) {
            $query->with(['respondent.role', 'respondent.institution'])->latest();
        }]);

        return [
            'overview' => $this->basicStatsService->getAnalyticsOverview($survey),
            'response_analysis' => $this->responseService->getResponseAnalysis($survey),
            'question_analysis' => $this->questionService->getQuestionStats($survey),
            'user_engagement' => $this->performanceService->getPerformanceMetrics($survey),
            'trend_analysis' => $this->temporalService->getTrendAnalysis($survey),
            'insights' => $this->generateInsights($survey),
            'recommendations' => $this->generateRecommendations($survey)
        ];
    }

    /**
     * Get dashboard statistics
     *
     * @return array
     */
    public function getDashboardStatistics(): array
    {
        // Placeholder - can be implemented with DashboardAnalyticsService
        return [];
    }

    /**
     * Generate insights from analytics data
     *
     * Analyzes patterns and provides actionable insights
     *
     * @param Survey $survey
     * @return array
     */
    protected function generateInsights(Survey $survey): array
    {
        $insights = [];

        // Response rate insights
        $basicStats = $this->basicStatsService->getBasicStats($survey);
        if ($basicStats['response_rate'] < 30) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'response_rate',
                'message' => 'Low response rate detected. Consider extending survey duration or sending reminders.',
                'severity' => 'medium'
            ];
        }

        // Completion rate insights
        $completionStats = $this->completionService->getCompletionStats($survey);
        if ($completionStats['completion_rate'] < 70) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'completion',
                'message' => 'High dropout rate detected. Review survey length and question difficulty.',
                'severity' => 'high'
            ];
        }

        // Dropout point insights
        if (!empty($completionStats['dropout_points'])) {
            $insights[] = [
                'type' => 'alert',
                'category' => 'dropout',
                'message' => 'Significant dropout detected at specific questions. Review question ' . implode(', ', array_column($completionStats['dropout_points'], 'question_index')),
                'severity' => 'high'
            ];
        }

        // Performance insights
        $performance = $this->performanceService->getPerformanceMetrics($survey);
        if ($performance['engagement_score'] > 80) {
            $insights[] = [
                'type' => 'success',
                'category' => 'engagement',
                'message' => 'Excellent engagement score! Survey is performing well.',
                'severity' => 'info'
            ];
        }

        return $insights;
    }

    /**
     * Generate recommendations for survey improvement
     *
     * @param Survey $survey
     * @return array
     */
    protected function generateRecommendations(Survey $survey): array
    {
        $recommendations = [];

        $basicStats = $this->basicStatsService->getBasicStats($survey);
        $completionStats = $this->completionService->getCompletionStats($survey);
        $performance = $this->performanceService->getPerformanceMetrics($survey);

        // Response rate recommendations
        if ($basicStats['response_rate'] < 50) {
            $recommendations[] = [
                'category' => 'reach',
                'priority' => 'high',
                'action' => 'Increase survey visibility',
                'suggestions' => [
                    'Send email reminders to non-respondents',
                    'Extend survey deadline',
                    'Promote survey through multiple channels'
                ]
            ];
        }

        // Completion time recommendations
        if ($completionStats['average_time'] > 1800) { // > 30 minutes
            $recommendations[] = [
                'category' => 'length',
                'priority' => 'medium',
                'action' => 'Reduce survey length',
                'suggestions' => [
                    'Remove non-essential questions',
                    'Split into multiple shorter surveys',
                    'Simplify complex questions'
                ]
            ];
        }

        // Quality recommendations
        if ($performance['quality_score'] < 60) {
            $recommendations[] = [
                'category' => 'quality',
                'priority' => 'high',
                'action' => 'Improve response quality',
                'suggestions' => [
                    'Add question validation',
                    'Provide clearer instructions',
                    'Reduce optional questions'
                ]
            ];
        }

        return $recommendations;
    }

    // Public access to individual domain services

    /**
     * Get basic statistics service
     *
     * @return BasicStatsService
     */
    public function basicStats(): BasicStatsService
    {
        return $this->basicStatsService;
    }

    /**
     * Get response analytics service
     *
     * @return ResponseAnalyticsService
     */
    public function responseAnalytics(): ResponseAnalyticsService
    {
        return $this->responseService;
    }

    /**
     * Get demographic analytics service
     *
     * @return DemographicAnalyticsService
     */
    public function demographicAnalytics(): DemographicAnalyticsService
    {
        return $this->demographicService;
    }

    /**
     * Get temporal analytics service
     *
     * @return TemporalAnalyticsService
     */
    public function temporalAnalytics(): TemporalAnalyticsService
    {
        return $this->temporalService;
    }

    /**
     * Get completion analytics service
     *
     * @return CompletionAnalyticsService
     */
    public function completionAnalytics(): CompletionAnalyticsService
    {
        return $this->completionService;
    }

    /**
     * Get performance metrics service
     *
     * @return PerformanceMetricsService
     */
    public function performanceMetrics(): PerformanceMetricsService
    {
        return $this->performanceService;
    }

    /**
     * Get question analytics service
     *
     * @return QuestionAnalyticsService
     */
    public function questionAnalytics(): QuestionAnalyticsService
    {
        return $this->questionService;
    }

    // ========================================
    // CONTROLLER API COMPATIBILITY METHODS
    // ========================================

    /**
     * Estimate survey recipients
     * DELEGATION: SurveyTargetingService
     */
    public function estimateRecipients(array $targetingRules): array
    {
        $user = Auth::user();
        $result = $this->targetingService->estimateRecipients($targetingRules, $user);

        $totalCount = $result['total_users'] ?? 0;
        return array_merge($result, [
            'estimated_responses' => $this->estimateResponseCount($totalCount, $targetingRules),
            'estimated_duration' => $this->estimateSurveyDuration($totalCount)
        ]);
    }

    /**
     * Export survey data for analysis
     */
    public function exportSurveyData(Survey $survey, string $format = 'json'): array
    {
        $survey->load(['responses' => function ($query) {
            $query->with(['respondent.role', 'respondent.institution'])->latest();
        }]);

        $exportData = [
            'survey_info' => [
                'id' => $survey->id,
                'title' => $survey->title,
                'type' => $survey->survey_type,
                'status' => $survey->status,
                'created_at' => $survey->created_at,
            ],
            'statistics' => $this->getSurveyStatistics($survey),
            'responses' => $survey->responses->map(function ($response) {
                return [
                    'id' => $response->id,
                    'respondent' => $response->respondent ? [
                        'name' => $response->respondent->name,
                        'role' => $response->respondent->role->name ?? 'Unknown',
                        'institution' => $response->respondent->institution->name ?? 'Unknown'
                    ] : null,
                    'responses' => $response->responses,
                    'is_complete' => $response->is_complete,
                    'created_at' => $response->created_at
                ];
            })
        ];

        return $exportData;
    }

    /**
     * Get response trends over time
     */
    public function getResponseTrends(Survey $survey, int $days = 30): array
    {
        return $this->temporalService->getTrendAnalysis($survey);
    }

    /**
     * Get institution breakdown
     * DELEGATION: HierarchicalAnalyticsService
     */
    public function getInstitutionBreakdown(Survey $survey): array
    {
        return $this->hierarchicalService->getInstitutionBreakdown($survey);
    }

    /**
     * Get hierarchical breakdown
     * DELEGATION: HierarchicalAnalyticsService
     */
    public function getHierarchicalBreakdown(Survey $survey): array
    {
        return $this->hierarchicalService->getHierarchicalBreakdown($survey);
    }

    /**
     * Get hierarchical institution analytics (enhanced)
     * DELEGATION: HierarchicalAnalyticsService
     */
    public function getHierarchicalInstitutionAnalyticsEnhanced(Survey $survey): array
    {
        return $this->hierarchicalService->getHierarchicalInstitutionAnalyticsEnhanced($survey);
    }

    /**
     * Get non-responding institutions
     * DELEGATION: HierarchicalAnalyticsService
     */
    public function getNonRespondingInstitutions(Survey $survey): array
    {
        return $this->hierarchicalService->getNonRespondingInstitutions($survey);
    }

    /**
     * Get survey analytics overview
     */
    public function getSurveyAnalyticsOverview(Survey $survey): array
    {
        return $this->basicStatsService->getAnalyticsOverview($survey);
    }

    /**
     * Get region analytics
     * DELEGATION: HierarchicalAnalyticsService
     */
    public function getRegionAnalytics(): array
    {
        return $this->hierarchicalService->getRegionAnalytics();
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    protected function estimateResponseCount(int $totalRecipients, array $targetingRules): array
    {
        $baseRate = 0.3; // 30% average response rate
        $expectedCount = round($totalRecipients * $baseRate);

        return [
            'optimistic' => round($totalRecipients * 0.5),
            'expected' => $expectedCount,
            'pessimistic' => round($totalRecipients * 0.15),
            'base_rate' => $baseRate
        ];
    }

    protected function estimateSurveyDuration(int $totalRecipients): array
    {
        $avgResponseTime = 3; // minutes per response
        $dailyResponseRate = 0.2; // 20% respond per day

        return [
            'estimated_days' => ceil($totalRecipients / ($totalRecipients * $dailyResponseRate)),
            'expected_completion_date' => now()->addDays(7)->format('Y-m-d'),
            'assumptions' => [
                'avg_response_time_minutes' => $avgResponseTime,
                'daily_response_rate' => $dailyResponseRate
            ]
        ];
    }
}
