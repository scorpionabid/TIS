<?php

namespace App\Services\SurveyAnalytics\Domains\Response;

use App\Models\Survey;
use Illuminate\Support\Collection;

/**
 * Response Analytics Service
 *
 * Handles response-level analytics and distribution analysis.
 * Extracted from SurveyAnalyticsService (REFACTOR Phase 2).
 *
 * RESPONSIBILITIES:
 * - Response statistics (complete, partial, anonymous)
 * - Response distribution analysis
 * - Daily response tracking
 * - Response pattern analysis
 */
class ResponseAnalyticsService extends BaseService
{
    /**
     * Get response statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getResponseStats() (lines 162-174)
     */
    public function getResponseStats(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'total_responses' => $responses->count(),
            'complete_responses' => $responses->where('is_complete', true)->count(),
            'partial_responses' => $responses->where('is_complete', false)->count(),
            'anonymous_responses' => $responses->whereNull('user_id')->count(),
            'responses_per_day' => $this->getResponsesPerDay($survey),
            'response_distribution' => $this->getResponseDistribution($survey),
        ];
    }

    /**
     * Get comprehensive response analysis
     *
     * Provides detailed insights into response patterns and quality
     */
    public function getResponseAnalysis(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'overview' => [
                'total_count' => $responses->count(),
                'complete_count' => $responses->where('is_complete', true)->count(),
                'partial_count' => $responses->where('is_complete', false)->count(),
                'anonymous_count' => $responses->whereNull('user_id')->count(),
                'authenticated_count' => $responses->whereNotNull('user_id')->count(),
            ],
            'quality_metrics' => [
                'completion_rate' => $this->calculateCompletionRate($responses),
                'authentication_rate' => $this->calculateAuthenticationRate($responses),
                'average_response_time' => $this->calculateAverageResponseTime($responses),
            ],
            'temporal_distribution' => [
                'by_day' => $this->getResponsesPerDay($survey),
                'by_hour' => $this->getResponsesByHour($responses),
                'by_weekday' => $this->getResponsesByWeekday($responses),
            ],
            'patterns' => [
                'peak_response_day' => $this->findPeakResponseDay($survey),
                'peak_response_hour' => $this->findPeakResponseHour($responses),
                'response_velocity' => $this->calculateResponseVelocity($survey),
            ],
        ];
    }

    /**
     * Get responses per day
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getResponsesPerDay() (lines 1014-1023)
     */
    public function getResponsesPerDay(Survey $survey): array
    {
        return $survey->responses()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();
    }

    /**
     * Get response distribution
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getResponseDistribution() (lines 1028-1037)
     */
    public function getResponseDistribution(Survey $survey): array
    {
        return [
            'by_status' => $survey->responses->countBy('status')->toArray(),
            'by_completion' => [
                'complete' => $survey->responses->where('is_complete', true)->count(),
                'partial' => $survey->responses->where('is_complete', false)->count(),
            ],
        ];
    }

    /**
     * Get responses grouped by hour of day
     */
    protected function getResponsesByHour(Collection $responses): array
    {
        return $responses
            ->groupBy(function ($response) {
                return $response->created_at->format('H:00');
            })
            ->map->count()
            ->toArray();
    }

    /**
     * Get responses grouped by day of week
     */
    protected function getResponsesByWeekday(Collection $responses): array
    {
        return $responses
            ->groupBy(function ($response) {
                return $response->created_at->format('l'); // Monday, Tuesday, etc.
            })
            ->map->count()
            ->toArray();
    }

    /**
     * Calculate completion rate from responses
     */
    protected function calculateCompletionRate(Collection $responses): float
    {
        $total = $responses->count();
        if ($total == 0) {
            return 0;
        }

        $complete = $responses->where('is_complete', true)->count();

        return round(($complete / $total) * 100, 2);
    }

    /**
     * Calculate authentication rate (non-anonymous responses)
     */
    protected function calculateAuthenticationRate(Collection $responses): float
    {
        $total = $responses->count();
        if ($total == 0) {
            return 0;
        }

        $authenticated = $responses->whereNotNull('user_id')->count();

        return round(($authenticated / $total) * 100, 2);
    }

    /**
     * Calculate average response time
     *
     * @return int Average time in seconds
     */
    protected function calculateAverageResponseTime(Collection $responses): int
    {
        $timedResponses = $responses
            ->filter(function ($response) {
                return $response->started_at && $response->submitted_at;
            });

        if ($timedResponses->isEmpty()) {
            return 0;
        }

        $totalTime = $timedResponses->sum(function ($response) {
            return $response->started_at->diffInSeconds($response->submitted_at);
        });

        return round($totalTime / $timedResponses->count());
    }

    /**
     * Find peak response day
     */
    protected function findPeakResponseDay(Survey $survey): ?array
    {
        $byDay = $this->getResponsesPerDay($survey);

        if (empty($byDay)) {
            return null;
        }

        $maxDay = array_keys($byDay, max($byDay))[0] ?? null;

        return $maxDay ? [
            'date' => $maxDay,
            'count' => $byDay[$maxDay],
        ] : null;
    }

    /**
     * Find peak response hour
     */
    protected function findPeakResponseHour(Collection $responses): ?array
    {
        $byHour = $this->getResponsesByHour($responses);

        if (empty($byHour)) {
            return null;
        }

        $maxHour = array_keys($byHour, max($byHour))[0] ?? null;

        return $maxHour ? [
            'hour' => $maxHour,
            'count' => $byHour[$maxHour],
        ] : null;
    }

    /**
     * Calculate response velocity (responses per day since start)
     */
    protected function calculateResponseVelocity(Survey $survey): float
    {
        $responses = $survey->responses;

        if ($responses->isEmpty()) {
            return 0;
        }

        $firstResponse = $responses->min('created_at');
        $daysSinceStart = now()->diffInDays($firstResponse) ?: 1;

        return round($responses->count() / $daysSinceStart, 2);
    }
}
