<?php

namespace App\Observers;

use App\Models\GradeBookSession;
use App\Models\GradeSubject;
use Illuminate\Support\Facades\Log;

class GradeSubjectObserver
{
    /**
     * Handle the GradeSubject "created" event.
     * When a subject is assigned to a grade, auto-create a grade book.
     */
    public function created(GradeSubject $gradeSubject): void
    {
        // Only create grade books for teaching activities
        if (!$gradeSubject->is_teaching_activity) {
            Log::info("Skipping grade book creation for non-teaching activity", [
                'grade_subject_id' => $gradeSubject->id,
            ]);
            return;
        }

        $grade = $gradeSubject->grade;
        $subject = $gradeSubject->subject;

        // Validate related models exist
        if (!$grade || !$subject) {
            Log::warning("Cannot create grade book - missing grade or subject", [
                'grade_subject_id' => $gradeSubject->id,
            ]);
            return;
        }

        // Check grade is active
        if (!$grade->is_active) {
            Log::warning("Skipping grade book creation for inactive grade", [
                'grade_id' => $grade->id,
                'grade_subject_id' => $gradeSubject->id,
            ]);
            return;
        }

        // Check subject is active
        if (method_exists($subject, 'is_active') && !$subject->is_active) {
            Log::warning("Skipping grade book creation for inactive subject", [
                'subject_id' => $subject->id,
                'grade_subject_id' => $gradeSubject->id,
            ]);
            return;
        }

        $academicYearId = $grade->academic_year_id;
        $institutionId = $grade->institution_id;

        // Validate academic year exists
        if (!$academicYearId) {
            Log::warning("Cannot create grade book - grade has no academic year", [
                'grade_id' => $grade->id,
                'grade_subject_id' => $gradeSubject->id,
            ]);
            return;
        }

        // Check if grade book already exists
        $exists = GradeBookSession::where([
            'institution_id' => $institutionId,
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $academicYearId,
        ])->whereNull('deleted_at')->exists();

        if ($exists) {
            Log::info("Grade book already exists, skipping creation", [
                'grade_id' => $grade->id,
                'subject_id' => $subject->id,
                'academic_year_id' => $academicYearId,
            ]);
            return;
        }

        try {
            // Create the grade book
            $gradeBook = GradeBookSession::create([
                'institution_id' => $institutionId,
                'grade_id' => $grade->id,
                'subject_id' => $subject->id,
                'academic_year_id' => $academicYearId,
                'created_by' => auth()->id() ?? $gradeSubject->teacher_id ?? throw new \RuntimeException('Cannot auto-create grade book without authenticated user or assigned teacher'),
                'status' => 'active',
                'title' => null,
            ]);

            // Auto-create calculated columns (semester + annual)
            $this->createCalculatedColumns($gradeBook);

            Log::info("Auto-created grade book for subject assignment", [
                'grade_book_id' => $gradeBook->id,
                'grade_id' => $grade->id,
                'subject_id' => $subject->id,
                'grade_subject_id' => $gradeSubject->id,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to auto-create grade book", [
                'grade_id' => $grade->id,
                'subject_id' => $subject->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle the GradeSubject "deleted" event.
     * When a subject is removed from a grade, archive the grade book.
     */
    public function deleted(GradeSubject $gradeSubject): void
    {
        // Only process teaching activities
        if (!$gradeSubject->is_teaching_activity) {
            return;
        }

        $grade = $gradeSubject->grade;
        $subject = $gradeSubject->subject;

        if (!$grade || !$subject) {
            return;
        }

        $academicYearId = $grade->academic_year_id;

        // Find the associated grade book
        $gradeBook = GradeBookSession::where([
            'institution_id' => $grade->institution_id,
            'grade_id' => $grade->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $academicYearId,
        ])->whereNull('deleted_at')->first();

        if ($gradeBook) {
            try {
                // Soft delete the grade book (archive)
                $gradeBook->delete();

                Log::info("Auto-archived grade book due to subject removal", [
                    'grade_book_id' => $gradeBook->id,
                    'grade_id' => $grade->id,
                    'subject_id' => $subject->id,
                    'grade_subject_id' => $gradeSubject->id,
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to auto-archive grade book", [
                    'grade_book_id' => $gradeBook->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Create calculated columns for a new grade book
     */
    private function createCalculatedColumns(GradeBookSession $gradeBook): void
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
            \App\Models\GradeBookColumn::firstOrCreate(
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
                    'created_by' => $gradeBook->created_by,
                    'is_archived' => false,
                ]
            );
        }

        // Initialize calculated cells for all active students
        $calculationService = app(\App\Services\GradeCalculationService::class);
        $calculationService->recalculateSession($gradeBook->id);
    }
}
