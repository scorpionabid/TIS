<?php

namespace App\Services\GradeBook;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use App\Services\GradeCalculationService;
use Illuminate\Support\Facades\Auth;

class GradeBookManagementService
{
    protected GradeCalculationService $calculationService;

    public function __construct(GradeCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * Create a new GradeBook Session
     */
    public function createSession(array $data): GradeBookSession
    {
        $gradeBook = GradeBookSession::create([
            ...$data,
            'created_by' => Auth::id(),
            'status' => 'active',
        ]);

        $this->initCalculatedColumns($gradeBook);
        $this->calculationService->recalculateSession($gradeBook->id);

        return $gradeBook;
    }

    /**
     * Initialize standard calculated columns
     */
    public function initCalculatedColumns(GradeBookSession $gradeBook): void
    {
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
    }

    /**
     * Add a new column to a GradeBook
     */
    public function addColumn(GradeBookSession $gradeBook, array $data): GradeBookColumn
    {
        $column = $gradeBook->columns()->create([
            ...$data,
            'max_score' => $data['max_score'] ?? 100,
            'display_order' => 0, // Will be set by reorderExamColumns
            'column_type' => 'input',
            'created_by' => Auth::id(),
        ]);

        // Automatically reorder and re-label based on date
        $this->reorderExamColumns($gradeBook);

        // Initialize empty cells for all active students (re-fetch column to get updated fields)
        $column->refresh();
        
        $enrolledIds = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        $directIds = \App\Models\Student::where('grade_id', $gradeBook->grade_id)
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();

        $studentIds = array_unique(array_merge($enrolledIds, $directIds));

        foreach ($studentIds as $studentId) {
            GradeBookCell::create([
                'grade_book_column_id' => $column->id,
                'student_id' => $studentId,
                'is_present' => true,
            ]);
        }

        return $column;
    }

    /**
     * Reorder and re-label KSQ/BSQ columns based on assessment_date chronological order.
     */
    public function reorderExamColumns(GradeBookSession $gradeBook): void
    {
        $columns = $gradeBook->columns()
            ->where('column_type', 'input')
            ->where('is_archived', false)
            ->with('assessmentType')
            ->get();

        $groups = $columns->groupBy(function($col) {
            $cat = strtolower($col->assessmentType->category ?? '');
            // Only reorder KSQ and BSQ/Graduation types
            if (in_array($cat, ['ksq', 'bsq', 'national'])) {
                return $col->semester . '_' . ($cat === 'ksq' ? 'KSQ' : 'BSQ');
            }
            return 'OTHER';
        });

        foreach ($groups as $key => $group) {
            if ($key === 'OTHER') continue;

            $prefix = explode('_', $key)[1];
            
            // Sort by date, then by ID as a fallback for the same date
            $sorted = $group->sortBy(function($col) {
                return [$col->assessment_date, $col->id];
            })->values();

            foreach ($sorted as $index => $col) {
                $newLabel = $prefix . ($index + 1);
                $newOrder = ($prefix === 'KSQ' ? 100 : 200) + ($index * 1);
                
                // Only update if changed to avoid redundant events
                if ($col->column_label !== $newLabel || $col->display_order !== $newOrder) {
                    $col->update([
                        'column_label' => $newLabel,
                        'display_order' => $newOrder
                    ]);
                }
            }
        }
        
        // Ensure manual/other columns also have reasonable ordering
        $others = $columns->filter(fn($c) => !in_array(strtolower($c->assessmentType->category ?? ''), ['ksq', 'bsq', 'national']))
            ->sortBy('id')
            ->values();
            
        foreach ($others as $index => $col) {
            $col->update(['display_order' => 500 + ($index * 1)]);
        }
    }

    /**
     * Ensure all students have cells for all columns in this session
     */
    public function ensureCellsExist(GradeBookSession $gradeBook, array $studentIds): void
    {
        if (empty($studentIds)) {
            return;
        }

        $columnIds = $gradeBook->columns()->pluck('id')->toArray();
        if (empty($columnIds)) {
            return;
        }

        foreach ($columnIds as $columnId) {
            $existingStudentIds = GradeBookCell::where('grade_book_column_id', $columnId)
                ->whereIn('student_id', $studentIds)
                ->pluck('student_id')
                ->toArray();

            $missingStudentIds = array_diff($studentIds, $existingStudentIds);

            if (! empty($missingStudentIds)) {
                $now = now();
                $insertData = array_map(fn ($sid) => [
                    'grade_book_column_id' => $columnId,
                    'student_id' => $sid,
                    'is_present' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $missingStudentIds);

                GradeBookCell::insert($insertData);
            }
        }
    }

    /**
     * Get all students with their scores for a grade book session
     */
    public function getStudentsWithScores(GradeBookSession $gradeBook): \Illuminate\Support\Collection
    {
        // Load relationships if not already loaded
        if (! $gradeBook->relationLoaded('columns')) {
            $gradeBook->load(['columns' => fn ($q) => $q->where('is_archived', false)->orderBy('display_order')]);
        }
        if (! $gradeBook->relationLoaded('grade')) {
            $gradeBook->load('grade');
        }

        $institutionId = $gradeBook->institution_id;
        $gradeId = $gradeBook->grade_id;

        // Fetch enrolled students
        $enrolledStudentIds = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        // Fetch all active students (direct + enrolled) for this grade in this institution
        $allStudents = \App\Models\Student::withoutGlobalScope(\App\Scopes\InstitutionScope::class)
            ->where(function ($query) use ($gradeId, $enrolledStudentIds) {
                $query->where('grade_id', $gradeId)
                    ->orWhereIn('id', $enrolledStudentIds);
            })
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->get();

        $studentIds = $allStudents->pluck('id')->toArray();

        // Resolve the internal class_id used in teaching_loads from grades metadata
        $classId = \Illuminate\Support\Facades\DB::table('classes')
            ->whereRaw("metadata->>'grade_id' = ?", [(string) $gradeBook->grade_id])
            ->where('institution_id', $gradeBook->institution_id)
            ->value('id');

        // Fetch ALL teachers for this specific grade and subject from teaching loads
        $teachingLoadTeachers = \App\Models\TeachingLoad::where('class_id', $classId)
            ->where('subject_id', $gradeBook->subject_id)
            ->where('academic_year_id', $gradeBook->academic_year_id)
            ->where('status', 'active')
            ->orderBy('id', 'asc') // Ensure consistent order for splitting
            ->pluck('teacher_id')
            ->toArray();

        // Fetch scores for ALL students in one go
        $allCells = GradeBookCell::whereHas('column', fn ($q) => $q->where('grade_book_session_id', $gradeBook->id))
            ->whereIn('student_id', $studentIds)
            ->get()
            ->groupBy('student_id');

        $totalStudents = $allStudents->count();

        return $allStudents->values()->map(function ($student, $index) use ($allCells, $gradeBook, $teachingLoadTeachers, $totalStudents) {
            $studentCells = $allCells->get($student->id, collect());
            $scores = [];

            // PRE-PAD: Ensure every column has an entry (even if null) to prevent "Xana tapılmadı"
            foreach ($gradeBook->columns as $column) {
                $scores[$column->id] = null;
            }

            foreach ($studentCells as $cell) {
                $columnId = $cell->grade_book_column_id;
                $existing = $scores[$columnId] ?? null;

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
                        'percentage' => $cell->percentage,
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
                'scores' => (object) $scores, // Frontend expects object for numeric keys
                'teacher_id' => $this->resolveStudentTeacher($student, $studentCells, $teachingLoadTeachers, $index, $totalStudents),
            ];
        });
    }

    /**
     * Resolve which teacher should be assigned to this student in the journal view.
     */
    private function resolveStudentTeacher($student, $studentCells, array $teachingLoadTeachers, int $index, int $totalStudents): ?int
    {
        // 1. Check if any cell already has a teacher assigned
        $assignedTeacherId = $studentCells->whereNotNull('teacher_id')
            ->pluck('teacher_id')
            ->first();

        if ($assignedTeacherId) {
            return (int) $assignedTeacherId;
        }

        // 2. If no teachers in teaching loads, return null
        if (empty($teachingLoadTeachers)) {
            return null;
        }

        // 3. If only one teacher, assign to everyone
        if (count($teachingLoadTeachers) === 1) {
            return (int) $teachingLoadTeachers[0];
        }

        // 4. Split logic - only for 2 teachers as per request (can be generalized)
        if (count($teachingLoadTeachers) >= 2) {
            // "Şagird siyahının yuxarıdan asagiya yarısı bir müəllim, digər yarısısna müəllim"
            $midPoint = ceil($totalStudents / 2);
            if ($index < $midPoint) {
                return (int) $teachingLoadTeachers[0];
            } else {
                return (int) $teachingLoadTeachers[1];
            }
        }

        return null;
    }

    /**
     * Synchronize teachers from teaching_loads table to the grade book session.
     * This ensures teachers officially assigned to the class/subject are available in the journal.
     */
    public function syncTeachersFromTeachingLoads(GradeBookSession $gradeBook): void
    {
        // Resolve the internal class_id used in teaching_loads from grades metadata
        $classId = \Illuminate\Support\Facades\DB::table('classes')
            ->whereRaw("metadata->>'grade_id' = ?", [(string) $gradeBook->grade_id])
            ->where('institution_id', $gradeBook->institution_id)
            ->value('id');

        if (!$classId) {
            return;
        }

        // Fetch ALL teachers for this specific grade and subject from teaching loads
        $teacherIds = \App\Models\TeachingLoad::where('class_id', $classId)
            ->where('subject_id', $gradeBook->subject_id)
            ->where('academic_year_id', $gradeBook->academic_year_id)
            ->where('status', 'active')
            ->pluck('teacher_id')
            ->toArray();

        foreach ($teacherIds as $teacherId) {
            $gradeBook->teachers()->firstOrCreate(
                ['teacher_id' => $teacherId],
                [
                    'assigned_by' => Auth::id() ?? 1,
                    'is_primary' => false,
                ]
            );
        }
    }

    /**
     * Assign teacher to GradeBook
     */
    public function assignTeacher(GradeBookSession $gradeBook, array $data)
    {
        return $gradeBook->teachers()->updateOrCreate(
            ['teacher_id' => $data['teacher_id'], 'group_label' => $data['group_label'] ?? null],
            ['is_primary' => $data['is_primary'] ?? false, 'assigned_by' => Auth::id()]
        );
    }
}
