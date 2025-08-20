<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;

class SurveyAnalyticsService
{
    /**
     * Get comprehensive survey statistics
     */
    public function getSurveyStatistics(Survey $survey): array
    {
        $survey->load(['responses.user', 'creator']);
        
        return [
            'basic_stats' => $this->getBasicStats($survey),
            'response_stats' => $this->getResponseStats($survey),
            'demographic_stats' => $this->getDemographicStats($survey),
            'temporal_stats' => $this->getTemporalStats($survey),
            'completion_stats' => $this->getCompletionStats($survey),
            'question_stats' => $this->getQuestionStats($survey),
            'performance_metrics' => $this->getPerformanceMetrics($survey)
        ];
    }
    
    /**
     * Get survey analytics with insights
     */
    public function getSurveyAnalytics(Survey $survey): array
    {
        $survey->load(['responses' => function ($query) {
            $query->with(['user.role', 'user.institution'])->latest();
        }]);
        
        return [
            'overview' => $this->getAnalyticsOverview($survey),
            'response_analysis' => $this->getResponseAnalysis($survey),
            'question_analysis' => $this->getQuestionAnalysis($survey),
            'user_engagement' => $this->getUserEngagement($survey),
            'trend_analysis' => $this->getTrendAnalysis($survey),
            'insights' => $this->generateInsights($survey),
            'recommendations' => $this->generateRecommendations($survey)
        ];
    }
    
    /**
     * Get dashboard statistics
     */
    public function getDashboardStatistics(): array
    {
        $userInstitutionId = Auth::user()->institution_id;
        
        return [
            'overview' => $this->getDashboardOverview($userInstitutionId),
            'recent_surveys' => $this->getRecentSurveys($userInstitutionId),
            'top_performing' => $this->getTopPerformingSurveys($userInstitutionId),
            'activity_trends' => $this->getActivityTrends($userInstitutionId),
            'response_rates' => $this->getResponseRates($userInstitutionId),
            'user_participation' => $this->getUserParticipation($userInstitutionId)
        ];
    }
    
    /**
     * Estimate survey recipients
     */
    public function estimateRecipients(array $targetingRules): array
    {
        $query = User::where('is_active', true);
        
        // Apply targeting rules
        $this->applyTargetingRules($query, $targetingRules);
        
        $totalCount = $query->count();
        $breakdown = $this->getRecipientBreakdown($query);
        
        return [
            'total_recipients' => $totalCount,
            'breakdown' => $breakdown,
            'targeting_rules' => $targetingRules,
            'estimated_responses' => $this->estimateResponseCount($totalCount, $targetingRules),
            'estimated_duration' => $this->estimateSurveyDuration($totalCount),
            'recommendations' => $this->getTargetingRecommendations($totalCount, $breakdown)
        ];
    }
    
    /**
     * Export survey data for analysis
     */
    public function exportSurveyData(Survey $survey, string $format = 'json'): array
    {
        $survey->load(['responses' => function ($query) {
            $query->with(['user.role', 'user.institution'])->latest();
        }]);
        
        $exportData = [
            'survey_info' => [
                'id' => $survey->id,
                'title' => $survey->title,
                'type' => $survey->survey_type,
                'status' => $survey->status,
                'created_at' => $survey->created_at,
                'published_at' => $survey->published_at
            ],
            'questions' => $survey->questions,
            'responses' => $survey->responses->map(function ($response) {
                return [
                    'id' => $response->id,
                    'user_id' => $response->user_id,
                    'user_role' => $response->user?->role?->name,
                    'user_institution' => $response->user?->institution?->name,
                    'answers' => $response->answers,
                    'submitted_at' => $response->created_at,
                    'completion_time' => $response->completion_time
                ];
            }),
            'statistics' => $this->getSurveyStatistics($survey),
            'exported_at' => now(),
            'exported_by' => Auth::user()->username
        ];
        
        return [
            'format' => $format,
            'data' => $exportData,
            'file_size' => strlen(json_encode($exportData)),
            'record_count' => $survey->responses->count()
        ];
    }
    
    /**
     * Get basic survey stats
     */
    protected function getBasicStats(Survey $survey): array
    {
        return [
            'total_responses' => $survey->responses->count(),
            'unique_respondents' => $survey->responses->unique('user_id')->count(),
            'response_rate' => $this->calculateResponseRate($survey),
            'completion_rate' => $this->calculateCompletionRate($survey),
            'average_completion_time' => $this->calculateAverageCompletionTime($survey),
            'first_response_at' => $survey->responses->min('created_at'),
            'last_response_at' => $survey->responses->max('created_at')
        ];
    }
    
    /**
     * Get response statistics
     */
    protected function getResponseStats(Survey $survey): array
    {
        $responses = $survey->responses;
        
        return [
            'total_responses' => $responses->count(),
            'complete_responses' => $responses->where('is_complete', true)->count(),
            'partial_responses' => $responses->where('is_complete', false)->count(),
            'anonymous_responses' => $responses->whereNull('user_id')->count(),
            'responses_per_day' => $this->getResponsesPerDay($survey),
            'response_distribution' => $this->getResponseDistribution($survey)
        ];
    }
    
