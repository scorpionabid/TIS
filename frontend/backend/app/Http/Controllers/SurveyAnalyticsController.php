<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Services\SurveyAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;

class SurveyAnalyticsController extends Controller
{
    use ValidationRules, ResponseHelpers;

    protected SurveyAnalyticsService $analyticsService;

    public function __construct(SurveyAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get survey statistics
     */
    public function statistics(Survey $survey): JsonResponse
    {
        try {
            $statistics = $this->analyticsService->getSurveyStatistics($survey);
            return $this->successResponse($statistics, 'Survey statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get survey analytics with insights
     */
    public function analytics(Survey $survey): JsonResponse
    {
        try {
            $analytics = $this->analyticsService->getSurveyAnalytics($survey);
            return $this->successResponse($analytics, 'Survey analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard(): JsonResponse
    {
        try {
            $dashboardStats = $this->analyticsService->getDashboardStatistics();
            return $this->successResponse($dashboardStats, 'Dashboard statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
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
            'targeting_rules.departments.*' => 'integer|exists:departments,id'
        ]);

        try {
            $estimates = $this->analyticsService->estimateRecipients($validated['targeting_rules']);
            return $this->successResponse($estimates, 'Recipient estimates calculated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Export survey data
     */
    public function export(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'format' => 'sometimes|string|in:json,csv,excel'
        ]);

        try {
            $format = $validated['format'] ?? 'json';
            $exportData = $this->analyticsService->exportSurveyData($survey, $format);
            
            return $this->successResponse($exportData, 'Survey data exported successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
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
            'end_date' => 'sometimes|date|after_or_equal:start_date'
        ]);

        try {
            $period = $validated['period'] ?? 'daily';
            $startDate = $validated['start_date'] ?? null;
            $endDate = $validated['end_date'] ?? null;

            $trends = $this->analyticsService->getResponseTrends($survey, $period, $startDate, $endDate);
            return $this->successResponse($trends, 'Response trends retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get question-level analytics
     */
    public function questionAnalytics(Survey $survey, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question_index' => 'sometimes|integer|min:0'
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

            return $this->successResponse($analytics, 'Question analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get user engagement metrics
     */
    public function userEngagement(Survey $survey): JsonResponse
    {
        try {
            $engagement = $this->analyticsService->getUserEngagement($survey);
            return $this->successResponse($engagement, 'User engagement metrics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get demographic analytics
     */
    public function demographics(Survey $survey): JsonResponse
    {
        try {
            $demographics = $this->analyticsService->getDemographicAnalytics($survey);
            return $this->successResponse($demographics, 'Demographic analytics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get survey completion funnel
     */
    public function completionFunnel(Survey $survey): JsonResponse
    {
        try {
            $funnel = $this->analyticsService->getCompletionFunnel($survey);
            return $this->successResponse($funnel, 'Completion funnel retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Generate survey insights
     */
    public function insights(Survey $survey): JsonResponse
    {
        try {
            $insights = $this->analyticsService->generateInsights($survey);
            return $this->successResponse($insights, 'Survey insights generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Generate survey recommendations
     */
    public function recommendations(Survey $survey): JsonResponse
    {
        try {
            $recommendations = $this->analyticsService->generateRecommendations($survey);
            return $this->successResponse($recommendations, 'Survey recommendations generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
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
            'metrics.*' => 'string|in:response_rate,completion_rate,engagement,satisfaction'
        ]);

        try {
            $metrics = $validated['metrics'] ?? ['response_rate', 'completion_rate'];
            $comparison = $this->analyticsService->compareSurveys($validated['survey_ids'], $metrics);
            
            return $this->successResponse($comparison, 'Survey comparison completed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}