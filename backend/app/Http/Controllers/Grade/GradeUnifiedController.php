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
     *
     * DELEGATED to GradeCRUDController::index() (Sprint 6 Phase 2)
     */
    public function index(Request $request): JsonResponse
    {
        $controller = app(GradeCRUDController::class);
        return $controller->index($request);
    }

    /**
     * Store a newly created grade
     *
     * DELEGATED to GradeCRUDController::store() (Sprint 6 Phase 2)
     */
    public function store(Request $request): JsonResponse
    {
        $controller = app(GradeCRUDController::class);
        return $controller->store($request);
    }

    /**
     * Display the specified grade with detailed information
     *
     * DELEGATED to GradeCRUDController::show() (Sprint 6 Phase 2)
     */
    public function show(Request $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);
        return $controller->show($request, $grade);
    }

    /**
     * Update the specified grade
     *
     * DELEGATED to GradeCRUDController::update() (Sprint 6 Phase 2)
     */
    public function update(Request $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);
        return $controller->update($request, $grade);
    }

    /**
     * Soft delete the specified grade
     *
     * DELEGATED to GradeCRUDController::destroy() (Sprint 6 Phase 2)
     */
    public function destroy(Request $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);
        return $controller->destroy($request, $grade);
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
    /**
     * Get grade statistics
     *
     * DELEGATED to GradeStatsController::statistics() (Sprint 6 Phase 1)
     */
    public function statistics(Request $request): JsonResponse
    {
        $controller = app(GradeStatsController::class);
        return $controller->statistics($request);
    }

    /**
     * Get capacity and utilization reports
     */
    /**
     * Get capacity and utilization reports
     *
     * DELEGATED to GradeStatsController::capacityAnalysis() (Sprint 6 Phase 1)
     */
    public function capacityReport(Request $request): JsonResponse
    {
        $controller = app(GradeStatsController::class);
        return $controller->capacityAnalysis($request);
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

            // Get available class levels (include preschool level 0)
            $classLevels = $namingConstants::getAvailableClassLevels(true);

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
    /**
     * Get analytics for a specific grade
     *
     * SIMPLIFIED (Sprint 6 Phase 1) - Delegates to performanceTrends for system-wide data
     * Grade-specific analytics kept minimal for now
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

            // Basic capacity analysis
            $capacityAnalysis = [
                'current_capacity' => $grade->student_count,
                'max_capacity' => $grade->room ? $grade->room->capacity : null,
                'utilization_rate' => $grade->utilization_rate ?? 0,
                'capacity_status' => $grade->capacity_status,
            ];

            // Resource allocation
            $resourceAllocation = [
                'has_room' => !is_null($grade->room_id),
                'room_capacity' => $grade->room ? $grade->room->capacity : null,
                'has_teacher' => !is_null($grade->homeroom_teacher_id),
            ];

            $analytics = [
                'student_statistics' => $studentStats,
                'capacity_analysis' => $capacityAnalysis,
                'resource_allocation' => $resourceAllocation,
            ];

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

    /**
     * Duplicate/Copy a grade with its curriculum
     * POST /api/grades/{grade}/duplicate
     */
    public function duplicate(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();

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

            // Determine the target class level (use new level if provided, otherwise keep original)
            $targetClassLevel = $request->has('class_level') ? $request->class_level : $grade->class_level;
            $targetAcademicYearId = $request->has('academic_year_id') ? $request->academic_year_id : $grade->academic_year_id;

            // Check if grade with same name, class_level, academic_year, and institution already exists
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

            // Update with new name
            $newGradeData['name'] = $request->name;

            // Update class level if provided (allows copying to different grade level)
            if ($request->has('class_level')) {
                $newGradeData['class_level'] = $request->class_level;
            }

            // Update academic year if provided
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

            // Refresh to get computed attributes (display_name, full_name are model attributes)
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