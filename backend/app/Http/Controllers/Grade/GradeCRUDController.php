<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\BaseController;
use App\Http\Requests\Grade\DuplicateGradeRequest;
use App\Http\Requests\Grade\FilterGradesRequest;
use App\Http\Requests\Grade\StoreGradeRequest;
use App\Http\Requests\Grade\UpdateGradeRequest;
use App\Http\Resources\Grade\GradeResource;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\User;
use App\Services\InstitutionAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class GradeCRUDController extends BaseController
{
    /**
     * Display a listing of grades with filtering and pagination.
     */
    public function index(FilterGradesRequest $request): JsonResponse
    {
        // Authorization handled by Policy (viewAny)
        Gate::authorize('viewAny', Grade::class);

        // Build query with filters
        $query = $this->applyFilters($request);

        // Apply eager loading based on includes
        $query->with($this->getIncludes($request));

        // Paginate results
        $perPage = $request->get('per_page', 20);
        $grades = $query->orderBy('class_level')
            ->orderBy('name')
            ->paginate($perPage);

        // Transform using GradeResource
        return response()->json([
            'success' => true,
            'data' => [
                'grades' => GradeResource::collection($grades->items()),
                'pagination' => [
                    'current_page' => $grades->currentPage(),
                    'per_page' => $grades->perPage(),
                    'total' => $grades->total(),
                    'total_pages' => $grades->lastPage(),
                    'from' => $grades->firstItem(),
                    'to' => $grades->lastItem(),
                ],
            ],
            'message' => 'Sinif siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created grade.
     */
    public function store(StoreGradeRequest $request): JsonResponse
    {
        // Check authorization using Policy
        Gate::authorize('create', Grade::class);

        $validated = $request->validated();
        $className = trim($validated['name']);
        $classLevel = (int) $validated['class_level'];

        // Check for unique grade name within institution, academic year, and class level
        $existingGrade = Grade::where('institution_id', $validated['institution_id'])
            ->where('academic_year_id', $validated['academic_year_id'])
            ->where('class_level', $classLevel)
            ->where('name', $className)
            ->first();
        if ($existingGrade) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təhsil ili və təşkilatda həmin səviyyə və adlı sinif mövcuddur',
            ], 422);
        }

        // Check if room is available
        if (! empty($validated['room_id'])) {
            $roomInUse = Grade::where('room_id', $validated['room_id'])
                ->where('academic_year_id', $validated['academic_year_id'])
                ->first();
            if ($roomInUse) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq artıq başqa sinif tərəfindən istifadə olunur',
                ], 422);
            }
        }

        // Check if teacher is already assigned
        if (! empty($validated['homeroom_teacher_id'])) {
            $teacherAssigned = Grade::where('homeroom_teacher_id', $validated['homeroom_teacher_id'])
                ->where('academic_year_id', $validated['academic_year_id'])
                ->first();
            if ($teacherAssigned) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu müəllim artıq başqa sinifin sinif rəhbəridir',
                ], 422);
            }

            // Verify the user is a teacher
            $teacher = User::find($validated['homeroom_teacher_id']);
            if (! $teacher->hasRole(['müəllim', 'müavin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən istifadəçi müəllim deyil',
                ], 422);
            }
        }

        try {
            $grade = Grade::create([
                'name' => $className,
                'class_level' => $classLevel,
                'academic_year_id' => $validated['academic_year_id'],
                'institution_id' => $validated['institution_id'],
                'room_id' => $validated['room_id'] ?? null,
                'homeroom_teacher_id' => $validated['homeroom_teacher_id'] ?? null,
                'specialty' => $validated['specialty'] ?? null,
                'student_count' => $validated['student_count'] ?? 0,
                'male_student_count' => $validated['male_student_count'] ?? 0,
                'female_student_count' => $validated['female_student_count'] ?? 0,
                'education_program' => $validated['education_program'] ?? null,
                'class_type' => $validated['class_type'] ?? null,
                'class_profile' => $validated['class_profile'] ?? null,
                'teaching_shift' => $validated['teaching_shift'] ?? null,
                'metadata' => $validated['metadata'] ?? [],
                'is_active' => true,
            ]);

            // Sync tags if provided
            if (! empty($validated['tag_ids']) && is_array($validated['tag_ids'])) {
                $grade->tags()->sync($validated['tag_ids']);
            }

            // Load relationships for response
            $grade->load(['academicYear', 'institution']);

            return response()->json([
                'success' => true,
                'data' => new GradeResource($grade),
                'message' => 'Sinif uğurla yaradıldı',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified grade.
     */
    public function show(Grade $grade): JsonResponse
    {
        // Check authorization using Policy
        Gate::authorize('view', $grade);

        // Eager load relationships
        $grade->load([
            'institution',
            'academicYear',
            'room',
            'homeroomTeacher.profile',
            'students.profile',
            'subjects.activeTeacherAssignments.teacher.profile',
            'tags',
        ]);

        // Return using GradeResource
        return response()->json([
            'success' => true,
            'data' => new GradeResource($grade),
            'message' => 'Sinif məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified grade.
     */
    public function update(UpdateGradeRequest $request, Grade $grade): JsonResponse
    {
        // Check authorization using Policy
        Gate::authorize('update', $grade);

        $validated = $request->validated();
        $classLevel = $request->has('class_level') ? (int) $validated['class_level'] : $grade->class_level;
        $className = $request->has('name') ? trim($validated['name']) : $grade->name;

        // Check for unique grade name if name or class_level is being updated
        if ($request->has('name') || $request->has('class_level')) {
            $existingGrade = Grade::where('institution_id', $grade->institution_id)
                ->where('academic_year_id', $grade->academic_year_id)
                ->where('class_level', $classLevel)
                ->where('name', $className)
                ->where('id', '!=', $grade->id)
                ->first();
            if ($existingGrade) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təhsil ili və təşkilatda həmin səviyyə və adlı sinif mövcuddur',
                ], 422);
            }
        }

        // Check if room is available if room is being changed
        if ($request->has('room_id') && $validated['room_id'] !== $grade->room_id) {
            if ($validated['room_id']) {
                $roomInUse = Grade::where('room_id', $validated['room_id'])
                    ->where('academic_year_id', $grade->academic_year_id)
                    ->where('id', '!=', $grade->id)
                    ->first();
                if ($roomInUse) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu otaq artıq başqa sinif tərəfindən istifadə olunur',
                    ], 422);
                }
            }
        }

        // Check if teacher is available if teacher is being changed
        if ($request->has('homeroom_teacher_id') && $validated['homeroom_teacher_id'] !== $grade->homeroom_teacher_id) {
            if ($validated['homeroom_teacher_id']) {
                $teacherAssigned = Grade::where('homeroom_teacher_id', $validated['homeroom_teacher_id'])
                    ->where('academic_year_id', $grade->academic_year_id)
                    ->where('id', '!=', $grade->id)
                    ->first();
                if ($teacherAssigned) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bu müəllim artıq başqa sinifin sinif rəhbəridir',
                    ], 422);
                }

                // Verify the user is a teacher
                $teacher = User::find($validated['homeroom_teacher_id']);
                if (! $teacher->hasRole(['müəllim', 'müavin'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilən istifadəçi müəllim deyil',
                    ], 422);
                }
            }
        }

        try {
            $updateData = array_filter($validated, fn ($key) => in_array($key, [
                'room_id', 'homeroom_teacher_id', 'specialty', 'student_count',
                'male_student_count', 'female_student_count', 'education_program',
                'is_active', 'metadata', 'class_type', 'class_profile', 'teaching_shift',
            ]), ARRAY_FILTER_USE_KEY);

            $updateData['name'] = $className;
            $updateData['class_level'] = $classLevel;

            $grade->update($updateData);

            // Sync tags if provided
            if ($request->has('tag_ids')) {
                $grade->tags()->sync($validated['tag_ids'] ?? []);
            }

            // Load relationships for response
            $grade->load(['academicYear', 'institution']);

            return response()->json([
                'success' => true,
                'data' => new GradeResource($grade),
                'message' => 'Sinif məlumatları uğurla yeniləndi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Deactivate the specified grade (soft delete).
     */
    public function deactivate(Grade $grade): JsonResponse
    {
        // Check authorization using Policy
        Gate::authorize('delete', $grade);

        try {
            // Deactivate instead of hard delete
            $grade->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Sinif uğurla deaktiv edildi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif deaktiv edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified grade (hard delete).
     * WARNING: This permanently deletes the grade and all related data.
     */
    public function destroy(Grade $grade): JsonResponse
    {
        // Check authorization using Policy
        Gate::authorize('delete', $grade);

        // Check if grade has active students
        $activeStudents = \App\Models\StudentEnrollment::where('grade_id', $grade->id)
            ->active()
            ->count();
        if ($activeStudents > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu sinifdə {$activeStudents} aktiv şagird var. Əvvəlcə onları başqa sinifə köçürün",
            ], 422);
        }

        // Check for any related data that should prevent deletion
        $hasSubjects = $grade->subjects()->exists();
        $hasAttendance = \DB::table('daily_attendance_summary')
            ->where('grade_id', $grade->id)
            ->exists();
        $hasEnrollments = \App\Models\StudentEnrollment::where('grade_id', $grade->id)->exists();

        if ($hasSubjects || $hasAttendance || $hasEnrollments) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinif silinə bilməz - əlaqəli məlumatlar mövcuddur',
                'data' => [
                    'has_subjects' => $hasSubjects,
                    'has_attendance' => $hasAttendance,
                    'has_enrollments' => $hasEnrollments,
                ],
            ], 422);
        }

        try {
            // Hard delete the grade
            $grade->delete();

            return response()->json([
                'success' => true,
                'message' => 'Sinif uğurla silindi',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif silinərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper methods
     */

    /**
     * Apply filters to the grade query.
     */
    private function applyFilters($request)
    {
        $query = Grade::query();

        // Apply regional access control
        $user = $request->user();
        if (! $user->hasRole('superadmin')) {
            $accessibleInstitutions = InstitutionAccessService::getAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Apply filters
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('class_level')) {
            $query->where('class_level', $request->class_level);
        }

        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        } else {
            // Default to active academic year
            $activeYear = AcademicYear::where('is_active', true)->first();
            if ($activeYear) {
                $query->where('academic_year_id', $activeYear->id);
            }
        }

        if ($request->has('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->has('homeroom_teacher_id')) {
            $query->where('homeroom_teacher_id', $request->homeroom_teacher_id);
        }

        if ($request->has('specialty')) {
            $query->where('specialty', $request->specialty);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('has_room')) {
            $query->when($request->boolean('has_room'), function ($q) {
                return $q->whereNotNull('room_id');
            }, function ($q) {
                return $q->whereNull('room_id');
            });
        }

        if ($request->has('has_teacher')) {
            $query->when($request->boolean('has_teacher'), function ($q) {
                return $q->whereNotNull('homeroom_teacher_id');
            }, function ($q) {
                return $q->whereNull('homeroom_teacher_id');
            });
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ILIKE', "%{$request->search}%")
                    ->orWhere('specialty', 'ILIKE', "%{$request->search}%");
            });
        }

        if ($request->has('class_type')) {
            $query->where('class_type', $request->class_type);
        }

        if ($request->has('teaching_shift')) {
            $query->where('teaching_shift', $request->teaching_shift);
        }

        return $query;
    }

    /**
     * Get relationships to eager load based on includes.
     */
    private function getIncludes($request): array
    {
        $includes = $request->get('include', '');
        $with = ['institution', 'academicYear', 'tags'];

        if (str_contains($includes, 'room')) {
            $with[] = 'room';
        }
        if (str_contains($includes, 'teacher')) {
            $with[] = 'homeroomTeacher.profile';
        }
        if (str_contains($includes, 'students')) {
            $with[] = 'students.profile';
        }
        if (str_contains($includes, 'subjects')) {
            $with[] = 'subjects.activeTeacherAssignments.teacher.profile';
        }

        return $with;
    }

    /**
     * Duplicate an existing grade with optional modifications.
     */
    public function duplicate(DuplicateGradeRequest $request, Grade $grade): JsonResponse
    {
        // Check authorization using Policy
        Gate::authorize('duplicate', $grade);

        $validated = $request->validated();

        // Determine target parameters
        $targetClassLevel = $validated['class_level'] ?? $grade->class_level;
        $targetAcademicYearId = $validated['academic_year_id'] ?? $grade->academic_year_id;

        // Check for duplicate grade
        $existingGrade = Grade::where('name', $validated['name'])
            ->where('class_level', $targetClassLevel)
            ->where('academic_year_id', $targetAcademicYearId)
            ->where('institution_id', $grade->institution_id)
            ->first();

        if ($existingGrade) {
            return response()->json([
                'success' => false,
                'message' => "{$targetClassLevel}-{$validated['name']} sinfi artıq mövcuddur",
                'errors' => ['name' => ['Bu sinif adı artıq istifadə olunur']],
            ], 422);
        }

        try {
            // Create new grade with copied data
            $newGradeData = $grade->toArray();

            // Remove non-copiable fields
            unset($newGradeData['id'], $newGradeData['created_at'], $newGradeData['updated_at']);

            // Apply modifications
            $newGradeData['name'] = $validated['name'];
            $newGradeData['class_level'] = $targetClassLevel;
            $newGradeData['academic_year_id'] = $targetAcademicYearId;
            $newGradeData['homeroom_teacher_id'] = null;
            $newGradeData['room_id'] = null;
            $newGradeData['student_count'] = 0;
            $newGradeData['male_student_count'] = 0;
            $newGradeData['female_student_count'] = 0;

            $newGrade = Grade::create($newGradeData);

            // Copy subjects if requested (default: true)
            if ($request->get('copy_subjects', true)) {
                $gradeSubjects = \DB::table('grade_subjects')
                    ->where('grade_id', $grade->id)
                    ->get();

                foreach ($gradeSubjects as $gradeSubject) {
                    \DB::table('grade_subjects')->insert([
                        'grade_id' => $newGrade->id,
                        'subject_id' => $gradeSubject->subject_id,
                        'weekly_hours' => $gradeSubject->weekly_hours,
                        'is_teaching_activity' => $gradeSubject->is_teaching_activity ?? false,
                        'is_extracurricular' => $gradeSubject->is_extracurricular ?? false,
                        'is_club' => $gradeSubject->is_club ?? false,
                        'is_split_groups' => $gradeSubject->is_split_groups ?? false,
                        'group_count' => $gradeSubject->group_count,
                        'teacher_id' => null,
                        'notes' => $gradeSubject->notes,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Load relationships for response
            $newGrade->load(['institution', 'academicYear', 'tags']);

            return response()->json([
                'success' => true,
                'data' => new GradeResource($newGrade),
                'message' => 'Sinif uğurla kopyalandı',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif kopyalanarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}
