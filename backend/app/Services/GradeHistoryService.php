<?php

namespace App\Services;

use App\Models\GradeBookAuditLog;
use App\Models\GradeBookCell;
use App\Models\GradeBookSession;
use Illuminate\Support\Collection;

class GradeHistoryService
{
    /**
     * Get complete grade history for a student in a grade book
     */
    public function getStudentGradeHistory(int $studentId, int $gradeBookSessionId): array
    {
        // Get all audit logs for this student
        $auditLogs = GradeBookAuditLog::with(['column', 'user'])
            ->where('student_id', $studentId)
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->orderBy('created_at', 'desc')
            ->get();

        // Get current scores
        $currentScores = GradeBookCell::with('column')
            ->whereHas('column', function ($q) use ($gradeBookSessionId) {
                $q->where('grade_book_session_id', $gradeBookSessionId);
            })
            ->where('student_id', $studentId)
            ->get();

        // Calculate semester and annual scores
        $calculationService = app(GradeCalculationService::class);
        
        $history = [
            'student_id' => $studentId,
            'grade_book_session_id' => $gradeBookSessionId,
            'current_scores' => $this->formatCurrentScores($currentScores),
            'calculated_scores' => [
                'i_semester' => $calculationService->calculateSemesterScore($studentId, 'I', $gradeBookSessionId),
                'ii_semester' => $calculationService->calculateSemesterScore($studentId, 'II', $gradeBookSessionId),
                'annual' => $calculationService->calculateAnnualScore($studentId, $gradeBookSessionId),
            ],
            'score_history' => $this->formatScoreHistory($auditLogs),
            'progression' => $this->calculateProgression($auditLogs, $studentId, $gradeBookSessionId),
            'statistics' => $this->calculateStatistics($auditLogs, $currentScores),
        ];

        return $history;
    }

    /**
     * Get score trend over time
     */
    public function getScoreTrend(int $studentId, int $gradeBookSessionId, string $semester = null): array
    {
        $query = GradeBookAuditLog::with('column')
            ->where('student_id', $studentId)
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->where('action_type', 'update')
            ->whereNotNull('new_score')
            ->orderBy('created_at', 'asc');

        if ($semester) {
            $query->whereHas('column', function ($q) use ($semester) {
                $q->where('semester', $semester);
            });
        }

        $logs = $query->get();

        $trend = [];
        $runningAverage = [];
        $scoreSum = 0;
        $scoreCount = 0;

        foreach ($logs as $log) {
            $scoreSum += $log->new_score;
            $scoreCount++;

            $trend[] = [
                'date' => $log->created_at->toDateTimeString(),
                'column' => $log->column->column_label ?? 'Unknown',
                'score' => $log->new_score,
                'running_average' => round($scoreSum / $scoreCount, 2),
            ];
        }

        // Calculate trend direction
        $trendDirection = $this->calculateTrendDirection($trend);

        return [
            'data' => $trend,
            'direction' => $trendDirection,
            'total_changes' => count($trend),
            'average_score' => $scoreCount > 0 ? round($scoreSum / $scoreCount, 2) : 0,
        ];
    }

    /**
     * Get class average comparison
     */
    public function getClassComparison(int $studentId, int $gradeBookSessionId): array
    {
        $gradeBook = GradeBookSession::with('grade.enrollments')->find($gradeBookSessionId);
        
        if (!$gradeBook) {
            return ['error' => 'Grade book not found'];
        }

        $studentIds = $gradeBook->grade->enrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        $calculationService = app(GradeCalculationService::class);

        // Calculate averages for all students
        $studentAverages = [];
        foreach ($studentIds as $sid) {
            $iSemester = $calculationService->calculateSemesterScore($sid, 'I', $gradeBookSessionId);
            $iiSemester = $calculationService->calculateSemesterScore($sid, 'II', $gradeBookSessionId);
            $annual = $calculationService->calculateAnnualScore($sid, $gradeBookSessionId);

            $studentAverages[] = [
                'student_id' => $sid,
                'i_semester' => $iSemester,
                'ii_semester' => $iiSemester,
                'annual' => $annual,
            ];
        }

        // Calculate statistics
        $iSemesterScores = array_column($studentAverages, 'i_semester');
        $iiSemesterScores = array_column($studentAverages, 'ii_semester');
        $annualScores = array_column($studentAverages, 'annual');

        $studentScores = collect($studentAverages)->firstWhere('student_id', $studentId);

        return [
            'student' => $studentScores,
            'class_average' => [
                'i_semester' => $this->calculateAverage($iSemesterScores),
                'ii_semester' => $this->calculateAverage($iiSemesterScores),
                'annual' => $this->calculateAverage($annualScores),
            ],
            'class_max' => [
                'i_semester' => max($iSemesterScores),
                'ii_semester' => max($iiSemesterScores),
                'annual' => max($annualScores),
            ],
            'class_min' => [
                'i_semester' => min($iSemesterScores),
                'ii_semester' => min($iiSemesterScores),
                'annual' => min($annualScores),
            ],
            'percentile' => $this->calculatePercentile($studentScores['annual'] ?? 0, $annualScores),
        ];
    }

