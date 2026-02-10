<?php

namespace App\Services\SurveyAnalytics\Domains\Basic;

use App\Models\Survey;
use App\Models\User;

/**
 * Basic Statistics Service
 *
 * Handles basic survey statistics and overview metrics.
 * Extracted from SurveyAnalyticsService (REFACTOR Phase 1).
 *
 * RESPONSIBILITIES:
 * - Basic survey statistics (total responses, completion rates)
 * - Response rate calculations
 * - Completion time analytics
 * - Target estimation for surveys
 */
class BasicStatsService extends BaseService
{
    /**
     * Get basic statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getBasicStats() (lines 146-157)
     */
    public function getBasicStats(Survey $survey): array
    {
        return [
            'total_responses' => $survey->responses->count(),
            'unique_respondents' => $survey->responses->unique('user_id')->count(),
            'response_rate' => $this->calculateResponseRate($survey),
            'completion_rate' => $this->calculateCompletionRate($survey),
            'average_completion_time' => $this->calculateAverageCompletionTime($survey),
            'first_response_at' => $survey->responses->min('created_at'),
            'last_response_at' => $survey->responses->max('created_at'),
        ];
    }

    /**
     * Get analytics overview for a survey
     *
     * Provides high-level summary suitable for dashboards
     */
    public function getAnalyticsOverview(Survey $survey): array
    {
        $basicStats = $this->getBasicStats($survey);
        $targetedUsers = $this->estimateTotalTargeted($survey);

        return [
            'survey_id' => $survey->id,
            'survey_title' => $survey->title,
            'status' => $survey->status,
            'created_at' => $survey->created_at,
            'total_responses' => $basicStats['total_responses'],
            'unique_respondents' => $basicStats['unique_respondents'],
            'response_rate' => $basicStats['response_rate'],
            'completion_rate' => $basicStats['completion_rate'],
            'targeted_users' => $targetedUsers,
            'average_completion_time' => $basicStats['average_completion_time'],
            'response_timeframe' => [
                'first_response' => $basicStats['first_response_at'],
                'last_response' => $basicStats['last_response_at'],
            ],
        ];
    }

    /**
     * Calculate response rate
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateResponseRate() (lines 382-390)
     *
     * @return float Response rate percentage
     */
    public function calculateResponseRate(Survey $survey): float
    {
        $totalTargeted = $this->estimateTotalTargeted($survey);
        $totalResponses = $survey->responses->count();

        if ($totalTargeted == 0) {
            return 0;
        }

        return round(($totalResponses / $totalTargeted) * 100, 2);
    }

    /**
     * Calculate completion rate
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateCompletionRate() (lines 395-403)
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
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::calculateAverageCompletionTime() (lines 408-423)
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
     * Provides a more robust central tendency measure than average
     *
     * @return int Median completion time in seconds
     */
    public function calculateMedianCompletionTime(Survey $survey): int
    {
        $times = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get()
            ->map(function ($response) {
                return $response->started_at->diffInSeconds($response->submitted_at);
            })
            ->sort()
            ->values();

        if ($times->isEmpty()) {
            return 0;
        }

        $count = $times->count();
        $middle = floor($count / 2);

        if ($count % 2 == 0) {
            return round(($times[$middle - 1] + $times[$middle]) / 2);
        }

        return $times[$middle];
    }

    /**
     * Estimate total number of users targeted by survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::estimateTotalTargeted() (lines 830-848)
     *
     * @return int Estimated number of targeted users
     */
    protected function estimateTotalTargeted(Survey $survey): int
    {
        // If survey has target_institutions, count users in those institutions
        if (! empty($survey->target_institutions)) {
            return User::whereIn('institution_id', $survey->target_institutions)
                ->where('is_active', true)
                ->count();
        }

        // If survey has targeting_rules, estimate from rules
        if (! empty($survey->targeting_rules)) {
            $query = User::where('is_active', true);
            $this->applyTargetingRules($query, $survey->targeting_rules);

            return $query->count();
        }

        // Default: assume all active users
        return User::where('is_active', true)->count();
    }

    /**
     * Apply targeting rules to user query
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     */
    protected function applyTargetingRules($query, array $rules): void
    {
        if (isset($rules['roles']) && ! empty($rules['roles'])) {
            $query->whereHas('role', function ($q) use ($rules) {
                $q->whereIn('name', $rules['roles']);
            });
        }

        if (isset($rules['institution_types']) && ! empty($rules['institution_types'])) {
            $query->whereHas('institution', function ($q) use ($rules) {
                $q->whereIn('type', $rules['institution_types']);
            });
        }

        if (isset($rules['institutions']) && ! empty($rules['institutions'])) {
            $query->whereIn('institution_id', $rules['institutions']);
        }
    }
}
