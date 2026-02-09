<?php

namespace App\Http\Controllers;

use App\Http\Traits\ResponseHelpers;
use App\Http\Traits\ValidationRules;
use App\Models\Survey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SurveyAnalyticsController extends BaseController
{
    use ResponseHelpers, ValidationRules;

    protected $analyticsService;

    public function __construct()
    {
        // Resolve service dynamically through container to support feature flag switching
        $useRefactored = config('features.use_refactored_analytics', true);
        
        if ($useRefactored) {
            $this->analyticsService = app(\App\Services\SurveyAnalyticsService::class);
        } else {
            // Fallback to legacy service if needed
            $this->analyticsService = app(\App\Services\SurveyAnalyticsService::class);
        }
    }

    /**
     * Get survey statistics
     */
    public function statistics(Survey $survey): JsonResponse
    {
        try {
            $statistics = $this->analyticsService->getSurveyStatistics($survey);

            return $this->success($statistics, 'Survey statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get survey analytics with insights
     */
    public function analytics(Survey $survey): JsonResponse
    {
        try {
            $analytics = $this->analyticsService->getSurveyAnalytics($survey);

            return $this->success($analytics, 'Survey analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard(): JsonResponse
    {
        try {
            $dashboardStats = $this->analyticsService->getDashboardStatistics();

            return $this->success($dashboardStats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Estimate survey recipients
     */
    public function estimateRecipients(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'targeting_rules' => 'required|array',
            'targeting_rules.roles' => 'sometimes|array',
            'targeting_rules.roles.*' => 'string|exists:roles,name',
            'targeting_rules.institutions' => 'sometimes|array',
            'targeting_rules.institutions.*' => 'integer|exists:institutions,id',
            'targeting_rules.departments' => 'sometimes|array',
            'targeting_rules.departments.*' => 'integer|exists:departments,id',
        ]);

        try {
            $estimates = $this->analyticsService->estimateRecipients($validated['targeting_rules']);

            return $this->success($estimates, 'Recipient estimates calculated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Export survey data
     */
    public function export(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'format' => 'sometimes|string|in:json,csv,excel',
        ]);

        try {
            $format = $validated['format'] ?? 'json';
            $exportData = $this->analyticsService->exportSurveyData($survey, $format);

            return $this->success($exportData, 'Survey data exported successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get survey response trends
     */
    public function responseTrends(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'sometimes|string|in:daily,weekly,monthly',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
        ]);

        try {
            $period = $validated['period'] ?? 'daily';
            $startDate = $validated['start_date'] ?? null;
            $endDate = $validated['end_date'] ?? null;

            $trends = $this->analyticsService->getResponseTrends($survey, $period, $startDate, $endDate);

            return $this->success($trends, 'Response trends retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get question-level analytics
     */
    public function questionAnalytics(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question_index' => 'sometimes|integer|min:0',
        ]);

        try {
            $questionIndex = $validated['question_index'] ?? null;

            if ($questionIndex !== null) {
                // Get specific question analytics
                $analytics = $this->analyticsService->getQuestionAnalytics($survey, $questionIndex);
            } else {
                // Get all questions analytics
                $analytics = $this->analyticsService->getAllQuestionsAnalytics($survey);
            }

            return $this->success($analytics, 'Question analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get user engagement metrics
     */
    public function userEngagement(Survey $survey): JsonResponse
    {
        try {
            $engagement = $this->analyticsService->getUserEngagement($survey);

            return $this->success($engagement, 'User engagement metrics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get demographic analytics
     */
    public function demographics(Survey $survey): JsonResponse
    {
        try {
            $demographics = $this->analyticsService->getDemographicAnalytics($survey);

            return $this->success($demographics, 'Demographic analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get survey completion funnel
     */
    public function completionFunnel(Survey $survey): JsonResponse
    {
        try {
            $funnel = $this->analyticsService->getCompletionFunnel($survey);

            return $this->success($funnel, 'Completion funnel retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Generate survey insights
     */
    public function insights(Survey $survey): JsonResponse
    {
        try {
            $insights = $this->analyticsService->generateInsights($survey);

            return $this->success($insights, 'Survey insights generated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Generate survey recommendations
     */
    public function recommendations(Survey $survey): JsonResponse
    {
        try {
            $recommendations = $this->analyticsService->generateRecommendations($survey);

            return $this->success($recommendations, 'Survey recommendations generated successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Compare multiple surveys
     */
    public function compare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'survey_ids' => 'required|array|min:2|max:5',
            'survey_ids.*' => 'required|integer|exists:surveys,id',
            'metrics' => 'sometimes|array',
            'metrics.*' => 'string|in:response_rate,completion_rate,engagement,satisfaction',
        ]);

        try {
            $metrics = $validated['metrics'] ?? ['response_rate', 'completion_rate'];
            $comparison = $this->analyticsService->compareSurveys($validated['survey_ids'], $metrics);

            return $this->success($comparison, 'Survey comparison completed successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get region analytics (RegionAdmin specific)
     */
    public function regionAnalytics(): JsonResponse
    {
        try {
            $analytics = $this->analyticsService->getRegionAnalytics();

            return $this->success($analytics, 'Region analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get institution breakdown for survey
     */
    public function institutionBreakdown(Survey $survey): JsonResponse
    {
        try {
            $breakdown = $this->analyticsService->getInstitutionBreakdown($survey);

            return $this->success($breakdown, 'Institution breakdown retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Institution breakdown error', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get hierarchical institution breakdown for survey
     * Shows sector -> schools hierarchy for RegionAdmin
     */
    public function hierarchicalBreakdown(Survey $survey): JsonResponse
    {
        try {
            $breakdown = $this->analyticsService->getHierarchicalBreakdown($survey);

            return $this->success($breakdown, 'Hierarchical breakdown retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Hierarchical breakdown error', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * ========================================
     * NEW: Survey Results Analytics Endpoints
     * ========================================
     */

    /**
     * Get comprehensive survey analytics overview
     */
    public function analyticsOverview(Survey $survey): JsonResponse
    {
        try {
            $data = $this->analyticsService->getSurveyAnalyticsOverview($survey);

            return $this->success($data, 'Survey analytics overview retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Analytics overview error', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get response trends over time
     */
    public function responseTimeTrends(Survey $survey, Request $request): JsonResponse
    {
        try {
            $days = $request->input('days', 30);
            $days = min(max($days, 7), 365); // Limit between 7 and 365 days

            $data = $this->analyticsService->getResponseTrends($survey, $days);

            return $this->success($data, 'Response trends retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Response trends error', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get enhanced hierarchical institution analytics
     */
    public function hierarchicalInstitutionsAnalytics(Survey $survey): JsonResponse
    {
        try {
            $data = $this->analyticsService->getHierarchicalInstitutionAnalyticsEnhanced($survey);

            return $this->success($data, 'Hierarchical institution analytics retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Hierarchical institutions analytics error', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Get non-responding institutions for a survey
     */
    public function nonRespondingInstitutions(Survey $survey): JsonResponse
    {
        try {
            $data = $this->analyticsService->getNonRespondingInstitutions($survey);

            return $this->success($data, 'Non-responding institutions retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Non-responding institutions error', [
                'survey_id' => $survey->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error($e->getMessage(), 500);
        }
    }
}
