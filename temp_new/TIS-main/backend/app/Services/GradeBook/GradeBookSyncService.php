<?php

namespace App\Services\GradeBook;

use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use App\Models\GradeSubject;
use App\Services\GradeCalculationService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GradeBookSyncService
{
    protected GradeCalculationService $calculationService;

    public function __construct(GradeCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * Sync grade books with grade_subjects
     */
    public function sync(array $filters): array
    {
        $query = GradeSubject::with(['grade', 'subject'])
            ->where('is_teaching_activity', true)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('grade_book_sessions')
                    ->whereColumn('grade_book_sessions.grade_id', 'grade_subjects.grade_id')
                    ->whereColumn('grade_book_sessions.subject_id', 'grade_subjects.subject_id')
                    ->whereNull('grade_book_sessions.deleted_at');
            });

        if (isset($filters['institution_id'])) {
            $query->whereHas('grade', function ($q) use ($filters) {
                $q->where('institution_id', $filters['institution_id']);
            });
        }

        if (isset($filters['academic_year_id'])) {
            $query->whereHas('grade', function ($q) use ($filters) {
                $q->where('academic_year_id', $filters['academic_year_id']);
            });
        }

        $missingGradeSubjects = $query->get();
        $createdCount = 0;
        $details = [];

        foreach ($missingGradeSubjects as $gradeSubject) {
            $gradeBook = $this->createGradeBookFromSubject($gradeSubject);
            if ($gradeBook) {
                $createdCount++;
                $details[] = [
                    'grade_book_id' => $gradeBook->id,
                    'grade_id' => $gradeSubject->grade_id,
                    'grade_name' => $gradeSubject->grade?->full_name,
                    'subject_id' => $gradeSubject->subject_id,
                    'subject_name' => $gradeSubject->subject?->name,
                    'status' => 'created',
                ];
            }
        }

        return [
            'created_count' => $createdCount,
            'details' => $details,
        ];
    }

    private function createGradeBookFromSubject(GradeSubject $gradeSubject): ?GradeBookSession
    {
        $grade = $gradeSubject->grade;
        $subject = $gradeSubject->subject;

        if (! $grade || ! $subject) {
            return null;
        }

        $gradeBook = GradeBookSession::create([
            'institution_id' => $grade->institution_id,
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $grade->academic_year_id,
            'created_by' => Auth::id(),
            'status' => 'active',
            'title' => null,
        ]);

        $this->initCalculatedColumns($gradeBook);
        $this->calculationService->recalculateSession($gradeBook->id);

        return $gradeBook;
    }

    private function initCalculatedColumns(GradeBookSession $gradeBook): void
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

    public function findOrphaned(array $filters)
    {
        $query = GradeBookSession::with(['grade', 'subject', 'academicYear'])
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('grade_subjects')
                    ->whereColumn('grade_subjects.grade_id', 'grade_book_sessions.grade_id')
                    ->whereColumn('grade_subjects.subject_id', 'grade_book_sessions.subject_id');
            })
            ->whereNull('deleted_at');

        if (isset($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (isset($filters['academic_year_id'])) {
            $query->where('academic_year_id', $filters['academic_year_id']);
        }

        return $query->get();
    }
}
