<?php

namespace App\Services\SurveyAnalytics\Domains\Completion;

use App\Models\Survey;
use App\Services\SurveyAnalytics\Domains\Question\QuestionAnalyticsService;

/**
 * Completion Analytics Service
 *
 * Handles survey completion analytics and dropout analysis.
 * Extracted from SurveyAnalyticsService (REFACTOR Phase 5).
 *
 * RESPONSIBILITIES:
 * - Completion rate calculations
 * - Completion time analytics (average, median)
 * - Dropout point identification
 * - Completion trend analysis
 */
class CompletionAnalyticsService extends BaseService
{
    protected QuestionAnalyticsService $questionService;

    public function __construct(QuestionAnalyticsService $questionService)
    {
        $this->questionService = $questionService;
    }

    /**
     * Get completion statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getCompletionStats() (lines 213-225)
     */
    public function getCompletionStats(Survey $survey): array
    {
        return [
            'completion_rate' => $this->calculateCompletionRate($survey),
            'average_time' => $this->calculateAverageCompletionTime($survey),
            'median_time' => $this->calculateMedianCompletionTime($survey),
            'completion_by_question' => $this->getCompletionByQuestion($survey),
            'dropout_points' => $this->getDropoutPoints($survey),
            'completion_trends' => $this->getCompletionTrends($survey),
        ];
    }

    /**
     * Calculate completion rate
     *
     * @return float Completion rate percentage
     */
    public function calculateCompletionRate(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        $completeResponses = $survey->responses->where('is_complete', true)->count();

        if ($totalResponses == 0) {
            return 0;
        }

        return round(($completeResponses / $totalResponses) * 100, 2);
    }

    /**
     * Calculate average completion time in seconds
     *
     * @return int Average completion time in seconds
     */
    public function calculateAverageCompletionTime(Survey $survey): int
    {
        $responses = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get();

        if ($responses->isEmpty()) {
            return 0;
        }

        $totalTime = 0;
        foreach ($responses as $response) {
            $totalTime += $response->started_at->diffInSeconds($response->submitted_at);
        }

        return round($totalTime / $responses->count());
    }

    /**
     * Calculate median completion time in seconds
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateMedianCompletionTime() (lines 979-1000)
     *
     * @return int Median completion time in seconds
     */
    public function calculateMedianCompletionTime(Survey $survey): int
    {
        $responses = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get();

        if ($responses->isEmpty()) {
            return 0;
        }

        $times = $responses->map(function ($response) {
            return $response->started_at->diffInSeconds($response->submitted_at);
        })->sort()->values();

        $count = $times->count();
        $middle = floor($count / 2);

        if ($count % 2 == 0) {
            return round(($times[$middle - 1] + $times[$middle]) / 2);
        }

        return $times[$middle];
    }

    /**
     * Get completion by question
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getCompletionByQuestion() (lines 1006-1009)
     * Delegates to QuestionAnalyticsService
     */
    public function getCompletionByQuestion(Survey $survey): array
    {
        return $this->questionService->getCompletionByQuestion($survey);
    }

    /**
     * Get dropout points (questions with high skip rates)
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getDropoutPoints() (lines 884-902)
     *
     * @return array Question indices with dropout rate > 30%
     */
    public function getDropoutPoints(Survey $survey): array
    {
        $questions = $survey->questions;
        $responses = $survey->responses;

        $dropoutRates = [];
        foreach ($questions as $index => $question) {
            $answeredCount = $this->questionService->getQuestionResponseCount($responses, $index);
            $dropoutRate = $responses->count() > 0
                ? round((($responses->count() - $answeredCount) / $responses->count()) * 100, 2)
                : 0;

            if ($dropoutRate > 30) { // Significant dropout
                $dropoutRates[] = [
                    'question_index' => $index,
                    'dropout_rate' => $dropoutRate,
                    'question_text' => $question['question'] ?? 'Unknown',
                ];
            }
        }

        return $dropoutRates;
    }

    /**
     * Get completion trends over time
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getCompletionTrends() (lines 869-878)
     */
    public function getCompletionTrends(Survey $survey): array
    {
        return $survey->responses()
            ->selectRaw('DATE(created_at) as date, AVG(progress_percentage) as avg_completion')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('avg_completion', 'date')
            ->toArray();
    }

    /**
     * Get detailed completion analysis
     *
     * Provides comprehensive completion insights
     */
    public function getCompletionAnalysis(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'rates' => [
                'completion_rate' => $this->calculateCompletionRate($survey),
                'partial_rate' => $responses->count() > 0
                    ? round(($responses->where('is_complete', false)->count() / $responses->count()) * 100, 2)
                    : 0,
            ],
            'timing' => [
                'average_time' => $this->calculateAverageCompletionTime($survey),
                'median_time' => $this->calculateMedianCompletionTime($survey),
                'min_time' => $this->getMinCompletionTime($survey),
                'max_time' => $this->getMaxCompletionTime($survey),
            ],
            'dropout_analysis' => [
                'dropout_points' => $this->getDropoutPoints($survey),
                'completion_by_question' => $this->getCompletionByQuestion($survey),
            ],
            'trends' => [
                'completion_trends' => $this->getCompletionTrends($survey),
            ],
        ];
    }

    /**
     * Get minimum completion time
     */
    protected function getMinCompletionTime(Survey $survey): int
    {
        $response = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get()
            ->min(function ($response) {
                return $response->started_at->diffInSeconds($response->submitted_at);
            });

        return $response ?? 0;
    }

    /**
     * Get maximum completion time
     */
    protected function getMaxCompletionTime(Survey $survey): int
    {
        $response = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get()
            ->max(function ($response) {
                return $response->started_at->diffInSeconds($response->submitted_at);
            });

        return $response ?? 0;
    }
}
