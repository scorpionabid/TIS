<?php

namespace App\Http\Controllers\TeacherRating;

use App\Http\Controllers\Controller;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * TeacherProfileController
 *
 * CRUD operations for teacher rating profiles
 * Note: Basic teacher data (name, email, etc.) is in User + UserProfile
 * This manages ONLY rating-specific extended profile
 */
class TeacherProfileController extends Controller
{
    /**
     * List all teacher profiles with filters
     *
     * GET /api/teacher-rating/teachers?search=&school_id=&subject_id=&is_active=
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = TeacherProfile::with([
                'user.profile',
                'school',
                'primarySubject',
            ]);

            // Search filter
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->whereHas('user.profile', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                })->orWhere('utis_code', 'like', "%{$search}%");
            }

            // School filter
            if ($request->has('school_id')) {
                $query->where('school_id', $request->input('school_id'));
            }

            // Subject filter
            if ($request->has('subject_id')) {
                $query->where('primary_subject_id', $request->input('subject_id'));
            }

            // Active status filter
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            // Age band filter
            if ($request->has('age_band')) {
                $query->where('age_band', $request->input('age_band'));
            }

            $perPage = $request->input('per_page', 20);
            $teachers = $query->paginate($perPage);

            // Transform response to include user data
            $teachers->getCollection()->transform(function ($teacher) {
                return [
                    'id' => $teacher->id,
                    'utis_code' => $teacher->utis_code,
                    'user_id' => $teacher->user_id,
                    'name' => $teacher->getFullName(),
                    'email' => $teacher->getEmail(),
                    'school' => [
                        'id' => $teacher->school->id ?? null,
                        'name' => $teacher->school->name ?? null,
                    ],
                    'primary_subject' => [
                        'id' => $teacher->primarySubject->id ?? null,
                        'name' => $teacher->primarySubject->name ?? null,
                    ],
                    'start_year' => $teacher->start_year,
                    'years_of_experience' => $teacher->getYearsOfExperience(),
                    'age_band' => $teacher->age_band,
                    'is_active' => $teacher->is_active,
                    'photo_path' => $teacher->photo_path,
                    'created_at' => $teacher->created_at,
                    'updated_at' => $teacher->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $teachers,
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherProfileController - index error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get teachers',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single teacher profile with full details
     *
     * GET /api/teacher-rating/teachers/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $teacher = TeacherProfile::with([
                'user.profile',
                'school',
                'primarySubject',
                'educationHistory',
                'teachingAssignments.subject',
                'classAcademicResults',
                'lessonObservations',
                'assessmentScores',
                'certificates.certificateType',
                'awards.awardType',
                'olympiadAchievements',
                'ratingResults.academicYear',
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $teacher->id,
                    'utis_code' => $teacher->utis_code,
                    'user_id' => $teacher->user_id,
                    'name' => $teacher->getFullName(),
                    'email' => $teacher->getEmail(),
                    'school' => $teacher->school,
                    'primary_subject' => $teacher->primarySubject,
                    'all_subjects' => $teacher->getAllSubjects(),
                    'start_year' => $teacher->start_year,
                    'years_of_experience' => $teacher->getYearsOfExperience(),
                    'age_band' => $teacher->age_band,
                    'is_active' => $teacher->is_active,
                    'photo_path' => $teacher->photo_path,
                    'education_history' => $teacher->educationHistory,
                    'teaching_assignments' => $teacher->teachingAssignments,
                    'academic_results_count' => $teacher->classAcademicResults->count(),
                    'lesson_observations_count' => $teacher->lessonObservations->count(),
                    'assessment_scores_count' => $teacher->assessmentScores->count(),
                    'certificates_count' => $teacher->certificates->count(),
                    'awards_count' => $teacher->awards->count(),
                    'olympiad_achievements_count' => $teacher->olympiadAchievements->count(),
                    'rating_history' => $teacher->ratingResults,
                    'created_at' => $teacher->created_at,
                    'updated_at' => $teacher->updated_at,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('TeacherProfileController - show error', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Teacher not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Create new teacher rating profile
     * Note: User must already exist (created via RegionAdmin teacher management)
     *
     * POST /api/teacher-rating/teachers
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'school_id' => 'required|exists:institutions,id',
            'primary_subject_id' => 'nullable|exists:subjects,id',
            'start_year' => 'nullable|integer|min:1980|max:' . date('Y'),
            'age_band' => 'nullable|in:20-29,30-39,40-49,50-59,60+',
            'photo_path' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            // Check if user already has a teacher profile
            $existing = TeacherProfile::where('user_id', $request->user_id)->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'This user already has a teacher profile',
                ], 409);
            }

            // Get UTIS code from user's profile
            $user = User::with('profile')->findOrFail($request->user_id);
            $utisCode = $user->profile->utis_code ?? 'TEMP_' . $user->id;

            $teacher = TeacherProfile::create([
                'user_id' => $request->user_id,
                'utis_code' => $utisCode,
                'school_id' => $request->school_id,
                'primary_subject_id' => $request->primary_subject_id,
                'start_year' => $request->start_year,
                'age_band' => $request->age_band,
                'photo_path' => $request->photo_path,
                'is_active' => true,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher profile created successfully',
                'data' => $teacher->load('user.profile', 'school', 'primarySubject'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TeacherProfileController - store error', [
                'error' => $e->getMessage(),
                'data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create teacher profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update teacher rating profile
     * Note: Cannot update user_id or utis_code (immutable)
     *
     * PUT /api/teacher-rating/teachers/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'school_id' => 'nullable|exists:institutions,id',
            'primary_subject_id' => 'nullable|exists:subjects,id',
            'start_year' => 'nullable|integer|min:1980|max:' . date('Y'),
            'age_band' => 'nullable|in:20-29,30-39,40-49,50-59,60+',
            'photo_path' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            $teacher = TeacherProfile::findOrFail($id);

            $teacher->update($request->only([
                'school_id',
                'primary_subject_id',
                'start_year',
                'age_band',
                'photo_path',
                'is_active',
            ]));

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher profile updated successfully',
                'data' => $teacher->load('user.profile', 'school', 'primarySubject'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TeacherProfileController - update error', [
                'id' => $id,
                'error' => $e->getMessage(),
                'data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Soft delete teacher profile
     *
     * DELETE /api/teacher-rating/teachers/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $teacher = TeacherProfile::findOrFail($id);
            $teacher->delete(); // Soft delete

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher profile deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TeacherProfileController - destroy error', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete teacher profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore soft-deleted teacher profile
     *
     * POST /api/teacher-rating/teachers/{id}/restore
     */
    public function restore(int $id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $teacher = TeacherProfile::withTrashed()->findOrFail($id);
            $teacher->restore();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher profile restored successfully',
                'data' => $teacher->load('user.profile', 'school', 'primarySubject'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TeacherProfileController - restore error', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to restore teacher profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk activate/deactivate teachers
     *
     * POST /api/teacher-rating/teachers/bulk-update-status
     * Body: { "teacher_ids": [1, 2, 3], "is_active": true }
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $request->validate([
            'teacher_ids' => 'required|array',
            'teacher_ids.*' => 'integer|exists:teachers,id',
            'is_active' => 'required|boolean',
        ]);

        DB::beginTransaction();
        try {
            $updated = TeacherProfile::whereIn('id', $request->teacher_ids)
                ->update(['is_active' => $request->is_active]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Successfully updated {$updated} teacher profiles",
                'data' => [
                    'updated_count' => $updated,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TeacherProfileController - bulkUpdateStatus error', [
                'error' => $e->getMessage(),
                'data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher profiles',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
