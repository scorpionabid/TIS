<?php

namespace App\Services\GradeBook;

use App\Models\GradeBookSession;
use App\Models\GradeBookColumn;
use App\Models\GradeBookCell;
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
        $maxOrder = $gradeBook->columns()
            ->where('semester', $data['semester'])
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
        $columnIds = $gradeBook->columns()->pluck('id')->toArray();
        
        if (empty($columnIds) || empty($studentIds)) return;

        foreach ($columnIds as $columnId) {
            $existingStudentIds = GradeBookCell::where('grade_book_column_id', $columnId)
                ->whereIn('student_id', $studentIds)
                ->pluck('student_id')
                ->toArray();

            $missingStudentIds = array_diff($studentIds, $existingStudentIds);

            foreach ($missingStudentIds as $studentId) {
                GradeBookCell::create([
                    'grade_book_column_id' => $columnId,
                    'student_id' => $studentId,
                    'is_present' => true,
                ]);
            }
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
