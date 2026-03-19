<?php

namespace App\Services;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GradeCalculationService
{
    /**
     * Calculate semester score for a student
     * Formula:
     * - Only KSQ: Y = (ksq1 + ksq2 + ... + ksqn) / n
     * - KSQ + BSQ: Y = [(ksq1 + ... + ksqn)/n] * 0.4 + BSQ * 0.6
     */
    public function calculateSemesterScore(int $studentId, string $semester, int $sessionId): float
    {
        $ksqScores = GradeBookCell::whereHas('column', function ($q) use ($semester, $sessionId) {
            $q->where('semester', $semester)
                ->where('grade_book_session_id', $sessionId)
                ->where('column_type', 'input')
                ->whereHas('assessmentType', function ($at) {
                    $at->where('category', 'ksq');
                });
        })
            ->where('student_id', $studentId)
            ->where('is_present', true)
            ->whereNotNull('score')
            ->pluck('score');

        $bsqScore = GradeBookCell::whereHas('column', function ($q) use ($semester, $sessionId) {
            $q->where('semester', $semester)
                ->where('grade_book_session_id', $sessionId)
                ->where('column_type', 'input')
                ->whereHas('assessmentType', function ($at) {
                    $at->where('category', 'bsq');
                });
        })
            ->where('student_id', $studentId)
            ->where('is_present', true)
            ->whereNotNull('score')
            ->value('score');

        if ($ksqScores->isEmpty() && !$bsqScore) {
            return 0;
        }

        $ksqAverage = $ksqScores->avg() ?? 0;

        if ($bsqScore) {
            return ($ksqAverage * 0.4) + ($bsqScore * 0.6);
        } else {
            return $ksqAverage;
        }
    }

    /**
     * Calculate annual score
     * Formula: (I Semester + II Semester) / 2
     */
    public function calculateAnnualScore(float $semester1Score, float $semester2Score): float
    {
        return ($semester1Score + $semester2Score) / 2;
    }

    /**
     * Convert score to grade mark (2-5 scale)
     * Rules: 0-30=2, 30-60=3, 60-80=4, 80-100=5
     */
    public function convertScoreToGrade(float $score): int
    {
        if ($score >= 80) return 5;
        if ($score >= 60) return 4;
        if ($score >= 30) return 3;
        return 2;
    }

    /**
     * Update calculated columns for a student in a session
     */
    public function updateCalculatedColumns(int $studentId, int $sessionId): void
    {
        DB::transaction(function () use ($studentId, $sessionId) {
            // Calculate I Semester
            $semester1Score = $this->calculateSemesterScore($studentId, 'I', $sessionId);
            $this->updateCalculatedCell($studentId, $sessionId, 'I', 'I_YARIMIL_BAL', $semester1Score);
            $this->updateCalculatedCell($studentId, $sessionId, 'I', 'I_YARIMIL_QIYMET', $this->convertScoreToGrade($semester1Score));

            // Calculate II Semester
            $semester2Score = $this->calculateSemesterScore($studentId, 'II', $sessionId);
            $this->updateCalculatedCell($studentId, $sessionId, 'II', 'II_YARIMIL_BAL', $semester2Score);
            $this->updateCalculatedCell($studentId, $sessionId, 'II', 'II_YARIMIL_QIYMET', $this->convertScoreToGrade($semester2Score));

            // Calculate Annual (only if both semesters have scores)
            if ($semester1Score > 0 || $semester2Score > 0) {
                // Use the available semester score if one is missing
                $s1 = $semester1Score > 0 ? $semester1Score : $semester2Score;
                $s2 = $semester2Score > 0 ? $semester2Score : $semester1Score;
                $annualScore = $this->calculateAnnualScore($s1, $s2);
                $this->updateCalculatedCell($studentId, $sessionId, 'I', 'ILLIK_BAL', $annualScore, true);
                $this->updateCalculatedCell($studentId, $sessionId, 'I', 'ILLIK_QIYMET', $this->convertScoreToGrade($annualScore), true);
            }
        });
    }

