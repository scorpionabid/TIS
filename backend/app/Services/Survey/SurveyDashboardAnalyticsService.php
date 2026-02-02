<?php

namespace App\Services\Survey;

use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SurveyDashboardAnalyticsService
{
    /**
     * Get comprehensive dashboard statistics
     */
    public function getDashboardStatistics(): array
    {
        $user = Auth::user();
        
        return [
            'overview' => $this->getOverviewMetrics($user),
            'recent_surveys' => $this->getRecentSurveys($user),
            'performance_metrics' => $this->getPerformanceMetrics($user),
            'quick_stats' => $this->getQuickStats($user),
            'trends' => $this->getDashboardTrends($user),
        ];
    }

    /**
     * Get overview metrics for dashboard
     */
    protected function getOverviewMetrics($user): array
    {
        $baseQuery = Survey::where('created_by', $user->id);
        
        return [
            'total_surveys' => $baseQuery->count(),
            'active_surveys' => $baseQuery->whereIn('status', ['published', 'active'])->count(),
            'completed_surveys' => $baseQuery->where('status', 'completed')->count(),
            'total_responses' => $baseQuery->withCount('responses')->get()->sum('responses_count'),
            'avg_response_rate' => $this->calculateAverageResponseRate($user),
            'avg_completion_rate' => $this->calculateAverageCompletionRate($user),
        ];
    }

    /**
     * Get recent surveys with basic stats
     */
    protected function getRecentSurveys($user): array
    {
        return Survey::where('created_by', $user->id)
            ->withCount('responses')
            ->with(['responses' => function ($query) {
                $query->where('is_complete', true);
            }])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($survey) {
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'status' => $survey->status,
                    'created_at' => $survey->created_at->format('Y-m-d'),
                    'total_responses' => $survey->responses_count,
                    'complete_responses' => $survey->responses->where('is_complete', true)->count(),
                    'response_rate' => $survey->responses_count > 0 ? 
                        round(($survey->responses->where('is_complete', true)->count() / $survey->responses_count) * 100, 2) : 0,
                ];
            })
            ->toArray();
    }

    /**
     * Get performance metrics
     */
    protected function getPerformanceMetrics($user): array
    {
        $surveys = Survey::where('created_by', $user->id)->get();
        
        if ($surveys->isEmpty()) {
            return [
                'best_performing' => null,
                'worst_performing' => null,
                'most_engaging' => null,
                'least_engaging' => null,
            ];
        }

        $surveyScores = $surveys->map(function ($survey) {
            return [
                'id' => $survey->id,
                'title' => $survey->title,
                'score' => $this->calculateEngagementScore($survey),
                'responses' => $survey->responses->count(),
            ];
        });

        return [
            'best_performing' => $surveyScores->sortByDesc('score')->first(),
            'worst_performing' => $surveyScores->sortBy('score')->first(),
            'most_engaging' => $surveyScores->sortByDesc('responses')->first(),
            'least_engaging' => $surveyScores->sortBy('responses')->first(),
        ];
    }

    /**
     * Get quick statistics for dashboard
     */
    protected function getQuickStats($user): array
    {
        $today = now()->startOfDay();
        $thisWeek = now()->startOfWeek();
        $thisMonth = now()->startOfMonth();

        return [
            'responses_today' => SurveyResponse::whereHas('survey', function ($query) use ($user) {
                $query->where('created_by', $user->id);
            })->where('created_at', '>=', $today)->count(),
            
            'responses_this_week' => SurveyResponse::whereHas('survey', function ($query) use ($user) {
                $query->where('created_by', $user->id);
            })->where('created_at', '>=', $thisWeek)->count(),
            
            'responses_this_month' => SurveyResponse::whereHas('survey', function ($query) use ($user) {
                $query->where('created_by', $user->id);
            })->where('created_at', '>=', $thisMonth)->count(),
            
            'surveys_published_this_month' => Survey::where('created_by', $user->id)
                ->where('status', 'published')
                ->where('published_at', '>=', $thisMonth)
                ->count(),
        ];
    }

    /**
     * Get dashboard trends
     */
    protected function getDashboardTrends($user): array
    {
        // Last 30 days response trends
        $responseTrends = SurveyResponse::whereHas('survey', function ($query) use ($user) {
                $query->where('created_by', $user->id);
            })
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'responses' => $item->count,
                ];
            });

        // Survey creation trends
        $surveyTrends = Survey::where('created_by', $user->id)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'surveys' => $item->count,
                ];
            });

        return [
            'response_trends' => $responseTrends->toArray(),
            'survey_trends' => $surveyTrends->toArray(),
            'period' => '30_days',
            'total_period_responses' => $responseTrends->sum('responses'),
            'total_period_surveys' => $surveyTrends->sum('surveys'),
        ];
    }

    /**
     * Calculate average response rate for user's surveys
     */
    protected function calculateAverageResponseRate($user): float
    {
        $surveys = Survey::where('created_by', $user->id)->get();
        
        if ($surveys->isEmpty()) {
            return 0;
        }

        $totalRate = 0;
        $validSurveys = 0;

        foreach ($surveys as $survey) {
            $rate = $this->calculateSurveyResponseRate($survey);
            if ($rate > 0) {
                $totalRate += $rate;
                $validSurveys++;
            }
        }

        return $validSurveys > 0 ? round($totalRate / $validSurveys, 2) : 0;
    }

    /**
     * Calculate average completion rate for user's surveys
     */
    protected function calculateAverageCompletionRate($user): float
    {
        $surveys = Survey::where('created_by', $user->id)->get();
        
        if ($surveys->isEmpty()) {
            return 0;
        }

        $totalRate = 0;
        $validSurveys = 0;

        foreach ($surveys as $survey) {
            $rate = $this->calculateSurveyCompletionRate($survey);
            if ($rate > 0) {
                $totalRate += $rate;
                $validSurveys++;
            }
        }

        return $validSurveys > 0 ? round($totalRate / $validSurveys, 2) : 0;
    }

    /**
     * Calculate response rate for a specific survey
     */
    protected function calculateSurveyResponseRate(Survey $survey): float
    {
        // Simplified calculation - in real implementation would use targeting rules
        $estimatedTargeted = 100; // This would come from targeting service
        $actualResponses = $survey->responses->count();

        return $estimatedTargeted > 0 ? round(($actualResponses / $estimatedTargeted) * 100, 2) : 0;
    }

    /**
     * Calculate completion rate for a specific survey
     */
    protected function calculateSurveyCompletionRate(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        $completeResponses = $survey->responses->where('is_complete', true)->count();

        return $totalResponses > 0 ? round(($completeResponses / $totalResponses) * 100, 2) : 0;
    }

    /**
     * Calculate engagement score for a survey
     */
    protected function calculateEngagementScore(Survey $survey): float
    {
        $responseRate = $this->calculateSurveyResponseRate($survey);
        $completionRate = $this->calculateSurveyCompletionRate($survey);

        // Simple weighted average
        return round(($responseRate * 0.6) + ($completionRate * 0.4), 2);
    }

    /**
     * Get survey status distribution
     */
    public function getSurveyStatusDistribution($user): array
    {
        return Survey::where('created_by', $user->id)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->status => $item->count];
            })
            ->toArray();
    }

    /**
     * Get response activity heatmap data
     */
    public function getResponseActivityHeatmap($user): array
    {
        return SurveyResponse::whereHas('survey', function ($query) use ($user) {
                $query->where('created_by', $user->id);
            })
            ->where('created_at', '>=', now()->subDays(90))
            ->selectRaw('
                EXTRACT(HOUR FROM created_at) as hour,
                EXTRACT(DOW FROM created_at) as day_of_week,
                COUNT(*) as count
            ')
            ->groupBy('hour', 'day_of_week')
            ->get()
            ->map(function ($item) {
                return [
                    'hour' => (int) $item->hour,
                    'day_of_week' => (int) $item->day_of_week,
                    'responses' => $item->count,
                ];
            })
            ->toArray();
    }

    /**
     * Get top performing surveys
     */
    public function getTopPerformingSurveys($user, int $limit = 5): array
    {
        return Survey::where('created_by', $user->id)
            ->withCount('responses')
            ->with(['responses' => function ($query) {
                $query->where('is_complete', true);
            }])
            ->get()
            ->map(function ($survey) {
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'responses' => $survey->responses_count,
                    'completion_rate' => $survey->responses_count > 0 ? 
                        round(($survey->responses->where('is_complete', true)->count() / $survey->responses_count) * 100, 2) : 0,
                    'engagement_score' => $this->calculateEngagementScore($survey),
                ];
            })
            ->sortByDesc('engagement_score')
            ->take($limit)
            ->values()
            ->toArray();
    }
}
