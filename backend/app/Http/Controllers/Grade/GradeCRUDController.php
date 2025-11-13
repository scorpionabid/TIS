<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\User;
use App\Models\Institution;
use App\Models\Room;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class GradeCRUDController extends Controller
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
            'name' => 'required_without:class_full_name|string|max:255',
            'class_full_name' => 'sometimes|string|max:25',
            'class_level' => 'required_without:class_full_name|integer|min:0|max:12',
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'required|exists:institutions,id',
            'room_id' => 'nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'specialty' => 'nullable|string|max:100',
            'student_count' => 'nullable|integer|min:0|max:500',
            'metadata' => 'nullable|array',
            'class_type' => 'nullable|string|max:120',
            'class_profile' => 'nullable|string|max:120',
            'teaching_shift' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $classLevel = (int) $request->input('class_level');
        $className = $request->input('name');

        if ($request->filled('class_full_name')) {
            $parsedIdentifiers = $this->parseClassFullName($request->input('class_full_name'));
            if (!$parsedIdentifiers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sinif adı formatı düzgün deyil (məs: 5A, 7-B)',
                ], 422);
            }
            [$classLevel, $className] = $parsedIdentifiers;
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

        // Check for unique grade name within institution, academic year, and class level
        // Important: Same letter (e.g., "A") can exist for different class levels (e.g., 6-A and 9-A are different classes)
        $existingGrade = Grade::where('institution_id', $request->institution_id)
                             ->where('academic_year_id', $request->academic_year_id)
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
                'name' => $className,
                'class_level' => $classLevel,
                'academic_year_id' => $request->academic_year_id,
                'institution_id' => $request->institution_id,
                'room_id' => $request->room_id,
                'homeroom_teacher_id' => $request->homeroom_teacher_id,
                'specialty' => $request->specialty,
                'student_count' => $request->student_count ?? 0,
                'class_type' => $request->class_type,
                'class_profile' => $request->class_profile,
                'teaching_shift' => $request->teaching_shift,
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
            'class_type' => $grade->class_type,
            'class_profile' => $grade->class_profile,
            'teaching_shift' => $grade->teaching_shift,
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
            'class_full_name' => 'sometimes|string|max:25',
            'class_level' => 'sometimes|integer|min:0|max:12',
            'room_id' => 'sometimes|nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'sometimes|nullable|exists:users,id',
            'specialty' => 'sometimes|nullable|string|max:100',
            'student_count' => 'sometimes|nullable|integer|min:0|max:500',
            'is_active' => 'sometimes|boolean',
            'metadata' => 'sometimes|nullable|array',
            'class_type' => 'sometimes|nullable|string|max:120',
            'class_profile' => 'sometimes|nullable|string|max:120',
            'teaching_shift' => 'sometimes|nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $classLevel = $request->has('class_level') ? (int) $request->class_level : $grade->class_level;
        $className = $request->has('name') ? $request->name : $grade->name;

        if ($request->filled('class_full_name')) {
            $parsedIdentifiers = $this->parseClassFullName($request->input('class_full_name'));
            if (!$parsedIdentifiers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sinif adı formatı düzgün deyil (məs: 5A, 7-B)',
                ], 422);
            }
            [$classLevel, $className] = $parsedIdentifiers;
        }

        // Check for unique grade name if name or class_level is being updated
        if ($request->has('name') || $request->has('class_level') || $request->filled('class_full_name')) {
            $checkName = $className;
            $checkClassLevel = $classLevel;

            $existingGrade = Grade::where('institution_id', $grade->institution_id)
                                 ->where('academic_year_id', $grade->academic_year_id)
                                 ->where('class_level', $checkClassLevel)
                                 ->where('name', $checkName)
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
                'room_id', 'homeroom_teacher_id', 
                'specialty', 'student_count', 'is_active', 'metadata',
                'class_type', 'class_profile', 'teaching_shift'
            ]);
            $updateData['name'] = $className;
            $updateData['class_level'] = $classLevel;

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
        $activeStudents = \App\Models\StudentEnrollment::where('grade_id', $grade->id)
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
     * Helper methods
     */
    private function parseClassFullName(?string $value): ?array
    {
        if (!$value) {
            return null;
        }

        $clean = Str::of($value)
            ->replace(['-', '_'], ' ')
            ->squish()
            ->toString();

        if (preg_match('/(?P<level>\d{1,2})\s*(?P<letter>[\p{L}\d]+)/u', $clean, $matches)) {
            $level = (int) $matches['level'];
            $letter = Str::upper($matches['letter']);

            return [$level, mb_substr($letter, 0, 5)];
        }

        return null;
    }

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

    /**
     * Duplicate an existing grade with optional modifications.
     * Created for Sprint 6 Phase 4 delegation from GradeUnifiedController.
     */
    public function duplicate(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = $request->user();

            // Authorization check
            if (!$user->hasPermissionTo('grades.create')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
                ], 403);
            }

            // Validate input
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:10',
                'class_level' => 'sometimes|integer|min:0|max:12',
                'copy_subjects' => 'sometimes|boolean',
                'academic_year_id' => 'sometimes|exists:academic_years,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasiya xətası',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Determine the target class level and academic year
            $targetClassLevel = $request->has('class_level') ? $request->class_level : $grade->class_level;
            $targetAcademicYearId = $request->has('academic_year_id') ? $request->academic_year_id : $grade->academic_year_id;

            // Check for duplicate grade
            $existingGrade = Grade::where('name', $request->name)
                ->where('class_level', $targetClassLevel)
                ->where('academic_year_id', $targetAcademicYearId)
                ->where('institution_id', $grade->institution_id)
                ->first();

            if ($existingGrade) {
                return response()->json([
                    'success' => false,
                    'message' => "{$targetClassLevel}-{$request->name} sinfi artıq mövcuddur",
                    'errors' => [
                        'name' => ["Bu sinif adı artıq istifadə olunur"]
                    ]
                ], 422);
            }

            // Create new grade with copied data
            $newGradeData = $grade->toArray();
            unset($newGradeData['id']);
            unset($newGradeData['created_at']);
            unset($newGradeData['updated_at']);
            unset($newGradeData['student_count']);
            unset($newGradeData['capacity_status']);
            unset($newGradeData['utilization_rate']);

            // Apply modifications
            $newGradeData['name'] = $request->name;

            if ($request->has('class_level')) {
                $newGradeData['class_level'] = $request->class_level;
            }

            if ($request->has('academic_year_id')) {
                $newGradeData['academic_year_id'] = $request->academic_year_id;
            }

            // Reset teacher and room assignments
            $newGradeData['homeroom_teacher_id'] = null;
            $newGradeData['room_id'] = null;

            // Create the new grade
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
                        'is_teaching_activity' => $gradeSubject->is_teaching_activity,
                        'is_extracurricular' => $gradeSubject->is_extracurricular,
                        'is_club' => $gradeSubject->is_club,
                        'is_split_groups' => $gradeSubject->is_split_groups,
                        'group_count' => $gradeSubject->group_count,
                        'teacher_id' => null, // Reset teacher assignment
                        'notes' => $gradeSubject->notes,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Load relationships
            $newGrade->load([
                'institution',
                'academicYear',
                'homeroomTeacher',
                'room',
            ]);

            // Refresh to get computed attributes
            $newGrade->refresh();

            Log::info('Grade duplicated successfully', [
                'original_grade_id' => $grade->id,
                'original_class_level' => $grade->class_level,
                'new_grade_id' => $newGrade->id,
                'new_class_level' => $newGrade->class_level,
                'user_id' => $user->id,
                'copied_subjects' => $request->get('copy_subjects', true),
                'class_level_changed' => $request->has('class_level') && $request->class_level !== $grade->class_level,
            ]);

            return response()->json([
                'success' => true,
                'data' => $newGrade,
                'message' => 'Sinif uğurla kopyalandı'
            ], 201);

        } catch (\Exception $e) {
            Log::error('Grade duplicate error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sinif kopyalanarkən xəta baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}
