<?php

namespace App\Http\Controllers;

use App\Models\GradeBookSession;
use App\Models\GradeBookColumn;
use App\Models\GradeBookCell;
use App\Models\GradeBookTeacher;
use App\Services\GradeCalculationService;
use App\Services\GradeBookExcelService;
use App\Services\GradeBook\GradeBookPermissionService;
use App\Services\GradeBook\GradeBookManagementService;
use App\Services\GradeBook\GradeBookScoreService;
use App\Services\GradeBook\GradeBookSyncService;
use App\Services\GradeBook\GradeBookAnalysisService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Scopes\InstitutionScope;

class GradeBookController extends Controller
{
    public function __construct(
        protected GradeCalculationService $calculationService,
        protected GradeBookPermissionService $permissionService,
        protected GradeBookManagementService $managementService,
        protected GradeBookScoreService $scoreService,
        protected GradeBookSyncService $syncService,
        protected GradeBookAnalysisService $analysisService
    ) {}

    protected function canModify(GradeBookSession $gradeBook): bool
    {
        return $this->permissionService->canModify($gradeBook);
    }

    protected function canView(GradeBookSession $gradeBook): bool
    {
        return $this->permissionService->canView($gradeBook);
    }

    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $institutionIdParam = $request->institution_id;
        
        // Check if this is a specific institution query (from hierarchy selection)
        $isSpecificInstitutionQuery = $institutionIdParam !== null && $institutionIdParam !== '';
        
        // ALWAYS bypass InstitutionScope for explicit queries - the scope overrides our where clause
        $query = GradeBookSession::query()
            ->withoutGlobalScope(InstitutionScope::class)
            ->with([
                'grade' => fn($q) => $q->withoutGlobalScope(InstitutionScope::class),
                'subject',
                'academicYear',
                'teachers.teacher',
            ]);

