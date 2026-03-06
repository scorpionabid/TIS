<?php

namespace App\Services\SurveyAnalytics\Domains\Temporal;

use App\Models\Survey;
use Illuminate\Support\Collection;

/**
 * Temporal Analytics Service
 *
 * Handles time-based analytics and trend analysis.
 * Extracted from SurveyAnalyticsService (REFACTOR Phase 4).
 *
 * RESPONSIBILITIES:
 * - Time-based response distribution (hour, day, week)
 * - Temporal trends and patterns
 * - Response timing analysis
 * - Peak activity identification
 */
class TemporalAnalyticsService
{
    /**
     * Get temporal statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyAnalyticsService::getTemporalStats() (lines 193-208)
     */
    public function getTemporalStats(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'responses_by_hour' => $responses->groupBy(function ($response) {
                return $response->created_at->format('H:00');
            })->map->count()->toArray(),
            'responses_by_day' => $responses->groupBy(function ($response) {
                return $response->created_at->format('Y-m-d');
            })->map->count()->toArray(),
            'responses_by_week' => $responses->groupBy(function ($response) {
                return $response->created_at->format('Y-W');
            })->map->count()->toArray(),
        ];
    }

    /**
     * Get comprehensive trend analysis
     *
     * Provides detailed temporal insights and patterns
     */
    public function getTrendAnalysis(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'temporal_distribution' => $this->getTemporalStats($survey),
            'peak_times' => [
                'peak_hour' => $this->findPeakHour($responses),
                'peak_day' => $this->findPeakDay($responses),
                'peak_weekday' => $this->findPeakWeekday($responses),
            ],
            'activity_patterns' => [
                'by_weekday' => $this->getResponsesByWeekday($responses),
                'by_month' => $this->getResponsesByMonth($responses),
                'business_hours_vs_off_hours' => $this->getBusinessHoursDistribution($responses),
            ],
            'velocity' => [
                'responses_per_day' => $this->calculateResponsesPerDay($survey),
                'cumulative_responses' => $this->getCumulativeResponses($survey),
            ],
        ];
    }

    /**
     * Get responses grouped by weekday
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
     * Get responses grouped by month
     */
    protected function getResponsesByMonth(Collection $responses): array
    {
        return $responses
            ->groupBy(function ($response) {
                return $response->created_at->format('Y-m');
            })
            ->map->count()
            ->toArray();
    }

    /**
     * Find peak hour of responses
     */
    protected function findPeakHour(Collection $responses): ?array
    {
        $byHour = $responses
            ->groupBy(function ($response) {
                return $response->created_at->format('H:00');
            })
            ->map->count();

        if ($byHour->isEmpty()) {
            return null;
        }

        $maxHour = $byHour->keys()->first(function ($hour) use ($byHour) {
            return $byHour[$hour] === $byHour->max();
        });

        return [
            'hour' => $maxHour,
            'count' => $byHour[$maxHour],
        ];
    }

    /**
     * Find peak day of responses
     */
    protected function findPeakDay(Collection $responses): ?array
    {
        $byDay = $responses
            ->groupBy(function ($response) {
                return $response->created_at->format('Y-m-d');
            })
            ->map->count();

        if ($byDay->isEmpty()) {
            return null;
        }

        $maxDay = $byDay->keys()->first(function ($day) use ($byDay) {
            return $byDay[$day] === $byDay->max();
        });

        return [
            'date' => $maxDay,
            'count' => $byDay[$maxDay],
        ];
    }

    /**
     * Find peak weekday of responses
     */
    protected function findPeakWeekday(Collection $responses): ?array
    {
        $byWeekday = $this->getResponsesByWeekday($responses);

        if (empty($byWeekday)) {
            return null;
        }

        $maxWeekday = array_keys($byWeekday, max($byWeekday))[0] ?? null;

        return $maxWeekday ? [
            'weekday' => $maxWeekday,
            'count' => $byWeekday[$maxWeekday],
        ] : null;
    }

    /**
     * Get business hours vs off-hours distribution
     *
     * Business hours: 9 AM - 5 PM on weekdays
     */
    protected function getBusinessHoursDistribution(Collection $responses): array
    {
        $businessHours = $responses->filter(function ($response) {
            $hour = (int) $response->created_at->format('H');
            $isWeekday = ! in_array($response->created_at->dayOfWeek, [0, 6]); // Not Sunday or Saturday

            return $isWeekday && $hour >= 9 && $hour < 17;
        })->count();

        $offHours = $responses->count() - $businessHours;

        return [
            'business_hours' => $businessHours,
            'off_hours' => $offHours,
            'business_hours_percentage' => $responses->count() > 0
                ? round(($businessHours / $responses->count()) * 100, 2)
                : 0,
        ];
    }

    /**
     * Calculate average responses per day
     */
    protected function calculateResponsesPerDay(Survey $survey): float
    {
        $responses = $survey->responses;

        if ($responses->isEmpty()) {
            return 0;
        }

        $firstResponse = $responses->min('created_at');
        $lastResponse = $responses->max('created_at');
        $daysDiff = $firstResponse->diffInDays($lastResponse) ?: 1;

        return round($responses->count() / $daysDiff, 2);
    }

    /**
     * Get cumulative responses over time
     */
    protected function getCumulativeResponses(Survey $survey): array
    {
        $byDay = $survey->responses()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $cumulative = [];
        $runningTotal = 0;

        foreach ($byDay as $day) {
            $runningTotal += $day->count;
            $cumulative[$day->date] = $runningTotal;
        }

        return $cumulative;
    }
}
