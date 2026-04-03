<?php

namespace App\Http\Controllers\Grade;

use App\Exports\ClassesTemplateExport;
use App\Exports\GradesExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Grade\DuplicateGradeRequest;
use App\Http\Requests\Grade\FilterGradesRequest;
use App\Http\Requests\Grade\StoreGradeRequest;
use App\Http\Requests\Grade\UpdateGradeRequest;
use App\Imports\ClassesImport;
use App\Models\Grade;
use App\Services\GradeManagementService;
use App\Services\GradeNamingEngine;
use App\Services\StudentEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
    public function index(FilterGradesRequest $request): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->index($request);
    }

    /**
     * Store a newly created grade
     *
     * DELEGATED to GradeCRUDController::store() (Sprint 6 Phase 2)
     */
    public function store(StoreGradeRequest $request): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->store($request);
    }

    /**
     * Display the specified grade with detailed information
     *
     * DELEGATED to GradeCRUDController::show() (Sprint 6 Phase 2)
     */
    public function show(Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->show($grade);
    }

    /**
     * Update the specified grade
     *
     * DELEGATED to GradeCRUDController::update() (Sprint 6 Phase 2)
     */
    public function update(UpdateGradeRequest $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->update($request, $grade);
    }

    /**
     * Deactivate the specified grade (soft delete)
     *
     * DELEGATED to GradeCRUDController::deactivate() (Sprint 6 Phase 2)
     */
    public function deactivate(Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->deactivate($grade);
    }

    /**
     * Permanently delete the specified grade (hard delete)
     *
     * DELEGATED to GradeCRUDController::destroy() (Sprint 6 Phase 2)
     */
    public function destroy(Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->destroy($grade);
    }

    /**
     * Get students enrolled in the specified grade
     *
     * DELEGATED to GradeStudentController::getStudents() (Sprint 6 Phase 3)
     */
    public function students(Request $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeStudentController::class);

        return $controller->getStudents($request, $grade);
    }

    /**
     * Assign a homeroom teacher to the specified grade
     */
    public function assignTeacher(Request $request, Grade $grade): JsonResponse
    {
        try {
            $user = Auth::user();

            if (! $this->gradeService->canUserModifyGrade($user, $grade)) {
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
                'trace' => $e->getTraceAsString(),
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

            if (! $this->gradeService->canUserModifyGrade($user, $grade)) {
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
                'trace' => $e->getTraceAsString(),
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
     *
     * DELEGATED to GradeStudentController::assignStudents() (Sprint 6 Phase 3)
     */
    public function enrollStudent(Request $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeStudentController::class);

        return $controller->assignStudents($request, $grade);
    }

    /**
     * Enroll multiple students into a grade
     *
     * DELEGATED to GradeStudentController::bulkUpdateEnrollments() (Sprint 6 Phase 3)
     */
    public function enrollMultipleStudents(Request $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeStudentController::class);

        return $controller->bulkUpdateEnrollments($request);
    }

    /**
     * Remove a student from a grade
     *
     * DELEGATED to GradeStudentController::removeStudent() (Sprint 6 Phase 3)
     */
    public function unenrollStudent(Request $request, Grade $grade, $studentId): JsonResponse
    {
        $controller = app(GradeStudentController::class);

        return $controller->removeStudent($request, $grade, $studentId);
    }

    /**
     * Update student enrollment status in a grade
     *
     * DELEGATED to GradeStudentController::updateStudentStatus() (Sprint 6 Phase 3)
     */
    public function updateStudentStatus(Request $request, Grade $grade, $studentId): JsonResponse
    {
        $controller = app(GradeStudentController::class);

        return $controller->updateStudentStatus($request, $grade, $studentId);
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
                'pattern' => $suggestions['pattern'] ?? 'unknown',
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
                'trace' => $e->getTraceAsString(),
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
            $lettersWithAvailability = array_map(function ($letter) use ($existingNames) {
                return [
                    'value' => $letter['value'],
                    'label' => $letter['label'],
                    'available' => ! in_array($letter['value'], $existingNames),
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
                'trace' => $e->getTraceAsString(),
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
            if (! $user->can('grades.read')) {
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
                'trace' => $e->getTraceAsString(),
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
            if (! $user->can('grades.analytics')) {
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
                'has_room' => ! is_null($grade->room_id),
                'room_capacity' => $grade->room ? $grade->room->capacity : null,
                'has_teacher' => ! is_null($grade->homeroom_teacher_id),
            ];

            $analytics = [
                'student_statistics' => $studentStats,
                'capacity_analysis' => $capacityAnalysis,
                'resource_allocation' => $resourceAllocation,
            ];

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'message' => 'Sinif analitikası uğurla alındı',
            ]);
        } catch (\Exception $e) {
            Log::error('Grade analytics error: ' . $e->getMessage(), [
                'grade_id' => $grade->id,
                'trace' => $e->getTraceAsString(),
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
    /**
     * Duplicate an existing grade with optional modifications
     *
     * DELEGATED to GradeCRUDController::duplicate() (Sprint 6 Phase 4)
     */
    public function duplicate(DuplicateGradeRequest $request, Grade $grade): JsonResponse
    {
        $controller = app(GradeCRUDController::class);

        return $controller->duplicate($request, $grade);
    }

    /**
     * Download grade import template (Excel)
     */
    public function downloadTemplate(): BinaryFileResponse
    {
        $user = Auth::user();

        $institutionsQuery = \App\Models\Institution::query()
            ->where('is_active', true)
            ->whereNotNull('institution_code');

        if ($user->hasRole(['superadmin', 'regionadmin'])) {
            $institutions = $institutionsQuery->limit(3)->get();
        } else {
            $institutions = $institutionsQuery
                ->where('id', $user->institution_id ?? 0)
                ->get();
        }

        $fileName = 'sinif_import_template_' . date('Y-m-d') . '.xlsx';

        return Excel::download(new ClassesTemplateExport($institutions), $fileName);
    }

    /**
     * Import grades from Excel/CSV file
     */
    public function importGrades(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $user = Auth::user();
        $region = $user->institution?->parent ?? $user->institution;

        try {
            $import = new ClassesImport($region);
            Excel::import($import, $request->file('file'));

            return response()->json([
                'success' => true,
                'message' => 'İdxal tamamlandı',
                'created' => $import->getSuccessCount(),
                'errors' => $import->getErrors(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İdxal zamanı xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export grades to Excel
     */
    public function exportGrades(Request $request): BinaryFileResponse
    {
        $user = Auth::user();

        $query = Grade::with(['institution', 'academicYear', 'homeroomTeacher'])
            ->select([
                'id', 'name', 'class_level', 'institution_id', 'academic_year_id',
                'homeroom_teacher_id', 'class_profile', 'education_program',
                'teaching_shift', 'is_active',
            ])
            // Real counts from Şagirdlər (Students) page
            ->withCount([
                'assignedStudents as real_student_count',
                'assignedStudents as real_male_count' => fn ($q) => $q->where('gender', 'male'),
                'assignedStudents as real_female_count' => fn ($q) => $q->where('gender', 'female'),
            ])
            // Lesson load hours from curriculum
            ->withSum(
                ['gradeSubjects as lesson_load_hours' => fn ($q) => $q->where('is_teaching_activity', true)],
                'weekly_hours'
            )
            ->withSum(
                ['gradeSubjects as extracurricular_hours' => fn ($q) => $q->where('is_extracurricular', true)],
                'weekly_hours'
            )
            ->withSum(
                ['gradeSubjects as club_hours' => fn ($q) => $q->where('is_club', true)],
                'weekly_hours'
            );

        if (! $user->hasRole(['superadmin', 'regionadmin'])) {
            $query->where('institution_id', $user->institution_id ?? 0);
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $grades = $query->orderBy('institution_id')->orderBy('class_level')->orderBy('name')->get();

        $data = $grades->map(fn ($g) => [
            'Sinif' => $g->name,
            'Sinif Səviyyəsi' => $g->class_level,
            'Şagirdlər' => $g->real_student_count ?? 0,
            'Oğlan' => $g->real_male_count ?? 0,
            'Qız' => $g->real_female_count ?? 0,
            'Növbə' => $g->teaching_shift ?? '',
            'Təhsil Proqramı' => $g->education_program ?? '',
            'Profil' => $g->class_profile ?? '',
            'Dərs yükü (saat)' => (int) ($g->lesson_load_hours ?? 0),
            'Dərsdənkənar (saat)' => (int) ($g->extracurricular_hours ?? 0),
            'Dərnək (saat)' => (int) ($g->club_hours ?? 0),
            'Sinif Rəhbəri' => $g->homeroomTeacher?->name ?? '',
            'Təhsil İli' => $g->academicYear?->name ?? '',
            'Məktəb' => $g->institution?->name ?? '',
        ]);

        $fileName = 'siniflər_' . date('Y-m-d_H-i-s') . '.xlsx';

        return Excel::download(new GradesExport($data), $fileName);
    }

    /**
     * Get statistics for import/export modal
     */
    public function getImportExportStats(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = Grade::query();

        if (! $user->hasRole(['superadmin', 'regionadmin'])) {
            $query->where('institution_id', $user->institution_id ?? 0);
        }

        $total = (clone $query)->count();
        $active = (clone $query)->where('is_active', true)->count();
        $inactive = (clone $query)->where('is_active', false)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_grades' => $total,
                'active_grades' => $active,
                'inactive_grades' => $inactive,
                'by_institution' => [],
            ],
        ]);
    }
}
