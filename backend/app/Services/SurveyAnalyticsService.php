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
        $survey->load(['responses.respondent', 'creator']);
        
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
            $query->with(['respondent.role', 'respondent.institution'])->latest();
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
            $query->with(['respondent.role', 'respondent.institution'])->latest();
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
                    'respondent_id' => $response->respondent_id,
                    'respondent_role' => $response->respondent?->role?->name,
                    'respondent_institution' => $response->respondent?->institution?->name,
                    'answers' => $response->responses,
                    'submitted_at' => $response->submitted_at ?? $response->created_at,
                    'completion_time' => $response->started_at && $response->submitted_at
                        ? $response->started_at->diffInSeconds($response->submitted_at)
                        : null
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
        $responses = $survey->responses()->with(['respondent.role', 'respondent.institution'])->get();

        return [
            'by_role' => $responses->groupBy('respondent.role.name')->map->count(),
            'by_institution' => $responses->groupBy('respondent.institution.name')->map->count(),
            'by_institution_type' => $responses->groupBy('respondent.institution.type')->map->count(),
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

    /**
     * Get region analytics (RegionAdmin specific)
     */
    public function getRegionAnalytics(): array
    {
        $user = Auth::user();

        if (!$user->hasRole('regionadmin')) {
            throw new \Exception('Bu xidmət yalnız RegionAdmin üçündür');
        }

        $userRegionId = $user->institution_id;

        // Get all institutions in region hierarchy
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();

        $institutionIds = $allRegionInstitutions->pluck('id');

        // Survey statistics using creator relationship
        $totalSurveys = Survey::whereHas('creator', function($q) use ($institutionIds) {
            $q->whereIn('institution_id', $institutionIds);
        })->count();

        $publishedSurveys = Survey::whereHas('creator', function($q) use ($institutionIds) {
            $q->whereIn('institution_id', $institutionIds);
        })->where('status', 'published')->count();

        $draftSurveys = Survey::whereHas('creator', function($q) use ($institutionIds) {
            $q->whereIn('institution_id', $institutionIds);
        })->where('status', 'draft')->count();

        // Response statistics
        $totalResponses = SurveyResponse::whereHas('survey.creator', function($query) use ($institutionIds) {
            $query->whereIn('institution_id', $institutionIds);
        })->count();

        // Survey performance by sector
        $surveysBySector = Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with(['children'])
            ->get()
            ->map(function($sector) use ($institutionIds) {
                $schoolIds = $sector->children->pluck('id');

                $surveys = Survey::whereJsonOverlaps('target_institutions', $schoolIds->toArray())->count();

                $responses = SurveyResponse::whereHas('survey.creator', function($query) use ($institutionIds) {
                    $query->whereIn('institution_id', $institutionIds);
                })->whereIn('institution_id', $schoolIds)->count();

                return [
                    'sector_name' => $sector->name,
                    'surveys_count' => $surveys,
                    'responses_count' => $responses,
                    'response_rate' => $surveys > 0 ? round(($responses / ($surveys * 10)) * 100, 1) : 0
                ];
            });

        return [
            'survey_totals' => [
                'total' => $totalSurveys,
                'published' => $publishedSurveys,
                'draft' => $draftSurveys,
                'total_responses' => $totalResponses
            ],
            'surveys_by_sector' => $surveysBySector,
            'average_response_rate' => $surveysBySector->avg('response_rate') ?? 0,
            'most_active_sector' => $surveysBySector->sortByDesc('responses_count')->first()
        ];
    }

    // Additional helper methods

    /**
     * Estimate total targeted users
     */
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

    /**
     * Estimate survey duration
     */
    protected function estimateSurveyDuration(int $totalRecipients): array
    {
        // Estimate based on historical data or heuristics
        $avgResponseTime = 3; // minutes per response
        $dailyResponseRate = 0.2; // 20% respond per day

        return [
            'estimated_days' => ceil($totalRecipients / ($totalRecipients * $dailyResponseRate)),
            'estimated_hours' => ceil(($totalRecipients * $avgResponseTime) / 60)
        ];
    }

    /**
     * Get response trends
     */
    protected function getResponseTrends(Survey $survey, string $period = 'daily', $startDate = null, $endDate = null): array
    {
        $responses = $survey->responses()
            ->when($startDate, fn($q) => $q->where('created_at', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('created_at', '<=', $endDate))
            ->get();

        $format = match($period) {
            'daily' => 'Y-m-d',
            'weekly' => 'Y-W',
            'monthly' => 'Y-m',
            default => 'Y-m-d'
        };

        return $responses->groupBy(fn($r) => $r->created_at->format($format))
            ->map->count()
            ->toArray();
    }

    /**
     * Get completion trends
     */
    protected function getCompletionTrends(Survey $survey): array
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
     * Get dropout points
     */
    protected function getDropoutPoints(Survey $survey): array
    {
        $questions = $survey->questions;
        $responses = $survey->responses;

        $dropoutRates = [];
        foreach ($questions as $index => $question) {
            $answeredCount = $this->getQuestionResponseCount($responses, $index);
            $dropoutRate = $responses->count() > 0
                ? round((($responses->count() - $answeredCount) / $responses->count()) * 100, 2)
                : 0;

            if ($dropoutRate > 30) { // Significant dropout
                $dropoutRates[] = $index;
            }
        }

        return $dropoutRates;
    }

    /**
     * Get question response count
     */
    protected function getQuestionResponseCount(Collection $responses, int $questionIndex): int
    {
        return $responses->filter(function($response) use ($questionIndex) {
            $answers = $response->responses ?? [];
            return isset($answers[$questionIndex]) && !empty($answers[$questionIndex]);
        })->count();
    }

    /**
     * Get question skip rate
     */
    protected function getQuestionSkipRate(Collection $responses, int $questionIndex): float
    {
        $total = $responses->count();
        if ($total == 0) return 0;

        $answered = $this->getQuestionResponseCount($responses, $questionIndex);
        return round((($total - $answered) / $total) * 100, 2);
    }

    /**
     * Get answer distribution
     */
    protected function getAnswerDistribution(Collection $responses, int $questionIndex, string $questionType): array
    {
        if ($questionType === 'rating' || $questionType === 'scale') {
            return $responses
                ->pluck("responses.$questionIndex")
                ->filter()
                ->countBy()
                ->toArray();
        }

        if ($questionType === 'multiple_choice' || $questionType === 'checkbox') {
            $distribution = [];
            foreach ($responses as $response) {
                $answer = $response->responses[$questionIndex] ?? null;
                if (is_array($answer)) {
                    foreach ($answer as $choice) {
                        $distribution[$choice] = ($distribution[$choice] ?? 0) + 1;
                    }
                } elseif ($answer) {
                    $distribution[$answer] = ($distribution[$answer] ?? 0) + 1;
                }
            }
            return $distribution;
        }

        return [];
    }

    /**
     * Get average rating
     */
    protected function getAverageRating(Collection $responses, int $questionIndex, string $questionType): ?float
    {
        if (!in_array($questionType, ['rating', 'scale', 'number'])) {
            return null;
        }

        $ratings = $responses
            ->pluck("responses.$questionIndex")
            ->filter()
            ->filter(fn($val) => is_numeric($val));

        return $ratings->isEmpty() ? null : round($ratings->average(), 2);
    }

    /**
     * Calculate engagement score
     */
    protected function calculateEngagementScore(Survey $survey): float
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
     */
    protected function calculateQualityScore(Survey $survey): float
    {
        $totalResponses = $survey->responses->count();
        if ($totalResponses == 0) return 0;

        $completeResponses = $survey->responses->where('is_complete', true)->count();
        $qualityScore = ($completeResponses / $totalResponses) * 100;

        return round($qualityScore, 2);
    }

    /**
     * Calculate reach score
     */
    protected function calculateReachScore(Survey $survey): float
    {
        $targeted = $this->estimateTotalTargeted($survey);
        $reached = $survey->responses->count();

        if ($targeted == 0) return 0;

        return round(($reached / $targeted) * 100, 2);
    }

    /**
     * Calculate satisfaction score
     */
    protected function calculateSatisfactionScore(Survey $survey): float
    {
        // This would need satisfaction questions in the survey
        // For now, return a placeholder
        return 0;
    }

    /**
     * Calculate overall performance
     */
    protected function calculateOverallPerformance(Survey $survey): float
    {
        $engagement = $this->calculateEngagementScore($survey);
        $quality = $this->calculateQualityScore($survey);
        $reach = $this->calculateReachScore($survey);

        return round(($engagement + $quality + $reach) / 3, 2);
    }

    /**
     * Calculate median completion time
     */
    protected function calculateMedianCompletionTime(Survey $survey): int
    {
        $responses = $survey->responses()
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get();

        if ($responses->isEmpty()) return 0;

        $times = $responses->map(function($response) {
            return $response->started_at->diffInSeconds($response->submitted_at);
        })->sort()->values();

        $count = $times->count();
        $middle = floor($count / 2);

        if ($count % 2 == 0) {
            return ($times[$middle - 1] + $times[$middle]) / 2;
        }

        return $times[$middle];
    }

    /**
     * Get completion by question
     */
    protected function getCompletionByQuestion(Survey $survey): array
    {
        $questions = $survey->questions;
        $responses = $survey->responses;

        $completion = [];
        foreach ($questions as $index => $question) {
            $completion[] = [
                'question_index' => $index,
                'completion_rate' => $this->getQuestionResponseCount($responses, $index)
            ];
        }

        return $completion;
    }

    /**
     * Get responses per day
     */
    protected function getResponsesPerDay(Survey $survey): array
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
     */
    protected function getResponseDistribution(Survey $survey): array
    {
        return [
            'by_status' => $survey->responses->countBy('status')->toArray(),
            'by_completion' => [
                'complete' => $survey->responses->where('is_complete', true)->count(),
                'partial' => $survey->responses->where('is_complete', false)->count()
            ]
        ];
    }

    /**
     * Placeholder methods for additional features
     */
    protected function getAgeDistribution($responses) { return []; }
    protected function getGenderDistribution($responses) { return []; }
    protected function getPeakResponseTime($responses) { return null; }
    protected function getResponseVelocity($responses) { return 0; }
    protected function getKeyMetrics($survey) { return []; }
    protected function getPerformanceIndicators($survey) { return []; }
    protected function getSurveyHealthStatus($survey) { return 'healthy'; }
    protected function getComparisonData($survey) { return []; }
    protected function getResponsePatterns($survey) { return []; }
    protected function getResponseQuality($survey) { return []; }
    protected function getResponseTiming($survey) { return []; }
    protected function getRespondentBehavior($survey) { return []; }
    protected function getQuestionPerformance($survey, $index) { return []; }
    protected function getQuestionEngagement($survey, $index) { return []; }
    protected function getQuestionClarityScore($survey, $index) { return 0; }
    protected function getQuestionInsights($survey, $index) { return []; }
    protected function calculateParticipationRate($survey) { return 0; }
    protected function getRepeatParticipants($survey) { return []; }
    protected function getEngagementBySegment($survey) { return []; }
    protected function getEngagementTrends($survey) { return []; }
    protected function getQualityTrends($survey) { return []; }
    protected function getSeasonalPatterns($survey) { return []; }
    protected function getTargetingRecommendations($total, $breakdown) { return []; }
    protected function compareSurveys($ids, $metrics) { return []; }
    protected function getQuestionAnalytics($survey, $index) { return []; }
    protected function getAllQuestionsAnalytics($survey) { return []; }
    protected function getDashboardOverview($institutionId) { return []; }
    protected function getRecentSurveys($institutionId) { return []; }
    protected function getTopPerformingSurveys($institutionId) { return []; }
    protected function getActivityTrends($institutionId) { return []; }
    protected function getResponseRates($institutionId) { return []; }
    protected function getUserParticipation($institutionId) { return []; }
    protected function getDemographicAnalytics($survey) { return []; }
    protected function getCompletionFunnel($survey) { return []; }
}