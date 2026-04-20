<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\SchoolAttendance;
use App\Models\User;
use Carbon\Carbon;

/**
 * Aggregated statistics for school-level attendance data.
 *
 * Covers: period stats with trend, daily / weekly / monthly summaries,
 * per-grade breakdowns, and school-grade stats.
 */
class SchoolAttendanceStatsService
{
    public function __construct(
        private readonly SchoolAttendanceCalculator $calculator,
        private readonly SchoolAttendanceScopeFilter $scope,
    ) {}

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Aggregate ClassBulkAttendance stats for a date range, with trend comparison.
     *
     * @param array{school_id?: int|null, start_date?: string, end_date?: string} $filters
     */
    public function getStats(array $filters, User $user): array
    {
        $startDate = $filters['start_date'] ?? Carbon::now()->startOfMonth()->format('Y-m-d');
        $endDate = $filters['end_date'] ?? Carbon::now()->format('Y-m-d');

        $query = ClassBulkAttendance::query();

        if (! empty($filters['school_id'])) {
            $query->where('institution_id', $filters['school_id']);
        }

        $query->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate);

        $this->scope->apply($query, $user, 'institution_id');

        $records = $query->get();

        $expectedWorkingDays = $this->countWeekdays($startDate, $endDate);

        $stats = $this->aggregateStats($records, $expectedWorkingDays);
        $stats = array_merge($stats, $this->buildTrend($filters, $user, $startDate, $endDate, $stats['average_attendance']));

