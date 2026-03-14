<?php

namespace App\Services;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookAuditLog;
use Illuminate\Support\Collection;

class StudentAbsenceService
{
    /**
     * Mark student as absent for a specific exam
     */
    public function markAbsent(
        int $cellId,
        string $absenceReason = null,
        string $notes = null,
        int $recordedBy = null
    ): GradeBookCell {
        $cell = GradeBookCell::findOrFail($cellId);
        
        $cell->update([
            'is_present' => false,
            'score' => null,
            'percentage' => null,
            'grade_mark' => null,
            'absence_reason' => $absenceReason,
            'notes' => $notes,
            'recorded_by' => $recordedBy,
            'recorded_at' => now(),
        ]);

        // Log the absence
        if ($recordedBy) {
            GradeBookAuditLog::create([
                'grade_book_session_id' => $cell->column->grade_book_session_id,
                'student_id' => $cell->student_id,
                'grade_book_column_id' => $cell->grade_book_column_id,
                'user_id' => $recordedBy,
                'action_type' => 'absence_marked',
                'old_is_present' => true,
                'new_is_present' => false,
                'notes' => $absenceReason ? "Qayıb səbəbi: {$absenceReason}" : 'Şagird qayıb',
            ]);
        }

        return $cell->fresh();
    }

    /**
     * Mark student as present and set score
     */
    public function markPresent(
        int $cellId,
        float $score,
        string $notes = null,
        int $recordedBy = null
    ): GradeBookCell {
        $cell = GradeBookCell::findOrFail($cellId);
        $column = $cell->column;

        $percentage = ($score / $column->max_score) * 100;
        $gradeMark = $this->convertScoreToGrade($score);

        $wasAbsent = !$cell->is_present;

        $cell->update([
            'is_present' => true,
            'score' => $score,
            'percentage' => $percentage,
            'grade_mark' => $gradeMark,
            'absence_reason' => null,
            'notes' => $notes,
            'recorded_by' => $recordedBy,
            'recorded_at' => now(),
        ]);

        // Log the change
        if ($recordedBy && $wasAbsent) {
            GradeBookAuditLog::create([
                'grade_book_session_id' => $column->grade_book_session_id,
                'student_id' => $cell->student_id,
                'grade_book_column_id' => $cell->grade_book_column_id,
                'user_id' => $recordedBy,
                'action_type' => 'presence_marked',
                'old_is_present' => false,
                'new_is_present' => true,
                'new_score' => $score,
                'notes' => 'Şagird iştirak etdi',
            ]);
        }

        return $cell->fresh();
    }

    /**
     * Get absence statistics for a grade book
     */
    public function getAbsenceStats(int $gradeBookSessionId): array
    {
        $columns = GradeBookColumn::where('grade_book_session_id', $gradeBookSessionId)
            ->where('column_type', 'input')
            ->pluck('id');

        $totalExams = $columns->count();

        $absences = GradeBookCell::whereIn('grade_book_column_id', $columns)
            ->where('is_present', false)
            ->selectRaw('
                student_id,
                COUNT(*) as absence_count,
                GROUP_CONCAT(DISTINCT absence_reason) as reasons
            ')
            ->groupBy('student_id')
            ->get()
            ->keyBy('student_id');

        $students = \App\Models\Student::whereIn('id', $absences->keys())
            ->get()
            ->keyBy('id');

        $stats = [];
        foreach ($absences as $studentId => $absence) {
            $student = $students[$studentId] ?? null;
            if ($student) {
                $stats[] = [
                    'student_id' => $studentId,
                    'student_name' => "{$student->last_name} {$student->first_name}",
                    'absence_count' => $absence->absence_count,
                    'total_exams' => $totalExams,
                    'absence_rate' => round(($absence->absence_count / $totalExams) * 100, 2),
                    'reasons' => array_filter(explode(',', $absence->reasons)),
                ];
            }
        }

        // Sort by absence count descending
        usort($stats, fn($a, $b) => $b['absence_count'] <=> $a['absence_count']);

        return [
            'total_exams' => $totalExams,
            'students_with_absences' => count($stats),
            'total_absences' => $absences->sum('absence_count'),
            'student_stats' => $stats,
        ];
    }

    /**
     * Get absence history for a specific student
     */
    public function getStudentAbsenceHistory(int $studentId, int $gradeBookSessionId): Collection
    {
        return GradeBookCell::with(['column'])
            ->whereHas('column', function ($q) use ($gradeBookSessionId) {
                $q->where('grade_book_session_id', $gradeBookSessionId);
            })
            ->where('student_id', $studentId)
            ->where('is_present', false)
            ->orderBy('recorded_at', 'desc')
            ->get()
            ->map(function ($cell) {
                return [
                    'column_id' => $cell->grade_book_column_id,
                    'column_label' => $cell->column->column_label,
                    'semester' => $cell->column->semester,
                    'absence_reason' => $cell->absence_reason,
                    'recorded_at' => $cell->recorded_at,
                    'notes' => $cell->notes,
                ];
            });
    }

    /**
     * Get frequent absentees (students with high absence rate)
     */
    public function getFrequentAbsentees(int $gradeBookSessionId, float $threshold = 20.0): array
    {
        $stats = $this->getAbsenceStats($gradeBookSessionId);

        return array_filter($stats['student_stats'], function ($student) use ($threshold) {
            return $student['absence_rate'] >= $threshold;
        });
    }

    /**
     * Bulk mark absences
     */
    public function bulkMarkAbsences(
        int $columnId,
        array $studentIds,
        string $absenceReason = null,
        int $recordedBy = null
    ): array {
        $column = GradeBookColumn::findOrFail($columnId);
        $results = [
            'marked' => 0,
            'errors' => [],
        ];

        foreach ($studentIds as $studentId) {
            try {
                $cell = GradeBookCell::firstOrCreate(
                    [
                        'grade_book_column_id' => $columnId,
                        'student_id' => $studentId,
                    ],
                    ['is_present' => true]
                );

                $this->markAbsent($cell->id, $absenceReason, null, $recordedBy);
                $results['marked']++;
            } catch (\Exception $e) {
                $results['errors'][] = "Student {$studentId}: " . $e->getMessage();
            }
        }

        return $results;
    }

    /**
     * Convert score to grade (5-point scale)
     */
    protected function convertScoreToGrade(float $score): int
    {
        if ($score >= 80) return 5;
        if ($score >= 60) return 4;
        if ($score >= 30) return 3;
        return 2;
    }
}
