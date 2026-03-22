<?php

namespace App\Services\GradeBook;

use App\Models\GradeBookSession;
use App\Models\GradeBookColumn;
use App\Models\GradeBookCell;
use App\Services\GradeCalculationService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;

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
        $maxOrder = $gradeBook->columns()
            ->where('semester', $data['semester'])
            ->where('column_type', 'input')
            ->max('display_order') ?? 0;

        $column = $gradeBook->columns()->create([
            ...$data,
            'max_score' => $data['max_score'] ?? 100,
            'display_order' => $maxOrder + 1,
            'column_type' => 'input',
            'created_by' => Auth::id(),
        ]);

        // Initialize empty cells for all active students
        $enrolledIds = $gradeBook->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        $directIds = \App\Models\Student::where('grade_id', $gradeBook->grade_id)
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();

        // Merge and unique
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
     * Ensure all students have cells for all columns in this session
     */
    public function ensureCellsExist(GradeBookSession $gradeBook, array $studentIds): void
    {
        if (empty($studentIds)) return;
        
        $columnIds = $gradeBook->columns()->pluck('id')->toArray();
        if (empty($columnIds)) return;

        foreach ($columnIds as $columnId) {
            $existingStudentIds = GradeBookCell::where('grade_book_column_id', $columnId)
                ->whereIn('student_id', $studentIds)
                ->pluck('student_id')
                ->toArray();

            $missingStudentIds = array_diff($studentIds, $existingStudentIds);

            if (!empty($missingStudentIds)) {
                $now = now();
                $insertData = array_map(fn($sid) => [
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
        if (!$gradeBook->relationLoaded('columns')) {
            $gradeBook->load(['columns' => fn($q) => $q->where('is_archived', false)->orderBy('display_order')]);
        }
        if (!$gradeBook->relationLoaded('grade')) {
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
        
        // Ensure cells exist for ALL students for ALL active columns
        $this->ensureCellsExist($gradeBook, $studentIds);

        // Fetch scores for ALL students in one go
        $allCells = GradeBookCell::whereHas('column', fn($q) => $q->where('grade_book_session_id', $gradeBook->id))
            ->whereIn('student_id', $studentIds)
            ->get()
            ->groupBy('student_id');

        return $allStudents->map(function ($student) use ($allCells, $gradeBook) {
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
                'teacher_id' => $student->teacher_id ?? null,
            ];
        });
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
