<?php

namespace App\Http\Controllers\StaffRating;

use App\Http\Controllers\Controller;
use App\Models\StaffRating;
use App\Models\User;
use App\Models\Institution;
use App\Services\StaffRating\AutomaticRatingCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * RatingDashboardController
 *
 * Provides statistics and analytics for staff ratings
 * Accessible by: SuperAdmin, RegionAdmin, RegionOperator, SektorAdmin
 */
class RatingDashboardController extends Controller
{
    protected AutomaticRatingCalculator $autoCalculator;

    public function __construct(AutomaticRatingCalculator $autoCalculator)
    {
        $this->autoCalculator = $autoCalculator;
    }

    /**
     * Get overview statistics
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function overview(Request $request): JsonResponse
    {
        try {
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());
            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            // Base query with role-based filtering
            $query = StaffRating::where('period', $period)->where('is_latest', true);

            // Apply hierarchical filtering
            if ($userRole === 'regionadmin') {
                $staffIds = User::where('institution_id', $user->institution_id)
                    ->orWhereHas('institution', function ($q) use ($user) {
                        $q->where('parent_id', $user->institution_id);
                    })
                    ->pluck('id');
                $query->whereIn('staff_user_id', $staffIds);
            } elseif ($userRole === 'regionoperator') {
                // Only assigned sectors
                $assignedSectors = DB::table('user_institution_assignments')
                    ->where('user_id', $user->id)
                    ->pluck('institution_id');
                $staffIds = User::whereIn('institution_id', $assignedSectors)->pluck('id');
                $query->whereIn('staff_user_id', $staffIds);
            } elseif ($userRole === 'sektoradmin') {
                // Only same sector
                $staffIds = User::where('institution_id', $user->institution_id)->pluck('id');
                $query->whereIn('staff_user_id', $staffIds);
            }

            $ratings = $query->get();

            // Overall statistics
            $totalStaff = $ratings->pluck('staff_user_id')->unique()->count();
            $averageScore = round($ratings->avg('score'), 2);
            $manualAverage = round($ratings->where('rating_type', 'manual')->avg('score'), 2);
            $automaticAverage = round($ratings->where('rating_type', 'automatic')->avg('score'), 2);

            // Score distribution
            $scoreDistribution = [
                'excellent' => $ratings->where('score', '>=', 4.5)->count(),
                'good' => $ratings->whereBetween('score', [3.5, 4.49])->count(),
                'average' => $ratings->whereBetween('score', [2.5, 3.49])->count(),
                'below_average' => $ratings->whereBetween('score', [1.5, 2.49])->count(),
                'poor' => $ratings->where('score', '<', 1.5)->count(),
            ];

            // By role
            $byRole = $ratings->groupBy('staff_role')->map(function ($group, $role) {
                return [
                    'role' => $role,
                    'count' => $group->pluck('staff_user_id')->unique()->count(),
                    'average' => round($group->avg('score'), 2),
                ];
            })->values();

            // By category (manual)
            $byCategory = $ratings->where('rating_type', 'manual')
                ->groupBy('category')
                ->map(function ($group, $category) {
                    return [
                        'category' => $category,
                        'count' => $group->count(),
                        'average' => round($group->avg('score'), 2),
                    ];
                })->values();

            // Top performers
            $topPerformers = $ratings->sortByDesc('score')->take(10)->map(function ($rating) {
                return [
                    'staff' => User::find($rating->staff_user_id),
                    'score' => $rating->score,
                    'category' => $rating->category,
                ];
            })->values();

            return response()->json([
                'period' => $period,
                'overview' => [
                    'total_staff' => $totalStaff,
                    'average_score' => $averageScore,
                    'manual_average' => $manualAverage,
                    'automatic_average' => $automaticAverage,
                    'total_ratings' => $ratings->count(),
                ],
                'score_distribution' => $scoreDistribution,
                'by_role' => $byRole,
                'by_category' => $byCategory,
                'top_performers' => $topPerformers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard məlumatlarını yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get leaderboard (top rated staff)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function leaderboard(Request $request): JsonResponse
    {
        try {
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());
            $category = $request->input('category', 'overall');
            $limit = $request->input('limit', 20);
            $ratingType = $request->input('rating_type'); // 'manual' or 'automatic'

            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            // Build query
            $query = StaffRating::where('period', $period)
                ->where('is_latest', true)
                ->where('category', $category);

            if ($ratingType) {
                $query->where('rating_type', $ratingType);
            }

            // Apply hierarchical filtering
            if ($userRole !== 'superadmin') {
                if ($userRole === 'regionadmin') {
                    $staffIds = User::where('institution_id', $user->institution_id)
                        ->orWhereHas('institution', function ($q) use ($user) {
                            $q->where('parent_id', $user->institution_id);
                        })
                        ->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                } elseif ($userRole === 'regionoperator') {
                    $assignedSectors = DB::table('user_institution_assignments')
                        ->where('user_id', $user->id)
                        ->pluck('institution_id');
                    $staffIds = User::whereIn('institution_id', $assignedSectors)->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                } elseif ($userRole === 'sektoradmin') {
                    $staffIds = User::where('institution_id', $user->institution_id)->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                }
            }

            $leaderboard = $query->with(['staffUser', 'institution'])
                ->orderBy('score', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($rating, $index) {
                    return [
                        'rank' => $index + 1,
                        'staff' => $rating->staffUser,
                        'institution' => $rating->institution,
                        'score' => $rating->score,
                        'category' => $rating->category,
                        'rating_type' => $rating->rating_type,
                    ];
                });

            return response()->json([
                'period' => $period,
                'category' => $category,
                'rating_type' => $ratingType ?? 'all',
                'leaderboard' => $leaderboard,
                'total' => $leaderboard->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Liderlik cədvəlini yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get ratings trend over time
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function trend(Request $request): JsonResponse
    {
        try {
            $staffUserId = $request->input('staff_user_id');
            $category = $request->input('category', 'overall');
            $months = $request->input('months', 12);

            if (!$staffUserId) {
                return response()->json([
                    'message' => 'staff_user_id tələb olunur',
                ], 400);
            }

            $staff = User::findOrFail($staffUserId);

            // Get last N months of data
            $trendData = [];

            for ($i = $months - 1; $i >= 0; $i--) {
                $period = now()->subMonths($i)->format('Y-m');

                $rating = StaffRating::where('staff_user_id', $staffUserId)
                    ->where('period', $period)
                    ->where('category', $category)
                    ->where('is_latest', true)
                    ->first();

                $trendData[] = [
                    'period' => $period,
                    'score' => $rating ? $rating->score : null,
                    'rating_type' => $rating ? $rating->rating_type : null,
                ];
            }

            return response()->json([
                'staff' => $staff,
                'category' => $category,
                'trend' => $trendData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Trend məlumatlarını yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Compare multiple staff members
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function compare(Request $request): JsonResponse
    {
        try {
            $staffIds = $request->input('staff_ids', []);
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());

            if (count($staffIds) < 2) {
                return response()->json([
                    'message' => 'Müqayisə üçün ən azı 2 istifadəçi seçilməlidir',
                ], 400);
            }

            if (count($staffIds) > 5) {
                return response()->json([
                    'message' => 'Maksimum 5 istifadəçi müqayisə oluna bilər',
                ], 400);
            }

            $comparisons = [];

            foreach ($staffIds as $staffId) {
                $staff = User::find($staffId);

                if (!$staff) {
                    continue;
                }

                $ratings = StaffRating::where('staff_user_id', $staffId)
                    ->where('period', $period)
                    ->where('is_latest', true)
                    ->get();

                $comparisons[] = [
                    'staff' => $staff,
                    'overall_score' => round($ratings->where('category', 'overall')->first()?->score ?? 0, 2),
                    'manual_average' => round($ratings->where('rating_type', 'manual')->avg('score'), 2),
                    'automatic_average' => round($ratings->where('rating_type', 'automatic')->avg('score'), 2),
                    'by_category' => $ratings->groupBy('category')->map(function ($group) {
                        return round($group->avg('score'), 2);
                    }),
                ];
            }

            return response()->json([
                'period' => $period,
                'comparisons' => $comparisons,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müqayisədə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get institution-level statistics
     *
     * @param Request $request
     * @param Institution $institution
     * @return JsonResponse
     */
    public function institutionStats(Request $request, Institution $institution): JsonResponse
    {
        try {
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());

            // Get all staff in this institution
            $staffIds = User::where('institution_id', $institution->id)->pluck('id');

            $ratings = StaffRating::whereIn('staff_user_id', $staffIds)
                ->where('period', $period)
                ->where('is_latest', true)
                ->get();

            $stats = [
                'institution' => $institution,
                'period' => $period,
                'total_staff' => $staffIds->count(),
                'average_score' => round($ratings->avg('score'), 2),
                'manual_average' => round($ratings->where('rating_type', 'manual')->avg('score'), 2),
                'automatic_average' => round($ratings->where('rating_type', 'automatic')->avg('score'), 2),
                'score_distribution' => [
                    'excellent' => $ratings->where('score', '>=', 4.5)->count(),
                    'good' => $ratings->whereBetween('score', [3.5, 4.49])->count(),
                    'average' => $ratings->whereBetween('score', [2.5, 3.49])->count(),
                    'below_average' => $ratings->whereBetween('score', [1.5, 2.49])->count(),
                    'poor' => $ratings->where('score', '<', 1.5)->count(),
                ],
                'by_category' => $ratings->groupBy('category')->map(function ($group) {
                    return round($group->avg('score'), 2);
                }),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müəssisə statistikasını yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export dashboard data
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());
            $format = $request->input('format', 'json'); // json, csv, excel

            // For now, return JSON format
            // Excel/CSV export can be implemented later with Laravel Excel package

            $user = auth()->user();
            $userRole = $user->getRoleNames()->first();

            $query = StaffRating::where('period', $period)->where('is_latest', true);

            // Apply hierarchical filtering
            if ($userRole !== 'superadmin') {
                // Apply same filtering as overview method
                if ($userRole === 'regionadmin') {
                    $staffIds = User::where('institution_id', $user->institution_id)
                        ->orWhereHas('institution', function ($q) use ($user) {
                            $q->where('parent_id', $user->institution_id);
                        })
                        ->pluck('id');
                    $query->whereIn('staff_user_id', $staffIds);
                }
            }

            $data = $query->with(['staffUser', 'rater', 'institution'])->get();

            return response()->json([
                'period' => $period,
                'format' => $format,
                'data' => $data,
                'exported_at' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Export edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
