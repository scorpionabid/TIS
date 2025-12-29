<?php

namespace App\Http\Controllers\StaffRating;

use App\Http\Controllers\Controller;
use App\Models\StaffRating;
use App\Models\User;
use App\Services\StaffRating\AutomaticRatingCalculator;
use App\Services\StaffRating\ManualRatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * StaffRatingController
 *
 * Main controller for staff rating operations
 * Handles both manual and automatic ratings
 * Accessible by: SuperAdmin, RegionAdmin, RegionOperator, SektorAdmin, SchoolAdmin (own ratings)
 */
class StaffRatingController extends Controller
{
    protected ManualRatingService $manualRatingService;
    protected AutomaticRatingCalculator $autoCalculator;

    public function __construct(
        ManualRatingService $manualRatingService,
        AutomaticRatingCalculator $autoCalculator
    ) {
        $this->manualRatingService = $manualRatingService;
        $this->autoCalculator = $autoCalculator;

        // Permission middleware
    }

    /**
     * Get all ratings for a staff member
     *
     * @param Request $request
     * @param User $staff
     * @return JsonResponse
     */
    public function index(Request $request, User $staff): JsonResponse
    {
        try {
            $ratingType = $request->input('rating_type'); // 'manual' or 'automatic'
            $category = $request->input('category');
            $period = $request->input('period');
            $latestOnly = $request->boolean('latest_only', false);

            $query = StaffRating::where('staff_user_id', $staff->id)
                ->with(['rater:id,name,email', 'institution:id,name']);

            // Apply filters
            if ($ratingType) {
                $query->where('rating_type', $ratingType);
            }

            if ($category) {
                $query->where('category', $category);
            }

            if ($period) {
                $query->where('period', $period);
            }

            if ($latestOnly) {
                $query->where('is_latest', true);
            }

            $ratings = $query->orderBy('created_at', 'desc')->get();

            // Calculate average score
            $averageScore = $ratings->avg('score');

            // Group by category
            $byCategory = $ratings->groupBy('category')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'average' => round($group->avg('score'), 2),
                    'latest' => $group->first(),
                ];
            });

            return response()->json([
                'staff' => [
                    'id' => $staff->id,
                    'name' => $staff->name,
                    'email' => $staff->email,
                    'role' => $staff->getRoleNames()->first(),
                ],
                'ratings' => $ratings,
                'statistics' => [
                    'total_count' => $ratings->count(),
                    'average_score' => round($averageScore, 2),
                    'manual_count' => $ratings->where('rating_type', 'manual')->count(),
                    'automatic_count' => $ratings->where('rating_type', 'automatic')->count(),
                    'by_category' => $byCategory,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymətləndirmələri yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get specific rating details
     *
     * @param StaffRating $rating
     * @return JsonResponse
     */
    public function show(StaffRating $rating): JsonResponse
    {
        try {
            $rating->load(['staffUser', 'rater', 'institution']);

            return response()->json([
                'rating' => $rating,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymətləndirmə detallarını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new manual rating
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'staff_user_id' => 'required|exists:users,id',
            'category' => 'required|in:leadership,teamwork,communication,initiative,overall',
            'score' => 'required|numeric|min:0|max:5',
            'period' => 'required|string',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $staff = User::findOrFail($request->staff_user_id);
            $rater = auth()->user();

            // Check if rater can rate this staff member
            if (!$this->manualRatingService->canRate($rater, $staff)) {
                return response()->json([
                    'message' => 'Bu istifadəçiyə qiymət vermə səlahiyyətiniz yoxdur',
                ], 403);
            }

            $rating = $this->manualRatingService->giveRating(
                $staff,
                $rater,
                $request->category,
                $request->score,
                $request->period,
                $request->notes
            );

            return response()->json([
                'message' => 'Qiymətləndirmə uğurla əlavə edildi',
                'rating' => $rating->load(['staffUser', 'rater']),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Qiymətləndirmə əlavə edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update existing rating
     *
     * @param Request $request
     * @param StaffRating $rating
     * @return JsonResponse
     */
    public function update(Request $request, StaffRating $rating): JsonResponse
    {
        // Only manual ratings can be updated
        if ($rating->rating_type !== 'manual') {
            return response()->json([
                'message' => 'Avtomatik qiymətləndirmələr redaktə oluna bilməz',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'score' => 'sometimes|numeric|min:0|max:5',
            'notes' => 'nullable|string|max:1000',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $rater = auth()->user();

            // Check if rater can update this rating
            if (!$this->manualRatingService->canRate($rater, $rating->staffUser)) {
                return response()->json([
                    'message' => 'Bu qiymətləndirməni yeniləmə səlahiyyətiniz yoxdur',
                ], 403);
            }

            $updatedRating = $this->manualRatingService->updateRating(
                $rating,
                $request->only(['score', 'notes']),
                $request->reason
            );

            return response()->json([
                'message' => 'Qiymətləndirmə yeniləndi',
                'rating' => $updatedRating->load(['staffUser', 'rater']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Yeniləmədə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete rating
     *
     * @param Request $request
     * @param StaffRating $rating
     * @return JsonResponse
     */
    public function destroy(Request $request, StaffRating $rating): JsonResponse
    {
        // Only manual ratings can be deleted
        if ($rating->rating_type !== 'manual') {
            return response()->json([
                'message' => 'Avtomatik qiymətləndirmələr silinə bilməz',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $rater = auth()->user();

            // Check if rater can delete this rating
            if (!$this->manualRatingService->canRate($rater, $rating->staffUser)) {
                return response()->json([
                    'message' => 'Bu qiymətləndirməni silmə səlahiyyətiniz yoxdur',
                ], 403);
            }

            $this->manualRatingService->deleteRating($rating, $request->reason);

            return response()->json([
                'message' => 'Qiymətləndirmə silindi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Silinməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get automatic rating breakdown
     *
     * @param Request $request
     * @param User $staff
     * @return JsonResponse
     */
    public function breakdown(Request $request, User $staff): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'period' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Validate period format
            if (!AutomaticRatingCalculator::isValidPeriod($request->period)) {
                return response()->json([
                    'message' => 'Yanlış period formatı. Düzgün: 2024-12, 2024-Q4, 2024',
                ], 400);
            }

            $breakdown = $this->autoCalculator->calculateOverallRating($staff, $request->period);

            return response()->json([
                'staff' => [
                    'id' => $staff->id,
                    'name' => $staff->name,
                    'role' => $staff->getRoleNames()->first(),
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
     * Get rateable users for current user
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getRateableUsers(Request $request): JsonResponse
    {
        try {
            $rater = auth()->user();

            $users = $this->manualRatingService->getRateableUsers($rater);

            return response()->json([
                'users' => $users,
                'total' => $users->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstifadəçiləri yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get rating statistics for multiple staff members
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'staff_user_ids' => 'required|array',
            'staff_user_ids.*' => 'exists:users,id',
            'period' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $period = $request->period ?? AutomaticRatingCalculator::getCurrentPeriod();

            $statistics = [];

            foreach ($request->staff_user_ids as $userId) {
                $staff = User::find($userId);

                if (!$staff) {
                    continue;
                }

                $ratings = StaffRating::where('staff_user_id', $userId)
                    ->where('period', $period)
                    ->where('is_latest', true)
                    ->get();

                $statistics[] = [
                    'staff' => [
                        'id' => $staff->id,
                        'name' => $staff->name,
                        'role' => $staff->getRoleNames()->first(),
                    ],
                    'period' => $period,
                    'manual_average' => round($ratings->where('rating_type', 'manual')->avg('score'), 2),
                    'automatic_average' => round($ratings->where('rating_type', 'automatic')->avg('score'), 2),
                    'overall_average' => round($ratings->avg('score'), 2),
                    'total_ratings' => $ratings->count(),
                ];
            }

            return response()->json([
                'statistics' => $statistics,
                'period' => $period,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Statistika hesablanarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