    /**
     * Get demographic statistics
     */
    protected function getDemographicStats(Survey $survey): array
    {
        $responses = $survey->responses()->with(['user.role', 'user.institution'])->get();
        
        return [
            'by_role' => $responses->groupBy('user.role.name')->map->count(),
            'by_institution' => $responses->groupBy('user.institution.name')->map->count(),
            'by_institution_type' => $responses->groupBy('user.institution.type')->map->count(),
            'age_distribution' => $this->getAgeDistribution($responses),
            'gender_distribution' => $this->getGenderDistribution($responses)
        ];
    }
    
    /**
     * Get temporal statistics
     */
    protected function getTemporalStats(Survey $survey): array
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
            'peak_response_time' => $this->getPeakResponseTime($responses),
            'response_velocity' => $this->getResponseVelocity($responses)
        ];
    }
    
    /**
     * Get completion statistics
     */
    protected function getCompletionStats(Survey $survey): array
    {
        $responses = $survey->responses;
        
        return [
            'completion_rate' => $this->calculateCompletionRate($survey),
            'average_time' => $this->calculateAverageCompletionTime($survey),
            'median_time' => $this->calculateMedianCompletionTime($survey),
            'completion_by_question' => $this->getCompletionByQuestion($survey),
            'dropout_points' => $this->getDropoutPoints($survey),
            'completion_trends' => $this->getCompletionTrends($survey)
        ];
    }
    
    /**
     * Get question-level statistics
     */
    protected function getQuestionStats(Survey $survey): array
    {
        $questions = $survey->questions;
        $responses = $survey->responses;
        
        $questionStats = [];
        foreach ($questions as $index => $question) {
            $questionStats[] = [
                'question_index' => $index,
                'question_text' => $question['question'],
                'question_type' => $question['type'],
                'response_count' => $this->getQuestionResponseCount($responses, $index),
                'skip_rate' => $this->getQuestionSkipRate($responses, $index),
                'answer_distribution' => $this->getAnswerDistribution($responses, $index, $question['type']),
                'average_rating' => $this->getAverageRating($responses, $index, $question['type'])
            ];
        }
        
        return $questionStats;
    }
    
    /**
     * Get performance metrics
     */
    protected function getPerformanceMetrics(Survey $survey): array
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
     * Get analytics overview
     */
    protected function getAnalyticsOverview(Survey $survey): array
    {
        return [
            'key_metrics' => $this->getKeyMetrics($survey),
            'performance_indicators' => $this->getPerformanceIndicators($survey),
            'health_status' => $this->getSurveyHealthStatus($survey),
            'comparison_data' => $this->getComparisonData($survey)
        ];
    }
    
    /**
     * Get response analysis
     */
    protected function getResponseAnalysis(Survey $survey): array
    {
        return [
            'response_patterns' => $this->getResponsePatterns($survey),
            'response_quality' => $this->getResponseQuality($survey),
            'response_timing' => $this->getResponseTiming($survey),
            'respondent_behavior' => $this->getRespondentBehavior($survey)
        ];
    }
    
    /**
     * Get question analysis
     */
    protected function getQuestionAnalysis(Survey $survey): array
    {
        $questions = $survey->questions;
        $analysis = [];
        
        foreach ($questions as $index => $question) {
            $analysis[] = [
                'question_index' => $index,
                'performance' => $this->getQuestionPerformance($survey, $index),
                'engagement' => $this->getQuestionEngagement($survey, $index),
                'clarity_score' => $this->getQuestionClarityScore($survey, $index),
                'insights' => $this->getQuestionInsights($survey, $index)
            ];
        }
        
        return $analysis;
    }
    
    /**
     * Get user engagement metrics
     */
    protected function getUserEngagement(Survey $survey): array
    {
        return [
            'participation_rate' => $this->calculateParticipationRate($survey),
            'repeat_participants' => $this->getRepeatParticipants($survey),
            'engagement_by_segment' => $this->getEngagementBySegment($survey),
            'engagement_trends' => $this->getEngagementTrends($survey)
        ];
    }
    
    /**
     * Get trend analysis
     */
    protected function getTrendAnalysis(Survey $survey): array
    {
        return [
            'response_trends' => $this->getResponseTrends($survey),
            'completion_trends' => $this->getCompletionTrends($survey),
            'quality_trends' => $this->getQualityTrends($survey),
            'seasonal_patterns' => $this->getSeasonalPatterns($survey)
        ];
    }
    
    /**
     * Generate insights
     */
    protected function generateInsights(Survey $survey): array
    {
        $insights = [];
        
        // Response rate insights
        $responseRate = $this->calculateResponseRate($survey);
        if ($responseRate < 20) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'response_rate',
                'message' => 'Low response rate detected. Consider improving survey promotion or incentives.',
                'metric' => $responseRate . '%'
            ];
        }
        
        // Completion rate insights
        $completionRate = $this->calculateCompletionRate($survey);
        if ($completionRate < 70) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'completion',
                'message' => 'High dropout rate. Survey may be too long or complex.',
                'metric' => $completionRate . '%'
            ];
        }
        
        // Question performance insights
        $dropoutPoints = $this->getDropoutPoints($survey);
        if (!empty($dropoutPoints)) {
            $insights[] = [
                'type' => 'info',
                'category' => 'questions',
                'message' => 'Significant dropout detected at question ' . $dropoutPoints[0],
                'metric' => 'Question ' . $dropoutPoints[0]
            ];
        }
        
        return $insights;
    }
    
    /**
     * Generate recommendations
     */
    protected function generateRecommendations(Survey $survey): array
    {
        $recommendations = [];
        
        $responseRate = $this->calculateResponseRate($survey);
        $completionRate = $this->calculateCompletionRate($survey);
        
        if ($responseRate < 30) {
            $recommendations[] = [
                'priority' => 'high',
                'category' => 'promotion',
                'title' => 'Improve Survey Promotion',
                'description' => 'Consider additional promotion channels or incentives to increase response rate.',
                'actions' => [
                    'Send reminder notifications',
                    'Offer incentives for completion',
                    'Improve survey invitation messaging'
                ]
            ];
        }
        
        if ($completionRate < 60) {
            $recommendations[] = [
                'priority' => 'high',
                'category' => 'optimization',
                'title' => 'Optimize Survey Length',
                'description' => 'High dropout rate suggests survey may be too long or complex.',
                'actions' => [
                    'Reduce number of questions',
                    'Simplify question language',
                    'Add progress indicators'
                ]
            ];
        }
        
        return $recommendations;
    }
    
    /**
     * Calculate response rate
     */
    protected function calculateResponseRate(Survey $survey): float
    {
        $totalTargeted = $this->estimateTotalTargeted($survey);
        $totalResponses = $survey->responses->count();
        
        if ($totalTargeted == 0) return 0;
        
        return round(($totalResponses / $totalTargeted) * 100, 2);
    }
    
    /**
     * Calculate completion rate
     */
    protected function calculateCompletionRate(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        $completeResponses = $survey->responses->where('is_complete', true)->count();
        
        if ($totalResponses == 0) return 0;
        
        return round(($completeResponses / $totalResponses) * 100, 2);
    }
    
    /**
     * Calculate average completion time
     */
    protected function calculateAverageCompletionTime(Survey $survey): int
    {
        $completionTimes = $survey->responses()
            ->whereNotNull('completion_time')
            ->where('completion_time', '>', 0)
            ->pluck('completion_time');
            
        if ($completionTimes->isEmpty()) return 0;
        
        return round($completionTimes->average());
    }
    
    /**
     * Apply targeting rules to query
     */
    protected function applyTargetingRules($query, array $targetingRules): void
    {
        if (isset($targetingRules['roles']) && !empty($targetingRules['roles'])) {
            $query->whereHas('role', function ($q) use ($targetingRules) {
                $q->whereIn('name', $targetingRules['roles']);
            });
        }
        
        if (isset($targetingRules['institutions']) && !empty($targetingRules['institutions'])) {
            $query->whereIn('institution_id', $targetingRules['institutions']);
        }
        
        if (isset($targetingRules['departments']) && !empty($targetingRules['departments'])) {
            $query->whereIn('department_id', $targetingRules['departments']);
        }
    }
    
    /**
     * Get recipient breakdown
     */
    protected function getRecipientBreakdown($query): array
    {
        $clone = clone $query;
        
        return [
            'by_role' => $clone->join('roles', 'users.role_id', '=', 'roles.id')
                ->selectRaw('roles.name as role, COUNT(*) as count')
                ->groupBy('roles.name')
                ->pluck('count', 'role')
                ->toArray(),
            'by_institution' => $clone->join('institutions', 'users.institution_id', '=', 'institutions.id')
                ->selectRaw('institutions.name as institution, COUNT(*) as count')
                ->groupBy('institutions.name')
                ->pluck('count', 'institution')
                ->toArray()
        ];
    }
    
    /**
     * Estimate response count based on targeting
     */
    protected function estimateResponseCount(int $totalRecipients, array $targetingRules): array
    {
        // Base response rates by role
        $responseRates = [
            'superadmin' => 0.8,
            'regionadmin' => 0.7,
            'sektoradmin' => 0.6,
            'schooladmin' => 0.5,
            'müəllim' => 0.4,
            'default' => 0.3
        ];
        
        $estimatedRate = $responseRates['default'];
        
        // Adjust based on targeting
        if (isset($targetingRules['roles']) && count($targetingRules['roles']) == 1) {
            $role = $targetingRules['roles'][0];
            $estimatedRate = $responseRates[$role] ?? $responseRates['default'];
        }
        
        return [
            'conservative' => round($totalRecipients * ($estimatedRate * 0.7)),
            'expected' => round($totalRecipients * $estimatedRate),
            'optimistic' => round($totalRecipients * ($estimatedRate * 1.3))
        ];
    }
    
    /**
     * Log analytics activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
    
    // Additional helper methods would continue here...
    // For brevity, I'm including the main structure
}