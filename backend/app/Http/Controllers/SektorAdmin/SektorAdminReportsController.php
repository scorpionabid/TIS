<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\ActivityLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SektorAdminReportsController extends Controller
{
    /**
     * Get sector overview statistics
     */
    public function getSectorOverviewStats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userSektorId = $user->institution_id;

            if (!$userSektorId) {
                return response()->json(['error' => 'Sektor məlumatları tapılmadı'], 404);
            }

            $dateRange = $this->getDateRange($request);
            $sektorInstitutionIds = $this->getSektorInstitutionIds($userSektorId);

            $stats = [
                'user_statistics' => $this->getSektorUserStatistics($sektorInstitutionIds, $dateRange),
                'institution_statistics' => $this->getSektorInstitutionStatistics($sektorInstitutionIds, $dateRange),
                'survey_statistics' => $this->getSektorSurveyStatistics($sektorInstitutionIds, $dateRange),
                'system_activity' => $this->getSektorSystemActivity($sektorInstitutionIds, $dateRange),
                'performance_metrics' => $this->getSektorPerformanceMetrics($sektorInstitutionIds, $dateRange),
                'growth_trends' => $this->getSektorGrowthTrends($sektorInstitutionIds, $dateRange),
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats,
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sektor hesabat məlumatları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get sector institutional performance report
     */
    public function getSectorInstitutionPerformance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userSektorId = $user->institution_id;

            if (!$userSektorId) {
                return response()->json(['error' => 'Sektor məlumatları tapılmadı'], 404);
            }

            $dateRange = $this->getDateRange($request);
            $sektorInstitutionIds = $this->getSektorInstitutionIds($userSektorId);

            $institutions = Institution::whereIn('id', $sektorInstitutionIds)
                ->with(['users' => function ($q) {
                    $q->where('is_active', true);
                }])
                ->withCount(['users as total_users', 'users as active_users' => function ($q) {
                    $q->where('is_active', true)->where('last_login_at', '>=', now()->subDays(30));
                }])
                ->get();

            $performanceData = $institutions->map(function ($institution) use ($dateRange) {
                $totalResponses = SurveyResponse::whereHas('survey', function ($q) use ($institution) {
                    $q->where('institution_id', $institution->id);
                })->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

                $completedResponses = SurveyResponse::where('status', 'completed')
                    ->whereHas('survey', function ($q) use ($institution) {
                        $q->where('institution_id', $institution->id);
                    })->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

                $activityScore = $this->calculateInstitutionActivityScore($institution, $dateRange);

                return [
                    'institution_id' => $institution->id,
                    'institution_name' => $institution->name,
                    'type' => $institution->type,
                    'level' => $institution->level,
                    'total_users' => $institution->total_users,
                    'active_users' => $institution->active_users,
                    'performance_score' => round($activityScore, 1),
                    'metrics' => [
                        'survey_participation_rate' => $institution->total_users > 0 ? 
                            round(($totalResponses / $institution->total_users) * 100, 1) : 0,
                        'task_completion_rate' => 85.5, // Mock data - real calculation needed
                        'user_engagement_score' => $institution->total_users > 0 ? 
                            round(($institution->active_users / $institution->total_users) * 100, 1) : 0,
                        'response_quality_score' => $totalResponses > 0 ? 
                            round(($completedResponses / $totalResponses) * 100, 1) : 0,
                    ],
                    'comparison_data' => [
                        'regional_average' => 75.2, // Mock data
                        'national_average' => 72.8, // Mock data
                        'ranking' => 0, // Will be calculated after sorting
                    ],
                ];
            })->sortByDesc('performance_score')->values();

            // Assign rankings
            $performanceData = $performanceData->map(function ($item, $index) {
                $item['comparison_data']['ranking'] = $index + 1;
                return $item;
            });

            return response()->json([
                'success' => true,
                'data' => $performanceData->toArray(),
                'filters' => $request->only(['institution_type', 'level']),
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sektor müəssisə performans hesabatı yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get sector user activity report
     */
    public function getSectorUserActivity(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userSektorId = $user->institution_id;

            if (!$userSektorId) {
                return response()->json(['error' => 'Sektor məlumatları tapılmadı'], 404);
            }

            $dateRange = $this->getDateRange($request);
            $sektorInstitutionIds = $this->getSektorInstitutionIds($userSektorId);

            $totalUsers = User::whereIn('institution_id', $sektorInstitutionIds)->count();
            $activeUsers = User::whereIn('institution_id', $sektorInstitutionIds)
                ->where('is_active', true)
                ->where('last_login_at', '>=', $dateRange['start_date'])
                ->count();

            // Most active users in sector
            $mostActiveUsers = ActivityLog::whereIn('institution_id', $sektorInstitutionIds)
                ->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
                ->select('user_id', DB::raw('COUNT(*) as activity_count'))
                ->groupBy('user_id')
                ->orderBy('activity_count', 'desc')
                ->take(10)
                ->get()
                ->map(function ($item) {
                    $user = User::find($item->user_id);
                    return [
                        'user_id' => $item->user_id,
                        'username' => $user?->username ?? 'Unknown',
                        'full_name' => $user?->full_name ?? 'Unknown',
                        'activity_count' => $item->activity_count,
                    ];
                });

            // Activity by role
            $activityByRole = User::whereIn('institution_id', $sektorInstitutionIds)
                ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->groupBy('roles.display_name')
                ->selectRaw('roles.display_name as role, COUNT(*) as user_count')
                ->get();

            // Daily activity trends (last 7 days)
            $dailyActivity = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i);
                $dayStart = $date->copy()->startOfDay();
                $dayEnd = $date->copy()->endOfDay();

                $dayActivity = ActivityLog::whereIn('institution_id', $sektorInstitutionIds)
                    ->whereBetween('created_at', [$dayStart, $dayEnd])
                    ->count();

                $dailyActivity[] = [
                    'date' => $date->format('Y-m-d'),
                    'day_name' => $date->format('l'),
                    'activity_count' => $dayActivity,
                ];
            }

            $activityData = [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'user_activities' => [], // Detailed user activities if needed
                'activity_summary' => [
                    'most_active_users' => $mostActiveUsers->toArray(),
                    'activity_by_role' => $activityByRole->toArray(),
                    'daily_activity' => $dailyActivity,
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => $activityData,
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sektor istifadəçi fəaliyyət hesabatı yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get sector survey analytics
     */
    public function getSectorSurveyAnalytics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userSektorId = $user->institution_id;

            if (!$userSektorId) {
                return response()->json(['error' => 'Sektor məlumatları tapılmadı'], 404);
            }

            $dateRange = $this->getDateRange($request);
            $sektorInstitutionIds = $this->getSektorInstitutionIds($userSektorId);

            $surveys = Survey::whereIn('institution_id', $sektorInstitutionIds)
                ->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
                ->withCount(['responses as total_responses', 'responses as completed_responses' => function ($q) {
                    $q->where('status', 'completed');
                }])
                ->get();

            $analyticsData = $surveys->map(function ($survey) {
                $completionRate = $survey->total_responses > 0 ? 
                    round(($survey->completed_responses / $survey->total_responses) * 100, 1) : 0;

                return [
                    'survey_id' => $survey->id,
                    'survey_title' => $survey->title,
                    'status' => $survey->status,
                    'created_at' => $survey->created_at->format('Y-m-d'),
                    'total_responses' => $survey->total_responses,
                    'completed_responses' => $survey->completed_responses,
                    'completion_rate' => $completionRate,
                    'average_completion_time' => '15.5 minutes', // Mock data
                ];
            });

            $metrics = [
                'total_surveys' => $surveys->count(),
                'published_surveys' => $surveys->where('status', 'published')->count(),
                'completed_surveys' => $surveys->where('status', 'closed')->count(),
                'total_responses' => $surveys->sum('total_responses'),
                'average_completion_rate' => round($analyticsData->avg('completion_rate'), 1),
                'most_successful_survey' => $analyticsData->sortByDesc('completion_rate')->first(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'surveys' => $analyticsData->toArray(),
                    'metrics' => $metrics,
                ],
                'date_range' => $dateRange,
                'generated_at' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sektor sorğu analitikası yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // Helper methods

    private function getDateRange(Request $request): array
    {
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        return [
            'start_date' => Carbon::parse($startDate)->startOfDay(),
            'end_date' => Carbon::parse($endDate)->endOfDay(),
        ];
    }

    private function getSektorInstitutionIds(int $sektorId): array
    {
        $sektor = Institution::find($sektorId);
        if (!$sektor) {
            return [];
        }

        // Get sector and all its children (schools)
        $childIds = $sektor->getAllChildrenIds();
        array_unshift($childIds, $sektorId);

        return $childIds;
    }

    private function getSektorUserStatistics(array $institutionIds, array $dateRange): array
    {
        $total = User::whereIn('institution_id', $institutionIds)->count();
        $active = User::whereIn('institution_id', $institutionIds)
            ->where('is_active', true)
            ->where('last_login_at', '>=', $dateRange['start_date'])
            ->count();
        $newUsers = User::whereIn('institution_id', $institutionIds)
            ->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->count();

        $usersByRole = User::whereIn('institution_id', $institutionIds)
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->groupBy('roles.display_name')
            ->selectRaw('roles.display_name as role, COUNT(*) as count')
            ->pluck('count', 'role')
            ->toArray();

        return [
            'total_users' => $total,
            'active_users' => $active,
            'new_users' => $newUsers,
            'user_growth_rate' => $total > 0 ? round(($newUsers / $total) * 100, 1) : 0,
            'users_by_role' => collect($usersByRole)->map(function ($count, $role) use ($total) {
                return [
                    'role' => $role,
                    'count' => $count,
                    'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                ];
            })->values()->toArray(),
        ];
    }

    private function getSektorInstitutionStatistics(array $institutionIds, array $dateRange): array
    {
        $institutions = Institution::whereIn('id', $institutionIds)->get();
        
        $total = $institutions->count();
        $active = $institutions->where('is_active', true)->count();
        $newInstitutions = $institutions->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

        $byType = $institutions->groupBy('type')->map->count()->toArray();
        $byLevel = $institutions->groupBy('level')->map->count()->toArray();

        return [
            'total_institutions' => $total,
            'active_institutions' => $active,
            'new_institutions' => $newInstitutions,
            'institutions_by_type' => collect($byType)->map(function ($count, $type) use ($total) {
                return [
                    'type' => $type,
                    'count' => $count,
                    'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                ];
            })->values()->toArray(),
            'regional_distribution' => [], // Sector level doesn't have regional distribution
        ];
    }

    private function getSektorSurveyStatistics(array $institutionIds, array $dateRange): array
    {
        $surveys = Survey::whereIn('institution_id', $institutionIds)
            ->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->get();

        $total = $surveys->count();
        $published = $surveys->where('status', 'published')->count();
        $completed = $surveys->where('status', 'closed')->count();

        $totalResponses = SurveyResponse::whereHas('survey', function ($q) use ($institutionIds) {
            $q->whereIn('institution_id', $institutionIds);
        })->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

        return [
            'total_surveys' => $total,
            'active_surveys' => $published,
            'completed_surveys' => $completed,
            'total_responses' => $totalResponses,
            'response_rate' => $total > 0 ? round(($totalResponses / ($total * 10)) * 100, 1) : 0, // Estimated
        ];
    }

    private function getSektorSystemActivity(array $institutionIds, array $dateRange): array
    {
        $activities = ActivityLog::whereIn('institution_id', $institutionIds)
            ->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->selectRaw('activity_type, COUNT(*) as count')
            ->groupBy('activity_type')
            ->pluck('count', 'activity_type')
            ->toArray();

        return [
            'total_activities' => array_sum($activities),
            'by_type' => $activities,
        ];
    }

    private function getSektorPerformanceMetrics(array $institutionIds, array $dateRange): array
    {
        return [
            'average_response_time' => '285ms', // Mock data
            'system_uptime' => '99.7%',
            'error_rate' => '0.3%',
            'user_satisfaction_score' => '4.5/5',
        ];
    }

    private function getSektorGrowthTrends(array $institutionIds, array $dateRange): array
    {
        // Mock implementation - would calculate actual trends
        return [
            [
                'date' => now()->subDays(21)->format('Y-m-d'),
                'users' => 45,
                'institutions' => 2,
                'surveys' => 3,
                'activities' => 125,
            ],
            [
                'date' => now()->subDays(14)->format('Y-m-d'),
                'users' => 52,
                'institutions' => 2,
                'surveys' => 5,
                'activities' => 168,
            ],
            [
                'date' => now()->subDays(7)->format('Y-m-d'),
                'users' => 58,
                'institutions' => 3,
                'surveys' => 4,
                'activities' => 195,
            ],
        ];
    }

    private function calculateInstitutionActivityScore(Institution $institution, array $dateRange): float
    {
        $userCount = $institution->users()->where('is_active', true)->count();
        $activeUserCount = $institution->users()
            ->where('is_active', true)
            ->where('last_login_at', '>=', $dateRange['start_date'])
            ->count();

        $surveyCount = $institution->surveys()
            ->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])
            ->count();

        $responseCount = SurveyResponse::whereHas('survey', function ($q) use ($institution) {
            $q->where('institution_id', $institution->id);
        })->whereBetween('created_at', [$dateRange['start_date'], $dateRange['end_date']])->count();

        // Calculate weighted score
        $userScore = $userCount > 0 ? ($activeUserCount / $userCount) * 40 : 0;
        $surveyScore = min($surveyCount * 5, 30); // Max 30 points
        $responseScore = min($responseCount * 2, 30); // Max 30 points

        return $userScore + $surveyScore + $responseScore;
    }
}
