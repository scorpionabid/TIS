<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\User;
use App\Models\Room;
use App\Models\AcademicYear;
use App\Models\Institution;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ClassesController extends Controller
{
    /**
     * Display a listing of classes with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'grade_level' => 'sometimes|integer|min:1|max:12',
            'academic_year_id' => 'sometimes|exists:academic_years,id',
            'specialty' => 'sometimes|string|max:255',
            'homeroom_teacher_id' => 'sometimes|exists:users,id',
            'status' => 'sometimes|in:active,inactive',
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

        $user = $request->user();
        $query = Grade::with(['academicYear', 'institution', 'room', 'homeroomTeacher.profile']);

        // Apply regional data access filtering
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                // RegionAdmin can see classes in their regional institutions
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole('sektoradmin')) {
                // SektorAdmin can see classes in their sector schools
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole(['məktəbadmin', 'müəllim', 'müavin'])) {
                // School staff can only see classes in their school
                $query->where('institution_id', $user->institution_id);
            }
        }

        // Apply filters
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('grade_level')) {
            $query->where('class_level', $request->grade_level);
        }

        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->has('specialty')) {
            $query->where('specialty', 'ILIKE', "%{$request->specialty}%");
        }

        if ($request->has('homeroom_teacher_id')) {
            $query->where('homeroom_teacher_id', $request->homeroom_teacher_id);
        }

        if ($request->has('status')) {
            $isActive = $request->status === 'active';
            $query->where('is_active', $isActive);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('specialty', 'ILIKE', "%{$search}%")
                  ->orWhereRaw("CONCAT(class_level, '-', name) ILIKE ?", ["%{$search}%"]);
            });
        }

        // Handle includes
        $includes = $request->get('include', '');
        if (str_contains($includes, 'students')) {
            $query->with(['activeStudents.student.profile']);
        }
        if (str_contains($includes, 'subjects')) {
            $query->with(['subjects.subject']);
        }

        $perPage = $request->get('per_page', 20);
        $classes = $query->paginate($perPage);

        // Transform the data
        $transformedClasses = $classes->through(function ($class) {
            return [
                'id' => $class->id,
                'name' => $class->name,
                'full_name' => $class->full_name,
                'display_name' => $class->display_name,
                'class_level' => $class->class_level,
                'specialty' => $class->specialty,
                'student_count' => $class->getCurrentStudentCount(),
                'max_capacity' => $class->room?->capacity,
                'remaining_capacity' => $class->getRemainingCapacity(),
                'has_capacity' => $class->hasCapacity(),
                'is_active' => $class->is_active,
                'academic_year' => $class->academicYear ? [
                    'id' => $class->academicYear->id,
                    'name' => $class->academicYear->name,
                    'is_current' => $class->academicYear->is_current,
                ] : null,
                'institution' => $class->institution ? [
                    'id' => $class->institution->id,
                    'name' => $class->institution->name,
                    'code' => $class->institution->code,
                ] : null,
                'room' => $class->room ? [
                    'id' => $class->room->id,
                    'name' => $class->room->name,
                    'capacity' => $class->room->capacity,
                    'type' => $class->room->type,
                ] : null,
                'homeroom_teacher' => $class->homeroomTeacher ? [
                    'id' => $class->homeroomTeacher->id,
                    'full_name' => $class->homeroomTeacher->profile 
                        ? "{$class->homeroomTeacher->profile->first_name} {$class->homeroomTeacher->profile->last_name}"
                        : $class->homeroomTeacher->username,
                    'email' => $class->homeroomTeacher->email,
                ] : null,
                'metadata' => $class->metadata,
                'created_at' => $class->created_at,
                'updated_at' => $class->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'classes' => $transformedClasses->items(),
                'pagination' => [
                    'current_page' => $classes->currentPage(),
                    'per_page' => $classes->perPage(),
                    'total' => $classes->total(),
                    'total_pages' => $classes->lastPage(),
                    'from' => $classes->firstItem(),
                    'to' => $classes->lastItem(),
                ],
            ],
            'message' => 'Sinif siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created class.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:10',
            'class_level' => 'required|integer|min:1|max:12',
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'required|exists:institutions,id',
            'room_id' => 'nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'specialty' => 'nullable|string|max:255',
            'max_capacity' => 'nullable|integer|min:1|max:50',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if class name already exists for this institution/academic year/level
        $existingClass = Grade::where('name', $request->name)
            ->where('class_level', $request->class_level)
            ->where('academic_year_id', $request->academic_year_id)
            ->where('institution_id', $request->institution_id)
            ->first();

        if ($existingClass) {
            return response()->json([
                'success' => false,
                'message' => 'Bu adda sinif artıq mövcuddur',
                'errors' => [
                    'name' => ['Bu adda sinif artıq mövcuddur']
                ]
            ], 422);
        }

        // Validate homeroom teacher if provided
        if ($request->homeroom_teacher_id) {
            $teacher = User::find($request->homeroom_teacher_id);
            if (!$teacher->hasRole(['müəllim', 'müavin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sinif rəhbəri müəllim olmalıdır',
                    'errors' => [
                        'homeroom_teacher_id' => ['Sinif rəhbəri müəllim olmalıdır']
                    ]
                ], 422);
            }
        }

        // Validate room availability if provided
        if ($request->room_id) {
            $roomInUse = Grade::where('room_id', $request->room_id)
                ->where('academic_year_id', $request->academic_year_id)
                ->where('is_active', true)
                ->first();

            if ($roomInUse) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq artıq istifadədədir',
                    'errors' => [
                        'room_id' => ['Bu otaq artıq istifadədədir']
                    ]
                ], 422);
            }
        }

        try {
            $class = Grade::create([
                'name' => $request->name,
                'class_level' => $request->class_level,
                'academic_year_id' => $request->academic_year_id,
                'institution_id' => $request->institution_id,
                'room_id' => $request->room_id,
                'homeroom_teacher_id' => $request->homeroom_teacher_id,
                'specialty' => $request->specialty,
                'student_count' => 0, // Will be updated dynamically
                'metadata' => $request->metadata ?? [],
                'is_active' => true,
            ]);

            // Load relationships for response
            $class->load(['academicYear', 'institution', 'room', 'homeroomTeacher.profile']);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'full_name' => $class->full_name,
                    'display_name' => $class->display_name,
                    'class_level' => $class->class_level,
                    'specialty' => $class->specialty,
                    'student_count' => 0,
                    'is_active' => $class->is_active,
                    'academic_year' => [
                        'id' => $class->academicYear->id,
                        'name' => $class->academicYear->name,
                    ],
                    'institution' => [
                        'id' => $class->institution->id,
                        'name' => $class->institution->name,
                    ],
                    'room' => $class->room ? [
                        'id' => $class->room->id,
                        'name' => $class->room->name,
                        'capacity' => $class->room->capacity,
                    ] : null,
                    'homeroom_teacher' => $class->homeroomTeacher ? [
                        'id' => $class->homeroomTeacher->id,
                        'full_name' => $class->homeroomTeacher->profile 
                            ? "{$class->homeroomTeacher->profile->first_name} {$class->homeroomTeacher->profile->last_name}"
                            : $class->homeroomTeacher->username,
                    ] : null,
                    'created_at' => $class->created_at,
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
     * Display the specified class.
     */
    public function show(Request $request, Grade $class): JsonResponse
    {
        // Check access permissions
        $user = $request->user();
        if (!$this->canAccessClass($user, $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifin məlumatlarına giriş icazəniz yoxdur',
            ], 403);
        }

        $class->load([
            'academicYear',
            'institution',
            'room',
            'homeroomTeacher.profile',
            'activeStudents.student.profile',
            'subjects.subject',
        ]);

        $studentsData = $class->activeStudents->map(function ($enrollment) {
            return [
                'id' => $enrollment->student->id,
                'student_number' => $enrollment->student_number,
                'full_name' => $enrollment->student->profile 
                    ? "{$enrollment->student->profile->first_name} {$enrollment->student->profile->last_name}"
                    : $enrollment->student->username,
                'email' => $enrollment->student->email,
                'enrollment_date' => $enrollment->enrollment_date,
                'enrollment_status' => $enrollment->enrollment_status,
            ];
        });

        $subjectsData = $class->subjects->map(function ($teacherSubject) {
            return [
                'id' => $teacherSubject->subject->id,
                'name' => $teacherSubject->subject->name,
                'code' => $teacherSubject->subject->code,
                'teacher' => $teacherSubject->teacher ? [
                    'id' => $teacherSubject->teacher->id,
                    'full_name' => $teacherSubject->teacher->profile 
                        ? "{$teacherSubject->teacher->profile->first_name} {$teacherSubject->teacher->profile->last_name}"
                        : $teacherSubject->teacher->username,
                ] : null,
                'weekly_hours' => $teacherSubject->weekly_hours,
            ];
        });

        $data = [
            'id' => $class->id,
            'name' => $class->name,
            'full_name' => $class->full_name,
            'display_name' => $class->display_name,
            'class_level' => $class->class_level,
            'specialty' => $class->specialty,
            'student_count' => $class->getCurrentStudentCount(),
            'max_capacity' => $class->room?->capacity,
            'remaining_capacity' => $class->getRemainingCapacity(),
            'has_capacity' => $class->hasCapacity(),
            'is_active' => $class->is_active,
            'metadata' => $class->metadata,
            'academic_year' => $class->academicYear ? [
                'id' => $class->academicYear->id,
                'name' => $class->academicYear->name,
                'start_date' => $class->academicYear->start_date,
                'end_date' => $class->academicYear->end_date,
                'is_current' => $class->academicYear->is_current,
            ] : null,
            'institution' => $class->institution ? [
                'id' => $class->institution->id,
                'name' => $class->institution->name,
                'code' => $class->institution->code,
                'type' => $class->institution->type,
            ] : null,
            'room' => $class->room ? [
                'id' => $class->room->id,
                'name' => $class->room->name,
                'room_number' => $class->room->room_number,
                'capacity' => $class->room->capacity,
                'type' => $class->room->type,
                'equipment' => $class->room->equipment ?? [],
            ] : null,
            'homeroom_teacher' => $class->homeroomTeacher ? [
                'id' => $class->homeroomTeacher->id,
                'full_name' => $class->homeroomTeacher->profile 
                    ? "{$class->homeroomTeacher->profile->first_name} {$class->homeroomTeacher->profile->last_name}"
                    : $class->homeroomTeacher->username,
                'email' => $class->homeroomTeacher->email,
                'phone' => $class->homeroomTeacher->profile?->contact_phone,
            ] : null,
            'students' => $studentsData,
            'subjects' => $subjectsData,
            'available_subjects' => $class->getAvailableSubjects()->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'category' => $subject->category,
                ];
            }),
            'created_at' => $class->created_at,
            'updated_at' => $class->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Sinif məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified class.
     */
    public function update(Request $request, Grade $class): JsonResponse
    {
        // Check access permissions
        $user = $request->user();
        if (!$this->canAccessClass($user, $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifi yeniləmək icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:10',
            'class_level' => 'sometimes|integer|min:1|max:12',
            'room_id' => 'sometimes|nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'sometimes|nullable|exists:users,id',
            'specialty' => 'sometimes|nullable|string|max:255',
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

        // Check uniqueness if name or level is being changed
        if ($request->has('name') || $request->has('class_level')) {
            $name = $request->get('name', $class->name);
            $level = $request->get('class_level', $class->class_level);
            
            $existingClass = Grade::where('name', $name)
                ->where('class_level', $level)
                ->where('academic_year_id', $class->academic_year_id)
                ->where('institution_id', $class->institution_id)
                ->where('id', '!=', $class->id)
                ->first();

            if ($existingClass) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu adda sinif artıq mövcuddur',
                    'errors' => [
                        'name' => ['Bu adda sinif artıq mövcuddur']
                    ]
                ], 422);
            }
        }

        // Validate homeroom teacher if provided
        if ($request->has('homeroom_teacher_id') && $request->homeroom_teacher_id) {
            $teacher = User::find($request->homeroom_teacher_id);
            if (!$teacher->hasRole(['müəllim', 'müavin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sinif rəhbəri müəllim olmalıdır',
                    'errors' => [
                        'homeroom_teacher_id' => ['Sinif rəhbəri müəllim olmalıdır']
                    ]
                ], 422);
            }
        }

        // Validate room availability if provided
        if ($request->has('room_id') && $request->room_id) {
            $roomInUse = Grade::where('room_id', $request->room_id)
                ->where('academic_year_id', $class->academic_year_id)
                ->where('is_active', true)
                ->where('id', '!=', $class->id)
                ->first();

            if ($roomInUse) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu otaq artıq istifadədədir',
                    'errors' => [
                        'room_id' => ['Bu otaq artıq istifadədədir']
                    ]
                ], 422);
            }
        }

        try {
            $updateData = $request->only([
                'name', 'class_level', 'room_id', 'homeroom_teacher_id', 
                'specialty', 'is_active', 'metadata'
            ]);

            $class->update($updateData);

            // Reload relationships
            $class->load(['academicYear', 'institution', 'room', 'homeroomTeacher.profile']);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'full_name' => $class->full_name,
                    'display_name' => $class->display_name,
                    'class_level' => $class->class_level,
                    'specialty' => $class->specialty,
                    'is_active' => $class->is_active,
                    'updated_at' => $class->updated_at,
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
     * Remove the specified class (soft delete).
     */
    public function destroy(Request $request, Grade $class): JsonResponse
    {
        // Check access permissions
        $user = $request->user();
        if (!$this->canAccessClass($user, $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifi silmək icazəniz yoxdur',
            ], 403);
        }

        // Check if class has students
        $activeStudentCount = $class->getCurrentStudentCount();
        if ($activeStudentCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu sinifdə {$activeStudentCount} aktiv şagird var. Əvvəlcə onları başqa sinifə köçürün",
            ], 422);
        }

        try {
            // Deactivate instead of hard delete
            $class->update(['is_active' => false]);

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
     * Get students in a specific class.
     */
    public function students(Request $request, Grade $class): JsonResponse
    {
        if (!$this->canAccessClass($request->user(), $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifin şagird siyahısına giriş icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:active,inactive,all',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = $class->students()->with(['student.profile']);

        // Apply status filter
        $status = $request->get('status', 'active');
        if ($status !== 'all') {
            $query->where('enrollment_status', $status);
        }

        $perPage = $request->get('per_page', 20);
        $enrollments = $query->paginate($perPage);

        $studentsData = $enrollments->through(function ($enrollment) {
            return [
                'id' => $enrollment->student->id,
                'student_number' => $enrollment->student_number,
                'first_name' => $enrollment->student->profile?->first_name,
                'last_name' => $enrollment->student->profile?->last_name,
                'full_name' => $enrollment->student->profile 
                    ? "{$enrollment->student->profile->first_name} {$enrollment->student->profile->last_name}"
                    : $enrollment->student->username,
                'email' => $enrollment->student->email,
                'enrollment_date' => $enrollment->enrollment_date,
                'enrollment_status' => $enrollment->enrollment_status,
                'attendance_rate' => $enrollment->calculateCurrentAttendanceRate(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'class_info' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'full_name' => $class->full_name,
                    'class_level' => $class->class_level,
                    'total_students' => $class->getCurrentStudentCount(),
                ],
                'students' => $studentsData->items(),
                'pagination' => [
                    'current_page' => $enrollments->currentPage(),
                    'per_page' => $enrollments->perPage(),
                    'total' => $enrollments->total(),
                    'total_pages' => $enrollments->lastPage(),
                ],
            ],
            'message' => 'Sinif şagird siyahısı uğurla alındı',
        ]);
    }

    /**
     * Assign homeroom teacher to class.
     */
    public function assignTeacher(Request $request, Grade $class): JsonResponse
    {
        if (!$this->canAccessClass($request->user(), $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifə müəllim təyin etmək icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $teacher = User::find($request->teacher_id);
        if (!$teacher->hasRole(['müəllim', 'müavin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilən istifadəçi müəllim deyil',
            ], 422);
        }

        try {
            $class->update(['homeroom_teacher_id' => $request->teacher_id]);
            $class->load('homeroomTeacher.profile');

            return response()->json([
                'success' => true,
                'data' => [
                    'class_id' => $class->id,
                    'teacher' => [
                        'id' => $class->homeroomTeacher->id,
                        'full_name' => $class->homeroomTeacher->profile 
                            ? "{$class->homeroomTeacher->profile->first_name} {$class->homeroomTeacher->profile->last_name}"
                            : $class->homeroomTeacher->username,
                        'email' => $class->homeroomTeacher->email,
                    ],
                ],
                'message' => 'Sinif rəhbəri uğurla təyin edildi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Müəllim təyin edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get class statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Grade::query();

        // Apply regional filtering
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole(['sektoradmin', 'məktəbadmin', 'müəllim'])) {
                $query->where('institution_id', $user->institution_id);
            }
        }

        $totalClasses = $query->count();
        $activeClasses = $query->where('is_active', true)->count();
        $inactiveClasses = $totalClasses - $activeClasses;

        // Students statistics
        $totalStudents = StudentEnrollment::whereHas('grade', function ($q) use ($query) {
            $q->whereIn('id', $query->pluck('id'));
        })->where('enrollment_status', 'active')->count();

        // Grade level distribution
        $gradeDistribution = $query->where('is_active', true)
            ->select('class_level', DB::raw('count(*) as count'))
            ->groupBy('class_level')
            ->orderBy('class_level')
            ->get()
            ->map(function ($item) {
                return [
                    'grade_level' => $item->class_level,
                    'class_count' => $item->count,
                ];
            });

        // Capacity statistics
        $capacityStats = $query->where('is_active', true)
            ->with('room')
            ->get()
            ->reduce(function ($carry, $class) {
                $capacity = $class->room?->capacity ?? 30; // Default capacity
                $currentCount = $class->getCurrentStudentCount();
                
                $carry['total_capacity'] += $capacity;
                $carry['occupied_capacity'] += $currentCount;
                $carry['utilization_rate'] = $carry['total_capacity'] > 0 
                    ? round(($carry['occupied_capacity'] / $carry['total_capacity']) * 100, 2)
                    : 0;
                
                return $carry;
            }, ['total_capacity' => 0, 'occupied_capacity' => 0, 'utilization_rate' => 0]);

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_classes' => $totalClasses,
                    'active_classes' => $activeClasses,
                    'inactive_classes' => $inactiveClasses,
                    'total_students' => $totalStudents,
                    'average_class_size' => $activeClasses > 0 ? round($totalStudents / $activeClasses, 2) : 0,
                ],
                'grade_distribution' => $gradeDistribution,
                'capacity_statistics' => $capacityStats,
            ],
            'message' => 'Sinif statistikaları uğurla alındı',
        ]);
    }

    /**
     * Check if user can access class data.
     */
    private function canAccessClass(User $user, Grade $class): bool
    {
        // SuperAdmin can access all classes
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can access classes in their region
        if ($user->hasRole('regionadmin')) {
            return $class->institution && 
                   ($class->institution->parent_id === $user->institution_id || 
                    $class->institution_id === $user->institution_id);
        }

        // SektorAdmin can access classes in their sector
        if ($user->hasRole('sektoradmin')) {
            return $class->institution && 
                   ($class->institution->parent_id === $user->institution_id || 
                    $class->institution_id === $user->institution_id);
        }

        // School staff can access classes in their school
        if ($user->hasRole(['məktəbadmin', 'müəllim', 'müavin'])) {
            return $class->institution_id === $user->institution_id;
        }

        return false;
    }
}