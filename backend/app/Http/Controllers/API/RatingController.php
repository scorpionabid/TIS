<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\BaseController;
use App\Models\Rating;
use App\Services\RatingCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RatingController extends BaseController
{
    public function __construct(
        private RatingCalculationService $ratingService
    ) {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:ratings.read')->only(['index', 'show']);
        $this->middleware('permission:ratings.write')->only(['store', 'update']);
        $this->middleware('permission:ratings.delete')->only(['destroy']);
        $this->middleware('permission:ratings.calculate')->only(['calculate', 'calculateAll']);
    }

    /**
     * Display a listing of ratings.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Rating::with(['user', 'institution', 'academicYear'])
                ->when($request->user()->cannot('ratings.manage'), function ($query) use ($request) {
                    return $query->where('institution_id', $request->user()->institution_id);
                })
                ->when($request->get('user_id'), function ($query, $userId) {
                    return $query->where('user_id', $userId);
                })
                ->when($request->get('institution_id'), function ($query, $institutionId) {
                    return $query->where('institution_id', $institutionId);
                })
                ->when($request->get('academic_year_id'), function ($query, $academicYearId) {
                    return $query->where('academic_year_id', $academicYearId);
                })
                ->when($request->get('period'), function ($query, $period) {
                    return $query->where('period', $period);
                })
                ->when($request->get('status'), function ($query, $status) {
                    return $query->where('status', $status);
                })
                ->when($request->get('user_role'), function ($query, $role) {
                    return $query->whereHas('user', function ($q) use ($role) {
                        $q->whereHas('role', function ($rq) use ($role) {
                            $rq->where('name', $role);
                        });
                    });
                });

            $ratings = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return $this->successResponse($ratings, 'Reytinqlər uğurla əldə edildi');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinqlər əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created rating in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|exists:users,id',
                'institution_id' => 'required|exists:institutions,id',
                'academic_year_id' => 'required|exists:academic_years,id',
                'period' => 'required|string|max:50',
                'manual_score' => 'nullable|numeric|min:0|max:100',
                'metadata' => 'nullable|array',
            ]);

            $rating = Rating::create($validated);

            return $this->successResponse($rating, 'Reytinq uğurla yaradıldı');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinq yaradıla bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified rating.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $rating = Rating::with(['user', 'institution', 'academicYear'])
                ->when(auth()->user()->cannot('ratings.manage'), function ($query) {
                    return $query->where('institution_id', auth()->user()->institution_id);
                })
                ->findOrFail($id);

            return $this->successResponse($rating, 'Reytinq uğurla əldə edildi');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinq əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified rating in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'task_score' => 'nullable|numeric|min:0|max:100',
                'survey_score' => 'nullable|numeric|min:0|max:100',
                'manual_score' => 'nullable|numeric|min:0|max:100',
                'status' => 'nullable|in:draft,published,archived',
                'metadata' => 'nullable|array',
            ]);

            $rating = Rating::when(auth()->user()->cannot('ratings.manage'), function ($query) {
                return $query->where('institution_id', auth()->user()->institution_id);
            })->findOrFail($id);

            $rating->update($validated);

            return $this->successResponse($rating, 'Reytinq uğurla yeniləndi');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinq yenilənə bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified rating from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $rating = Rating::when(auth()->user()->cannot('ratings.manage'), function ($query) {
                return $query->where('institution_id', auth()->user()->institution_id);
            })->findOrFail($id);

            $rating->delete();

            return $this->successResponse(null, 'Reytinq uğurla silindi');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinq silinə bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Calculate rating for a specific user.
     */
    public function calculate(int $userId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'academic_year_id' => 'required|exists:academic_years,id',
                'period' => 'required|string|max:50',
            ]);

            $rating = $this->ratingService->calculateRating($userId, $validated);

            return $this->successResponse($rating, 'Reytinq uğurla hesablandı');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinq hesablanıla bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Calculate ratings for all users.
     */
    public function calculateAll(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'academic_year_id' => 'required|exists:academic_years,id',
                'period' => 'required|string|max:50',
            ]);

            $results = $this->ratingService->calculateAllRatings($validated);

            return $this->successResponse($results, 'Bütün reytinqlər uğurla hesablandı');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinqlər hesablanıla bilmədi: ' . $e->getMessage());
        }
    }
}
