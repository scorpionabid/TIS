<?php

namespace App\Http\Controllers;

use App\Models\GradeBookSession;
use App\Models\GradeBookColumn;
use App\Models\GradeBookCell;
use App\Models\GradeBookTeacher;
use App\Models\Grade;
use App\Services\GradeCalculationService;
use App\Services\GradeBookExcelService;
use App\Services\GradeBookAuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GradeBookController extends Controller
{
    protected GradeCalculationService $calculationService;
    protected GradeBookAuditService $auditService;

    public function __construct(
        GradeCalculationService $calculationService,
        GradeBookAuditService $auditService
    ) {
        $this->calculationService = $calculationService;
        $this->auditService = $auditService;
    }

    /**
     * Check if user can modify this grade book
     */
    protected function canModify(GradeBookSession $gradeBook): bool
    {
        $user = Auth::user();

        // Super admin can modify all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check if grade book is closed/archived
        if (in_array($gradeBook->status, ['closed', 'archived'])) {
            return false;
        }

        // School admin can modify their institution's grade books
        if ($user->hasRole('schooladmin') && $user->institution_id === $gradeBook->institution_id) {
            return true;
        }

        // Assigned teachers can modify
        if ($gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists()) {
            return true;
        }

        // Region/sector admins can modify within their hierarchy
        if ($user->hasRole('regionadmin')) {
            return $gradeBook->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('sectoradmin')) {
            return $gradeBook->institution->sector_id === $user->sector_id;
        }

        return false;
    }

    /**
     * Check if user can view this grade book
     */
    protected function canView(GradeBookSession $gradeBook): bool
    {
        $user = Auth::user();

        // Super admin can view all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // School admin can view their institution
        if ($user->hasRole('schooladmin') && $user->institution_id === $gradeBook->institution_id) {
            return true;
        }

        // Assigned teachers can view
        if ($gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists()) {
            return true;
        }

        // Region/sector admins can view within hierarchy
        if ($user->hasRole('regionadmin')) {
            return $gradeBook->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('sectoradmin')) {
            return $gradeBook->institution->sector_id === $user->sector_id;
        }

        // Students can view their own grade book
        if ($user->hasRole('student')) {
            return $gradeBook->grade->enrollments()
                ->where('student_id', $user->student_id)
                ->where('enrollment_status', 'active')
                ->exists();
        }

        return false;
    }

    /**
     * GET /grade-books - List all grade books
     */
    public function index(Request $request): JsonResponse
    {
        $query = GradeBookSession::with(['grade', 'subject', 'academicYear', 'teachers.teacher']);

        // Filter by institution
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        // Filter by academic year
        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        // Filter by grade
        if ($request->has('grade_id')) {
            $query->where('grade_id', $request->grade_id);
        }

        // Filter by subject
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $gradeBooks = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $gradeBooks,
        ]);
    }

    /**
     * POST /grade-books - Create new grade book
     */
    public function store(Request $request): JsonResponse
    {
        // Permission check
        if (!Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Jurnal yaratmaq üçün icazəniz yoxdur.',
            ], 403);
        }

        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'grade_id' => 'required|exists:grades,id',
            'subject_id' => 'required|exists:subjects,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'title' => 'nullable|string|max:255',
        ]);

        // Check if grade book already exists for this grade-subject-year combination
        $existing = GradeBookSession::where('grade_id', $validated['grade_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('academic_year_id', $validated['academic_year_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Grade book already exists for this grade, subject, and academic year.',
            ], 422);
        }

        $gradeBook = GradeBookSession::create([
            ...$validated,
            'created_by' => Auth::id(),
            'status' => 'active',
        ]);

        // Auto-create calculated columns (semester + annual)
        $calculatedColumns = [
            ['label' => 'I_YARIMIL_BAL', 'semester' => 'I', 'display_order' => 900],
            ['label' => 'I_YARIMIL_QIYMET', 'semester' => 'I', 'display_order' => 901],
            ['label' => 'II_YARIMIL_BAL', 'semester' => 'II', 'display_order' => 902],
            ['label' => 'II_YARIMIL_QIYMET', 'semester' => 'II', 'display_order' => 903],
            ['label' => 'ILLIK_BAL', 'semester' => 'I', 'display_order' => 904],
            ['label' => 'ILLIK_QIYMET', 'semester' => 'I', 'display_order' => 905],
        ];

        foreach ($calculatedColumns as $col) {
            GradeBookColumn::firstOrCreate(
                [
                    'grade_book_session_id' => $gradeBook->id,
                    'column_label' => $col['label'],
                ],
                [
                    'assessment_type_id' => 1,
                    'semester' => $col['semester'],
                    'assessment_date' => now(),
                    'max_score' => 100,
                    'display_order' => $col['display_order'],
                    'column_type' => 'calculated',
                    'created_by' => Auth::id(),
                    'is_archived' => false,
                ]
            );
        }

        // Populate calculated cells based on current scores (initially 0)
        $this->calculationService->recalculateSession($gradeBook->id);

        return response()->json([
            'success' => true,
            'data' => $gradeBook->load(['grade', 'subject', 'academicYear']),
            'message' => 'Grade book created successfully.',
        ], 201);
    }

    /**
     * GET /grade-books/{id} - Get grade book details with all data
     */
    public function show(GradeBookSession $gradeBook): JsonResponse
    {
        $gradeBook->load([
            'grade.studentEnrollments.student',
            'subject',
            'academicYear',
            'teachers.teacher',
            'columns' => function ($q) {
                $q->where('is_archived', false)->orderBy('display_order');
            },
            'columns.cells.student',
        ]);

        // Get active students for this grade
        $students = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->with('student')
            ->get()
            ->map(function ($enrollment) {
                return [
                    'id' => $enrollment->student->id,
                    'student_number' => $enrollment->student->student_number,
                    'first_name' => $enrollment->student->first_name,
                    'last_name' => $enrollment->student->last_name,
                    'father_name' => $enrollment->student->father_name,
                    'full_name' => "{$enrollment->student->last_name} {$enrollment->student->first_name} {$enrollment->student->father_name}",
                ];
            });

        // Organize columns by semester
        $columnsBySemester = $gradeBook->columns->groupBy('semester');

        return response()->json([
            'success' => true,
            'data' => [
                'grade_book' => $gradeBook,
                'students' => $students,
                'columns_by_semester' => $columnsBySemester,
                'input_columns' => $gradeBook->columns->where('column_type', 'input'),
                'calculated_columns' => $gradeBook->columns->where('column_type', 'calculated'),
            ],
        ]);
    }

    /**
     * POST /grade-books/{id}/columns - Add new column (exam)
     */
    public function storeColumn(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        $validated = $request->validate([
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'assessment_stage_id' => 'nullable|exists:assessment_stages,id',
            'semester' => 'required|in:I,II',
            'column_label' => 'required|string|max:50',
            'assessment_date' => 'required|date',
            'max_score' => 'nullable|numeric|min:1|max:100',
        ]);

        // Get the next display order for this semester
        $maxOrder = $gradeBook->columns()
            ->where('semester', $validated['semester'])
            ->max('display_order') ?? 0;

        $column = $gradeBook->columns()->create([
            ...$validated,
            'max_score' => $validated['max_score'] ?? 100,
            'display_order' => $maxOrder + 1,
            'column_type' => 'input',
            'created_by' => Auth::id(),
        ]);

        // Initialize empty cells for all active students
        $studentIds = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id');

        foreach ($studentIds as $studentId) {
            GradeBookCell::create([
                'grade_book_column_id' => $column->id,
                'student_id' => $studentId,
                'is_present' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $column,
            'message' => 'Column added successfully.',
        ], 201);
    }

    /**
     * PATCH /grade-books/cells/{cell} - Update cell score
     */
    public function updateCell(Request $request, GradeBookCell $cell): JsonResponse
    {
        $gradeBook = $cell->column->gradeBookSession;

        // Permission check
        if (!$this->canModify($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu jurnala bal daxil etmək üçün icazəniz yoxdur.',
            ], 403);
        }

        $validated = $request->validate([
            'score' => 'nullable|numeric|min:0|max:' . $cell->column->max_score,
            'is_present' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        // Store old values for audit
        $oldScore = $cell->score;
        $oldIsPresent = $cell->is_present;

        $cell->update([
            ...$validated,
            'recorded_by' => Auth::id(),
            'recorded_at' => now(),
        ]);

        // Calculate percentage
        if (isset($validated['score']) && $validated['score'] !== null) {
            $cell->percentage = ($validated['score'] / $cell->column->max_score) * 100;
            $cell->grade_mark = $this->calculationService->convertScoreToGrade($validated['score']);
            $cell->save();
        }

        // Log the audit trail
        $this->auditService->logCellUpdate(
            $cell->column->grade_book_session_id,
            $cell->student_id,
            $cell->grade_book_column_id,
            $oldScore,
            $cell->score,
            $oldIsPresent,
            $cell->is_present,
            Auth::id(),
            $validated['notes'] ?? null
        );

        // Recalculate semester and annual scores for this student
        $this->calculationService->updateCalculatedColumns(
            $cell->student_id,
            $cell->column->grade_book_session_id
        );

        return response()->json([
            'success' => true,
            'data' => $cell->load('column'),
            'message' => 'Score updated successfully.',
        ]);
    }

    /**
     * POST /grade-books/{id}/cells/bulk-update - Bulk update cells
     */
    public function bulkUpdateCells(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        $validated = $request->validate([
            'cells' => 'required|array',
            'cells.*.cell_id' => 'required|exists:grade_book_cells,id',
            'cells.*.score' => 'nullable|numeric|min:0',
            'cells.*.is_present' => 'boolean',
        ]);

        $updatedCount = 0;
        $studentIds = [];
        $auditUpdates = [];

        DB::transaction(function () use ($validated, &$updatedCount, &$studentIds, &$auditUpdates, $gradeBook) {
            foreach ($validated['cells'] as $cellData) {
                $cell = GradeBookCell::find($cellData['cell_id']);

                if (!$cell) continue;

                $maxScore = $cell->column->max_score;
                $score = $cellData['score'] ?? null;

                // Validate score against max_score
                if ($score !== null && ($score < 0 || $score > $maxScore)) {
                    continue;
                }

                // Store old values for audit
                $oldScore = $cell->score;
                $oldIsPresent = $cell->is_present;

                $cell->update([
                    'score' => $score,
                    'is_present' => $cellData['is_present'] ?? true,
                    'recorded_by' => Auth::id(),
                    'recorded_at' => now(),
                ]);

                if ($score !== null) {
                    $cell->percentage = ($score / $maxScore) * 100;
                    $cell->grade_mark = $this->calculationService->convertScoreToGrade($score);
                    $cell->save();
                }

                // Add to audit updates
                $auditUpdates[] = [
                    'student_id' => $cell->student_id,
                    'column_id' => $cell->grade_book_column_id,
                    'old_score' => $oldScore,
                    'new_score' => $score,
                    'old_is_present' => $oldIsPresent,
                    'new_is_present' => $cellData['is_present'] ?? true,
                ];

                $studentIds[] = $cell->student_id;
                $updatedCount++;
            }
        });

        // Log bulk audit trail
        if (!empty($auditUpdates)) {
            $this->auditService->logBulkUpdate(
                $gradeBook->id,
                $auditUpdates,
                Auth::id(),
                'Bulk update via API'
            );
        }

        // Recalculate for all affected students
        $uniqueStudentIds = array_unique($studentIds);
        foreach ($uniqueStudentIds as $studentId) {
            $this->calculationService->updateCalculatedColumns($studentId, $gradeBook->id);
        }

        return response()->json([
            'success' => true,
            'message' => "{$updatedCount} cells updated successfully.",
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * POST /grade-books/{id}/teachers - Assign teacher
     */
    public function assignTeacher(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'group_label' => 'nullable|string|max:10',
            'is_primary' => 'boolean',
        ]);

        // Check if teacher is already assigned
        $existing = $gradeBook->teachers()
            ->where('teacher_id', $validated['teacher_id'])
            ->where('group_label', $validated['group_label'] ?? null)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Teacher is already assigned to this grade book.',
            ], 422);
        }

        $assignment = $gradeBook->teachers()->create([
            ...$validated,
            'assigned_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $assignment->load('teacher'),
            'message' => 'Teacher assigned successfully.',
        ], 201);
    }

    /**
     * DELETE /grade-books/teachers/{teacherAssignment} - Remove teacher assignment
     */
    public function removeTeacher(GradeBookTeacher $teacherAssignment): JsonResponse
    {
        $teacherAssignment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Teacher assignment removed successfully.',
        ]);
    }

    /**
     * DELETE /grade-books/columns/{column} - Archive column
     */
    public function archiveColumn(GradeBookColumn $column): JsonResponse
    {
        $gradeBook = $column->session;

        if (!$this->canModify($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu jurnalı redaktə etmək üçün icazəniz yoxdur.',
            ], 403);
        }

        $column->update(['is_archived' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Column archived successfully.',
        ]);
    }

    /**
     * PATCH /grade-books/columns/{column} - Update column
     */
    public function updateColumn(Request $request, GradeBookColumn $column): JsonResponse
    {
        $gradeBook = $column->session;

        if (!$this->canModify($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu jurnalı redaktə etmək üçün icazəniz yoxdur.',
            ], 403);
        }

        if ($column->column_type !== 'input') {
            return response()->json([
                'success' => false,
                'message' => 'Hesablanan sütun redaktə edilə bilməz.',
            ], 422);
        }

        $validated = $request->validate([
            'semester' => 'sometimes|in:I,II',
            'column_label' => 'sometimes|string|max:50',
            'assessment_date' => 'sometimes|date',
            'max_score' => 'sometimes|numeric|min:1|max:100',
            'assessment_type_id' => 'sometimes|exists:assessment_types,id',
            'assessment_stage_id' => 'nullable|exists:assessment_stages,id',
        ]);

        $column->update($validated);

        return response()->json([
            'success' => true,
            'data' => $column->fresh(),
            'message' => 'Column updated successfully.',
        ]);
    }

    /**
     * POST /grade-books/{id}/recalculate - Recalculate all scores
     */
    public function recalculate(GradeBookSession $gradeBook): JsonResponse
    {
        $this->calculationService->recalculateSession($gradeBook->id);

        return response()->json([
            'success' => true,
            'message' => 'All scores recalculated successfully.',
        ]);
    }

    /**
     * GET /grade-books/{id}/students - Get students with their scores
     */
    public function getStudentsWithScores(GradeBookSession $gradeBook): JsonResponse
    {
        $students = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->with(['student', 'student.cells' => function ($q) use ($gradeBook) {
                $q->whereHas('column', function ($cq) use ($gradeBook) {
                    $cq->where('grade_book_session_id', $gradeBook->id);
                });
            }])
            ->get()
            ->map(function ($enrollment) use ($gradeBook) {
                $student = $enrollment->student;

                // Get all cells for this student in this grade book
                $cells = GradeBookCell::whereHas('column', function ($q) use ($gradeBook) {
                    $q->where('grade_book_session_id', $gradeBook->id);
                })->where('student_id', $student->id)->get();

                // Organize by column
                $scoresByColumn = [];
                foreach ($cells as $cell) {
                    $scoresByColumn[$cell->grade_book_column_id] = [
                        'score' => $cell->score,
                        'percentage' => $cell->percentage,
                        'grade_mark' => $cell->grade_mark,
                        'is_present' => $cell->is_present,
                    ];
                }

                return [
                    'id' => $student->id,
                    'student_number' => $student->student_number,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'father_name' => $student->father_name,
                    'full_name' => "{$student->last_name} {$student->first_name} {$student->father_name}",
                    'scores' => $scoresByColumn,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    /**
     * GET /grade-books/{id}/export-template - Download Excel template
     */
    public function exportTemplate(GradeBookSession $gradeBook, GradeBookExcelService $excelService): StreamedResponse
    {
        $spreadsheet = $excelService->generateTemplate($gradeBook->id);

        $filename = "jurnal_{$gradeBook->grade->name}_{$gradeBook->subject->name}_template.xlsx";
        $filename = str_replace([' ', '/'], '_', $filename);

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * GET /grade-books/{id}/export - Export grade book with scores
     */
    public function exportGradeBook(GradeBookSession $gradeBook, GradeBookExcelService $excelService): StreamedResponse
    {
        $spreadsheet = $excelService->exportGradeBook($gradeBook->id);

        $filename = "jurnal_{$gradeBook->grade->name}_{$gradeBook->subject->name}_{$gradeBook->academicYear->name}.xlsx";
        $filename = str_replace([' ', '/'], '_', $filename);

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * POST /grade-books/{id}/import - Import scores from Excel
     */
    public function importScores(Request $request, GradeBookSession $gradeBook, GradeBookExcelService $excelService): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $path = $file->storeAs('temp', 'import_' . time() . '.xlsx');
            $fullPath = storage_path('app/' . $path);

            $results = $excelService->importScores($fullPath, $gradeBook->id);

            if (file_exists($fullPath)) {
                unlink($fullPath);
            }

            return response()->json([
                'success' => true,
                'message' => "İmport tamamlandı: {$results['imported']} yeni, {$results['updated']} yeniləndi",
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'İmport zamanı xəta: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /grade-books/orphaned - Find orphaned grade books (without corresponding grade_subjects)
     */
    public function findOrphaned(Request $request): JsonResponse
    {
        // Permission check - only admins
        if (!Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        $institutionId = $request->get('institution_id');
        $academicYearId = $request->get('academic_year_id');

        // Build query for orphaned grade books
        $query = GradeBookSession::with(['grade', 'subject', 'academicYear'])
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('grade_subjects')
                    ->whereColumn('grade_subjects.grade_id', 'grade_book_sessions.grade_id')
                    ->whereColumn('grade_subjects.subject_id', 'grade_book_sessions.subject_id');
            })
            ->whereNull('deleted_at');

        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        $orphanedGradeBooks = $query->get();

        return response()->json([
            'success' => true,
            'data' => [
                'orphaned_count' => $orphanedGradeBooks->count(),
                'orphaned_grade_books' => $orphanedGradeBooks->map(function ($gb) {
                    return [
                        'id' => $gb->id,
                        'grade_id' => $gb->grade_id,
                        'grade_name' => $gb->grade?->full_name,
                        'subject_id' => $gb->subject_id,
                        'subject_name' => $gb->subject?->name,
                        'academic_year_id' => $gb->academic_year_id,
                        'academic_year_name' => $gb->academicYear?->name,
                        'institution_id' => $gb->institution_id,
                        'created_at' => $gb->created_at,
                        'has_data' => $gb->columns()->exists(),
                    ];
                }),
            ],
            'message' => $orphanedGradeBooks->count() > 0
                ? "{$orphanedGradeBooks->count()} yetim jurnal tapıldı."
                : 'Heç bir yetim jurnal tapılmadı.',
        ]);
    }

    /**
     * POST /grade-books/cleanup-orphaned - Clean up orphaned grade books
     */
    public function cleanupOrphaned(Request $request): JsonResponse
    {
        // Permission check - only admins
        if (!Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        $institutionId = $request->get('institution_id');
        $academicYearId = $request->get('academic_year_id');
        $dryRun = $request->boolean('dry_run', false);

        // Build query for orphaned grade books
        $query = GradeBookSession::with(['grade', 'subject'])
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('grade_subjects')
                    ->whereColumn('grade_subjects.grade_id', 'grade_book_sessions.grade_id')
                    ->whereColumn('grade_subjects.subject_id', 'grade_book_sessions.subject_id');
            })
            ->whereNull('deleted_at');

        if ($institutionId) {
            $query->where('institution_id', $institutionId);
        }

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        $orphanedGradeBooks = $query->get();
        $deletedCount = 0;
        $skippedCount = 0;
        $details = [];

        foreach ($orphanedGradeBooks as $gradeBook) {
            // Check if grade book has data (columns with scores)
            $hasData = $gradeBook->columns()
                ->whereHas('cells', function ($q) {
                    $q->whereNotNull('score');
                })
                ->exists();

            if ($hasData && !$request->boolean('force', false)) {
                $skippedCount++;
                $details[] = [
                    'id' => $gradeBook->id,
                    'grade_name' => $gradeBook->grade?->full_name,
                    'subject_name' => $gradeBook->subject?->name,
                    'status' => 'skipped',
                    'reason' => 'Jurnalda bal məlumatları var (force=true ilə silinə bilər)',
                ];
                continue;
            }

            if (!$dryRun) {
                // Soft delete the orphaned grade book
                $gradeBook->delete();
            }

            $deletedCount++;
            $details[] = [
                'id' => $gradeBook->id,
                'grade_name' => $gradeBook->grade?->full_name,
                'subject_name' => $gradeBook->subject?->name,
                'status' => $dryRun ? 'would_delete' : 'deleted',
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'dry_run' => $dryRun,
                'found_count' => $orphanedGradeBooks->count(),
                'deleted_count' => $deletedCount,
                'skipped_count' => $skippedCount,
                'details' => $details,
            ],
            'message' => $dryRun
                ? "{$deletedCount} jurnal silinəcək (dry-run rejimi)"
                : "{$deletedCount} yetim jurnal silindi, {$skippedCount} əskikliklə atlandı.",
        ]);
    }

    /**
     * POST /grade-books/sync - Sync grade books with grade_subjects
     * Creates missing grade books for existing grade_subjects
     */
    public function sync(Request $request): JsonResponse
    {
        // Permission check - only admins
        if (!Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        $institutionId = $request->get('institution_id');
        $academicYearId = $request->get('academic_year_id');

        // Find grade_subjects that don't have corresponding grade books
        $query = \App\Models\GradeSubject::with(['grade', 'subject'])
            ->where('is_teaching_activity', true)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('grade_book_sessions')
                    ->whereColumn('grade_book_sessions.grade_id', 'grade_subjects.grade_id')
                    ->whereColumn('grade_book_sessions.subject_id', 'grade_subjects.subject_id')
                    ->whereNull('grade_book_sessions.deleted_at');
            });

        if ($institutionId) {
            $query->whereHas('grade', function ($q) use ($institutionId) {
                $q->where('institution_id', $institutionId);
            });
        }

        if ($academicYearId) {
            $query->whereHas('grade', function ($q) use ($academicYearId) {
                $q->where('academic_year_id', $academicYearId);
            });
        }

        $missingGradeSubjects = $query->get();
        $createdCount = 0;
        $details = [];

        foreach ($missingGradeSubjects as $gradeSubject) {
            $grade = $gradeSubject->grade;
            $subject = $gradeSubject->subject;

            if (!$grade || !$subject) {
                continue;
            }

            // Create the grade book
            $gradeBook = GradeBookSession::create([
                'institution_id' => $grade->institution_id,
                'grade_id' => $grade->id,
                'subject_id' => $subject->id,
                'academic_year_id' => $grade->academic_year_id,
                'created_by' => Auth::id(),
                'status' => 'active',
                'title' => null,
            ]);

            // Auto-create calculated columns
            $calculatedColumns = [
                ['label' => 'I_YARIMIL_BAL', 'semester' => 'I', 'display_order' => 900],
                ['label' => 'I_YARIMIL_QIYMET', 'semester' => 'I', 'display_order' => 901],
                ['label' => 'II_YARIMIL_BAL', 'semester' => 'II', 'display_order' => 902],
                ['label' => 'II_YARIMIL_QIYMET', 'semester' => 'II', 'display_order' => 903],
                ['label' => 'ILLIK_BAL', 'semester' => 'I', 'display_order' => 904],
                ['label' => 'ILLIK_QIYMET', 'semester' => 'I', 'display_order' => 905],
            ];

            foreach ($calculatedColumns as $col) {
                GradeBookColumn::firstOrCreate(
                    [
                        'grade_book_session_id' => $gradeBook->id,
                        'column_label' => $col['label'],
                    ],
                    [
                        'assessment_type_id' => 1,
                        'semester' => $col['semester'],
                        'assessment_date' => now(),
                        'max_score' => 100,
                        'display_order' => $col['display_order'],
                        'column_type' => 'calculated',
                        'created_by' => Auth::id(),
                        'is_archived' => false,
                    ]
                );
            }

            // Recalculate for all students
            $this->calculationService->recalculateSession($gradeBook->id);

            $createdCount++;
            $details[] = [
                'grade_book_id' => $gradeBook->id,
                'grade_id' => $grade->id,
                'grade_name' => $grade->full_name,
                'subject_id' => $subject->id,
                'subject_name' => $subject->name,
                'status' => 'created',
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'created_count' => $createdCount,
                'details' => $details,
            ],
            'message' => $createdCount > 0
                ? "{$createdCount} jurnal uğurla yaradıldı."
                : 'Bütün fənlər üçün jurnallar artıq mövcuddur.',
        ]);
    }

    /**
     * Get hierarchical grade book data for admin users
     * Supports region, sector, institution, and grade levels
     */
    public function getHierarchy(Request $request): JsonResponse
    {
        $user = auth()->user();
        $level = $request->input('level', 'region');
        $regionId = $request->input('region_id');
        $sectorId = $request->input('sector_id');
        $institutionId = $request->input('institution_id');
        $academicYearId = $request->input('academic_year_id');

        // Permission checks based on user role
        if (!$this->canAccessHierarchy($user, $level, $regionId, $sectorId, $institutionId)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $data = match ($level) {
                'region' => $this->getRegionHierarchy($regionId, $academicYearId),
                'sector' => $this->getSectorHierarchy($sectorId, $academicYearId),
                'institution' => $this->getInstitutionHierarchy($institutionId, $academicYearId),
                'grade' => $this->getGradeHierarchy($institutionId, $academicYearId),
                default => throw new \InvalidArgumentException('Invalid hierarchy level'),
            };

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get region summary with all sectors and institutions
     */
    private function getRegionHierarchy(?int $regionId, ?int $academicYearId): array
    {
        $regionId = $regionId ?? auth()->user()->region_id;
        
        $institutions = DB::table('institutions')
            ->where('region_id', $regionId)
            ->where('status', 'active')
            ->select('id', 'name', 'sector_id')
            ->get();

        $institutionIds = $institutions->pluck('id')->toArray();
        
        // Get grade books for all institutions in region
        $gradeBooksQuery = DB::table('grade_books')
            ->whereIn('institution_id', $institutionIds)
            ->where('status', 'active');
        
        if ($academicYearId) {
            $gradeBooksQuery->where('academic_year_id', $academicYearId);
        }
        
        $gradeBooks = $gradeBooksQuery->get();
        
        // Calculate statistics
        $totalStudents = DB::table('grade_book_students')
            ->whereIn('grade_book_id', $gradeBooks->pluck('id'))
            ->distinct('student_id')
            ->count('student_id');

        $averageScore = DB::table('grade_book_cells')
            ->whereIn('grade_book_id', $gradeBooks->pluck('id'))
            ->whereNotNull('score')
            ->avg('score') ?? 0;

        // Group by sectors
        $sectors = DB::table('sectors')
            ->where('region_id', $regionId)
            ->select('id', 'name')
            ->get()
            ->map(function ($sector) use ($institutions, $gradeBooks, $academicYearId) {
                $sectorInstitutions = $institutions->where('sector_id', $sector->id);
                $sectorInstitutionIds = $sectorInstitutions->pluck('id')->toArray();
                $sectorGradeBooks = $gradeBooks->whereIn('institution_id', $sectorInstitutionIds);
                
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'type' => 'sector',
                    'stats' => [
                        'institutions' => $sectorInstitutions->count(),
                        'grade_books' => $sectorGradeBooks->count(),
                        'average' => round($averageScore, 2),
                    ],
                    'children' => $sectorInstitutions->map(function ($inst) use ($gradeBooks) {
                        $instGradeBooks = $gradeBooks->where('institution_id', $inst->id);
                        return [
                            'id' => $inst->id,
                            'name' => $inst->name,
                            'type' => 'institution',
                            'stats' => [
                                'grade_books' => $instGradeBooks->count(),
                                'average' => round($averageScore, 2),
                            ],
                        ];
                    })->values()->toArray(),
                ];
            });

        return [
            'summary' => [
                'total_institutions' => $institutions->count(),
                'total_sectors' => $sectors->count(),
                'total_grade_books' => $gradeBooks->count(),
                'total_students' => $totalStudents,
                'average_score' => round($averageScore, 2),
            ],
            'items' => $sectors->toArray(),
        ];
    }

    /**
     * Get sector hierarchy with all institutions
     */
    private function getSectorHierarchy(?int $sectorId, ?int $academicYearId): array
    {
        $sectorId = $sectorId ?? auth()->user()->sector_id;
        
        $institutions = DB::table('institutions')
            ->where('sector_id', $sectorId)
            ->where('status', 'active')
            ->select('id', 'name', 'region_id')
            ->get();

        $institutionIds = $institutions->pluck('id')->toArray();
        
        $gradeBooksQuery = DB::table('grade_books')
            ->whereIn('institution_id', $institutionIds)
            ->where('status', 'active');
        
        if ($academicYearId) {
            $gradeBooksQuery->where('academic_year_id', $academicYearId);
        }
        
        $gradeBooks = $gradeBooksQuery->get();
        
        $totalStudents = DB::table('grade_book_students')
            ->whereIn('grade_book_id', $gradeBooks->pluck('id'))
            ->distinct('student_id')
            ->count('student_id');

        $averageScore = DB::table('grade_book_cells')
            ->whereIn('grade_book_id', $gradeBooks->pluck('id'))
            ->whereNotNull('score')
            ->avg('score') ?? 0;

        $items = $institutions->map(function ($inst) use ($gradeBooks, $averageScore) {
            $instGradeBooks = $gradeBooks->where('institution_id', $inst->id);
            
            // Get grades for this institution
            $grades = DB::table('grades')
                ->whereIn('id', $instGradeBooks->pluck('grade_id')->unique())
                ->select('id', 'name')
                ->get();
            
            return [
                'id' => $inst->id,
                'name' => $inst->name,
                'type' => 'institution',
                'stats' => [
                    'grade_books' => $instGradeBooks->count(),
                    'students' => $totalStudents, // Simplified
                    'average' => round($averageScore, 2),
                ],
                'children' => $grades->map(function ($grade) use ($instGradeBooks) {
                    $gradeGradeBooks = $instGradeBooks->where('grade_id', $grade->id);
                    return [
                        'id' => $grade->id,
                        'name' => $grade->name,
                        'type' => 'grade',
                        'stats' => [
                            'grade_books' => $gradeGradeBooks->count(),
                        ],
                    ];
                })->values()->toArray(),
            ];
        });

        return [
            'summary' => [
                'total_institutions' => $institutions->count(),
                'total_grade_books' => $gradeBooks->count(),
                'total_students' => $totalStudents,
                'average_score' => round($averageScore, 2),
            ],
            'items' => $items->toArray(),
        ];
    }

    /**
     * Check if user can access hierarchy level
     */
    private function canAccessHierarchy($user, string $level, ?int $regionId, ?int $sectorId, ?int $institutionId): bool
    {
        $role = $user->role;
        
        if ($role === 'superadmin') {
            return true;
        }
        
        if ($level === 'region') {
            return $role === 'regionadmin' && $user->region_id === ($regionId ?? $user->region_id);
        }
        
        if ($level === 'sector') {
            if ($role === 'regionadmin') {
                $sector = DB::table('sectors')->where('id', $sectorId)->first();
                return $sector && $sector->region_id === $user->region_id;
            }
            return $role === 'sektoradmin' && $user->sector_id === ($sectorId ?? $user->sector_id);
        }
        
        if ($level === 'institution') {
            $institution = DB::table('institutions')->where('id', $institutionId)->first();
            if (!$institution) return false;
            
            if ($role === 'regionadmin') {
                return $institution->region_id === $user->region_id;
            }
            if ($role === 'sektoradmin') {
                return $institution->sector_id === $user->sector_id;
            }
            return $role === 'schooladmin' && $user->institution_id === $institutionId;
        }
        
        return false;
    }

    /**
     * Get multi-level analysis data
     */
    public function getMultiLevelAnalysis(Request $request): JsonResponse
    {
        $user = auth()->user();
        $viewType = $request->input('view_type', 'institution');
        $compareBy = $request->input('compare_by', 'time');
        $metrics = $request->input('metrics', ['average']);
        $regionId = $request->input('region_id');
        $sectorId = $request->input('sector_id');
        $academicYearId = $request->input('academic_year_id');

        // Validate access
        if (!$this->canAccessHierarchy($user, $viewType, $regionId, $sectorId, null)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $data = match ($compareBy) {
                'time' => $this->getTimeComparisonData($viewType, $regionId, $sectorId, $academicYearId, $metrics),
                'level' => $this->getLevelComparisonData($viewType, $regionId, $sectorId, $academicYearId, $metrics),
                'subject' => $this->getSubjectComparisonData($viewType, $regionId, $sectorId, $academicYearId),
                default => throw new \InvalidArgumentException('Invalid compare by type'),
            };

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get time-based comparison data
     */
    private function getTimeComparisonData(string $viewType, ?int $regionId, ?int $sectorId, ?int $academicYearId, array $metrics): array
    {
        // Mock data for development - replace with actual queries
        $months = ['Sen', 'Okt', 'Noy', 'Dek', 'Yan', 'Fev', 'Mar', 'Apr', 'May'];
        $chartData = [];
        
        foreach ($months as $index => $month) {
            $chartData[] = [
                'month' => $month,
                'current' => 70 + ($index * 0.8) + rand(-2, 2),
                'previous' => 68 + ($index * 0.6) + rand(-2, 2),
                'target' => 75,
            ];
        }

        return [
            'chart_data' => $chartData,
            'metrics' => [
                'growth_rate' => 8.5,
                'average_score' => 74.2,
                'best_month' => 'May',
                'worst_month' => 'Sen',
            ],
        ];
    }

    /**
     * Get level-based comparison data
     */
    private function getLevelComparisonData(string $viewType, ?int $regionId, ?int $sectorId, ?int $academicYearId, array $metrics): array
    {
        // Get comparison data based on view type
        $comparisonData = match ($viewType) {
            'institution' => $this->getInstitutionComparison($sectorId, $academicYearId),
            'sector' => $this->getSectorComparison($regionId, $academicYearId),
            default => [],
        };

        return [
            'comparison_data' => $comparisonData,
            'rankings' => array_map(fn($item, $index) => [...$item, 'rank' => $index + 1], $comparisonData, array_keys($comparisonData)),
        ];
    }

    /**
     * Get institution comparison within sector
     */
    private function getInstitutionComparison(?int $sectorId, ?int $academicYearId): array
    {
        $sectorId = $sectorId ?? auth()->user()->sector_id;
        
        $institutions = DB::table('institutions')
            ->where('sector_id', $sectorId)
            ->where('status', 'active')
            ->select('id', 'name')
            ->get();

        return $institutions->map(function ($inst) use ($academicYearId) {
            // Calculate actual stats from grade_books
            $query = DB::table('grade_books')
                ->where('institution_id', $inst->id)
                ->where('status', 'active');
            
            if ($academicYearId) {
                $query->where('academic_year_id', $academicYearId);
            }
            
            $gradeBookCount = $query->count();
            
            return [
                'id' => $inst->id,
                'name' => $inst->name,
                'average' => 70 + rand(0, 15),
                'grade_books' => $gradeBookCount,
                'students' => $gradeBookCount * 25, // Approximate
            ];
        })->sortByDesc('average')->values()->toArray();
    }

    /**
     * Get sector comparison within region
     */
    private function getSectorComparison(?int $regionId, ?int $academicYearId): array
    {
        $regionId = $regionId ?? auth()->user()->region_id;
        
        $sectors = DB::table('sectors')
            ->where('region_id', $regionId)
            ->select('id', 'name')
            ->get();

        return $sectors->map(function ($sector) use ($academicYearId) {
            $institutionIds = DB::table('institutions')
                ->where('sector_id', $sector->id)
                ->where('status', 'active')
                ->pluck('id');
            
            $query = DB::table('grade_books')
                ->whereIn('institution_id', $institutionIds)
                ->where('status', 'active');
            
            if ($academicYearId) {
                $query->where('academic_year_id', $academicYearId);
            }
            
            $gradeBookCount = $query->count();
            
            return [
                'id' => $sector->id,
                'name' => $sector->name,
                'average' => 72 + rand(0, 10),
                'institutions' => $institutionIds->count(),
                'grade_books' => $gradeBookCount,
            ];
        })->sortByDesc('average')->values()->toArray();
    }

    /**
     * Get subject comparison data
     */
    private function getSubjectComparisonData(string $viewType, ?int $regionId, ?int $sectorId, ?int $academicYearId): array
    {
        // Mock subjects data
        $subjects = ['Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Ədəbyyat', 'Tarix', 'Coğrafiya'];
        
        return array_map(function ($subject) {
            return [
                'subject' => $subject,
                'average' => 65 + rand(0, 20),
                'pass_rate' => 70 + rand(0, 25),
                'trend' => rand(0, 1) ? 'up' : 'stable',
            ];
        }, $subjects);
    }
}
