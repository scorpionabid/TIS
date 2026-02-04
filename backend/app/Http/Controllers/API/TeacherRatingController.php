<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\BaseController;
use App\Services\TeacherRatingCalculationService;
use App\Services\LeaderboardService;
use App\Models\Rating;
use App\Models\RatingConfig;
use App\Models\OlympiadLevelConfig;
use App\Models\GrowthBonusConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * PRD: Müəllim Reytinq Sistemi API Controller
 */
class TeacherRatingController extends BaseController
{
    public function __construct(
        private TeacherRatingCalculationService $calculationService,
        private LeaderboardService $leaderboardService
    ) {
        $this->middleware('auth:sanctum');
    }

    /**
     * PRD: Calculate rating for a single teacher.
     *
     * POST /api/teacher-rating/calculate/{teacherId}
     */
    public function calculate(int $teacherId, Request $request): JsonResponse
    {
        $this->authorize('calculate', Rating::class);

        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $rating = $this->calculationService->calculateTeacherRating(
                $teacherId,
                $validated['academic_year_id']
            );

            return $this->successResponse([
                'rating' => $rating->load(['user', 'institution', 'academicYear']),
            ], 'Reytinq uğurla hesablandı');
        } catch (\Exception $e) {
            Log::error("Rating calculation failed for teacher {$teacherId}: " . $e->getMessage());
            return $this->errorResponse('Reytinq hesablanarkən xəta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PRD: Calculate ratings for all teachers in scope.
     *
     * POST /api/teacher-rating/calculate-all
     */
    public function calculateAll(Request $request): JsonResponse
    {
        $this->authorize('calculateAll', Rating::class);

        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'nullable|exists:institutions,id',
        ]);

        try {
            $results = $this->calculationService->calculateAllRatings(
                $validated['academic_year_id'],
                $validated['institution_id'] ?? null
            );

            return $this->successResponse($results, 'Bütün reytinqlər hesablandı');
        } catch (\Exception $e) {
            Log::error("Bulk rating calculation failed: " . $e->getMessage());
            return $this->errorResponse('Reytinqlər hesablanarkən xəta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PRD: Get rating result for a teacher.
     *
     * GET /api/teacher-rating/result/{teacherId}
     */
    public function getResult(int $teacherId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        $rating = Rating::with(['user', 'institution', 'academicYear'])
            ->where('user_id', $teacherId)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->first();

        if (!$rating) {
            return $this->errorResponse('Reytinq tapılmadı', 404);
        }

        return $this->successResponse([
            'rating' => $rating,
            'breakdown' => [
                'academic' => $rating->academic_score,
                'observation' => $rating->observation_score,
                'assessment' => $rating->assessment_score,
                'certificate' => $rating->certificate_score,
                'olympiad' => $rating->olympiad_score,
                'award' => $rating->award_score,
            ],
            'growth_bonus' => $rating->growth_bonus,
            'yearly_breakdown' => $rating->yearly_breakdown,
        ]);
    }

    /**
     * PRD: Compare teacher ratings across years.
     *
     * GET /api/teacher-rating/compare/{teacherId}
     */
    public function compareYears(int $teacherId): JsonResponse
    {
        $ratings = Rating::with('academicYear')
            ->where('user_id', $teacherId)
            ->where('status', 'published')
            ->orderBy('academic_year_id')
            ->get();

        if ($ratings->isEmpty()) {
            return $this->errorResponse('Müqayisə üçün reytinq tapılmadı', 404);
        }

        $comparison = $ratings->map(function ($rating) {
            return [
                'academic_year' => $rating->academicYear->name,
                'academic_year_id' => $rating->academic_year_id,
                'overall_score' => $rating->overall_score,
                'breakdown' => [
                    'academic' => $rating->academic_score,
                    'observation' => $rating->observation_score,
                    'assessment' => $rating->assessment_score,
                    'certificate' => $rating->certificate_score,
                    'olympiad' => $rating->olympiad_score,
                    'award' => $rating->award_score,
                ],
                'growth_bonus' => $rating->growth_bonus,
            ];
        });

        return $this->successResponse([
            'teacher_id' => $teacherId,
            'comparison' => $comparison,
        ]);
    }

    /**
     * PRD: Get leaderboard (Top 20).
     *
     * GET /api/teacher-rating/leaderboard
     */
    public function leaderboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'scope' => 'required|in:school,rayon,region,subject',
            'scope_id' => 'nullable|integer',
            'subject_id' => 'nullable|exists:subjects,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'region_id' => 'nullable|exists:institutions,id',
        ]);

        try {
            $leaderboard = $this->leaderboardService->getLeaderboard($validated);

            return $this->successResponse([
                'leaderboard' => $leaderboard,
                'count' => $leaderboard->count(),
                'filters' => [
                    'academic_year_id' => $validated['academic_year_id'],
                    'scope' => $validated['scope'],
                    'scope_id' => $validated['scope_id'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("Leaderboard query failed: " . $e->getMessage());
            return $this->errorResponse('Liderbord yüklənərkən xəta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PRD: Get statistics for dashboard.
     *
     * GET /api/teacher-rating/statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'nullable|exists:institutions,id',
        ]);

        try {
            $stats = $this->leaderboardService->getStatistics(
                $validated['academic_year_id'],
                $validated['institution_id'] ?? null
            );

            return $this->successResponse($stats);
        } catch (\Exception $e) {
            Log::error("Statistics query failed: " . $e->getMessage());
            return $this->errorResponse('Statistika yüklənərkən xəta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PRD: Get district comparison (rayonlararası müqayisə).
     *
     * GET /api/teacher-rating/district-comparison
     */
    public function districtComparison(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'region_id' => 'required|exists:institutions,id',
        ]);

        try {
            $comparison = $this->leaderboardService->getDistrictComparison(
                $validated['academic_year_id'],
                $validated['region_id']
            );

            return $this->successResponse([
                'comparison' => $comparison,
                'region_id' => $validated['region_id'],
            ]);
        } catch (\Exception $e) {
            Log::error("District comparison failed: " . $e->getMessage());
            return $this->errorResponse('Rayon müqayisəsi yüklənərkən xəta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PRD: Get subject comparison.
     *
     * GET /api/teacher-rating/subject-comparison
     */
    public function subjectComparison(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'nullable|exists:institutions,id',
        ]);

        try {
            $comparison = $this->leaderboardService->getSubjectComparison(
                $validated['academic_year_id'],
                $validated['institution_id'] ?? null
            );

            return $this->successResponse([
                'comparison' => $comparison,
            ]);
        } catch (\Exception $e) {
            Log::error("Subject comparison failed: " . $e->getMessage());
            return $this->errorResponse('Fənn müqayisəsi yüklənərkən xəta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PRD: Get rating configuration.
     *
     * GET /api/teacher-rating/config
     */
    public function getConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        $config = RatingConfig::where('institution_id', $validated['institution_id'])
            ->where('academic_year_id', $validated['academic_year_id'])
            ->first();

        if (!$config) {
            // Return defaults
            $config = new RatingConfig([
                'institution_id' => $validated['institution_id'],
                'academic_year_id' => $validated['academic_year_id'],
                'academic_weight' => 0.25,
                'observation_weight' => 0.20,
                'assessment_weight' => 0.20,
                'certificate_weight' => 0.15,
                'olympiad_weight' => 0.10,
                'award_weight' => 0.10,
                'year_weights' => RatingConfig::DEFAULT_YEAR_WEIGHTS,
            ]);
        }

        // Get additional configs
        $olympiadConfigs = OlympiadLevelConfig::active()->get();
        $growthBonusConfigs = GrowthBonusConfig::active()->get();

        return $this->successResponse([
            'config' => $config,
            'olympiad_configs' => $olympiadConfigs,
            'growth_bonus_configs' => $growthBonusConfigs,
        ]);
    }

    /**
     * PRD: Update rating configuration.
     *
     * PUT /api/teacher-rating/config
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $this->authorize('manageConfig', RatingConfig::class);

        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'academic_weight' => 'nullable|numeric|min:0|max:1',
            'observation_weight' => 'nullable|numeric|min:0|max:1',
            'assessment_weight' => 'nullable|numeric|min:0|max:1',
            'certificate_weight' => 'nullable|numeric|min:0|max:1',
            'olympiad_weight' => 'nullable|numeric|min:0|max:1',
            'award_weight' => 'nullable|numeric|min:0|max:1',
            'year_weights' => 'nullable|array',
            'year_weights.*' => 'numeric|min:0|max:1',
        ]);

        // Validate that weights sum to 1
        $weights = [
            $validated['academic_weight'] ?? 0.25,
            $validated['observation_weight'] ?? 0.20,
            $validated['assessment_weight'] ?? 0.20,
            $validated['certificate_weight'] ?? 0.15,
            $validated['olympiad_weight'] ?? 0.10,
            $validated['award_weight'] ?? 0.10,
        ];

        $totalWeight = array_sum($weights);
        if (abs($totalWeight - 1.0) > 0.01) {
            return $this->errorResponse('Komponent çəkilərinin cəmi 1.0 olmalıdır (hazırda: ' . $totalWeight . ')', 422);
        }

        $config = RatingConfig::updateOrCreate(
            [
                'institution_id' => $validated['institution_id'],
                'academic_year_id' => $validated['academic_year_id'],
            ],
            array_filter([
                'academic_weight' => $validated['academic_weight'] ?? null,
                'observation_weight' => $validated['observation_weight'] ?? null,
                'assessment_weight' => $validated['assessment_weight'] ?? null,
                'certificate_weight' => $validated['certificate_weight'] ?? null,
                'olympiad_weight' => $validated['olympiad_weight'] ?? null,
                'award_weight' => $validated['award_weight'] ?? null,
                'year_weights' => $validated['year_weights'] ?? null,
            ], fn($v) => $v !== null)
        );

        return $this->successResponse([
            'config' => $config,
        ], 'Konfiqurasiya uğurla yeniləndi');
    }
}