    /**
     * Get grade change notifications
     */
    public function getRecentGradeChanges(int $gradeBookSessionId, int $hours = 24): array
    {
        $since = now()->subHours($hours);

        $changes = GradeBookAuditLog::with(['student', 'column', 'user'])
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->where('created_at', '>=', $since)
            ->where('action_type', 'update')
            ->whereNotNull('new_score')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'student' => [
                        'id' => $log->student_id,
                        'name' => $log->student ? "{$log->student->last_name} {$log->student->first_name}" : 'Unknown',
                    ],
                    'column' => $log->column->column_label ?? 'Unknown',
                    'old_score' => $log->old_score,
                    'new_score' => $log->new_score,
                    'change' => $log->new_score - $log->old_score,
                    'changed_by' => $log->user ? $log->user->name : 'Unknown',
                    'changed_at' => $log->created_at->toDateTimeString(),
                ];
            });

        return [
            'count' => $changes->count(),
            'changes' => $changes,
            'average_change' => $changes->avg('change'),
            'improvements' => $changes->where('change', '>', 0)->count(),
            'declines' => $changes->where('change', '<', 0)->count(),
        ];
    }

    /**
     * Format current scores
     */
    protected function formatCurrentScores(Collection $scores): array
    {
        return $scores->map(function ($cell) {
            return [
                'column_id' => $cell->grade_book_column_id,
                'column_label' => $cell->column->column_label ?? 'Unknown',
                'semester' => $cell->column->semester ?? null,
                'score' => $cell->score,
                'percentage' => $cell->percentage,
                'grade_mark' => $cell->grade_mark,
                'is_present' => $cell->is_present,
                'recorded_at' => $cell->recorded_at,
            ];
        })->toArray();
    }

    /**
     * Format score history from audit logs
     */
    protected function formatScoreHistory(Collection $logs): array
    {
        return $logs->map(function ($log) {
            return [
                'action' => $log->action_type,
                'column' => $log->column->column_label ?? 'Unknown',
                'semester' => $log->column->semester ?? null,
                'old_score' => $log->old_score,
                'new_score' => $log->new_score,
                'old_is_present' => $log->old_is_present,
                'new_is_present' => $log->new_is_present,
                'changed_by' => $log->user ? $log->user->name : 'Unknown',
                'changed_at' => $log->created_at->toDateTimeString(),
                'notes' => $log->notes,
            ];
        })->toArray();
    }

    /**
     * Calculate progression metrics
     */
    protected function calculateProgression(Collection $logs, int $studentId, int $gradeBookSessionId): array
    {
        $scoreLogs = $logs->where('action_type', 'update')->whereNotNull('new_score');
        
        if ($scoreLogs->isEmpty()) {
            return [
                'first_score' => null,
                'latest_score' => null,
                'improvement' => 0,
                'average_score' => 0,
            ];
        }

        $firstScore = $scoreLogs->last()->new_score;
        $latestScore = $scoreLogs->first()->new_score;

        return [
            'first_score' => $firstScore,
            'latest_score' => $latestScore,
            'improvement' => round($latestScore - $firstScore, 2),
            'average_score' => round($scoreLogs->avg('new_score'), 2),
        ];
    }

    /**
     * Calculate statistics
     */
    protected function calculateStatistics(Collection $logs, Collection $currentScores): array
    {
        $scoreLogs = $logs->where('action_type', 'update')->whereNotNull('new_score');
        
        if ($scoreLogs->isEmpty()) {
            return [
                'total_updates' => 0,
                'average_score' => 0,
                'highest_score' => 0,
                'lowest_score' => 0,
            ];
        }

        return [
            'total_updates' => $scoreLogs->count(),
            'unique_days' => $scoreLogs->pluck('created_at')->map->format('Y-m-d')->unique()->count(),
            'average_score' => round($scoreLogs->avg('new_score'), 2),
            'highest_score' => $scoreLogs->max('new_score'),
            'lowest_score' => $scoreLogs->min('new_score'),
            'current_scores_count' => $currentScores->whereNotNull('score')->count(),
        ];
    }

    /**
     * Calculate trend direction
     */
    protected function calculateTrendDirection(array $trend): string
    {
        if (count($trend) < 2) {
            return 'stable';
        }

        $firstHalf = array_slice($trend, 0, (int) (count($trend) / 2));
        $secondHalf = array_slice($trend, (int) (count($trend) / 2));

        $firstAvg = array_sum(array_column($firstHalf, 'score')) / count($firstHalf);
        $secondAvg = array_sum(array_column($secondHalf, 'score')) / count($secondHalf);

        $difference = $secondAvg - $firstAvg;

        if ($difference > 5) {
            return 'improving';
        } elseif ($difference < -5) {
            return 'declining';
        }

        return 'stable';
    }

    /**
     * Calculate average
     */
    protected function calculateAverage(array $values): float
    {
        $values = array_filter($values);
        if (empty($values)) {
            return 0;
        }
        return round(array_sum($values) / count($values), 2);
    }

    /**
     * Calculate percentile
     */
    protected function calculatePercentile(float $value, array $allValues): float
    {
        $allValues = array_filter($allValues);
        if (empty($allValues)) {
            return 0;
        }

        sort($allValues);
        $count = count($allValues);
        
        $below = 0;
        foreach ($allValues as $v) {
            if ($v < $value) {
                $below++;
            }
        }

        return round(($below / $count) * 100, 2);
    }
}
