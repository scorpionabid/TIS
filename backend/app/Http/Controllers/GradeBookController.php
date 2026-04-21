<?php

namespace App\Http\Controllers;

use App\Helpers\DataIsolationHelper;
use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use App\Models\GradeBookTeacher;
use App\Scopes\InstitutionScope;
use App\Services\GradeBook\GradeBookAnalysisService;
use App\Services\GradeBook\GradeBookManagementService;
use App\Services\GradeBook\GradeBookPermissionService;
use App\Services\GradeBook\GradeBookScoreService;
use App\Services\GradeBook\GradeBookSyncService;
use App\Services\GradeBookExcelService;
use App\Services\GradeCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        // InstitutionScope bypass edilir — çünki scope WHERE clausunu override edir.
        // Əvəzinə DataIsolationHelper ilə role-based filtr tətbiq edilir.
        $query = GradeBookSession::query()
            ->withoutGlobalScope(InstitutionScope::class)
            ->with([
                'grade' => fn ($q) => $q
                    ->withoutGlobalScope(InstitutionScope::class)
                    ->withCount(['assignedStudents as real_student_count']),
                'subject',
                'academicYear',
                'teachers.teacher',
            ]);

        // Specific institution query (hierarchy navigator-dan gəldikdə)
        if ($institutionIdParam !== null && $institutionIdParam !== '') {
            $institutionId = (int) $institutionIdParam;
            $query->where('grade_book_sessions.institution_id', '=', $institutionId);
        } else {
            // Institution ID yoxdursa — istifadəçinin hierarchy-sinə görə məhdudlaşdır
            $query = DataIsolationHelper::applyRegionalScope($query, $user);
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
        if (! Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'])) {
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

        if (! $this->canView($gradeBook)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $gradeBook->load(['subject', 'academicYear', 'teachers.teacher', 'columns.assessmentType']);

        // Sync teachers from official teaching loads to ensure they are available in the UI
        $this->managementService->syncTeachersFromTeachingLoads($gradeBook);
        $gradeBook->load('teachers.teacher');

        $students = $this->managementService->getStudentsWithScores($gradeBook);

        $activeColumns = $gradeBook->columns->where('is_archived', false);

        return response()->json([
            'success' => true,
            'data' => [
                'grade_book' => $gradeBook,
                'students' => $students,
                'columns_by_semester' => $activeColumns->groupBy('semester'),
                'input_columns' => $activeColumns->where('column_type', 'input')->values(),
                'calculated_columns' => $activeColumns->where('column_type', 'calculated')->values(),
            ],
        ]);
    }

    public function storeColumn(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        if (! $this->canModify($gradeBook)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

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
        if (! $this->canModify($cell->column->session)) {
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
        if (! $this->canModify($gradeBook)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

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

    public function assignStudentTeacher(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        if (! $this->canModify($gradeBook)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'teacher_id' => 'nullable|exists:users,id',
            'student_id' => 'nullable|integer|exists:students,id',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'integer|exists:students,id',
        ]);

        $teacherId = $validated['teacher_id'] ?? null;
        
        // Combine single ID and array of IDs
        $studentIds = $validated['student_ids'] ?? [];
        if (isset($validated['student_id'])) {
            $studentIds[] = $validated['student_id'];
        }
        $studentIds = array_unique($studentIds);

        if (empty($studentIds)) {
            return response()->json(['success' => false, 'message' => 'Tələbə seçilməyib.'], 422);
        }

        // Update all cells for these students in this grade book to the new teacher
        \App\Models\GradeBookCell::whereHas('column', function ($q) use ($gradeBook) {
            $q->where('grade_book_session_id', $gradeBook->id);
        })->whereIn('student_id', $studentIds)->update(['teacher_id' => $teacherId]);

        return response()->json(['success' => true, 'message' => 'Müəllim təyinatı uğurla icra olundu.']);
    }

    public function archiveColumn(GradeBookColumn $column): JsonResponse
    {
        if (! $this->canModify($column->session)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $column->update(['is_archived' => true]);

        return response()->json(['success' => true, 'message' => 'Column archived successfully.']);
    }

    public function updateColumn(Request $request, GradeBookColumn $column): JsonResponse
    {
        if (! $this->canModify($column->session)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        if ($column->column_type !== 'input') {
            return response()->json(['success' => false, 'message' => 'Cannot edit calculated column.'], 422);
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
        $this->managementService->reorderExamColumns($column->session);

        return response()->json(['success' => true, 'data' => $column->fresh(), 'message' => 'Column updated successfully.']);
    }

    public function recalculate(GradeBookSession $gradeBook): JsonResponse
    {
        $this->calculationService->recalculateSession($gradeBook->id);

        return response()->json(['success' => true, 'message' => 'All scores recalculated successfully.']);
    }

    public function getStudentsWithScores(GradeBookSession $gradeBook): JsonResponse
    {
        $studentsData = $this->managementService->getStudentsWithScores($gradeBook);

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

    public function bulkExportByGrade(Request $request, GradeBookExcelService $excelService): StreamedResponse
    {
        $validated = $request->validate([
            'grade_id' => 'required|integer|exists:grades,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
        ]);

        $grade = \App\Models\Grade::withoutGlobalScope(InstitutionScope::class)->findOrFail($validated['grade_id']);
        $spreadsheet = $excelService->bulkExportByGrade($validated['grade_id'], $validated['academic_year_id'] ?? null);
        $filename = str_replace([' ', '/'], '_', "jurnal_{$grade->name}_butun_fennler.xlsx");

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
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }

            return response()->json(['success' => true, 'message' => 'İmport tamamlandı', 'data' => $results]);
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
        if (! $request->boolean('dry_run', false)) {
            foreach ($orphans as $gb) {
                if ($request->boolean('force', false) || ! $gb->columns()->whereHas('cells', fn ($q) => $q->whereNotNull('score'))->exists()) {
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

        if (! $this->permissionService->canAccessHierarchy($user, $level, $regionId, $sectorId, $institutionId)) {
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
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        if (empty($academicYearIds) && $request->input('academic_year_id')) {
            $academicYearIds = [(int) $request->input('academic_year_id')];
        }
        $subjectIds = array_values(array_filter(array_map('intval', (array) $request->input('subject_ids', []))));
        if (empty($subjectIds) && $request->input('subject_id')) {
            $subjectIds = [(int) $request->input('subject_id')];
        }
        $gradeIds = array_values(array_filter(array_map('intval', (array) $request->input('grade_ids', []))));
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));
        $gender = in_array($request->input('gender'), ['male', 'female']) ? $request->input('gender') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getOverviewData(
            $institutionIds, $academicYearIds, $gradeIds, $subjectIds,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages, $gender
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisComparison(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearId = $request->input('academic_year_id') ? (int) $request->input('academic_year_id') : null;
        $compareBy = $request->input('compare_by', 'subject');
        $gradeId = $request->input('grade_id') ? (int) $request->input('grade_id') : null;
        $subjectId = $request->input('subject_id') ? (int) $request->input('subject_id') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);

        $data = $this->analysisService->getComparisonData($institutionIds, $academicYearId, $compareBy, $gradeId, $subjectId);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisTrends(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        if (empty($academicYearIds) && $request->input('academic_year_id')) {
            $academicYearIds = [(int) $request->input('academic_year_id')];
        }
        $timeRange = $request->input('time_range', 'year');
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getTrendsData(
            $institutionIds, $academicYearIds, $timeRange,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisDeepDive(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        if (empty($academicYearIds) && $request->input('academic_year_id')) {
            $academicYearIds = [(int) $request->input('academic_year_id')];
        }
        $gradeIds = array_values(array_filter(array_map('intval', (array) $request->input('grade_ids', []))));
        $subjectIds = array_values(array_filter(array_map('intval', (array) $request->input('subject_ids', []))));
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));
        $gender = in_array($request->input('gender'), ['male', 'female']) ? $request->input('gender') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getDeepDiveData(
            $institutionIds, $academicYearIds, $gradeIds, $subjectIds,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages, $gender
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Resolve allowed institution IDs based on user role.
     * Returns null for SuperAdmin (no restriction), array for scoped roles.
     */
    private function resolveInstitutionIds(?int $explicitId): ?array
    {
        $user = auth()->user();
        $roleName = strtolower($user->roles->first()?->name ?? '');

        // schooladmin həmişə yalnız öz məktəbini görür — explicit param ignore edilir
        if (in_array($roleName, ['schooladmin', 'teacher'])) {
            return $user->institution_id ? [$user->institution_id] : [];
        }

        if ($explicitId) {
            $inst = \App\Models\Institution::withoutGlobalScope(InstitutionScope::class)->find($explicitId);
            // If non-leaf institution (ministry/region/sector), expand to all school-level children
            if ($inst && $inst->level < 4) {
                $childIds = $inst->getAllChildrenIds();

                return ! empty($childIds) ? $childIds : [$explicitId];
            }

            return [$explicitId];
        }

        if ($roleName === 'superadmin') {
            return null; // no restriction
        }

        $institution = $user->institution;
        if (! $institution) {
            return []; // no access
        }

        if (in_array($roleName, ['regionadmin', 'regionoperator', 'sektoradmin'])) {
            return $institution->getAllChildrenIds();
        }

        return $user->institution_id ? [$user->institution_id] : [];
    }

    /**
     * Schooladmin/teacher üçün sector_ids və school_ids parametrlərini sıfırla.
     * Bu rollar yalnız öz məktəbini görür — sub-filtr mənasızdır.
     */
    private function sanitizeHierarchyFilters(array $sectorIds, array $schoolIds): array
    {
        $roleName = strtolower(auth()->user()->roles->first()?->name ?? '');
        if (in_array($roleName, ['schooladmin', 'teacher'])) {
            return [[], []];
        }

        return [$sectorIds, $schoolIds];
    }

    public function getPivotAnalysis(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $groupBy = in_array($request->input('group_by'), ['class_level', 'sector', 'school', 'grade', 'subject', 'language'])
                             ? $request->input('group_by') : 'class_level';

        // Support both single and array params for backward compatibility
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        if (empty($academicYearIds) && $request->input('academic_year_id')) {
            $academicYearIds = [(int) $request->input('academic_year_id')];
        }
        $subjectIds = array_values(array_filter(array_map('intval', (array) $request->input('subject_ids', []))));
        if (empty($subjectIds) && $request->input('subject_id')) {
            $subjectIds = [(int) $request->input('subject_id')];
        }
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));
        if (empty($teachingLanguages) && $request->input('teaching_language')) {
            $teachingLanguages = [$request->input('teaching_language')];
        }

        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $gradeIds = array_values(array_filter(array_map('intval', (array) $request->input('grade_ids', []))));
        $gender = in_array($request->input('gender'), ['male', 'female']) ? $request->input('gender') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getPivotAnalysis(
            $institutionIds, $academicYearIds, $subjectIds, $groupBy,
            $sectorIds, $schoolIds, $classLevels, $gradeIds, $teachingLanguages, $gender
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getClassLevelSubjectAnalysis(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearId = $request->input('academic_year_id') ? (int) $request->input('academic_year_id') : null;
        $classLevel = $request->input('class_level') ? (int) $request->input('class_level') : null;
        $subjectId = $request->input('subject_id') ? (int) $request->input('subject_id') : null;
        $assessmentTypeId = $request->input('assessment_type_id') ? (int) $request->input('assessment_type_id') : null;
        $semester = $request->input('semester') ?: null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);

        $data = $this->analysisService->getClassLevelSubjectAnalysis(
            $institutionIds, $academicYearId, $classLevel, $subjectId, $assessmentTypeId, $semester
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getRegionTrends(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        if (empty($academicYearIds) && $request->input('academic_year_id')) {
            $academicYearIds = [(int) $request->input('academic_year_id')];
        }
        $groupBy = in_array($request->input('group_by'), ['semester', 'assessment_type'])
            ? $request->input('group_by') : 'semester';
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getRegionTrends(
            $institutionIds, $academicYearIds, $groupBy,
            $sectorIds, $schoolIds, $classLevels, $teachingLanguages
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getJournalCompletion(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearId = $request->input('academic_year_id') ? (int) $request->input('academic_year_id') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);

        $data = $this->analysisService->getJournalCompletion(
            $institutionIds, $academicYearId
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function exportComprehensive(Request $request, GradeBookExcelService $excelService): StreamedResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearId = $request->input('academic_year_id') ? (int) $request->input('academic_year_id') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);

        $overviewData = $this->analysisService->getOverviewData($institutionIds, $academicYearId, null, null);
        $classLevelData = $this->analysisService->getClassLevelSubjectAnalysis($institutionIds, $academicYearId, null, null, null, null);
        $completionData = $this->analysisService->getJournalCompletion($institutionIds, $academicYearId);
        $deepDiveData = $this->analysisService->getDeepDiveData($institutionId, $academicYearId, null, null);

        $spreadsheet = $excelService->exportComprehensive($overviewData, $classLevelData, $completionData, $deepDiveData);

        $filename = 'hesabat_' . now()->format('Y-m-d') . '.xlsx';

        return new StreamedResponse(function () use ($spreadsheet) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function getScoreboard(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        $subjectIds = array_values(array_filter(array_map('intval', (array) $request->input('subject_ids', []))));
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $gradeIds = array_values(array_filter(array_map('intval', (array) $request->input('grade_ids', []))));
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));
        $gender = in_array($request->input('gender'), ['male', 'female']) ? $request->input('gender') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getScoreboardData(
            $institutionIds, $academicYearIds, $subjectIds,
            $sectorIds, $schoolIds, $classLevels, $gradeIds, $teachingLanguages, $gender
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getAnalysisAvailableGrades(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getAvailableGrades($institutionIds, $academicYearIds, $sectorIds, $schoolIds);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function getNestedPivotAnalysis(Request $request): JsonResponse
    {
        $institutionId = $request->input('institution_id') ? (int) $request->input('institution_id') : null;
        $groupBys = array_values(array_filter((array) $request->input('group_bys', ['sector', 'school'])));

        $academicYearIds = array_values(array_filter(array_map('intval', (array) $request->input('academic_year_ids', []))));
        if (empty($academicYearIds) && $request->input('academic_year_id')) {
            $academicYearIds = [(int) $request->input('academic_year_id')];
        }
        $subjectIds = array_values(array_filter(array_map('intval', (array) $request->input('subject_ids', []))));
        $teachingLanguages = array_values(array_filter((array) $request->input('teaching_languages', [])));
        $sectorIds = array_values(array_filter(array_map('intval', (array) $request->input('sector_ids', []))));
        $schoolIds = array_values(array_filter(array_map('intval', (array) $request->input('school_ids', []))));
        $classLevels = array_values(array_filter(array_map('intval', (array) $request->input('class_levels', []))));
        $gradeIds = array_values(array_filter(array_map('intval', (array) $request->input('grade_ids', []))));
        $gender = in_array($request->input('gender'), ['male', 'female']) ? $request->input('gender') : null;

        $institutionIds = $this->resolveInstitutionIds($institutionId);
        [$sectorIds, $schoolIds] = $this->sanitizeHierarchyFilters($sectorIds, $schoolIds);

        $data = $this->analysisService->getNestedPivotAnalysis(
            $institutionIds, $academicYearIds, $subjectIds, $groupBys,
            $sectorIds, $schoolIds, $classLevels, $gradeIds, $teachingLanguages, $gender
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function exportAnalysis(Request $request, GradeBookExcelService $excelService): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $institutionId = (int) ($request->input('institution_id') ?? auth()->user()->institution_id);
        $academicYearId = $request->input('academic_year_id') ? (int) $request->input('academic_year_id') : null;
        $gradeId = $request->input('grade_id') ? (int) $request->input('grade_id') : null;

        $overviewData = $this->analysisService->getOverviewData($institutionId, $academicYearId, $gradeId, null);
        $deepDiveData = $this->analysisService->getDeepDiveData($institutionId, $academicYearId, $gradeId, null);

        $spreadsheet = $excelService->exportAnalysisSummary($overviewData, $deepDiveData);

        $filename = 'analiz_export_' . now()->format('Y-m-d') . '.xlsx';

        return new \Symfony\Component\HttpFoundation\StreamedResponse(function () use ($spreadsheet) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