        return $stats;
    }

    /**
     * Daily report summary using legacy SchoolAttendance model.
     */
    public function getDailyReport(string $date, User $user): array
    {
        $query = SchoolAttendance::with(['school:id,name'])
            ->whereDate('date', $date);

        $this->scope->apply($query, $user);

        $records = $query->get();

        return [
            'date' => $date,
            'total_records' => $records->count(),
            'total_students' => $records->sum('start_count'),
            'total_present' => $records->sum('end_count'),
            'total_absent' => $records->sum('start_count') - $records->sum('end_count'),
            'average_attendance' => $records->avg('attendance_rate') ?? 0,
            'schools_reported' => $records->pluck('school_id')->unique()->count(),
        ];
    }

    /**
     * Weekly summary with per-day breakdown using legacy SchoolAttendance model.
     */
    public function getWeeklySummary(string $startDate, string $endDate, User $user): array
    {
        $query = SchoolAttendance::with(['school:id,name'])
            ->whereBetween('date', [$startDate, $endDate]);

        $this->scope->apply($query, $user);

        $records = $query->get();

        $dailyData = $records->groupBy(fn ($r) => $r->date->format('Y-m-d'))
            ->map(fn ($dayRecords) => [
                'total_students' => $dayRecords->sum('start_count'),
                'total_present' => $dayRecords->sum('end_count'),
                'attendance_rate' => $dayRecords->avg('attendance_rate') ?? 0,
                'schools_count' => $dayRecords->count(),
            ]);

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'total_records' => $records->count(),
            'total_students' => $records->sum('start_count'),
            'total_present' => $records->sum('end_count'),
            'average_attendance' => $records->avg('attendance_rate') ?? 0,
            'daily_breakdown' => $dailyData,
        ];
    }

    /**
     * Monthly statistics with best/worst day detection using legacy SchoolAttendance model.
     */
    public function getMonthlyStatistics(int $month, int $year, User $user): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $query = SchoolAttendance::with(['school:id,name'])
            ->whereBetween('date', [$startDate, $endDate]);

        $this->scope->apply($query, $user);

        $records = $query->get();

        $statistics = [
            'period' => $startDate->format('F Y'),
            'total_school_days' => $records->pluck('date')->unique()->count(),
            'total_records' => $records->count(),
            'total_students' => $records->sum('start_count'),
            'total_present' => $records->sum('end_count'),
            'total_absent' => $records->sum('start_count') - $records->sum('end_count'),
            'average_attendance' => round($records->avg('attendance_rate') ?? 0, 2),
            'best_day' => null,
            'worst_day' => null,
            'schools_participating' => $records->pluck('school_id')->unique()->count(),
        ];

        $dailyAverages = $records->groupBy(fn ($r) => $r->date->format('Y-m-d'))
            ->map(fn ($dayRecords, $date) => [
                'date' => $date,
                'attendance_rate' => round($dayRecords->avg('attendance_rate') ?? 0, 2),
            ])
            ->sortBy('attendance_rate');

        if ($dailyAverages->isNotEmpty()) {
            $statistics['worst_day'] = $dailyAverages->first();
            $statistics['best_day'] = $dailyAverages->last();
        }

        return $statistics;
    }

    /**
     * Per-grade attendance breakdown for a specific school.
     */
    public function getSchoolGradeStats(string $startDate, string $endDate, int $schoolId, User $user): array
    {
        $grades = Grade::where('institution_id', $schoolId)
            ->where('is_active', true)
            ->orderBy('class_level')
            ->orderBy('name')
            ->get();

        $records = ClassBulkAttendance::where('institution_id', $schoolId)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->with('grade')
            ->get();

        $gradeStats = $grades->map(fn ($grade) => $this->buildGradeStat($grade, $records));

        $schoolTotalStudentsInRecords = (int) $records->sum('total_students');
        $schoolAvgRate = $schoolTotalStudentsInRecords > 0
            ? round(
                $records->sum(fn ($r) => $this->calculator->effectiveRate($r) * max((int) $r->total_students, 1))
                / $schoolTotalStudentsInRecords,
                2
            )
            : 0.0;

        // Add weekly breakdown if period is long enough
        $weeklyBreakdown = [];
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        if ($start->diffInDays($end) >= 6) {
            $recordsByWeek = $records->groupBy(function($r) {
                return Carbon::parse($r->attendance_date)->startOfWeek()->format('Y-m-d');
            })->sortKeysDesc();

            foreach ($recordsByWeek as $weekStart => $weekRecords) {
                $wStart = Carbon::parse($weekStart);
                $wEnd = $wStart->copy()->endOfWeek()->min($end);
                
                // Adjust week start if it's before our period start
                $actualStart = $wStart->max($start);

                $weeklyBreakdown[] = [
                    'week_label' => "Həftə " . $wStart->weekOfYear . " (" . $actualStart->format('d.m') . " - " . $wEnd->format('d.m') . ")",
                    'grades' => $grades->map(fn ($grade) => $this->buildGradeStat($grade, $weekRecords)),
                ];
            }
        }

        return [
            'school_id' => $schoolId,
            'school_name' => $user->institution?->name,
            'period' => ['start_date' => $startDate, 'end_date' => $endDate],
            'summary' => [
                'total_grades' => $grades->count(),
                'total_students' => $grades->sum('student_count'),
                'total_records' => $records->count(),
                'average_attendance_rate' => $schoolAvgRate,
            ],
            'grades' => $gradeStats,
            'weekly_breakdown' => $weeklyBreakdown,
        ];
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build the main stats array from a collection of ClassBulkAttendance records.
     */
    private function aggregateStats(\Illuminate\Support\Collection $records, int $expectedWorkingDays = 0): array
    {
        $totalStudents = (int) $records->sum('total_students');
        $uniqueDays = $records->pluck('attendance_date')->unique()->count();

        $uniformRaw = (int) $records->sum('uniform_violation');

        $avgAttendance = $this->calculator->weightedRate($records);

        // effectivePresentTotal sums morning+evening (double-counts).
        // Use effectiveRate×students per record to get true daily attending count.
        $effectiveAttendingSum = $records->sum(
            fn ($r) => $this->calculator->effectiveRate($r) / 100 * max((int) $r->total_students, 1)
        );
        $presentTotal = (int) round($effectiveAttendingSum);
        $uniform = $this->calculator->uniformStats($presentTotal, $uniformRaw);

        $avgDailyAttending = $uniqueDays > 0 ? (int) round($effectiveAttendingSum / $uniqueDays) : 0;
        $missingDays = max(0, $expectedWorkingDays - $uniqueDays);

        return [
            'total_students' => $totalStudents,
            'total_present' => $records->sum('morning_present') + $records->sum('evening_present'),
            'total_absent' => ($records->sum('morning_excused') + $records->sum('morning_unexcused'))
                + ($records->sum('evening_excused') + $records->sum('evening_unexcused')),
            'total_uniform_violations' => $uniform['violations'],
            'uniform_violation_rate' => $uniform['violation_rate'],
            'uniform_compliance_rate' => $uniform['compliance_rate'],
            'average_attendance' => $avgAttendance,
            'total_days' => $uniqueDays,
            'total_records' => $records->count(),
            'avg_daily_attending' => $avgDailyAttending,
            'expected_working_days' => $expectedWorkingDays,
            'missing_days' => $missingDays,
        ];
    }

    /**
     * Count weekdays (Mon–Fri) in an inclusive date range.
     */
    private function countWeekdays(string $startDate, string $endDate): int
    {
        $current = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay();
        $count = 0;

        while ($current->lte($end)) {
            if ($current->isWeekday()) {
                $count++;
            }
            $current->addDay();
        }

        return $count;
    }

    /**
     * Compare current-period rate with an equally-long prior period and return trend info.
     */
    private function buildTrend(array $filters, User $user, string $startDate, string $endDate, float $currentRate): array
    {
        $intervalDays = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1;
        $prevEnd = Carbon::parse($startDate)->subDay()->format('Y-m-d');
        $prevStart = Carbon::parse($prevEnd)->subDays($intervalDays - 1)->format('Y-m-d');

        $prevQuery = ClassBulkAttendance::query()
            ->whereDate('attendance_date', '>=', $prevStart)
            ->whereDate('attendance_date', '<=', $prevEnd);

        if (! empty($filters['school_id'])) {
            $prevQuery->where('institution_id', $filters['school_id']);
        }

        $this->scope->apply($prevQuery, $user, 'institution_id');
        $prevRecords = $prevQuery->get();

        if ($prevRecords->isNotEmpty()) {
            $prevRate = $this->calculator->weightedRate($prevRecords);
            $diff = $currentRate - $prevRate;

            return [
                'trend_direction' => $diff > 2.0 ? 'up' : ($diff < -2.0 ? 'down' : 'stable'),
                'trend_previous_rate' => $prevRate,
            ];
        }

        return [
            'trend_direction' => $currentRate >= 90 ? 'up' : ($currentRate >= 80 ? 'stable' : 'down'),
            'trend_previous_rate' => null,
        ];
    }

    /**
     * Build stats row for one grade within getSchoolGradeStats.
     */
    private function buildGradeStat(Grade $grade, \Illuminate\Support\Collection $allRecords): array
    {
        $gradeRecords = $allRecords->where('grade_id', $grade->id);
        $recordCount = $gradeRecords->count();

        if ($recordCount === 0) {
            return [
                'grade_id' => $grade->id,
                'grade_name' => $grade->name,
                'grade_level' => $grade->class_level,
                'total_students' => (int) $grade->student_count,
                'record_count' => 0,
                'average_attendance_rate' => 0,
                'total_present' => 0,
                'total_absent' => 0,
                'uniform_violations' => 0,
            ];
        }

        $totalStudents = (int) $gradeRecords->sum('total_students');
        $weightedSum = $gradeRecords->sum(
            fn ($r) => $this->calculator->effectiveRate($r) * max((int) $r->total_students, 1)
        );

        return [
            'grade_id' => $grade->id,
            'grade_name' => $grade->name,
            'grade_level' => $grade->class_level,
            'total_students' => (int) $grade->student_count,
            'record_count' => $recordCount,
            'average_attendance_rate' => $totalStudents > 0 ? round($weightedSum / $totalStudents, 2) : 0,
            'total_present' => $gradeRecords->sum('morning_present') + $gradeRecords->sum('evening_present'),
            'total_absent' => $gradeRecords->sum('morning_excused') + $gradeRecords->sum('morning_unexcused')
                + $gradeRecords->sum('evening_excused') + $gradeRecords->sum('evening_unexcused'),
            'uniform_violations' => (int) $gradeRecords->sum('uniform_violation'),
        ];
    }
}