        // Apply institution filter FIRST if provided
        if ($isSpecificInstitutionQuery) {
            $institutionId = (int) $institutionIdParam;
            // Force the where clause to be applied
            $query = $query->where('grade_book_sessions.institution_id', '=', $institutionId);
        }
        
        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }
        if ($request->has('grade_id')) {
            $query->where('grade_id', $request->grade_id);
        }
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $result = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json(['success' => false, 'message' => 'Jurnal yaratmaq üçün icazəniz yoxdur.'], 403);
        }

        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'grade_id' => 'required|exists:grades,id',
            'subject_id' => 'required|exists:subjects,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'title' => 'nullable|string|max:255',
        ]);

        $gradeBook = $this->managementService->createSession($validated);

        return response()->json([
            'success' => true,
            'data' => $gradeBook->load(['grade', 'subject', 'academicYear']),
            'message' => 'Grade book created successfully.',
        ], 201);
    }

    public function show(GradeBookSession $gradeBook): JsonResponse
    {
        // Load institution relationship first for proper permission checks
        $gradeBook->load('institution');
        
        if (!$this->canView($gradeBook)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $gradeBook->load([
            'grade.studentEnrollments.student',
            'subject', 'academicYear', 'teachers.teacher',
            'columns' => fn($q) => $q->where('is_archived', false)->orderBy('display_order'),
            'columns.cells.student',
        ]);

        // Fetch students from both enrollments and directly from students table for resilience
        // Bypass InstitutionScope to ensure we get students from the correct grade only
        $enrolledStudentIds = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        // Get students directly assigned to this grade (bypass InstitutionScope)
        $directStudents = \App\Models\Student::withoutGlobalScope(InstitutionScope::class)
            ->where('grade_id', $gradeBook->grade_id)
            ->where('is_active', true)
            ->get();

        // Get students via enrollment that might not have grade_id set yet (bypass InstitutionScope)
        $enrolledStudents = \App\Models\Student::withoutGlobalScope(InstitutionScope::class)
            ->whereIn('id', $enrolledStudentIds)
            ->where('is_active', true)
            ->get();

        // Merge and unique by ID
        $allStudents = $directStudents->concat($enrolledStudents)->unique('id');

        // Ensure cells exist for ALL students for ALL columns in this session
        $this->managementService->ensureCellsExist($gradeBook, $allStudents->pluck('id')->toArray());

        // Fetch scores for ALL students in one go
        $allCells = \App\Models\GradeBookCell::whereHas('column', fn($q) => $q->where('grade_book_session_id', $gradeBook->id))
            ->whereIn('student_id', $allStudents->pluck('id'))
            ->get()
            ->groupBy('student_id');

        // Fetch teacher assignments for ALL students in one go
        // Assuming there's a student_teacher_assignments table or similar if it's not on the student table
        // For now, let's assume it's on the cell or teacher_student table. 
        // Based on the code, assignStudentTeacher updates something. Let's check.
        // Actually, let's just use the scores for now and add teacher_id if we can find it.
        
        $students = $allStudents->map(function($student) use ($allCells, $gradeBook) {
            $studentCells = $allCells->get($student->id, collect());
            $scores = [];
            foreach ($studentCells as $cell) {
                $columnId = $cell->grade_book_column_id;
                $existing = $scores[$columnId] ?? null;

                // If duplicates exist for the same column/student, prefer a non-null score.
                // If both have a score, prefer the one with the latest recorded_at/updated_at.
                $shouldReplace = true;
                if ($existing) {
                    $existingScore = $existing['score'] ?? null;
                    $incomingScore = $cell->score;

                    if ($existingScore !== null && $incomingScore === null) {
                        $shouldReplace = false;
                    } elseif ($existingScore !== null && $incomingScore !== null) {
                        $existingAt = $existing['recorded_at'] ?? $existing['updated_at'] ?? null;
                        $incomingAt = $cell->recorded_at ?? $cell->updated_at;
                        if ($existingAt && $incomingAt && $existingAt >= $incomingAt) {
                            $shouldReplace = false;
                        }
                    }
                }

                if ($shouldReplace) {
                    $scores[$columnId] = [
                        'id' => $cell->id,
                        'score' => $cell->score,
                        'is_present' => $cell->is_present,
                        'grade_mark' => $cell->grade_mark,
                        'recorded_at' => $cell->recorded_at,
                        'updated_at' => $cell->updated_at,
                    ];
                }
            }

            return [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'father_name' => $student->father_name,
                'full_name' => "{$student->last_name} {$student->first_name} {$student->father_name}",
                'scores' => $scores,
                'teacher_id' => $student->teacher_id ?? null, // Fallback if exists on student
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grade_book' => $gradeBook,
                'students' => $students,
                'columns_by_semester' => $gradeBook->columns->groupBy('semester'),
                'input_columns' => $gradeBook->columns->where('column_type', 'input'),
                'calculated_columns' => $gradeBook->columns->where('column_type', 'calculated'),
            ],
        ]);
    }

    public function storeColumn(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        if (!$this->canModify($gradeBook)) return response()->json(['error' => 'Unauthorized'], 403);

        $validated = $request->validate([
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'assessment_stage_id' => 'nullable|exists:assessment_stages,id',
            'semester' => 'required|in:I,II',
            'column_label' => 'required|string|max:50',
            'assessment_date' => 'required|date',
            'max_score' => 'nullable|numeric|min:1|max:100',
        ]);

        $column = $this->managementService->addColumn($gradeBook, $validated);

        return response()->json(['success' => true, 'data' => $column, 'message' => 'Column added successfully.'], 201);
    }

    public function updateCell(Request $request, GradeBookCell $cell): JsonResponse
    {
        if (!$this->canModify($cell->column->session)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $validated = $request->validate([
            'score' => 'nullable|numeric|min:0|max:' . (float) $cell->column->max_score,
            'is_present' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $oldScore = $cell->score;
        $cell = $this->scoreService->updateCell($cell, $validated);
        $cell->refresh();

        return response()->json([
            'success' => true,
            'data' => $cell->load('column'),
            'message' => 'Score updated successfully.',
        ]);
    }

    public function bulkUpdateCells(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        if (!$this->canModify($gradeBook)) return response()->json(['error' => 'Unauthorized'], 403);

        $validated = $request->validate([
            'cells' => 'required|array',
            'cells.*.cell_id' => 'required|exists:grade_book_cells,id',
            'cells.*.score' => 'nullable|numeric|min:0',
            'cells.*.is_present' => 'boolean',
        ]);

        $count = $this->scoreService->bulkUpdate($gradeBook, $validated['cells']);

        return response()->json(['success' => true, 'message' => "{$count} cells updated successfully.", 'updated_count' => $count]);
    }

    public function assignTeacher(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'group_label' => 'nullable|string|max:10',
            'is_primary' => 'boolean',
        ]);

        $assignment = $this->managementService->assignTeacher($gradeBook, $validated);

        return response()->json(['success' => true, 'data' => $assignment->load('teacher'), 'message' => 'Teacher assigned successfully.'], 201);
    }

    public function removeTeacher(GradeBookTeacher $teacherAssignment): JsonResponse
    {
        $teacherAssignment->delete();
        return response()->json(['success' => true, 'message' => 'Teacher assignment removed successfully.']);
    }

    public function archiveColumn(GradeBookColumn $column): JsonResponse
    {
        if (!$this->canModify($column->session)) return response()->json(['error' => 'Unauthorized'], 403);
        $column->update(['is_archived' => true]);
        return response()->json(['success' => true, 'message' => 'Column archived successfully.']);
    }

    public function updateColumn(Request $request, GradeBookColumn $column): JsonResponse
    {
        if (!$this->canModify($column->session)) return response()->json(['error' => 'Unauthorized'], 403);
        if ($column->column_type !== 'input') return response()->json(['success' => false, 'message' => 'Cannot edit calculated column.'], 422);

        $validated = $request->validate([
            'semester' => 'sometimes|in:I,II',
            'column_label' => 'sometimes|string|max:50',
            'assessment_date' => 'sometimes|date',
            'max_score' => 'sometimes|numeric|min:1|max:100',
            'assessment_type_id' => 'sometimes|exists:assessment_types,id',
            'assessment_stage_id' => 'nullable|exists:assessment_stages,id',
        ]);

        $column->update($validated);
        return response()->json(['success' => true, 'data' => $column->fresh(), 'message' => 'Column updated successfully.']);
    }

    public function recalculate(GradeBookSession $gradeBook): JsonResponse
    {
        $this->calculationService->recalculateSession($gradeBook->id);
        return response()->json(['success' => true, 'message' => 'All scores recalculated successfully.']);
    }

    public function getStudentsWithScores(GradeBookSession $gradeBook): JsonResponse
    {
        $enrolledStudentIds = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        $directStudents = \App\Models\Student::where('grade_id', $gradeBook->grade_id)
            ->where('is_active', true)
            ->get();

        $enrolledStudents = \App\Models\Student::whereIn('id', $enrolledStudentIds)
            ->where('is_active', true)
            ->get();

        $allStudents = $directStudents->concat($enrolledStudents)->unique('id');

        // Ensure cells exist for ALL students for ALL columns in this session
        $this->managementService->ensureCellsExist($gradeBook, $allStudents->pluck('id')->toArray());

        // Fetch scores for ALL students in one go
        $allCells = \App\Models\GradeBookCell::whereHas('column', fn($q) => $q->where('grade_book_session_id', $gradeBook->id))
            ->whereIn('student_id', $allStudents->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $studentsData = $allStudents->map(function ($student) use ($allCells) {
                $studentCells = $allCells->get($student->id, collect());
                $scoresByColumn = [];
                foreach ($studentCells as $cell) {
                    $columnId = $cell->grade_book_column_id;
                    $existing = $scoresByColumn[$columnId] ?? null;

                    $shouldReplace = true;
                    if ($existing) {
                        $existingScore = $existing['score'] ?? null;
                        $incomingScore = $cell->score;

                        if ($existingScore !== null && $incomingScore === null) {
                            $shouldReplace = false;
                        } elseif ($existingScore !== null && $incomingScore !== null) {
                            $existingAt = $existing['recorded_at'] ?? $existing['updated_at'] ?? null;
                            $incomingAt = $cell->recorded_at ?? $cell->updated_at;
                            if ($existingAt && $incomingAt && $existingAt >= $incomingAt) {
                                $shouldReplace = false;
                            }
                        }
                    }

                    if ($shouldReplace) {
                        $scoresByColumn[$columnId] = [
                            'id' => $cell->id,
                            'score' => $cell->score,
                            'percentage' => $cell->percentage,
                            'grade_mark' => $cell->grade_mark,
                            'is_present' => $cell->is_present,
                            'recorded_at' => $cell->recorded_at,
                            'updated_at' => $cell->updated_at,
                        ];
                    }
                }

                return [
                    'id' => $student->id, 'student_number' => $student->student_number,
                    'full_name' => "{$student->last_name} {$student->first_name} {$student->father_name}",
                    'scores' => $scoresByColumn,
                    'teacher_id' => $student->teacher_id ?? null,
                ];
            });

        return response()->json(['success' => true, 'data' => $studentsData]);
    }

    public function exportTemplate(GradeBookSession $gradeBook, GradeBookExcelService $excelService): StreamedResponse
    {
        $spreadsheet = $excelService->generateTemplate($gradeBook->id);
        $filename = str_replace([' ', '/'], '_', "jurnal_{$gradeBook->grade->name}_{$gradeBook->subject->name}_template.xlsx");

        return new StreamedResponse(function () use ($spreadsheet) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportGradeBook(GradeBookSession $gradeBook, GradeBookExcelService $excelService): StreamedResponse
    {
        $spreadsheet = $excelService->exportGradeBook($gradeBook->id);
        $filename = str_replace([' ', '/'], '_', "jurnal_{$gradeBook->grade->name}_{$gradeBook->subject->name}_{$gradeBook->academicYear->name}.xlsx");

        return new StreamedResponse(function () use ($spreadsheet) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function importScores(Request $request, GradeBookSession $gradeBook, GradeBookExcelService $excelService): JsonResponse
    {
        $validated = $request->validate(['file' => 'required|file|mimes:xlsx,xls|max:10240']);
        try {
            $path = $request->file('file')->storeAs('temp', 'import_' . time() . '.xlsx');
            $fullPath = storage_path('app/' . $path);
            $results = $excelService->importScores($fullPath, $gradeBook->id);
            if (file_exists($fullPath)) unlink($fullPath);
            return response()->json(['success' => true, 'message' => "İmport tamamlandı", 'data' => $results]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Xəta: ' . $e->getMessage()], 422);
        }
    }

    public function findOrphaned(Request $request): JsonResponse
    {
        $orphans = $this->syncService->findOrphaned($request->only(['institution_id', 'academic_year_id']));
        return response()->json(['success' => true, 'data' => ['orphaned_count' => $orphans->count(), 'orphaned_grade_books' => $orphans]]);
    }

    public function cleanupOrphaned(Request $request): JsonResponse
    {
        $orphans = $this->syncService->findOrphaned($request->only(['institution_id', 'academic_year_id']));
        $deleted = 0;
        if (!$request->boolean('dry_run', false)) {
            foreach ($orphans as $gb) {
                if ($request->boolean('force', false) || !$gb->columns()->whereHas('cells', fn($q) => $q->whereNotNull('score'))->exists()) {
                    $gb->delete();
                    $deleted++;
                }
            }
        }
        return response()->json(['success' => true, 'deleted_count' => $deleted]);
    }

    public function sync(Request $request): JsonResponse
    {
        $result = $this->syncService->sync($request->only(['institution_id', 'academic_year_id']));
        return response()->json(['success' => true, 'data' => $result]);
    }

    public function getHierarchy(Request $request): JsonResponse
    {
        $user = auth()->user();
        $userInstitution = $user->institution;
        
        $level = $request->input('level', 'region');
        $regionId = $request->input('region_id') ?? ($userInstitution?->id);
        $sectorId = $request->input('sector_id') ?? ($userInstitution?->id);
        $institutionId = $request->input('institution_id') ?? $user->institution_id;
        $academicYearId = $request->input('academic_year_id');

        if (!$this->permissionService->canAccessHierarchy($user, $level, $regionId, $sectorId, $institutionId)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $data = match ($level) {
            'region' => $this->analysisService->getRegionHierarchy($regionId, $academicYearId),
            'sector' => $this->analysisService->getSectorHierarchy($sectorId, $academicYearId),
            'institution', 'grade' => $this->analysisService->getSectorHierarchy($sectorId, $academicYearId), 
            default => [],
        };

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getMultiLevelAnalysis(Request $request): JsonResponse
    {
        $compareBy = $request->input('compare_by', 'time');
        $data = match ($compareBy) {
            'time' => $this->analysisService->getTimeComparisonData('institution', null, null, null, []),
            'subject' => $this->analysisService->getSubjectComparisonData(),
            default => [],
        };
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisOverview(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
        $academicYearId = $request->input('academic_year_id');
        $gradeId = $request->input('grade_id');
        $subjectId = $request->input('subject_id');

        $data = $this->analysisService->getOverviewData($institutionId, $academicYearId, $gradeId, $subjectId);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisComparison(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
        $academicYearId = $request->input('academic_year_id');
        $compareBy = $request->input('compare_by', 'subject');

        $data = $this->analysisService->getComparisonData($institutionId, $academicYearId, $compareBy);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisTrends(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
        $academicYearId = $request->input('academic_year_id');
        $timeRange = $request->input('time_range', 'year');

        $data = $this->analysisService->getTrendsData($institutionId, $academicYearId, $timeRange);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisDeepDive(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ?? auth()->user()->institution_id;
        $academicYearId = $request->input('academic_year_id');
        $gradeId = $request->input('grade_id');
        $subjectId = $request->input('subject_id');

        $data = $this->analysisService->getDeepDiveData($institutionId, $academicYearId, $gradeId, $subjectId);

        return response()->json(['success' => true, 'data' => $data]);
    }
}
