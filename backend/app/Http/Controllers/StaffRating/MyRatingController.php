<?php

namespace App\Http\Controllers\StaffRating;

use App\Http\Controllers\Controller;
use App\Models\StaffRating;
use App\Services\StaffRating\AutomaticRatingCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MyRatingController
 *
 * Allows staff members to view their own ratings
 * Accessible by: ALL authenticated users (SchoolAdmin, SektorAdmin, RegionOperator)
 */
class MyRatingController extends Controller
{
    protected AutomaticRatingCalculator $autoCalculator;

    public function __construct(AutomaticRatingCalculator $autoCalculator)
    {
        $this->autoCalculator = $autoCalculator;
    }

    /**
     * Get current user's ratings
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());
            $latestOnly = $request->boolean('latest_only', true);

            $query = StaffRating::where('staff_user_id', $user->id)
                ->where('period', $period)
                ->with(['rater:id,name,email']);

            if ($latestOnly) {
                $query->where('is_latest', true);
            }

            $ratings = $query->orderBy('created_at', 'desc')->get();

            // Separate manual and automatic
            $manualRatings = $ratings->where('rating_type', 'manual');
            $automaticRatings = $ratings->where('rating_type', 'automatic');

            // Calculate averages
            $manualAverage = $manualRatings->isNotEmpty() ? round($manualRatings->avg('score'), 2) : null;
            $automaticAverage = $automaticRatings->isNotEmpty() ? round($automaticRatings->avg('score'), 2) : null;
            $overallAverage = $ratings->isNotEmpty() ? round($ratings->avg('score'), 2) : null;

            // Get overall rating
            $overallRating = $ratings->where('category', 'overall')->first();

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->getRoleNames()->first(),
                ],
                'period' => $period,
                'overall_rating' => $overallRating,
                'overall_average' => $overallAverage,
                'manual_average' => $manualAverage,
                'automatic_average' => $automaticAverage,
                'manual_ratings' => $manualRatings->values(),
                'automatic_ratings' => $automaticRatings->values(),
                'total_ratings' => $ratings->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymətləndirmələrinizi yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get automatic rating breakdown for current user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function breakdown(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());

            // Validate period format
            if (!AutomaticRatingCalculator::isValidPeriod($period)) {
                return response()->json([
                    'message' => 'Yanlış period formatı. Düzgün: 2024-12, 2024-Q4, 2024',
                ], 400);
            }

            $breakdown = $this->autoCalculator->calculateOverallRating($user, $period);

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->getRoleNames()->first(),
                ],
                'breakdown' => $breakdown,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Avtomatik qiymətləndirmə hesablanarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get rating history for current user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function history(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $months = $request->input('months', 12);
            $category = $request->input('category', 'overall');

            $historyData = [];

            for ($i = $months - 1; $i >= 0; $i--) {
                $period = now()->subMonths($i)->format('Y-m');

                $rating = StaffRating::where('staff_user_id', $user->id)
                    ->where('period', $period)
                    ->where('category', $category)
                    ->where('is_latest', true)
                    ->first();

                $historyData[] = [
                    'period' => $period,
                    'score' => $rating ? $rating->score : null,
                    'rating_type' => $rating ? $rating->rating_type : null,
                    'rater' => $rating && $rating->rater ? [
                        'name' => $rating->rater->name,
                        'role' => $rating->rater->getRoleNames()->first(),
                    ] : null,
                ];
            }

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
                'category' => $category,
                'history' => $historyData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Tarixçəni yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get comparison with peer average
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function peerComparison(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());
            $userRole = $user->getRoleNames()->first();

            // Get user's ratings
            $userRatings = StaffRating::where('staff_user_id', $user->id)
                ->where('period', $period)
                ->where('is_latest', true)
                ->get();

            $userAverage = round($userRatings->avg('score'), 2);

            // Get peer average (same role, same institution level)
            $peerRatings = StaffRating::where('staff_role', $userRole)
                ->where('period', $period)
                ->where('is_latest', true)
                ->where('staff_user_id', '!=', $user->id)
                ->get();

            $peerAverage = round($peerRatings->avg('score'), 2);

            // Calculate percentile
            $allScores = $peerRatings->pluck('score')->push($userAverage)->sort()->values();
            $userPercentile = 0;
            if ($allScores->count() > 0) {
                $rank = $allScores->search($userAverage) + 1;
                $userPercentile = round(($rank / $allScores->count()) * 100, 1);
            }

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $userRole,
                ],
                'period' => $period,
                'user_average' => $userAverage,
                'peer_average' => $peerAverage,
                'difference' => round($userAverage - $peerAverage, 2),
                'percentile' => $userPercentile,
                'peer_count' => $peerRatings->pluck('staff_user_id')->unique()->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müqayisədə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current user's position in leaderboard
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function myRank(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $period = $request->input('period', AutomaticRatingCalculator::getCurrentPeriod());
            $category = $request->input('category', 'overall');

            // Get user's rating
            $userRating = StaffRating::where('staff_user_id', $user->id)
                ->where('period', $period)
                ->where('category', $category)
                ->where('is_latest', true)
                ->first();

            if (!$userRating) {
                return response()->json([
                    'message' => 'Bu dövr üçün qiymətləndirmə yoxdur',
                    'rank' => null,
                ], 404);
            }

            // Count how many have higher score
            $higherCount = StaffRating::where('period', $period)
                ->where('category', $category)
                ->where('is_latest', true)
                ->where('score', '>', $userRating->score)
                ->count();

            $rank = $higherCount + 1;

            // Total participants
            $totalParticipants = StaffRating::where('period', $period)
                ->where('category', $category)
                ->where('is_latest', true)
                ->distinct('staff_user_id')
                ->count();

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
                'period' => $period,
                'category' => $category,
                'rank' => $rank,
                'total_participants' => $totalParticipants,
                'score' => $userRating->score,
                'top_percentage' => round(($rank / $totalParticipants) * 100, 1),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Reytinq məlumatlarını yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get summary of all ratings for current user
     *
     * @return JsonResponse
     */
    public function summary(): JsonResponse
    {
        try {
            $user = auth()->user();
            $currentPeriod = AutomaticRatingCalculator::getCurrentPeriod();

            // Get all ratings for current period
            $currentRatings = StaffRating::where('staff_user_id', $user->id)
                ->where('period', $currentPeriod)
                ->where('is_latest', true)
                ->get();

            // Get previous period for comparison
            $previousPeriod = now()->subMonth()->format('Y-m');
            $previousRatings = StaffRating::where('staff_user_id', $user->id)
                ->where('period', $previousPeriod)
                ->where('is_latest', true)
                ->get();

            $currentAverage = round($currentRatings->avg('score'), 2);
            $previousAverage = round($previousRatings->avg('score'), 2);
            $change = $previousAverage > 0 ? round($currentAverage - $previousAverage, 2) : null;

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->getRoleNames()->first(),
                ],
                'current_period' => $currentPeriod,
                'current_average' => $currentAverage,
                'previous_period' => $previousPeriod,
                'previous_average' => $previousAverage,
                'change' => $change,
                'trend' => $change > 0 ? 'improving' : ($change < 0 ? 'declining' : 'stable'),
                'by_category' => $currentRatings->groupBy('category')->map(function ($group) {
                    return round($group->avg('score'), 2);
                }),
                'manual_count' => $currentRatings->where('rating_type', 'manual')->count(),
                'automatic_count' => $currentRatings->where('rating_type', 'automatic')->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Xülasə məlumatlarını yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
