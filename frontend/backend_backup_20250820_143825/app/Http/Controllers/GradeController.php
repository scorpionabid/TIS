<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Models\Institution;
use App\Models\Room;
use App\Models\AcademicYear;
use App\Models\StudentEnrollment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class GradeController extends Controller
{
    /**
     * Display a listing of grades with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'class_level' => 'sometimes|integer|min:1|max:12',
            'academic_year_id' => 'sometimes|exists:academic_years,id',
            'room_id' => 'sometimes|exists:rooms,id',
            'homeroom_teacher_id' => 'sometimes|exists:users,id',
            'specialty' => 'sometimes|string|max:100',
            'is_active' => 'sometimes|boolean',
            'has_room' => 'sometimes|boolean',
            'has_teacher' => 'sometimes|boolean',
            'capacity_status' => 'sometimes|in:full,available,over_capacity',
            'search' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = Grade::query();

        // Apply regional access control
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
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

        if ($request->has('capacity_status')) {
            $query->with('room')->whereHas('room', function ($q) use ($request) {
                switch ($request->capacity_status) {
                    case 'full':
                        $q->whereRaw('grades.student_count >= rooms.capacity');
                        break;
                    case 'available':
                        $q->whereRaw('grades.student_count < rooms.capacity');
                        break;
                    case 'over_capacity':
                        $q->whereRaw('grades.student_count > rooms.capacity');
                        break;
                }
            });
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ILIKE', "%{$request->search}%")
                  ->orWhere('specialty', 'ILIKE', "%{$request->search}%");
            });
        }

        // Handle includes
        $includes = $request->get('include', '');
        $with = ['institution', 'academicYear'];
        
        if (str_contains($includes, 'room')) {
            $with[] = 'room';
        }
        if (str_contains($includes, 'teacher')) {
            $with[] = 'homeroomTeacher.profile';
        }
        if (str_contains($includes, 'students')) {
            $with[] = 'students';
        }
        if (str_contains($includes, 'subjects')) {
            $with[] = 'subjects';
        }

        $query->with($with);

        $perPage = $request->get('per_page', 20);
        $grades = $query->orderBy('class_level')
                       ->orderBy('name')
                       ->paginate($perPage);

        // Transform the data
        $transformedGrades = $grades->through(function ($grade) {
            $data = [
                'id' => $grade->id,
                'name' => $grade->name,
                'full_name' => $grade->full_name,
                'class_level' => $grade->class_level,
                'academic_year' => [
                    'id' => $grade->academicYear->id,
                    'name' => $grade->academicYear->name,
                    'is_active' => $grade->academicYear->is_active,
                ],
                'institution' => [
                    'id' => $grade->institution->id,
                    'name' => $grade->institution->name,
                    'type' => $grade->institution->type,
                ],
                'room_id' => $grade->room_id,
                'homeroom_teacher_id' => $grade->homeroom_teacher_id,
                'student_count' => $grade->student_count,
                'specialty' => $grade->specialty,
                'is_active' => $grade->is_active,
                'capacity_status' => $this->calculateCapacityStatus($grade),
                'utilization_rate' => $this->calculateUtilizationRate($grade),
                'created_at' => $grade->created_at,
                'updated_at' => $grade->updated_at,
            ];

            // Add room if included
            if ($grade->relationLoaded('room') && $grade->room) {
                $data['room'] = [
                    'id' => $grade->room->id,
                    'name' => $grade->room->name,
                    'full_identifier' => $grade->room->full_identifier,
                    'capacity' => $grade->room->capacity,
                    'room_type' => $grade->room->room_type,
                ];
            }

            // Add teacher if included
            if ($grade->relationLoaded('homeroomTeacher') && $grade->homeroomTeacher) {
                $data['homeroom_teacher'] = [
                    'id' => $grade->homeroomTeacher->id,
                    'full_name' => $grade->homeroomTeacher->profile 
                        ? "{$grade->homeroomTeacher->profile->first_name} {$grade->homeroomTeacher->profile->last_name}"
                        : $grade->homeroomTeacher->username,
                    'email' => $grade->homeroomTeacher->email,
                ];
            }

            // Add students if included
            if ($grade->relationLoaded('students')) {
                $data['students'] = $grade->students->map(function ($student) {
                    return [
                        'id' => $student->id,
                        'full_name' => $student->profile 
                            ? "{$student->profile->first_name} {$student->profile->last_name}"
                            : $student->username,
                        'email' => $student->email,
                        'enrollment_date' => $student->pivot->enrollment_date ?? null,
                    ];
                });
            }

            // Add subjects if included
            if ($grade->relationLoaded('subjects')) {
                $data['subjects'] = $grade->subjects->map(function ($subject) {
                    return [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'category' => $subject->category,
                        'teacher_id' => $subject->pivot->teacher_id ?? null,
                        'weekly_hours' => $subject->pivot->weekly_hours ?? null,
                    ];
                });
            }

            return $data;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grades' => $transformedGrades->items(),
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
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'class_level' => 'required|integer|min:1|max:12',
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'required|exists:institutions,id',
            'room_id' => 'nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'specialty' => 'nullable|string|max:100',
            'student_count' => 'nullable|integer|min:0|max:500',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($request->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təşkilat üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check for unique grade name within institution and academic year
        $existingGrade = Grade::where('institution_id', $request->institution_id)
                             ->where('academic_year_id', $request->academic_year_id)
                             ->where('name', $request->name)
                             ->first();
        if ($existingGrade) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təhsil ili və təşkilatda həmin adlı sinif mövcuddur',
            ], 422);
        }

        // Check if room is available
        if ($request->room_id) {
            $roomInUse = Grade::where('room_id', $request->room_id)
                             ->where('academic_year_id', $request->academic_year_id)
                             ->first();
            if ($roomInUse) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq artıq başqa sinif tərəfindən istifadə olunur',
                ], 422);
            }
        }

        // Check if teacher is already assigned
        if ($request->homeroom_teacher_id) {
            $teacherAssigned = Grade::where('homeroom_teacher_id', $request->homeroom_teacher_id)
                                   ->where('academic_year_id', $request->academic_year_id)
                                   ->first();
            if ($teacherAssigned) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu müəllim artıq başqa sinifin sinif rəhbəridir',
                ], 422);
            }

            // Verify the user is a teacher
            $teacher = User::find($request->homeroom_teacher_id);
            if (!$teacher->hasRole(['müəllim', 'müavin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən istifadəçi müəllim deyil',
                ], 422);
            }
        }

        try {
            $grade = Grade::create([
                'name' => $request->name,
                'class_level' => $request->class_level,
                'academic_year_id' => $request->academic_year_id,
                'institution_id' => $request->institution_id,
                'room_id' => $request->room_id,
                'homeroom_teacher_id' => $request->homeroom_teacher_id,
                'specialty' => $request->specialty,
                'student_count' => $request->student_count ?? 0,
                'metadata' => $request->metadata ?? [],
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'full_name' => $grade->full_name,
                    'class_level' => $grade->class_level,
                    'is_active' => $grade->is_active,
                    'created_at' => $grade->created_at,
                ],
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
    public function show(Request $request, Grade $grade): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $grade->load([
            'institution',
            'academicYear',
            'room',
            'homeroomTeacher.profile',
            'students.profile',
            'subjects.activeTeacherAssignments.teacher.profile',
        ]);

        $studentsData = $grade->students->map(function ($student) {
            return [
                'id' => $student->id,
                'full_name' => $student->profile 
                    ? "{$student->profile->first_name} {$student->profile->last_name}"
                    : $student->username,
                'email' => $student->email,
                'enrollment_date' => $student->pivot->enrollment_date ?? null,
                'status' => $student->pivot->status ?? 'active',
            ];
        });

        $subjectsData = $grade->subjects->map(function ($subject) {
            return [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                'category' => $subject->category,
                'weekly_hours' => $subject->pivot->weekly_hours ?? null,
                'teacher' => $subject->activeTeacherAssignments->first() ? [
                    'id' => $subject->activeTeacherAssignments->first()->teacher->id,
                    'full_name' => $subject->activeTeacherAssignments->first()->teacher->profile 
                        ? "{$subject->activeTeacherAssignments->first()->teacher->profile->first_name} {$subject->activeTeacherAssignments->first()->teacher->profile->last_name}"
                        : $subject->activeTeacherAssignments->first()->teacher->username,
                    'email' => $subject->activeTeacherAssignments->first()->teacher->email,
                ] : null,
            ];
        });

        $data = [
            'id' => $grade->id,
            'name' => $grade->name,
            'full_name' => $grade->full_name,
            'class_level' => $grade->class_level,
            'academic_year' => [
                'id' => $grade->academicYear->id,
                'name' => $grade->academicYear->name,
                'is_active' => $grade->academicYear->is_active,
            ],
            'institution' => [
                'id' => $grade->institution->id,
                'name' => $grade->institution->name,
                'type' => $grade->institution->type,
            ],
            'room' => $grade->room ? [
                'id' => $grade->room->id,
                'name' => $grade->room->name,
                'full_identifier' => $grade->room->full_identifier,
                'capacity' => $grade->room->capacity,
                'room_type' => $grade->room->room_type,
            ] : null,
            'homeroom_teacher' => $grade->homeroomTeacher ? [
                'id' => $grade->homeroomTeacher->id,
                'full_name' => $grade->homeroomTeacher->profile 
                    ? "{$grade->homeroomTeacher->profile->first_name} {$grade->homeroomTeacher->profile->last_name}"
                    : $grade->homeroomTeacher->username,
                'email' => $grade->homeroomTeacher->email,
            ] : null,
            'student_count' => $grade->student_count,
            'actual_student_count' => $grade->students->count(),
            'specialty' => $grade->specialty,
            'is_active' => $grade->is_active,
            'capacity_status' => $this->calculateCapacityStatus($grade),
            'utilization_rate' => $this->calculateUtilizationRate($grade),
            'students' => $studentsData,
            'subjects' => $subjectsData,
            'metadata' => $grade->metadata,
            'created_at' => $grade->created_at,
            'updated_at' => $grade->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Sinif məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified grade.
     */
    public function update(Request $request, Grade $grade): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'room_id' => 'sometimes|nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'sometimes|nullable|exists:users,id',
            'specialty' => 'sometimes|nullable|string|max:100',
            'student_count' => 'sometimes|nullable|integer|min:0|max:500',
            'is_active' => 'sometimes|boolean',
            'metadata' => 'sometimes|nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check for unique grade name if name is being updated
        if ($request->has('name') && $request->name !== $grade->name) {
            $existingGrade = Grade::where('institution_id', $grade->institution_id)
                                 ->where('academic_year_id', $grade->academic_year_id)
                                 ->where('name', $request->name)
                                 ->first();
            if ($existingGrade) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu təhsil ili və təşkilatda həmin adlı sinif mövcuddur',
                ], 422);
            }
        }

        // Check if room is available if room is being changed
        if ($request->has('room_id') && $request->room_id !== $grade->room_id) {
            if ($request->room_id) {
                $roomInUse = Grade::where('room_id', $request->room_id)
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
        if ($request->has('homeroom_teacher_id') && $request->homeroom_teacher_id !== $grade->homeroom_teacher_id) {
            if ($request->homeroom_teacher_id) {
                $teacherAssigned = Grade::where('homeroom_teacher_id', $request->homeroom_teacher_id)
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
                $teacher = User::find($request->homeroom_teacher_id);
                if (!$teacher->hasRole(['müəllim', 'müavin'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilən istifadəçi müəllim deyil',
                    ], 422);
                }
            }
        }

        try {
            $updateData = $request->only([
                'name', 'room_id', 'homeroom_teacher_id', 
                'specialty', 'student_count', 'is_active', 'metadata'
            ]);

            $grade->update($updateData);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'full_name' => $grade->full_name,
                    'class_level' => $grade->class_level,
                    'is_active' => $grade->is_active,
                    'updated_at' => $grade->updated_at,
                ],
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
     * Remove the specified grade (soft delete).
     */
    public function destroy(Request $request, Grade $grade): JsonResponse
    {
        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        // Check if grade has active students
        $activeStudents = StudentEnrollment::where('grade_id', $grade->id)
                                          ->where('status', 'active')
                                          ->count();
        if ($activeStudents > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu sinifdə {$activeStudents} aktiv şagird var. Əvvəlcə onları başqa sinifə köçürün",
            ], 422);
        }

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
     * Get grade statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Grade::query();

        // Apply regional access control
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Filter by academic year (default to active)
        $academicYearId = $request->get('academic_year_id');
        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        } else {
            $activeYear = AcademicYear::where('is_active', true)->first();
            if ($activeYear) {
                $query->where('academic_year_id', $activeYear->id);
            }
        }

        $totalGrades = $query->count();
        $activeGrades = $query->where('is_active', true)->count();
        $inactiveGrades = $totalGrades - $activeGrades;

        // Class level distribution
        $levelDistribution = $query->where('is_active', true)
            ->select('class_level', DB::raw('count(*) as count'))
            ->groupBy('class_level')
            ->orderBy('class_level')
            ->get()
            ->map(function ($item) {
                return [
                    'class_level' => $item->class_level,
                    'count' => $item->count,
                ];
            });

        // Student statistics
        $studentStats = $query->where('is_active', true)
            ->selectRaw('
                AVG(student_count) as average_students,
                MIN(student_count) as min_students,
                MAX(student_count) as max_students,
                SUM(student_count) as total_students
            ')
            ->first();

        // Room utilization
        $gradesWithRooms = $query->where('is_active', true)->whereNotNull('room_id')->count();
        $gradesWithoutRooms = $activeGrades - $gradesWithRooms;

        // Teacher assignment
        $gradesWithTeachers = $query->where('is_active', true)->whereNotNull('homeroom_teacher_id')->count();
        $gradesWithoutTeachers = $activeGrades - $gradesWithTeachers;

        // Specialty distribution
        $specialtyStats = $query->where('is_active', true)
            ->whereNotNull('specialty')
            ->select('specialty', DB::raw('count(*) as count'))
            ->groupBy('specialty')
            ->get()
            ->map(function ($item) {
                return [
                    'specialty' => $item->specialty,
                    'count' => $item->count,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_grades' => $totalGrades,
                    'active_grades' => $activeGrades,
                    'inactive_grades' => $inactiveGrades,
                    'grades_with_rooms' => $gradesWithRooms,
                    'grades_without_rooms' => $gradesWithoutRooms,
                    'grades_with_teachers' => $gradesWithTeachers,
                    'grades_without_teachers' => $gradesWithoutTeachers,
                ],
                'students' => [
                    'total_students' => (int)$studentStats->total_students,
                    'average_per_grade' => round($studentStats->average_students, 1),
                    'min_per_grade' => (int)$studentStats->min_students,
                    'max_per_grade' => (int)$studentStats->max_students,
                ],
                'class_level_distribution' => $levelDistribution,
                'specialty_distribution' => $specialtyStats,
                'resource_utilization' => [
                    'room_assignment_rate' => $activeGrades > 0 
                        ? round(($gradesWithRooms / $activeGrades) * 100, 2) 
                        : 0,
                    'teacher_assignment_rate' => $activeGrades > 0 
                        ? round(($gradesWithTeachers / $activeGrades) * 100, 2) 
                        : 0,
                ],
            ],
            'message' => 'Sinif statistikaları uğurla alındı',
        ]);
    }

    /**
     * Assign students to grade.
     */
    public function assignStudents(Request $request, Grade $grade): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'exists:users,id',
            'enrollment_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check regional access
        $user = $request->user();
        if (!$user->hasRole('superadmin')) {
            $accessibleInstitutions = $this->getUserAccessibleInstitutions($user);
            if (!in_array($grade->institution_id, $accessibleInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinif üçün icazəniz yoxdur',
                ], 403);
            }
        }

        try {
            DB::beginTransaction();

            $assignedCount = 0;
            $errors = [];

            foreach ($request->student_ids as $studentId) {
                $student = User::find($studentId);
                
                // Check if user is actually a student
                if (!$student->isStudent()) {
                    $errors[] = "İstifadəçi ID {$studentId} şagird deyil";
                    continue;
                }

                // Check if student is already enrolled in this grade
                $existingEnrollment = StudentEnrollment::where('student_id', $studentId)
                    ->where('grade_id', $grade->id)
                    ->where('status', 'active')
                    ->first();

                if ($existingEnrollment) {
                    $errors[] = "Şagird (ID: {$studentId}) artıq bu sinifdə qeydiyyatdadır";
                    continue;
                }

                // Check if student is enrolled in another active grade
                $otherEnrollment = StudentEnrollment::where('student_id', $studentId)
                    ->whereHas('grade', function ($q) use ($grade) {
                        $q->where('academic_year_id', $grade->academic_year_id)
                          ->where('is_active', true);
                    })
                    ->where('status', 'active')
                    ->first();

                if ($otherEnrollment) {
                    $errors[] = "Şagird (ID: {$studentId}) artıq başqa sinifdə qeydiyyatdadır";
                    continue;
                }

                // Create enrollment
                StudentEnrollment::create([
                    'student_id' => $studentId,
                    'grade_id' => $grade->id,
                    'enrollment_date' => $request->enrollment_date ?? now(),
                    'status' => 'active',
                ]);

                $assignedCount++;
            }

            // Update grade student count
            $grade->update([
                'student_count' => StudentEnrollment::where('grade_id', $grade->id)
                    ->where('status', 'active')
                    ->count()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'grade_id' => $grade->id,
                    'assigned_count' => $assignedCount,
                    'total_students' => $grade->fresh()->student_count,
                    'errors' => $errors,
                ],
                'message' => "{$assignedCount} şagird sinifə uğurla təyin edildi",
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Şagirdlər təyin edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper methods
     */
    private function getUserAccessibleInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institutions = [];
        
        if ($user->hasRole('regionadmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } elseif ($user->hasRole('sektoradmin')) {
            $institutions = Institution::where('parent_id', $user->institution_id)->pluck('id')->toArray();
            $institutions[] = $user->institution_id;
        } else {
            $institutions = [$user->institution_id];
        }

        return $institutions;
    }

    private function calculateCapacityStatus($grade): string
    {
        if (!$grade->room) {
            return 'no_room';
        }

        $capacity = $grade->room->capacity;
        $studentCount = $grade->student_count;

        if ($studentCount > $capacity) {
            return 'over_capacity';
        } elseif ($studentCount === $capacity) {
            return 'full';
        } else {
            return 'available';
        }
    }

    private function calculateUtilizationRate($grade): float
    {
        if (!$grade->room || $grade->room->capacity === 0) {
            return 0;
        }

        return round(($grade->student_count / $grade->room->capacity) * 100, 2);
    }
}