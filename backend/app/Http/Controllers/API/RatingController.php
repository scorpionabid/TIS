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
            $period = $request->get('period');
            $academicYearId = $request->get('academic_year_id');
            $userRole = $request->get('user_role');

            if ($userRole) {
                // If filtering by role, we want all users of that role, potentially with ratings
                $sortBy = $request->get('sort_by', 'first_name');
                $sortOrder = $request->get('sort_order', 'asc');

                $query = \App\Models\User::with([
                    'institution',
                    'ratings' => function ($q) use ($period, $academicYearId) {
                        $q->when($period, fn($q) => $q->where('period', $period))
                            ->when($academicYearId, fn($q) => $q->where('academic_year_id', $academicYearId));
                    }
                ])
                    ->byRole($userRole)
                    ->when($request->get('institution_id'), function ($query, $institutionId) {
                        return $query->where('institution_id', $institutionId);
                    })
                    ->when($request->get('search'), function ($query, $search) {
                        return $query->where(function ($q) use ($search) {
                            $q->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%");
                        });
                    })
                    ->when($request->user()->cannot('ratings.manage'), function ($query) use ($request) {
                        return $query->where('institution_id', $request->user()->institution_id);
                    });

                // Handle sorting
                if (in_array($sortBy, ['first_name', 'last_name', 'name', 'email'])) {
                    $query->orderBy($sortBy === 'name' ? 'first_name' : $sortBy, $sortOrder);
                } elseif (in_array($sortBy, ['overall_score', 'task_score', 'survey_score', 'manual_score'])) {
                    // Sort by rating fields - requires join to work with pagination
                    $query->leftJoin('ratings', function ($join) use ($period, $academicYearId) {
                        $join->on('users.id', '=', 'ratings.user_id')
                            ->when($period, fn($j) => $j->where('ratings.period', $period))
                            ->when($academicYearId, fn($j) => $j->where('ratings.academic_year_id', $academicYearId));
                    })
                        ->select('users.*') // Ensure we only get user columns to avoid collisions
                        ->orderBy("ratings.{$sortBy}", $sortOrder);
                } else {
                    $query->orderBy('first_name', 'asc');
                }

                $paginator = $query->paginate($request->get('per_page', 15));

                // Transform to look like Rating model for frontend compatibility
                $transformedData = collect($paginator->items())->map(function ($user) use ($period, $academicYearId) {
                    $rating = $user->ratings->first();
                    return [
                        'id' => $rating?->id ?? null,
                        'user_id' => $user->id,
                        'institution_id' => $user->institution_id,
                        'academic_year_id' => $rating?->academic_year_id ?? $academicYearId,
                        'period' => $rating?->period ?? $period,
                        'overall_score' => $rating?->overall_score ?? 0,
                        'task_score' => $rating?->task_score ?? 0,
                        'survey_score' => $rating?->survey_score ?? 0,
                        'manual_score' => $rating?->manual_score ?? 0,
                        'status' => $rating?->status ?? 'draft',
                        'user' => [
                            'id' => $user->id,
                            'full_name' => $user->name,
                            'email' => $user->email,
                        ],
                        'institution' => $user->institution ? [
                            'id' => $user->institution->id,
                            'name' => $user->institution->name,
                        ] : null,
                    ];
                });

                $results = $paginator->setCollection($transformedData);
            } else {
                // Standard Rating-based query
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
                    ->when($academicYearId, function ($query, $academicYearId) {
                        return $query->where('academic_year_id', $academicYearId);
                    })
                    ->when($period, function ($query, $period) {
                        return $query->where('period', $period);
                    })
                    ->when($request->get('status'), function ($query, $status) {
                        return $query->where('status', $status);
                    });

                $results = $query->orderBy('created_at', 'desc')
                    ->paginate($request->get('per_page', 15));
            }

            return $this->successResponse($results, 'Reytinqlər uğurla əldə edildi');
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
