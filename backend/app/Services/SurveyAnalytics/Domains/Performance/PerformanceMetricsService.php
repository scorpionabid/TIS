<?php

namespace App\Services\SurveyAnalytics\Domains\Performance;

use App\Models\Survey;
use App\Models\User;

/**
 * Performance Metrics Service
 *
 * Handles survey performance scoring and quality metrics.
 * Extracted from SurveyAnalyticsService (REFACTOR Phase 6).
 *
 * RESPONSIBILITIES:
 * - Engagement score calculation
 * - Quality score calculation
 * - Reach score calculation
 * - Overall performance aggregation
 *
 * @package App\Services\SurveyAnalytics\Domains\Performance
 */
class PerformanceMetricsService
{
    /**
     * Get performance metrics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getPerformanceMetrics() (lines 239-246)
     *
     * @param Survey $survey
     * @return array
     */
    public function getPerformanceMetrics(Survey $survey): array
    {
        return [
            'engagement_score' => $this->calculateEngagementScore($survey),
            'quality_score' => $this->calculateQualityScore($survey),
            'reach_score' => $this->calculateReachScore($survey),
            'satisfaction_score' => $this->calculateSatisfactionScore($survey),
            'overall_performance' => $this->calculateOverallPerformance($survey)
        ];
    }

    /**
     * Calculate engagement score
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateEngagementScore() (lines 908-925)
     *
     * @param Survey $survey
     * @return float Engagement score (0-100)
     */
    public function calculateEngagementScore(Survey $survey): float
    {
        $responseRate = $this->calculateResponseRate($survey);
        $completionRate = $this->calculateCompletionRate($survey);
        $avgTime = $this->calculateAverageCompletionTime($survey);

        // Weighted score (response rate 40%, completion rate 40%, time 20%)
        $score = ($responseRate * 0.4) + ($completionRate * 0.4);

        // Adjust for completion time (faster is better, up to a point)
        if ($avgTime > 0 && $avgTime < 600) { // Less than 10 minutes
            $score += 20;
        } elseif ($avgTime < 1800) { // Less than 30 minutes
            $score += 10;
        }

        return round(min($score, 100), 2);
    }

    /**
     * Calculate quality score
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateQualityScore() (lines 930-939)
     *
     * @param Survey $survey
     * @return float Quality score (0-100)
     */
    public function calculateQualityScore(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        if ($totalResponses == 0) return 0;

        $completeResponses = $survey->responses->where('is_complete', true)->count();
        $qualityScore = ($completeResponses / $totalResponses) * 100;

        return round($qualityScore, 2);
    }

    /**
     * Calculate reach score
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateReachScore() (lines 944-952)
     *
     * @param Survey $survey
     * @return float Reach score (0-100)
     */
    public function calculateReachScore(Survey $survey): float
    {
        $targeted = $this->estimateTotalTargeted($survey);
        $reached = $survey->responses->count();

        if ($targeted == 0) return 0;

        return round(($reached / $targeted) * 100, 2);
    }

    /**
     * Calculate satisfaction score
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateSatisfactionScore() (lines 957-962)
     *
     * @param Survey $survey
     * @return float Satisfaction score (0-100)
     */
    public function calculateSatisfactionScore(Survey $survey): float
    {
        // This would need satisfaction questions in the survey
        // For now, return a placeholder based on completion rate
        return $this->calculateCompletionRate($survey);
    }

    /**
     * Calculate overall performance score
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateOverallPerformance() (lines 967-974)
     *
     * @param Survey $survey
     * @return float Overall performance score (0-100)
     */
    public function calculateOverallPerformance(Survey $survey): float
    {
        $engagement = $this->calculateEngagementScore($survey);
        $quality = $this->calculateQualityScore($survey);
        $reach = $this->calculateReachScore($survey);

        return round(($engagement + $quality + $reach) / 3, 2);
    }

    /**
     * Get comprehensive performance analysis
     *
     * @param Survey $survey
     * @return array
     */
    public function getPerformanceAnalysis(Survey $survey): array
    {
        return [
            'scores' => $this->getPerformanceMetrics($survey),
            'breakdown' => [
                'engagement' => [
                    'score' => $this->calculateEngagementScore($survey),
                    'factors' => [
                        'response_rate' => $this->calculateResponseRate($survey),
                        'completion_rate' => $this->calculateCompletionRate($survey),
                        'average_time' => $this->calculateAverageCompletionTime($survey)
                    ]
                ],
                'quality' => [
                    'score' => $this->calculateQualityScore($survey),
                    'complete_responses' => $survey->responses->where('is_complete', true)->count(),
                    'total_responses' => $survey->responses->count()
                ],
                'reach' => [
                    'score' => $this->calculateReachScore($survey),
                    'targeted_users' => $this->estimateTotalTargeted($survey),
                    'actual_responses' => $survey->responses->count()
                ]
            ],
            'grade' => $this->calculatePerformanceGrade($survey)
        ];
    }

    /**
     * Calculate performance grade (A-F)
     *
     * @param Survey $survey
     * @return string
     */
    protected function calculatePerformanceGrade(Survey $survey): string
    {
        $overall = $this->calculateOverallPerformance($survey);

        if ($overall >= 90) return 'A';
        if ($overall >= 80) return 'B';
        if ($overall >= 70) return 'C';
        if ($overall >= 60) return 'D';
        return 'F';
    }

    // Helper methods (shared logic)

    protected function calculateResponseRate(Survey $survey): float
    {
        $totalTargeted = $this->estimateTotalTargeted($survey);
        $totalResponses = $survey->responses->count();

        if ($totalTargeted == 0) return 0;

        return round(($totalResponses / $totalTargeted) * 100, 2);
    }

    protected function calculateCompletionRate(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        $completeResponses = $survey->responses->where('is_complete', true)->count();

        if ($totalResponses == 0) return 0;

        return round(($completeResponses / $totalResponses) * 100, 2);
    }

    protected function calculateAverageCompletionTime(Survey $survey): int
    {
        $responses = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get();

        if ($responses->isEmpty()) return 0;

        $totalTime = 0;
        foreach ($responses as $response) {
            $totalTime += $response->started_at->diffInSeconds($response->submitted_at);
        }

        return round($totalTime / $responses->count());
    }

    protected function estimateTotalTargeted(Survey $survey): int
    {
        // If survey has target_institutions, count users in those institutions
        if (!empty($survey->target_institutions)) {
            return User::whereIn('institution_id', $survey->target_institutions)
                ->where('is_active', true)
                ->count();
        }

        // If survey has targeting_rules, estimate from rules
        if (!empty($survey->targeting_rules)) {
            $query = User::where('is_active', true);
            $this->applyTargetingRules($query, $survey->targeting_rules);
            return $query->count();
        }

        // Default: assume all active users
        return User::where('is_active', true)->count();
    }

    protected function applyTargetingRules($query, array $rules): void
    {
        if (isset($rules['roles']) && !empty($rules['roles'])) {
            $query->whereHas('role', function ($q) use ($rules) {
                $q->whereIn('name', $rules['roles']);
            });
        }

        if (isset($rules['institution_types']) && !empty($rules['institution_types'])) {
            $query->whereHas('institution', function ($q) use ($rules) {
                $q->whereIn('type', $rules['institution_types']);
            });
        }

        if (isset($rules['institutions']) && !empty($rules['institutions'])) {
            $query->whereIn('institution_id', $rules['institutions']);
        }
    }
}
