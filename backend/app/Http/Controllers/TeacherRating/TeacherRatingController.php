<?php

namespace App\Http\Controllers\TeacherRating;

use App\Http\Controllers\Controller;
use App\Models\TeacherProfile;
use App\Models\AcademicYear;
use App\Models\RatingResult;
use App\Services\TeacherRating\TeacherRatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * TeacherRatingController
 *
 * API endpoints for teacher rating calculations and results
 */
class TeacherRatingController extends Controller
{
    protected TeacherRatingService $ratingService;

    public function __construct(TeacherRatingService $ratingService)
    {
        $this->ratingService = $ratingService;
    }

    /**
     * Calculate rating for a single teacher
     *
     * POST /api/teacher-rating/calculate/{teacherId}
     * Body: { "academic_year_id": 1 }
     */
    public function calculateTeacherRating(Request $request, int $teacherId): JsonResponse
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $teacher = TeacherProfile::with('user.profile', 'school')->findOrFail($teacherId);
            $academicYearId = $request->input('academic_year_id');

            $result = $this->ratingService->calculateTeacherRating($teacher, $academicYearId);

            return response()->json([
                'success' => true,
                'message' => 'Rating calculated successfully',
                'data' => [
                    'rating_result' => $result,
                    'teacher' => [
                        'id' => $teacher->id,
                        'name' => $teacher->getFullName(),
                        'utis_code' => $teacher->utis_code,
                        'school' => $teacher->school->name ?? null,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherRatingController - calculateTeacherRating error', [
                'teacher_id' => $teacherId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate rating',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calculate ratings for all teachers in academic year
     *
     * POST /api/teacher-rating/calculate-all
     * Body: { "academic_year_id": 1 }
     */
    public function calculateAllRatings(Request $request): JsonResponse
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $academicYearId = $request->input('academic_year_id');
            $teachers = TeacherProfile::active()->get();

            $successCount = 0;
            $errorCount = 0;
            $errors = [];

            foreach ($teachers as $teacher) {
                try {
                    $this->ratingService->calculateTeacherRating($teacher, $academicYearId);
                    $successCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    $errors[] = [
                        'teacher_id' => $teacher->id,
                        'teacher_name' => $teacher->getFullName(),
                        'error' => $e->getMessage(),
                    ];
                }
            }

            // Calculate rankings after all ratings are done
            $this->ratingService->calculateRankings($academicYearId);

            return response()->json([
                'success' => true,
                'message' => 'Batch rating calculation completed',
                'data' => [
                    'total_teachers' => $teachers->count(),
                    'success_count' => $successCount,
                    'error_count' => $errorCount,
                    'errors' => $errors,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherRatingController - calculateAllRatings error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate ratings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get rating result for a teacher
     *
     * GET /api/teacher-rating/result/{teacherId}?academic_year_id=1
     */
    public function getRatingResult(Request $request, int $teacherId): JsonResponse
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $academicYearId = $request->query('academic_year_id');

            $result = RatingResult::where('teacher_id', $teacherId)
                ->where('academic_year_id', $academicYearId)
                ->with('teacher.user.profile', 'teacher.school', 'academicYear')
                ->first();

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rating result not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherRatingController - getRatingResult error', [
                'teacher_id' => $teacherId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get rating result',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get leaderboard (top 20 teachers)
     *
     * GET /api/teacher-rating/leaderboard?academic_year_id=1&scope=region&scope_id=1
     */
    public function getLeaderboard(Request $request): JsonResponse
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'scope' => 'nullable|in:school,district,region,subject',
            'scope_id' => 'nullable|integer',
        ]);

        try {
            $academicYearId = $request->query('academic_year_id');
            $scope = $request->query('scope', 'region');
            $scopeId = $request->query('scope_id');

            $leaderboard = $this->ratingService->getLeaderboard($academicYearId, $scope, $scopeId);

            return response()->json([
                'success' => true,
                'data' => [
                    'leaderboard' => $leaderboard,
                    'academic_year_id' => $academicYearId,
                    'scope' => $scope,
                    'scope_id' => $scopeId,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherRatingController - getLeaderboard error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get leaderboard',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get rating statistics for academic year
     *
     * GET /api/teacher-rating/statistics?academic_year_id=1
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        try {
            $academicYearId = $request->query('academic_year_id');

            $results = RatingResult::where('academic_year_id', $academicYearId)->get();

            if ($results->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'total_teachers' => 0,
                        'message' => 'No ratings calculated yet',
                    ],
                ]);
            }

            $statistics = [
                'total_teachers' => $results->count(),
                'average_score' => round($results->avg('total_score'), 2),
                'median_score' => round($results->median('total_score'), 2),
                'min_score' => round($results->min('total_score'), 2),
                'max_score' => round($results->max('total_score'), 2),
                'score_distribution' => [
                    '90-100' => $results->whereBetween('total_score', [90, 100])->count(),
                    '80-89' => $results->whereBetween('total_score', [80, 89])->count(),
                    '70-79' => $results->whereBetween('total_score', [70, 79])->count(),
                    '60-69' => $results->whereBetween('total_score', [60, 69])->count(),
                    'below_60' => $results->where('total_score', '<', 60)->count(),
                ],
                'component_averages' => [
                    'academic' => round($results->avg('breakdown.academic.weighted_score'), 2),
                    'lesson_observation' => round($results->avg('breakdown.lesson_observation.weighted_score'), 2),
                    'olympiad' => round($results->avg('breakdown.olympiad.weighted_score'), 2),
                    'assessment' => round($results->avg('breakdown.assessment.weighted_score'), 2),
                    'certificate' => round($results->avg('breakdown.certificate.weighted_score'), 2),
                    'award' => round($results->avg('breakdown.award.weighted_score'), 2),
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherRatingController - getStatistics error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Compare teacher ratings across years
     *
     * GET /api/teacher-rating/compare/{teacherId}
     */
    public function compareYears(int $teacherId): JsonResponse
    {
        try {
            $teacher = TeacherProfile::with('user.profile')->findOrFail($teacherId);

            $results = RatingResult::where('teacher_id', $teacherId)
                ->with('academicYear')
                ->orderBy('academic_year_id', 'asc')
                ->get();

            if ($results->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No rating history found for this teacher',
                ], 404);
            }

            $comparison = $results->map(function ($result) {
                return [
                    'academic_year' => $result->academicYear->name,
                    'total_score' => $result->total_score,
                    'rank_school' => $result->rank_school,
                    'rank_district' => $result->rank_district,
                    'rank_region' => $result->rank_region,
                    'rank_subject' => $result->rank_subject,
                    'calculated_at' => $result->calculated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'teacher' => [
                        'id' => $teacher->id,
                        'name' => $teacher->getFullName(),
                        'utis_code' => $teacher->utis_code,
                    ],
                    'comparison' => $comparison,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherRatingController - compareYears error', [
                'teacher_id' => $teacherId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to compare years',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
