<?php

namespace App\Http\Controllers\API;

use App\Helpers\DataIsolationHelper;
use App\Http\Controllers\BaseController;
use App\Models\AcademicYear;
use App\Models\Rating;
use App\Services\RatingCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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
     * Display a listing of ratings with hierarchical institution filtering.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $period = $request->get('period');
            $academicYearId = $request->get('academic_year_id');
            $userRole = $request->get('user_role');
            $forceCalculate = $request->boolean('force_calculate', false);

            $user = $request->user();

            // If user is schooladmin, they should only see their own rating (myStats logic)
            if ($user->hasRole('schooladmin')) {
                return $this->myStats($request);
            }

            // Get allowed institution IDs based on user hierarchy
            $allowedInstitutionIds = DataIsolationHelper::getAllowedInstitutionIds($user);

            // Auto-calculate ratings when user_role and period are set
            if ($userRole && $period) {
                $calcAcademicYearId = $academicYearId
                    ?? AcademicYear::current()->first()?->id
                    ?? AcademicYear::active()->first()?->id;

                if ($calcAcademicYearId) {
                    try {
                        $this->ratingService->calculateAllRatings([
                            'academic_year_id' => $calcAcademicYearId,
                            'period' => $period,
                            'user_role' => $userRole,
                        ], $request->user(), $forceCalculate);
                    } catch (\Exception $e) {
                        Log::warning('Auto-calculate ratings failed', [
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            if ($userRole) {
                $sortBy = $request->get('sort_by', 'first_name');
                $sortOrder = $request->get('sort_order', 'asc');

                $query = \App\Models\User::with([
                    'institution.parent',
                    'ratings' => function ($q) use ($period, $academicYearId) {
                        $q->when($period, fn ($q) => $q->where('period', $period))
                            ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId));
                    },
                ])
                    ->byRole($userRole)
                    ->whereIn('institution_id', $allowedInstitutionIds)
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
                    ->when($request->get('status'), function ($query, $status) use ($period, $academicYearId) {
                        return $query->whereHas('ratings', function ($q) use ($status, $period, $academicYearId) {
                            $q->where('status', $status)
                                ->when($period, fn ($q) => $q->where('period', $period))
                                ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId));
                        });
                    });

                // Handle sorting
                if (in_array($sortBy, ['first_name', 'last_name', 'name', 'email'])) {
                    $query->orderBy($sortBy === 'name' ? 'first_name' : $sortBy, $sortOrder);
                } elseif (in_array($sortBy, ['overall_score', 'task_score', 'survey_score', 'approval_score', 'manual_score'])) {
                    $query->leftJoin('ratings', function ($join) use ($period, $academicYearId) {
                        $join->on('users.id', '=', 'ratings.user_id')
                            ->when($period, fn ($j) => $j->where('ratings.period', $period))
                            ->when($academicYearId, fn ($j) => $j->where('ratings.academic_year_id', $academicYearId));
                    })
                        ->select('users.*')
                        ->orderBy("ratings.{$sortBy}", $sortOrder);
                } elseif ($sortBy === 'sector') {
                    // Sort by sector (parent institution) for grouping
                    $query->leftJoin('institutions', 'users.institution_id', '=', 'institutions.id')
                        ->select('users.*')
                        ->orderBy('institutions.parent_id', $sortOrder)
                        ->orderBy('institutions.name', 'asc');
                } else {
                    // Default: sort by sector then name for natural grouping
                    $query->leftJoin('institutions', 'users.institution_id', '=', 'institutions.id')
                        ->select('users.*')
                        ->orderBy('institutions.parent_id', 'asc')
                        ->orderBy('users.first_name', 'asc');
                }

                $paginator = $query->paginate($request->get('per_page', 50));

                // Transform to include sector info and score_details
                $transformedData = collect($paginator->items())->map(function ($user) use ($period, $academicYearId) {
                    $rating = $user->ratings->first();
                    $institution = $user->institution;
                    
                    $data = [
                        'id' => $rating?->id ?? null,
                        'user_id' => $user->id,
                        'institution_id' => $user->institution_id,
                        'academic_year_id' => $rating?->academic_year_id ?? $academicYearId,
                        'period' => $rating?->period ?? $period,
                        'overall_score' => $rating?->overall_score ?? 0,
                        'task_score' => $rating?->task_score ?? 0,
                        'survey_score' => $rating?->survey_score ?? 0,
                        'attendance_score' => $rating?->attendance_score ?? 0,
                        'approval_score' => $rating?->approval_score ?? 0,
                        'link_score' => $rating?->link_score ?? 0,
                        'manual_score' => $rating?->manual_score ?? 0,
                        'score_details' => $rating?->score_details,
                        'status' => $rating?->status ?? 'draft',
                        'user' => [
                            'id' => $user->id,
                            'full_name' => $user->name,
                            'email' => $user->email,
                        ],
                        'institution' => $institution ? [
                            'id' => $institution->id,
                            'name' => $institution->name,
                            'sector_id' => $institution->parent_id,
                            'sector_name' => $institution->parent?->name,
                        ] : null,
                    ];

                    // Add Ranking and Trend if it's a single institution view (School Admin)
                    if ($institution && $period) {
                        // 1. Sector Rank
                        $sectorId = $institution->parent_id;
                        $sectorRatings = \App\Models\Rating::where('period', $period)
                            ->where('academic_year_id', $academicYearId)
                            ->whereHas('institution', fn($q) => $q->where('parent_id', $sectorId))
                            ->orderBy('overall_score', 'desc')
                            ->pluck('overall_score', 'institution_id');
                        
                        $data['sector_rank'] = $sectorRatings->keys()->search($institution->id) !== false 
                            ? $sectorRatings->keys()->search($institution->id) + 1 
                            : null;
                        $data['sector_total'] = $sectorRatings->count();

                        // 2. Region Rank (Level 2)
                        $regionId = $institution->region_id; // Added region_id check or parent path
                        if (!$regionId && $institution->parent) {
                             $regionId = $institution->parent->parent_id;
                        }
                        
                        if ($regionId) {
                            $regionRatings = \App\Models\Rating::where('period', $period)
                                ->where('academic_year_id', $academicYearId)
                                ->whereHas('institution', function($q) use ($regionId) {
                                    $q->where('parent_id', $regionId)
                                      ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId));
                                })
                                ->orderBy('overall_score', 'desc')
                                ->pluck('overall_score', 'institution_id');

                            $data['region_rank'] = $regionRatings->keys()->search($institution->id) !== false 
                                ? $regionRatings->keys()->search($institution->id) + 1 
                                : null;
                            $data['region_total'] = $regionRatings->count();
                        }

                        // 3. Yearly Trend
                        $yearlyRatings = \App\Models\Rating::where('institution_id', $institution->id)
                            ->where('academic_year_id', $academicYearId)
                            ->orderBy('period', 'asc')
                            ->get(['period', 'overall_score'])
                            ->map(fn($r) => [
                                'period' => $r->period,
                                'score' => $r->overall_score
                            ]);
                        
                        $data['monthly_trend'] = $yearlyRatings;
                    }

                    return $data;
                });

                $results = $paginator->setCollection($transformedData);
            } else {
                // Standard Rating-based query
                $query = Rating::with(['user', 'institution.parent', 'academicYear'])
                    ->whereIn('institution_id', $allowedInstitutionIds)
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
                    ->paginate($request->get('per_page', 50));
            }

            return $this->successResponse($results, 'Reytinqlər uğurla əldə edildi');
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinqlər əldə edilə bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Get specific rating stats for the current school admin.
     */
    public function myStats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (! $user->institution_id) {
                return $this->errorResponse('İstifadəçinin müəssisəsi təyin edilməyib');
            }

            $period = $request->get('period') ?? now()->format('Y-m');
            $academicYearId = $request->get('academic_year_id') 
                ?? AcademicYear::current()->first()?->id 
                ?? AcademicYear::active()->first()?->id;

            if (! $academicYearId) {
                return $this->errorResponse('Aktiv tədris ili tapılmadı');
            }

            // Ensure rating exists/calculated
            $rating = $this->ratingService->calculateRating($user->id, [
                'academic_year_id' => $academicYearId,
                'period' => $period,
                'user_role' => 'schooladmin',
            ], $request->boolean('force_calculate'));

            $institution = $user->institution;
            
            // 1. Sector Rank
            $sectorId = $institution->parent_id;
            $sectorRatings = Rating::where('period', $period)
                ->where('academic_year_id', $academicYearId)
                ->whereHas('institution', fn($q) => $q->where('parent_id', $sectorId))
                ->orderBy('overall_score', 'desc')
                ->get(['overall_score', 'institution_id']);
            
            $sectorRank = $sectorRatings->search(fn($r) => (int) $r->institution_id === (int) $institution->id);
            $sectorRank = $sectorRank !== false ? $sectorRank + 1 : null;
            $sectorTotal = $sectorRatings->count();

            // 2. Region Rank
            $regionId = $institution->region_id;
            if (!$regionId && $institution->parent) {
                $regionId = $institution->parent->parent_id;
            }
            
            $regionRank = null;
            $regionTotal = 0;
            if ($regionId) {
                $regionRatings = Rating::where('period', $period)
                    ->where('academic_year_id', $academicYearId)
                    ->whereHas('institution', function($q) use ($regionId) {
                        $q->where('parent_id', $regionId)
                          ->orWhereHas('parent', fn($pq) => $pq->where('parent_id', $regionId));
                    })
                    ->orderBy('overall_score', 'desc')
                    ->get(['overall_score', 'institution_id']);

                $regionRankIndex = $regionRatings->search(fn($r) => (int) $r->institution_id === (int) $institution->id);
                $regionRank = $regionRankIndex !== false ? $regionRankIndex + 1 : null;
                $regionTotal = $regionRatings->count();
            }

            // 3. Dynamics (Monthly Trend)
            $monthlyTrend = Rating::where('user_id', $user->id)
                ->where('academic_year_id', $academicYearId)
                ->orderBy('period', 'asc')
                ->get(['period', 'overall_score'])
                ->map(fn($r) => [
                    'period' => $r->period,
                    'score' => $r->overall_score
                ]);

            $data = [
                'rating' => $rating,
                'sector_rank' => $sectorRank,
                'sector_total' => $sectorTotal,
                'region_rank' => $regionRank,
                'region_total' => $regionTotal,
                'monthly_trend' => $monthlyTrend,
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'sector_name' => $institution->parent?->name,
                ]
            ];

            return $this->successResponse($data, 'Məlumatlar uğurla əldə edildi');
        } catch (\Exception $e) {
            Log::error('MyStats error', ['error' => $e->getMessage()]);
            return $this->errorResponse('Məlumatlar əldə edilə bilmədi');
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
                'task_score' => 'nullable|numeric',
                'survey_score' => 'nullable|numeric',
                'attendance_score' => 'nullable|numeric',
                'approval_score' => 'nullable|numeric',
                'link_score' => 'nullable|numeric',
                'manual_score' => 'nullable|numeric|min:-100|max:100',
                'manual_score_category' => 'nullable|string|max:100',
                'manual_score_reason' => 'nullable|string|max:1000',
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
            $allowedIds = DataIsolationHelper::getAllowedInstitutionIds(auth()->user());

            $rating = Rating::with(['user', 'institution.parent', 'academicYear'])
                ->whereIn('institution_id', $allowedIds)
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
                'task_score' => 'nullable|numeric',
                'survey_score' => 'nullable|numeric',
                'attendance_score' => 'nullable|numeric',
                'approval_score' => 'nullable|numeric',
                'link_score' => 'nullable|numeric',
                'manual_score' => 'nullable|numeric|min:-100|max:100',
                'manual_score_category' => 'nullable|string|max:100',
                'manual_score_reason' => 'nullable|string|max:1000',
                'status' => 'nullable|in:draft,published,archived',
                'metadata' => 'nullable|array',
            ]);

            $allowedIds = DataIsolationHelper::getAllowedInstitutionIds(auth()->user());

            $rating = Rating::whereIn('institution_id', $allowedIds)->findOrFail($id);

            // Recalculate overall_score based on user's role
            $taskScore = $validated['task_score'] ?? $rating->task_score;
            $surveyScore = $validated['survey_score'] ?? $rating->survey_score;
            $attendanceScore = $validated['attendance_score'] ?? $rating->attendance_score;
            $approvalScore = $validated['approval_score'] ?? $rating->approval_score;
            $linkScore = $validated['link_score'] ?? $rating->link_score;
            $manualScore = $validated['manual_score'] ?? $rating->manual_score;

            $ratingUser = \App\Models\User::with('roles')->find($rating->user_id);
            $isSektorAdmin = $ratingUser?->hasRole('sektoradmin');

            $validated['overall_score'] = $taskScore + $surveyScore
                + ($isSektorAdmin ? $approvalScore : $attendanceScore)
                + $linkScore + $manualScore;

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
            $allowedIds = DataIsolationHelper::getAllowedInstitutionIds(auth()->user());

            $rating = Rating::whereIn('institution_id', $allowedIds)->findOrFail($id);

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
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasiya xətası', 422, $e->errors());
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinq hesablanıla bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Calculate ratings for all users in the caller's hierarchy.
     */
    public function calculateAll(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'academic_year_id' => 'required|exists:academic_years,id',
                'period' => 'required|string|max:50',
                'user_role' => 'nullable|string',
            ]);

            $results = $this->ratingService->calculateAllRatings($validated, $request->user());

            return $this->successResponse($results, 'Bütün reytinqlər uğurla hesablandı');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasiya xətası', 422, $e->errors());
        } catch (\Exception $e) {
            return $this->errorResponse('Reytinqlər hesablanıla bilmədi: ' . $e->getMessage());
        }
    }
}
