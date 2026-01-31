<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\BaseController;
use App\Models\Rating;
use App\Models\RatingConfig;
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
                ->when($request->user()->cannot('ratings.manage'), function ($query) {
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
                });

            $ratings = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return $this->success('Reytinqlər uğurla əldə edildi', $ratings);
        } catch (\Exception $e) {
            return $this->error('Reytinqlər əldə edilə bilmədi: ' . $e->getMessage());
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

            return $this->success('Reytinq uğurla yaradıldı', $rating, 201);
        } catch (\Exception $e) {
            return $this->error('Reytinq yaradıla bilmədi: ' . $e->getMessage());
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

            return $this->success('Reytinq uğurla əldə edildi', $rating);
        } catch (\Exception $e) {
            return $this->error('Reytinq əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified rating in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'manual_score' => 'nullable|numeric|min:0|max:100',
                'status' => 'nullable|in:draft,published,archived',
                'metadata' => 'nullable|array',
            ]);

            $rating = Rating::when(auth()->user()->cannot('ratings.manage'), function ($query) {
                return $query->where('institution_id', auth()->user()->institution_id);
            })->findOrFail($id);

            $rating->update($validated);

            return $this->success('Reytinq uğurla yeniləndi', $rating);
        } catch (\Exception $e) {
            return $this->error('Reytinq yenilənə bilmədi: ' . $e->getMessage());
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

            return $this->success('Reytinq uğurla silindi');
        } catch (\Exception $e) {
            return $this->error('Reytinq silinə bilmədi: ' . $e->getMessage());
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

            return $this->success('Reytinq uğurla hesablandı', $rating);
        } catch (\Exception $e) {
            return $this->error('Reytinq hesablanıla bilmədi: ' . $e->getMessage());
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

            return $this->success('Bütün reytinqlər uğurla hesablandı', $results);
        } catch (\Exception $e) {
            return $this->error('Reytinqlər hesablanıla bilmədi: ' . $e->getMessage());
        }
    }
}
