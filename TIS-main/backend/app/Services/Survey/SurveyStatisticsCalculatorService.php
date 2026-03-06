<?php

namespace App\Services\Survey;

use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Support\Facades\Auth;

class SurveyStatisticsCalculatorService
{
    /**
     * Calculate response rate for a survey
     */
    public function calculateResponseRate(Survey $survey): float
    {
        $totalTargeted = $this->estimateTotalTargeted($survey);
        $totalResponses = $survey->responses->count();

        if ($totalTargeted === 0) {
            return 0;
        }

        return round(($totalResponses / $totalTargeted) * 100, 2);
    }

    /**
     * Calculate completion rate for a survey
     */
    public function calculateCompletionRate(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        $completeResponses = $survey->responses->where('is_complete', true)->count();

        if ($totalResponses === 0) {
            return 0;
        }

        return round(($completeResponses / $totalResponses) * 100, 2);
    }

    /**
     * Calculate average completion time in seconds
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

        $totalTime = $responses->sum(function ($response) {
            return $response->started_at->diffInSeconds($response->submitted_at);
        });

        return round($totalTime / $responses->count());
    }

    /**
     * Calculate engagement score based on multiple factors
     */
    public function calculateEngagementScore(Survey $survey): float
    {
        $responseRate = $this->calculateResponseRate($survey);
        $completionRate = $this->calculateCompletionRate($survey);
        $avgCompletionTime = $this->calculateAverageCompletionTime($survey);

        // Normalize completion time (lower is better, max 30 minutes)
        $timeScore = max(0, 100 - ($avgCompletionTime / 1800) * 100);

        // Weighted average
        $engagementScore = ($responseRate * 0.4) + ($completionRate * 0.4) + ($timeScore * 0.2);

        return round($engagementScore, 2);
    }

    /**
     * Get responses per day distribution
     */
    public function getResponsesPerDay(Survey $survey): array
    {
        return $survey->responses
            ->groupBy(function ($response) {
                return $response->created_at->format('Y-m-d');
            })
            ->map->count()
            ->toArray();
    }

    /**
     * Get response distribution by status
     */
    public function getResponseDistribution(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'complete' => $responses->where('is_complete', true)->count(),
            'partial' => $responses->where('is_complete', false)->count(),
            'anonymous' => $responses->whereNull('user_id')->count(),
            'identified' => $responses->whereNotNull('user_id')->count(),
        ];
    }

    /**
     * Get demographic breakdown by role
     */
    public function getDemographicByRole(Survey $survey): array
    {
        $responses = $survey->responses()->with(['respondent.role'])->get();

        return $responses
            ->groupBy('respondent.role.name')
            ->map->count()
            ->toArray();
    }

    /**
     * Get demographic breakdown by institution
     */
    public function getDemographicByInstitution(Survey $survey): array
    {
        $responses = $survey->responses()->with(['respondent.institution'])->get();

        return $responses
            ->groupBy('respondent.institution.name')
            ->map->count()
            ->toArray();
    }

    /**
     * Get temporal statistics (hourly, daily, weekly)
     */
    public function getTemporalStats(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'responses_by_hour' => $responses->groupBy(function ($response) {
                return $response->created_at->format('H:00');
            })->map->count(),
            'responses_by_day' => $responses->groupBy(function ($response) {
                return $response->created_at->format('Y-m-d');
            })->map->count(),
            'responses_by_week' => $responses->groupBy(function ($response) {
                return $response->created_at->format('Y-W');
            })->map->count(),
        ];
    }

    /**
     * Estimate total targeted users for a survey
     */
    protected function estimateTotalTargeted(Survey $survey): int
    {
        // This would integrate with SurveyTargetingService
        // For now, return a reasonable estimate
        return $survey->targeting_rules ? 1000 : 500;
    }

    /**
     * Get completion statistics
     */
    public function getCompletionStats(Survey $survey): array
    {
        $responses = $survey->responses;

        return [
            'total_responses' => $responses->count(),
            'complete_responses' => $responses->where('is_complete', true)->count(),
            'partial_responses' => $responses->where('is_complete', false)->count(),
            'completion_rate' => $this->calculateCompletionRate($survey),
            'average_completion_time' => $this->calculateAverageCompletionTime($survey),
            'engagement_score' => $this->calculateEngagementScore($survey),
        ];
    }
}