    /**
     * Update or create a calculated cell
     */
    private function updateCalculatedCell(int $studentId, int $sessionId, string $semester, string $label, float $score, bool $applyToAllSemesters = false): void
    {
        $displayOrder = $this->getDisplayOrderForLabel($label);

        $columns = GradeBookColumn::query()
            ->where('grade_book_session_id', $sessionId)
            ->where('column_type', 'calculated')
            ->where(function ($q) use ($label, $displayOrder) {
                $q->where('column_label', $label)
                    ->orWhere('display_order', $displayOrder);
            })
            ->get();

        if ($columns->isEmpty()) {
            $columns = collect([
                GradeBookColumn::create([
                    'grade_book_session_id' => $sessionId,
                    'column_label' => $label,
                    'assessment_type_id' => 1,
                    'semester' => $semester,
                    'assessment_date' => now(),
                    'max_score' => 100,
                    'display_order' => $displayOrder,
                    'column_type' => 'calculated',
                    'created_by' => auth()->id() ?? throw new \RuntimeException('Authenticated user required for grade book column creation'),
                ])
            ]);
        }

        $upperLabel = strtoupper($label);
        $isGradeColumn = str_ends_with($upperLabel, '_QIYMET') || str_contains($upperLabel, 'QIYMET') || str_contains($upperLabel, 'QIYM');
        $normalizedGrade = $isGradeColumn ? (int) round($score) : $this->convertScoreToGrade($score);

        foreach ($columns as $column) {
            GradeBookCell::updateOrCreate(
                [
                    'grade_book_column_id' => $column->id,
                    'student_id' => $studentId,
                ],
                [
                    'score' => $isGradeColumn ? $normalizedGrade : $score,
                    'percentage' => $isGradeColumn ? null : $score,
                    'grade_mark' => $normalizedGrade,
                    'is_present' => true,
                    'recorded_by' => auth()->id(),
                    'recorded_at' => now(),
                ]
            );
        }
    }

    /**
     * Get display order for calculated column labels
     */
    private function getDisplayOrderForLabel(string $label): int
    {
        $orders = [
            'I_YARIMIL_BAL' => 900,
            'I_YARIMIL_QIYMET' => 901,
            'II_YARIMIL_BAL' => 902,
            'II_YARIMIL_QIYMET' => 903,
            'ILLIK_BAL' => 904,
            'ILLIK_QIYMET' => 905,
        ];

        return $orders[$label] ?? 900;
    }

    /**
     * Recalculate all students in a session
     */
    public function recalculateSession(int $sessionId): void
    {
        $session = GradeBookSession::with(['grade.studentEnrollments.student'])->find($sessionId);

        if (!$session || !$session->grade) {
            return;
        }

        $studentIds = $session->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        if (empty($studentIds)) {
            $studentIds = GradeBookCell::query()
                ->whereHas('column', function ($q) use ($sessionId) {
                    $q->where('grade_book_session_id', $sessionId);
                })
                ->distinct()
                ->pluck('student_id')
                ->toArray();
        }

        foreach ($studentIds as $studentId) {
            $this->updateCalculatedColumns($studentId, $sessionId);
        }
    }

    /**
     * Get score color based on value (for UI indicators)
     */
    public function getScoreColor(float $score): string
    {
        if ($score >= 80) return 'green';    // Grade 5
        if ($score >= 60) return 'yellow';     // Grade 4
        if ($score >= 30) return 'orange';   // Grade 3
        return 'red';                          // Grade 2
    }

    /**
     * Get score background class for UI
     */
    public function getScoreBackgroundClass(float $score): string
    {
        if ($score >= 80) return 'bg-green-100';
        if ($score >= 60) return 'bg-yellow-100';
        if ($score >= 30) return 'bg-orange-100';
        return 'bg-red-100';
    }
}
