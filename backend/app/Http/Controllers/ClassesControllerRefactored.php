<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Services\ClassAnalyticsService;
use App\Services\ClassCrudService;
use App\Services\ClassPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClassesControllerRefactored extends Controller
{
    protected ClassCrudService $crudService;

    protected ClassPermissionService $permissionService;

    protected ClassAnalyticsService $analyticsService;

    public function __construct(
        ClassCrudService $crudService,
        ClassPermissionService $permissionService,
        ClassAnalyticsService $analyticsService
    ) {
        $this->crudService = $crudService;
        $this->permissionService = $permissionService;
        $this->analyticsService = $analyticsService;
    }

    /**
     * Display a listing of classes with filtering and pagination
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

        try {
            $user = $request->user();
            $filters = $request->only([
                'institution_id', 'grade_level', 'academic_year_id',
                'specialty', 'homeroom_teacher_id', 'status', 'search', 'include',
            ]);

            // Apply regional filtering to filters
            $query = Grade::query();
            $this->permissionService->applyRegionalFiltering($query, $user);

            $perPage = $request->get('per_page', 20);
            $result = $this->crudService->getClasses($filters, $perPage);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Sinif siyahısı uğurla alındı',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sinif siyahısı alınarkən xəta baş verdi');
        }
    }

    /**
     * Store a newly created class
     */
    public function store(Request $request): JsonResponse
    {
        if (! $this->permissionService->canCreateClass($request->user())) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif yaratmaq icazəniz yoxdur',
            ], 403);
        }

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

        try {
            $class = $this->crudService->createClass($request->validated());
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
                    'created_at' => $class->created_at,
                ],
                'message' => 'Sinif uğurla yaradıldı',
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sinif yaradılarkən xəta baş verdi');
        }
    }

    /**
     * Display the specified class
     */
    public function show(Request $request, Grade $class): JsonResponse
    {
        if (! $this->permissionService->canAccessClass($request->user(), $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifin məlumatlarına giriş icazəniz yoxdur',
            ], 403);
        }

        try {
            $data = $this->crudService->getClassDetails($class);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Sinif məlumatları uğurla alındı',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sinif məlumatları alınarkən xəta baş verdi');
        }
    }

    /**
     * Update the specified class
     */
    public function update(Request $request, Grade $class): JsonResponse
    {
        if (! $this->permissionService->canModifyClass($request->user(), $class)) {
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

        try {
            $updatedClass = $this->crudService->updateClass($class, $request->validated());

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $updatedClass->id,
                    'name' => $updatedClass->name,
                    'full_name' => $updatedClass->full_name,
                    'display_name' => $updatedClass->display_name,
                    'class_level' => $updatedClass->class_level,
                    'specialty' => $updatedClass->specialty,
                    'is_active' => $updatedClass->is_active,
                    'updated_at' => $updatedClass->updated_at,
                ],
                'message' => 'Sinif məlumatları uğurla yeniləndi',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sinif yenilənərkən xəta baş verdi');
        }
    }

    /**
     * Remove the specified class (soft delete)
     */
    public function destroy(Request $request, Grade $class): JsonResponse
    {
        if (! $this->permissionService->canDeleteClass($request->user(), $class)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sinifi silmək icazəniz yoxdur',
            ], 403);
        }

        try {
            $this->crudService->deactivateClass($class);

            return response()->json([
                'success' => true,
                'message' => 'Sinif uğurla deaktiv edildi',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Sinif deaktiv edilərkən xəta baş verdi');
        }
    }

    /**
     * Get students in a specific class
     */
    public function students(Request $request, Grade $class): JsonResponse
    {
        if (! $this->permissionService->canAccessClass($request->user(), $class)) {
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

        try {
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
        } catch (\Exception $e) {
            return $this->handleError($e, 'Şagird siyahısı alınarkən xəta baş verdi');
        }
    }

    /**
     * Assign homeroom teacher to class
     */
    public function assignTeacher(Request $request, Grade $class): JsonResponse
    {
        if (! $this->permissionService->canAssignTeacher($request->user(), $class)) {
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

        try {
            $this->crudService->assignHomeroomTeacher($class, $request->teacher_id);
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
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Müəllim təyin edilərkən xəta baş verdi');
        }
    }

    /**
     * Get class statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $data = $this->analyticsService->getClassStatistics($request->user());

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Sinif statistikaları uğurla alındı',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Statistikalar alınarkən xəta baş verdi');
        }
    }

    /**
     * Get user permission context
     */
    public function getPermissionContext(Request $request): JsonResponse
    {
        try {
            $context = $this->permissionService->getPermissionContext($request->user());

            return response()->json([
                'success' => true,
                'data' => $context,
                'message' => 'Permission context retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə konteksti alınarkən xəta baş verdi');
        }
    }

    /**
     * Get trending classes
     */
    public function trending(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:most_enrolled,least_enrolled,overcrowded',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $type = $request->get('type', 'most_enrolled');
            $data = $this->analyticsService->getTrendingClasses($request->user(), $type);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Trending siniflar uğurla alındı',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Trending məlumatlar alınarkən xəta baş verdi');
        }
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : 'Server error',
        ], 500);
    }
}
