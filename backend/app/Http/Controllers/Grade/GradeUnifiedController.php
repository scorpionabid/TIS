<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\User;
use App\Models\Room;
use App\Models\AcademicYear;
use App\Services\GradeManagementService;
use App\Services\StudentEnrollmentService;
use App\Services\GradeNamingEngine;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Unified Grade Controller
 * 
 * This controller consolidates all grade/class management functionality
 * from the previous fragmented controllers into a unified, efficient API.
 * 
 * It provides a clean, RESTful API with consistent response formats
 * and proper role-based access control.
 */
class GradeUnifiedController extends Controller
{
    protected GradeManagementService $gradeService;
    protected StudentEnrollmentService $enrollmentService;
    protected GradeNamingEngine $namingEngine;

    public function __construct(
        GradeManagementService $gradeService,
        StudentEnrollmentService $enrollmentService,
        GradeNamingEngine $namingEngine
    ) {
        $this->gradeService = $gradeService;
        $this->enrollmentService = $enrollmentService;
        $this->namingEngine = $namingEngine;
    }

    /**
     * Display a listing of grades with advanced filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'institution_id' => 'sometimes|exists:institutions,id',
                'class_level' => 'sometimes|integer|min:0|max:12',
                'academic_year_id' => 'sometimes|exists:academic_years,id',
                'room_id' => 'sometimes|exists:rooms,id',
                'homeroom_teacher_id' => 'sometimes|exists:users,id',
                'specialty' => 'sometimes|string|max:100',
                'is_active' => 'sometimes|boolean',
                'has_room' => 'sometimes|boolean',
                'has_teacher' => 'sometimes|boolean',
                'capacity_status' => 'sometimes|in:available,full,over_capacity,no_room',
                'search' => 'sometimes|string|max:255',
                'page' => 'sometimes|integer|min:1',
                'per_page' => 'sometimes|integer|min:1|max:100',
                'include' => 'sometimes|string',
                'sort_by' => 'sometimes|in:name,class_level,capacity,student_count,created_at',
                'sort_direction' => 'sometimes|in:asc,desc',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $filters = $request->only([
                'institution_id', 'class_level', 'academic_year_id',
                'room_id', 'homeroom_teacher_id', 'specialty', 'is_active',
                'has_room', 'has_teacher', 'capacity_status', 'search'
            ]);

            $options = [
                'per_page' => $request->get('per_page', 20),
                'include' => $request->get('include', ''),
                'sort_by' => $request->get('sort_by', 'class_level'),
                'sort_direction' => $request->get('sort_direction', 'asc'),
            ];

            $result = $this->gradeService->getGradesForUser($user, $filters, $options);

            return response()->json([
                'success' => true,
                'data' => $result['data'], // Direct grades array
                'pagination' => $result['pagination'] ?? null,
                'meta' => $result['meta'] ?? null,
                'message' => count($result['data']) . ' sinif tapıldı',
            ]);

        } catch (\Exception $e) {
            Log::error('Grade index error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sinif siyahısı alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Store a newly created grade
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => [
                    'required',
                    'string',
                    'max:10',
// Smart validation will handle pattern checking
                ],
                'class_level' => 'required|integer|min:0|max:12',
                'academic_year_id' => 'required|exists:academic_years,id',
                'institution_id' => 'sometimes|exists:institutions,id',
                'room_id' => 'nullable|exists:rooms,id',
                'homeroom_teacher_id' => 'nullable|exists:users,id',
                'specialty' => 'nullable|string|max:100',
                'student_count' => 'nullable|integer|min:0|max:500',
                'is_active' => 'sometimes|boolean',
                'metadata' => 'nullable|array',
            ], [
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $data = $validator->validated();
            
            // Set institution_id from user if not provided (for school-level users)
            if (!isset($data['institution_id']) && $user->institution_id) {
                $data['institution_id'] = $user->institution_id;
            }

            // Use GradeNamingEngine for smart validation
            $validation = $this->namingEngine->validateName(
                $data['name'],
                $data['institution_id'],
                $data['class_level'],
                $data['academic_year_id']
            );

            if (!$validation['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $validation['message'],
                    'errors' => [
                        'name' => [$validation['message']]
                    ],
                ], 422);
            }

            $grade = $this->gradeService->createGrade($user, $data);

            return response()->json([
                'success' => true,
                'data' => $this->gradeService->formatGradeResponse($grade),
                'message' => 'Sinif uğurla yaradıldı',
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Grade creation error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sinif yaradılarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Display the specified grade with detailed information
     */
    public function show(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check access permission
            if (!$this->gradeService->canUserAccessGrade($user, $grade)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinifin məlumatlarına giriş icazəniz yoxdur',
                ], 403);
            }

            $includeOptions = $request->get('include', 'room,teacher,students,subjects,performance');
            $gradeDetails = $this->gradeService->getGradeDetails($grade, $includeOptions);

            return response()->json([
                'success' => true,
                'data' => $gradeDetails,
                'message' => 'Sinif məlumatları uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Grade show error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sinif məlumatları alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Update the specified grade
     */
    public function update(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check modification permission
            if (!$this->gradeService->canUserModifyGrade($user, $grade)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinifi yeniləmək icazəniz yoxdur',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'name' => [
                    'sometimes',
                    'string',
                    'max:10',
// Smart validation will handle pattern checking
                ],
                'class_level' => 'sometimes|integer|min:0|max:12',
                'room_id' => 'sometimes|nullable|exists:rooms,id',
                'homeroom_teacher_id' => 'sometimes|nullable|exists:users,id',
                'specialty' => 'sometimes|nullable|string|max:100',
                'student_count' => 'sometimes|nullable|integer|min:0|max:500',
                'is_active' => 'sometimes|boolean',
                'metadata' => 'sometimes|nullable|array',
            ], [
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = $validator->validated();
            
            // Use GradeNamingEngine for smart validation during update
            if (isset($data['name']) && $data['name'] !== $grade->name) {
                $validation = $this->namingEngine->validateName(
                    $data['name'],
                    $grade->institution_id,
                    isset($data['class_level']) ? $data['class_level'] : $grade->class_level,
                    $grade->academic_year_id,
                    $grade->id // Exclude current grade
                );

                if (!$validation['valid']) {
                    return response()->json([
                        'success' => false,
                        'message' => $validation['message'],
                        'errors' => [
                            'name' => [$validation['message']]
                        ],
                    ], 422);
                }
            }
            
            $updatedGrade = $this->gradeService->updateGrade($user, $grade, $data);

            return response()->json([
                'success' => true,
                'data' => $this->gradeService->formatGradeResponse($updatedGrade),
                'message' => 'Sinif məlumatları uğurla yeniləndi',
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Grade update error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'grade_id' => $grade->id,
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sinif yenilənərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Soft delete the specified grade
     */
    public function destroy(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check deletion permission
            if (!$this->gradeService->canUserDeleteGrade($user, $grade)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinifi silmək icazəniz yoxdur',
                ], 403);
            }

            $this->gradeService->deactivateGrade($user, $grade);

            return response()->json([
                'success' => true,
                'message' => 'Sinif uğurla deaktiv edildi',
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Grade deletion error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sinif silinərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get students enrolled in the specified grade
     */
    public function students(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$this->gradeService->canUserAccessGrade($user, $grade)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinifin şagird siyahısına giriş icazəniz yoxdur',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'enrollment_status' => 'sometimes|in:active,inactive,transferred,graduated,all',
                'include_profile' => 'sometimes|boolean',
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

            $filters = $request->only(['enrollment_status']);
            $options = [
                'include_profile' => $request->boolean('include_profile', true),
                'per_page' => $request->get('per_page', 20),
            ];

            $result = $this->enrollmentService->getStudentsForGrade($grade, $filters, $options);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Sinif şagird siyahısı uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Grade students error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Şagird siyahısı alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Assign a homeroom teacher to the specified grade
     */
    public function assignTeacher(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$this->gradeService->canUserModifyGrade($user, $grade)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinifə müəllim təyin etmək icazəniz yoxdur',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'teacher_id' => 'required|exists:users,id',
                'effective_date' => 'sometimes|date',
                'notes' => 'sometimes|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $teacherId = $request->teacher_id;
            $effectiveDate = $request->get('effective_date', now());
            $notes = $request->get('notes');

            $this->gradeService->assignHomeroomTeacher($user, $grade, $teacherId, $effectiveDate, $notes);

            // Reload grade with teacher relationship
            $grade->load('homeroomTeacher.profile');

            return response()->json([
                'success' => true,
                'data' => [
                    'grade_id' => $grade->id,
                    'grade_name' => $grade->name,
                    'teacher' => $grade->homeroomTeacher ? [
                        'id' => $grade->homeroomTeacher->id,
                        'name' => $grade->homeroomTeacher->name,
                        'email' => $grade->homeroomTeacher->email,
                        'full_name' => $grade->homeroomTeacher->profile 
                            ? "{$grade->homeroomTeacher->profile->first_name} {$grade->homeroomTeacher->profile->last_name}"
                            : $grade->homeroomTeacher->name,
                    ] : null,
                ],
                'message' => 'Sinif rəhbəri uğurla təyin edildi',
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Teacher assignment error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'grade_id' => $grade->id,
                'teacher_id' => $request->get('teacher_id'),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim təyin edilərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Remove homeroom teacher from the specified grade
     */
    public function removeTeacher(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$this->gradeService->canUserModifyGrade($user, $grade)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu sinifin müəllimini dəyişmək icazəniz yoxdur',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'effective_date' => 'sometimes|date',
                'reason' => 'sometimes|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $effectiveDate = $request->get('effective_date', now());
            $reason = $request->get('reason');

            $this->gradeService->removeHomeroomTeacher($user, $grade, $effectiveDate, $reason);

            return response()->json([
                'success' => true,
                'message' => 'Sinif rəhbəri uğurla götürüldü',
            ]);

        } catch (\Exception $e) {
            Log::error('Teacher removal error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəllim götürülərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get comprehensive statistics for grades
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'institution_id' => 'sometimes|exists:institutions,id',
                'academic_year_id' => 'sometimes|exists:academic_years,id',
                'include_trends' => 'sometimes|boolean',
                'date_from' => 'sometimes|date',
                'date_to' => 'sometimes|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $filters = $request->only(['institution_id', 'academic_year_id', 'date_from', 'date_to']);
            $options = [
                'include_trends' => $request->boolean('include_trends', false),
            ];

            $statistics = $this->gradeService->getGradeStatistics($user, $filters, $options);

            return response()->json([
                'success' => true,
                'data' => $statistics,
                'message' => 'Sinif statistikaları uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Grade statistics error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Statistikalar alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get capacity and utilization reports
     */
    public function capacityReport(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'institution_id' => 'sometimes|exists:institutions,id',
                'academic_year_id' => 'sometimes|exists:academic_years,id',
                'threshold' => 'sometimes|numeric|min:0|max:100',
                'include_projections' => 'sometimes|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $filters = $request->only(['institution_id', 'academic_year_id']);
            $options = [
                'threshold' => $request->get('threshold', 85),
                'include_projections' => $request->boolean('include_projections', false),
            ];

            $report = $this->gradeService->getCapacityReport($user, $filters, $options);

            return response()->json([
                'success' => true,
                'data' => $report,
                'message' => 'Kapasitə hesabatı uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Capacity report error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Kapasitə hesabatı alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Enroll a single student into a grade
     */
    public function enrollStudent(Request $request, Grade $grade): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'student_id' => 'required|exists:users,id',
                'enrollment_date' => 'sometimes|date',
                'notes' => 'sometimes|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            
            // Check permissions
            if (!$user->can('grades.manage_students')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tələbə idarə etmək üçün icazəniz yoxdur',
                ], 403);
            }

            $studentId = $request->get('student_id');
            $enrollmentDate = $request->get('enrollment_date', now());
            $notes = $request->get('notes');

            $result = $this->enrollmentService->enrollStudentInGrade(
                $studentId,
                $grade->id,
                $enrollmentDate,
                $notes
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 400);
            }

            Log::info('Student enrolled successfully', [
                'grade_id' => $grade->id,
                'student_id' => $studentId,
                'enrolled_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tələbə uğurla sinifə əlavə edildi',
                'data' => $result['data']
            ]);

        } catch (\Exception $e) {
            Log::error('Student enrollment error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tələbə əlavə edilərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Enroll multiple students into a grade
     */
    public function enrollMultipleStudents(Request $request, Grade $grade): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'student_ids' => 'required|array|min:1',
                'student_ids.*' => 'required|exists:users,id',
                'enrollment_date' => 'sometimes|date',
                'notes' => 'sometimes|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            
            // Check permissions
            if (!$user->can('grades.manage_students')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tələbə idarə etmək üçün icazəniz yoxdur',
                ], 403);
            }

            $studentIds = $request->get('student_ids');
            $enrollmentDate = $request->get('enrollment_date', now());
            $notes = $request->get('notes');

            $results = $this->enrollmentService->enrollMultipleStudentsInGrade(
                $studentIds,
                $grade->id,
                $enrollmentDate,
                $notes
            );

            Log::info('Multiple students enrollment completed', [
                'grade_id' => $grade->id,
                'student_count' => count($studentIds),
                'successful' => $results['successful'],
                'failed' => $results['failed'],
                'enrolled_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => $results['successful'] . ' tələbə uğurla əlavə edildi' .
                           ($results['failed'] > 0 ? ', ' . $results['failed'] . ' tələbə əlavə edilə bilmədi' : ''),
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Multiple students enrollment error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tələbələr əlavə edilərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Remove a student from a grade
     */
    public function unenrollStudent(Request $request, Grade $grade, $studentId): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check permissions
            if (!$user->can('grades.manage_students')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tələbə idarə etmək üçün icazəniz yoxdur',
                ], 403);
            }

            $validator = Validator::make(['student_id' => $studentId], [
                'student_id' => 'required|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keçərsiz tələbə ID',
                ], 422);
            }

            $result = $this->enrollmentService->unenrollStudentFromGrade(
                $studentId,
                $grade->id,
                $request->get('reason', 'Removed by admin')
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 400);
            }

            Log::info('Student unenrolled successfully', [
                'grade_id' => $grade->id,
                'student_id' => $studentId,
                'removed_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tələbə sinifdən uğurla çıxarıldı',
                'data' => $result['data']
            ]);

        } catch (\Exception $e) {
            Log::error('Student unenrollment error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'student_id' => $studentId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tələbə çıxarılarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Update student enrollment status in a grade
     */
    public function updateStudentStatus(Request $request, Grade $grade, $studentId): JsonResponse
    {
        try {
            $validator = Validator::make(array_merge($request->all(), ['student_id' => $studentId]), [
                'student_id' => 'required|exists:users,id',
                'status' => 'required|in:active,inactive,transferred,graduated,suspended',
                'notes' => 'sometimes|string|max:500',
                'effective_date' => 'sometimes|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            
            // Check permissions
            if (!$user->can('grades.manage_students')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tələbə statusu dəyişmək üçün icazəniz yoxdur',
                ], 403);
            }

            $status = $request->get('status');
            $notes = $request->get('notes');
            $effectiveDate = $request->get('effective_date', now());

            $result = $this->enrollmentService->updateStudentEnrollmentStatus(
                $studentId,
                $grade->id,
                $status,
                $effectiveDate,
                $notes
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 400);
            }

            Log::info('Student status updated successfully', [
                'grade_id' => $grade->id,
                'student_id' => $studentId,
                'new_status' => $status,
                'updated_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tələbə statusu uğurla yeniləndi',
                'data' => $result['data']
            ]);

        } catch (\Exception $e) {
            Log::error('Student status update error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'student_id' => $studentId,
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tələbə statusu yenilənərkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get smart grade naming suggestions
     */
    public function getNamingSuggestions(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'institution_id' => 'required|exists:institutions,id',
                'class_level' => 'required|integer|min:0|max:12',
                'academic_year_id' => 'required|exists:academic_years,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $institutionId = $request->get('institution_id');
            $classLevel = $request->get('class_level');
            $academicYearId = $request->get('academic_year_id');

            // Get smart suggestions from naming engine
            $suggestions = $this->namingEngine->suggestNamingPattern(
                $institutionId,
                $classLevel,
                $academicYearId
            );

            Log::info('Grade naming suggestions generated', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'class_level' => $classLevel,
                'academic_year_id' => $academicYearId,
                'pattern' => $suggestions['pattern'] ?? 'unknown'
            ]);

            return response()->json([
                'success' => true,
                'data' => $suggestions,
                'message' => 'Sinif adlandırma tövsiyələri uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Grade naming suggestions error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tövsiyələr alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get naming options for grade creation dropdown
     *
     * This provides standardized dropdown options for:
     * - Class levels (1-12)
     * - Letters (A, B, C, Ç, D, E, Ə...)
     * - Specialties (Riyazi, Humanitar, etc.)
     * - Existing grade names to prevent duplicates
     */
    public function getNamingOptions(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'institution_id' => 'required|exists:institutions,id',
                'class_level' => 'sometimes|integer|min:0|max:12',
                'academic_year_id' => 'required|exists:academic_years,id',
                'extended_letters' => 'sometimes|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $institutionId = $request->get('institution_id');
            $classLevel = $request->get('class_level');
            $academicYearId = $request->get('academic_year_id');
            $extendedLetters = $request->get('extended_letters', false);

            // Import naming constants
            $namingConstants = \App\Constants\GradeNamingConstants::class;

            // Get available letters
            $availableLetters = $namingConstants::getAvailableLetters($extendedLetters);

            // Get existing grade names for this institution/level/year to mark as used
            $existingGradesQuery = Grade::where('institution_id', $institutionId)
                ->where('academic_year_id', $academicYearId);

            if ($classLevel) {
                $existingGradesQuery->where('class_level', $classLevel);
            }

            $existingNames = $existingGradesQuery->pluck('name')->toArray();

            // Mark used letters
            $lettersWithAvailability = array_map(function($letter) use ($existingNames) {
                return [
                    'value' => $letter['value'],
                    'label' => $letter['label'],
                    'available' => !in_array($letter['value'], $existingNames),
                    'used' => in_array($letter['value'], $existingNames),
                ];
            }, $availableLetters);

            // Get available class levels
            $classLevels = $namingConstants::getAvailableClassLevels(false);

            // Get available specialties
            $specialties = $namingConstants::getAvailableSpecialties();

            // Get capacity recommendation for the class level
            $capacityRecommendation = $classLevel
                ? $namingConstants::getCapacityRecommendation($classLevel)
                : null;

            // Should show specialty field (typically for grades 10-12)
            $shouldShowSpecialty = $classLevel
                ? $namingConstants::shouldShowSpecialty($classLevel)
                : false;

            return response()->json([
                'success' => true,
                'data' => [
                    'class_levels' => $classLevels,
                    'letters' => $lettersWithAvailability,
                    'specialties' => $specialties,
                    'existing_names' => $existingNames,
                    'capacity_recommendation' => $capacityRecommendation,
                    'should_show_specialty' => $shouldShowSpecialty,
                    'naming_pattern' => $namingConstants::DEFAULT_NAMING_PATTERN,
                    'naming_patterns' => $namingConstants::NAMING_PATTERNS,
                ],
                'message' => 'Adlandırma seçimləri uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Grade naming options error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Adlandırma seçimləri alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get naming system statistics
     */
    public function getNamingSystemStats(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check permissions
            if (!$user->can('grades.read')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara baxmaq üçün icazəniz yoxdur',
                ], 403);
            }

            $stats = $this->namingEngine->getSystemStats();

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Adlandırma sistemi statistikaları uğurla alındı',
            ]);

        } catch (\Exception $e) {
            Log::error('Naming system stats error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Statistikalar alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get comprehensive analytics for a grade
     */
    public function getAnalytics(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check permissions
            if (!$user->can('grades.analytics')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Analitika məlumatlarına baxmaq üçün icazəniz yoxdur',
                ], 403);
            }

            // Get student statistics
            $studentStats = $this->enrollmentService->getGradeStudentStatistics($grade->id);
            
            // Calculate capacity analysis
            $capacityAnalysis = [
                'current_capacity' => $grade->student_count,
                'max_capacity' => $grade->room ? $grade->room->capacity : null,
                'utilization_rate' => $grade->utilization_rate ?? 0,
                'capacity_status' => $grade->capacity_status,
                'recommendations' => []
            ];

            // Add recommendations based on capacity
            if ($capacityAnalysis['utilization_rate'] > 95) {
                $capacityAnalysis['recommendations'][] = 'Sinif həddindən çox doludur, yeni otaq tapılmalıdır';
            } elseif ($capacityAnalysis['utilization_rate'] < 60) {
                $capacityAnalysis['recommendations'][] = 'Sinif az istifadə olunur, tələbə qeydiyyatını artırmaq olar';
            }

            if (!$grade->room_id) {
                $capacityAnalysis['recommendations'][] = 'Sinif üçün otaq təyin edilməyib';
            }

            if (!$grade->homeroom_teacher_id) {
                $capacityAnalysis['recommendations'][] = 'Sinif rəhbəri təyin edilməyib';
            }

            // Performance metrics (mock data for now)
            $performanceMetrics = [
                'enrollment_trend' => [
                    ['month' => 'Sentyabr', 'enrolled' => 25, 'withdrawn' => 2],
                    ['month' => 'Oktyabr', 'enrolled' => 3, 'withdrawn' => 1],
                    ['month' => 'Noyabr', 'enrolled' => 1, 'withdrawn' => 0],
                ],
                'retention_rate' => 95.5,
                'average_class_size_comparison' => $grade->student_count
            ];

            // Resource allocation
            $resourceAllocation = [
                'has_room' => !is_null($grade->room_id),
                'room_capacity' => $grade->room ? $grade->room->capacity : null,
                'has_teacher' => !is_null($grade->homeroom_teacher_id),
                'teacher_workload' => $grade->homeroom_teacher ? 85 : null // Mock percentage
            ];

            // Generate alerts
            $alerts = [];
            
            if ($capacityAnalysis['utilization_rate'] > 100) {
                $alerts[] = [
                    'type' => 'error',
                    'message' => 'Sinif tutumu həddindən çox aşılmışdır',
                    'action_required' => true
                ];
            }

            if (!$grade->room_id) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => 'Sinif üçün otaq təyin edilməyib',
                    'action_required' => true
                ];
            }

            if (!$grade->homeroom_teacher_id) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => 'Sinif rəhbəri təyin edilməyib',
                    'action_required' => true
                ];
            }

            $analytics = [
                'student_statistics' => $studentStats,
                'capacity_analysis' => $capacityAnalysis,
                'performance_metrics' => $performanceMetrics,
                'resource_allocation' => $resourceAllocation,
                'alerts' => $alerts
            ];

            Log::info('Grade analytics retrieved', [
                'grade_id' => $grade->id,
                'user_id' => $user->id,
                'analytics_keys' => array_keys($analytics)
            ]);

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'message' => 'Sinif analitikası uğurla alındı'
            ]);

        } catch (\Exception $e) {
            Log::error('Grade analytics error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Analitika məlumatları alınarkən səhv baş verdi',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }
}