<?php

namespace App\Http\Controllers\Grade;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\User;
use App\Models\Room;
use App\Models\AcademicYear;
use App\Services\GradeManagementService;
use App\Services\StudentEnrollmentService;
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

    public function __construct(
        GradeManagementService $gradeService,
        StudentEnrollmentService $enrollmentService
    ) {
        $this->gradeService = $gradeService;
        $this->enrollmentService = $enrollmentService;
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
                'data' => $result,
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
                'name' => 'required|string|max:10',
                'class_level' => 'required|integer|min:0|max:12',
                'academic_year_id' => 'required|exists:academic_years,id',
                'institution_id' => 'sometimes|exists:institutions,id',
                'room_id' => 'nullable|exists:rooms,id',
                'homeroom_teacher_id' => 'nullable|exists:users,id',
                'specialty' => 'nullable|string|max:100',
                'student_count' => 'nullable|integer|min:0|max:500',
                'description' => 'nullable|string|max:500',
                'is_active' => 'sometimes|boolean',
                'metadata' => 'nullable|array',
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
                'name' => 'sometimes|string|max:10',
                'class_level' => 'sometimes|integer|min:0|max:12',
                'room_id' => 'sometimes|nullable|exists:rooms,id',
                'homeroom_teacher_id' => 'sometimes|nullable|exists:users,id',
                'specialty' => 'sometimes|nullable|string|max:100',
                'student_count' => 'sometimes|nullable|integer|min:0|max:500',
                'description' => 'sometimes|nullable|string|max:500',
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

            $data = $validator->validated();
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
}