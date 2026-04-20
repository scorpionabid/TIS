<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceStatsService
{
    use AttendanceScopeTrait;

    /**
     * Build aggregated attendance overview for the given user scope and filters.
     */
    public function getOverview(User $user, array $filters): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        
        $schoolIds = $scope['school_ids'];
        if (empty($schoolIds)) {
            return $this->formatEmptyOverview($scope, $startDate, $endDate);
        }

        $educationProgram = $filters['education_program'] ?? null;

        // Aggregate per school
        $query = ClassBulkAttendance::selectRaw(
            'class_bulk_attendance.institution_id,
             COUNT(DISTINCT attendance_date) AS reported_days,
             COUNT(DISTINCT class_bulk_attendance.grade_id) AS reported_classes,
             SUM(morning_present)            AS total_morning_present,
             SUM(evening_present)            AS total_evening_present,
             SUM(uniform_violation)          AS total_uniform_violations,
             SUM(total_students)             AS total_possible,
             AVG(daily_attendance_rate)      AS avg_rate,
             MAX(morning_recorded_at)        AS last_morning_recorded,
             MAX(evening_recorded_at)        AS last_evening_recorded'
        )
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate);

        if ($educationProgram && $educationProgram !== 'all') {
            $query->where('grades.education_program', $educationProgram);
        }

        $schoolAggregates = $query->groupBy('class_bulk_attendance.institution_id')->get()->keyBy('institution_id');

        // Trend aggregates
        $trendAggregates = ClassBulkAttendance::selectRaw('attendance_date, AVG(daily_attendance_rate) AS avg_rate')
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->groupBy('attendance_date')
            ->get()
            ->keyBy(fn ($r) => (string) $r->attendance_date);

        $gradeStudentCounts = Grade::whereIn('institution_id', $schoolIds)
            ->get(['id', 'institution_id', 'student_count'])
            ->groupBy('institution_id')
            ->map(fn (Collection $grades) => [
                'student_total' => (int) $grades->sum('student_count'),
                'grades' => $grades,
            ]);

        $sectorNamesById = $scope['sectors']->pluck('name', 'id');

        $schoolStats = $this->buildSchoolStats(
            $scope['schools'],
            $schoolAggregates,
            $gradeStudentCounts,
            $scope['school_days'],
            $sectorNamesById
        );

        $sectorStats = $this->buildSectorStats(
            $scope['sectors'],
            $schoolStats,
            $startDate,
            $endDate
        );

        return [
            'summary' => $this->buildSummary($schoolStats, $sectorStats, $startDate, $endDate, $scope['school_days']),
            'trends' => $this->buildTrends($trendAggregates, $startDate, $endDate),
            'sectors' => array_values($sectorStats),
            'schools' => array_values($schoolStats),
            'alerts' => $this->buildAlerts($schoolStats),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'region_id' => $scope['region']?->id,
                'sector_id' => $scope['active_sector']?->id ?? $filters['sector_id'] ?? null,
            ],
            'context' => [
                'region' => $scope['region'] ? ['id' => $scope['region']->id, 'name' => $scope['region']->name] : null,
                'active_sector' => $scope['active_sector'] ? ['id' => $scope['active_sector']->id, 'name' => $scope['active_sector']->name] : null,
            ],
        ];
    }

    /**
     * Get detailed breakdown for a single school.
     */
    public function getSchoolClassBreakdown(User $user, Institution $school, array $filters): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        
        if (! in_array($school->id, $scope['school_ids'])) {
            throw ValidationException::withMessages(['school_id' => 'Bu məktəbin məlumatlarına baxmaq icazəniz yoxdur.']);
        }

        $gradeMap = Grade::where('institution_id', $school->id)->get(['id', 'name', 'class_level', 'student_count'])->keyBy('id');
        $records = ClassBulkAttendance::where('institution_id', $school->id)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->get();

        $classStats = $this->buildClassStats($records, $gradeMap, $scope['school_days']);

        return [
            'school' => ['id' => $school->id, 'name' => $school->name],
            'summary' => $this->buildSchoolSummary($classStats, $scope['school_days'], $startDate, $endDate),
            'classes' => array_values($classStats),
            'period' => ['start_date' => $startDate, 'end_date' => $endDate, 'expected_school_days' => $scope['school_days']],
        ];
    }

    /**
     * Aggregates stats into school-level objects.
     */
    protected function buildSchoolStats($schools, $aggregates, $studentCounts, $days, $sectorNames): array
    {
        $stats = [];
        foreach ($schools as $school) {
            $agg = $aggregates->get($school->id);
            $count = $studentCounts->get($school->id);

            $reported = $agg ? (int) $agg->reported_days : 0;
            $missing = max(0, $days - $reported);
            $studentTotal = $count ? $count['student_total'] : 0;
            $attendanceRate = $agg ? round($agg->avg_rate, 2) : 0;
            $presentTotal = $agg ? (int) $agg->total_morning_present + (int) $agg->total_evening_present : 0;
            $uniformViolations = $agg ? (int) $agg->total_uniform_violations : 0;
            $reportedClasses = $agg ? (int) $agg->reported_classes : 0;
            $possibleAttendance = $studentTotal * max($reported, 1);
            $uniformComplianceRate = $possibleAttendance > 0
                ? round((($possibleAttendance - $uniformViolations) / $possibleAttendance) * 100, 2)
                : 0;
            $lastSubmission = $agg ? ($agg->last_evening_recorded ?? $agg->last_morning_recorded) : null;

            $warnings = [];
            if ($missing > 0) {
                $warnings[] = 'reports_missing';
            }
            if ($reported > 0 && $attendanceRate < 70) {
                $warnings[] = 'low_attendance';
            }

            $stats[$school->id] = [
                'school_id' => $school->id,
                'id' => $school->id,
                'name' => $school->name,
                'sector_id' => $school->parent_id,
                'sector_name' => $sectorNames->get($school->parent_id, 'Naməlum'),
                'average_attendance_rate' => $attendanceRate,
                'attendance_rate' => $attendanceRate,
                'reported_days' => $reported,
                'missing_days' => $missing,
                'expected_school_days' => $days,
                'total_students' => $studentTotal,
                'student_count' => $studentTotal,
                'reported_classes' => $reportedClasses,
                'present_total' => $presentTotal,
                'total_uniform_violations' => $uniformViolations,
                'uniform_compliance_rate' => $uniformComplianceRate,
                'last_submission_at' => $lastSubmission,
                'last_morning_recorded' => $agg ? $agg->last_morning_recorded : null,
                'last_evening_recorded' => $agg ? $agg->last_evening_recorded : null,
                'is_compliant' => $missing === 0,
                'warnings' => $warnings,
            ];
        }
        return $stats;
    }

    /**
     * Aggregates school stats into sector-level objects.
     */
    protected function buildSectorStats($sectors, $schoolStats, $start, $end): array
    {
        $stats = [];
        foreach ($sectors as $sector) {
            $sectorSchools = array_filter($schoolStats, fn($s) => $s['sector_id'] == $sector->id);
            $totalSchools = count($sectorSchools);
            
            $avgRate = $totalSchools > 0 ? array_sum(array_column($sectorSchools, 'attendance_rate')) / $totalSchools : 0;
            $compliantCount = count(array_filter($sectorSchools, fn($s) => $s['is_compliant']));

            $stats[$sector->id] = [
                'sector_id' => $sector->id,
                'id' => $sector->id,
                'name' => $sector->name,
                'school_count' => $totalSchools,
                'compliant_schools' => $compliantCount,
                'average_rate' => round($avgRate, 2),
                'compliance_percentage' => $totalSchools > 0 ? round(($compliantCount / $totalSchools) * 100, 2) : 0,
            ];
        }
        return $stats;
    }

    /**
     * Build top-level summary for the period.
     */
    protected function buildSummary($schoolStats, $sectorStats, $start, $end, $days): array
    {
        $totalSchools = count($schoolStats);
        $totalStudents = array_sum(array_column($schoolStats, 'student_count'));
        $attendingStudents = 0;
        $missingReports = 0;
        $totalReportedDays = 0;

        foreach ($schoolStats as $stat) {
            $attendingStudents += ($stat['attendance_rate'] / 100) * $stat['student_count'];
            $totalReportedDays += $stat['reported_days'];
            if ($stat['reported_days'] === 0) {
                $missingReports++;
            }
        }

        $avgRate = $totalStudents > 0 ? ($attendingStudents / $totalStudents) * 100 : 0;
        
        return [
            'total_schools' => $totalSchools,
            'total_sectors' => count($sectorStats),
            'total_students' => $totalStudents,
            'attending_students' => (int) round($attendingStudents),
            'reported_days' => $totalReportedDays,
            'average_attendance_rate' => round($avgRate, 2),
            'schools_missing_reports' => $missingReports,
            'period' => [
                'start_date' => $start,
                'end_date' => $end,
                'school_days' => $days,
            ],
        ];
    }

    /**
     * Build trend data points for chart.
     */
    protected function buildTrends($trendAggregates, $start, $end): array
    {
        $trends = [];
        $current = CarbonImmutable::parse($start);
        $stop = CarbonImmutable::parse($end);

        while ($current->lte($stop)) {
            $date = $current->toDateString();
            $agg = $trendAggregates->get($date);
            $trends[] = [
                'date' => $date,
                'rate' => $agg ? round($agg->avg_rate, 2) : null,
            ];
            $current = $current->addDay();
        }
        return $trends;
    }

    /**
     * Generate alerts for schools with significant attendance drops or missing data.
     */
    protected function buildAlerts($schoolStats): array
    {
        $alerts = [];
        foreach ($schoolStats as $school) {
            if ($school['missing_days'] > 2) {
                $alerts[] = [
                    'type' => 'critical',
                    'school_id' => $school['id'],
                    'message' => "{$school['name']} hesabat daxil etmir ({$school['missing_days']} gün).",
                ];
            } elseif ($school['attendance_rate'] < 70 && $school['reported_days'] > 0) {
                $alerts[] = [
                    'type' => 'warning',
                    'school_id' => $school['id'],
                    'message' => "{$school['name']} - Aşağı davamiyyət: {$school['attendance_rate']}%",
                ];
            }
        }
        return $alerts;
    }

    /**
     * Aggregates records into class-level statistics.
     */
    protected function buildClassStats($records, $gradeMap, $days): array
    {
        $stats = [];
        $grouped = $records->groupBy('grade_id');

        foreach ($gradeMap as $id => $grade) {
            $classRecords = $grouped->get($id, collect());
            $reported = $classRecords->count();
            $avgRate = $reported > 0 ? round($classRecords->avg('daily_attendance_rate'), 2) : 0;
            $presentTotal = (int) $classRecords->sum('morning_present') + (int) $classRecords->sum('evening_present');
            $uniformViolations = (int) $classRecords->sum('uniform_violation');
            $studentCount = (int) $grade->student_count;
            $possibleAttendance = $studentCount * max($reported, 1);
            $uniformComplianceRate = $possibleAttendance > 0
                ? round((($possibleAttendance - $uniformViolations) / $possibleAttendance) * 100, 2)
                : 0;
            $firstRecordedAt = $reported > 0 ? $classRecords->min('morning_recorded_at') : null;
            $lastRecordedAt = $reported > 0 ? ($classRecords->max('evening_recorded_at') ?? $classRecords->max('morning_recorded_at')) : null;

            $warnings = [];
            if ($reported === 0 && $days > 0) {
                $warnings[] = 'reports_missing';
            } elseif ($reported > 0 && $avgRate < 70) {
                $warnings[] = 'low_attendance';
            }

            $stats[$id] = [
                'grade_id' => $id,
                'id' => $id,
                'name' => $grade->name,
                'class_level' => $grade->class_level,
                'level' => $grade->class_level,
                'student_count' => $studentCount,
                'records' => $reported,
                'reported_days' => $reported,
                'expected_school_days' => $days,
                'missing_days' => max(0, $days - $reported),
                'average_attendance_rate' => $avgRate,
                'average_rate' => $avgRate,
                'present_total' => $presentTotal,
                'total_uniform_violations' => $uniformViolations,
                'uniform_compliance_rate' => $uniformComplianceRate,
                'warnings' => $warnings,
                'first_recorded_at' => $firstRecordedAt,
                'last_recorded_at' => $lastRecordedAt,
            ];
        }
        return $stats;
    }

    /**
     * Build summary for a single school.
     */
    protected function buildSchoolSummary($classStats, $days, $start, $end): array
    {
        $totalClasses = count($classStats);
        $reportedClasses = count(array_filter($classStats, fn($c) => $c['reported_days'] > 0));
        $avgRate = $totalClasses > 0
            ? array_sum(array_column($classStats, 'average_attendance_rate')) / $totalClasses
            : 0;
        $presentTotal = (int) array_sum(array_column($classStats, 'present_total'));
        $uniformViolations = (int) array_sum(array_column($classStats, 'total_uniform_violations'));
        $totalStudents = (int) array_sum(array_column($classStats, 'student_count'));
        $totalPossible = $totalStudents * max($reportedClasses, 1);
        $uniformComplianceRate = $totalPossible > 0
            ? round((($totalPossible - $uniformViolations) / $totalPossible) * 100, 2)
            : 0;

        return [
            'total_classes' => $totalClasses,
            'reported_classes' => $reportedClasses,
            'average_attendance_rate' => round($avgRate, 2),
            'average_rate' => round($avgRate, 2),
            'attending_students' => $presentTotal,
            'present_total' => $presentTotal,
            'total_uniform_violations' => $uniformViolations,
            'uniform_compliance_rate' => $uniformComplianceRate,
            'period_days' => $days,
            'period' => [
                'start_date' => $start,
                'end_date' => $end,
                'school_days' => $days,
            ],
        ];
    }

    /**
     * Formats an empty overview response.
     */
    protected function formatEmptyOverview(array $scope, string $start, string $end): array
    {
        return [
            'summary' => [
                'total_schools' => 0,
                'total_sectors' => count($scope['sectors']),
                'total_students' => 0,
                'attending_students' => 0,
                'reported_days' => 0,
                'average_attendance_rate' => 0,
                'schools_missing_reports' => 0,
                'period' => [
                    'start_date' => $start,
                    'end_date' => $end,
                    'school_days' => $scope['school_days'],
                ],
            ],
            'trends' => [],
            'sectors' => [],
            'schools' => [],
            'alerts' => ['missing_reports' => [], 'low_attendance' => []],
            'filters' => ['start_date' => $start, 'end_date' => $end],
        ];
    }

    /**
     * Get schools with missing reports.
     */
    public function getSchoolsWithMissingReports(User $user, array $filters): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        if (empty($scope['school_ids'])) return ['summary' => ['total_schools' => 0], 'schools' => []];

        $reportCounts = DB::table('class_bulk_attendance')
            ->whereIn('institution_id', $scope['school_ids'])
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->selectRaw('institution_id, COUNT(DISTINCT attendance_date) as c')
            ->groupBy('institution_id')
            ->pluck('c', 'institution_id')
            ->all();

        // Optimized: Fetch last report dates for all schools in one query
        $lastReports = ClassBulkAttendance::whereIn('institution_id', $scope['school_ids'])
            ->whereDate('attendance_date', '<', $startDate)
            ->selectRaw('institution_id, MAX(attendance_date) as last_date')
            ->groupBy('institution_id')
            ->pluck('last_date', 'institution_id')
            ->all();

        $missing = [];
        foreach ($scope['schools'] as $school) {
            $reported = (int)($reportCounts[$school->id] ?? 0);
            $baseline = $scope['school_days'];
            if ($reported < $baseline) {
                $lastDate = $lastReports[$school->id] ?? null;
                $missing[] = [
                    'school_id' => $school->id,
                    'name' => $school->name,
                    'reported_days' => $reported,
                    'missing_days' => $baseline - $reported,
                    'last_report_date' => $lastDate instanceof \DateTimeInterface ? $lastDate->format('Y-m-d') : ((string)$lastDate ?: 'Hesabat yoxdur'),
                ];
            }
        }

        return [
            'summary' => [
                'total_schools' => count($scope['school_ids']),
                'missing_count' => count($missing),
                'period' => ['start_date' => $startDate, 'end_date' => $endDate],
            ],
            'schools' => $missing,
        ];
    }

    /**
     * Get grade level attendance statistics aggregated by class level (1-11).
     */
    public function getGradeLevelStats(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        if (empty($scope['school_ids'])) return $this->formatEmptyGradeLevelStats($scope, $startDate, $endDate);

        $educationProgram = $filters['education_program'] ?? null;

        $gradeQuery = Grade::whereIn('institution_id', $scope['school_ids'])->where('is_active', true);
        if ($educationProgram && $educationProgram !== 'all') $gradeQuery->where('education_program', $educationProgram);
        $allGrades = $gradeQuery->get(['id', 'institution_id', 'class_level', 'student_count']);

        $levelSummaries = $allGrades->groupBy('class_level')->map(fn($grades) => [
            'student_count' => $grades->sum('student_count'),
            'school_count' => $grades->pluck('institution_id')->unique()->count(),
            'schools' => $grades->groupBy('institution_id')->map(fn($gs, $sid) => [
                'school_id' => $sid,
                'student_count' => $gs->sum('student_count'),
            ])->values()->toArray(),
        ]);

        $attendanceAggs = ClassBulkAttendance::selectRaw('
            grades.class_level,
            SUM(CASE WHEN morning_recorded_at IS NOT NULL THEN (CASE WHEN morning_present = 0 AND morning_excused = 0 AND morning_unexcused = 0 THEN class_bulk_attendance.total_students ELSE morning_present END) ELSE 0 END) AS eff_morning_present,
            SUM(CASE WHEN evening_recorded_at IS NOT NULL THEN (CASE WHEN evening_present = 0 AND evening_excused = 0 AND evening_unexcused = 0 THEN class_bulk_attendance.total_students ELSE evening_present END) ELSE 0 END) AS eff_evening_present,
            SUM(daily_attendance_rate * class_bulk_attendance.total_students) as weighted_rates,
            SUM(class_bulk_attendance.total_students) as weighted_denominator,
            COUNT(DISTINCT class_bulk_attendance.institution_id) AS reported_school_count,
            SUM(uniform_violation) AS total_uniform_violations
        ')
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $scope['school_ids'])
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->groupBy('grades.class_level')
            ->get()
            ->keyBy('class_level');

        $rows = [];
        for ($level = 0; $level <= 11; $level++) {
            $summary = $levelSummaries->get($level, ['student_count' => 0, 'school_count' => 0, 'schools' => []]);
            $agg = $attendanceAggs->get($level);
            
            $avgRate = ($agg && $agg->weighted_denominator > 0) ? round($agg->weighted_rates / $agg->weighted_denominator, 2) : 0;
            $totalPresent = $agg ? ((int)$agg->eff_morning_present + (int)$agg->eff_evening_present) : 0;
            $uniformCompliance = 0;
            if ($totalPresent > 0) {
                $violations = min((int)$agg->total_uniform_violations, $totalPresent);
                $uniformCompliance = round(100 - ($violations / $totalPresent * 100), 2);
            }

            $rows[] = [
                'class_level' => $level,
                'class_level_display' => $this->getRomanNumeral($level),
                'student_count' => $summary['student_count'],
                'school_count' => $summary['school_count'],
                'reported_school_count' => $agg ? (int)$agg->reported_school_count : 0,
                'average_attendance_rate' => $avgRate,
                'uniform_compliance_rate' => $uniformCompliance,
                'present_total' => $totalPresent,
                'schools' => $summary['schools'],
            ];
        }

        $overallWeight = array_sum(array_column($rows, 'student_count'));
        $overallWeightedRate = 0;
        foreach ($rows as $row) { if ($row['student_count'] > 0) $overallWeightedRate += $row['average_attendance_rate'] * $row['student_count']; }

        return [
            'summary' => [
                'total_students' => $overallWeight,
                'total_schools' => count($scope['school_ids']),
                'overall_average_attendance' => $overallWeight > 0 ? round($overallWeightedRate / $overallWeight, 2) : 0,
                'period' => ['start_date' => $startDate, 'end_date' => $endDate, 'school_days' => $scope['school_days']],
            ],
            'grade_levels' => $rows,
            'filters' => array_merge($filters, ['start_date' => $startDate, 'end_date' => $endDate]),
            'context' => ['region' => $scope['region'], 'active_sector' => $scope['active_sector']],
        ];
    }

    /**
     * Get attendance statistics for schools and grade levels (matrix).
     */
    public function getSchoolGradeStats(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        if (empty($scope['school_ids'])) return ['schools' => [], 'period' => ['start_date' => $startDate, 'end_date' => $endDate]];

        $gradeQuery = Grade::whereIn('institution_id', $scope['school_ids']);
        $educationProgram = $filters['education_program'] ?? null;
        if ($educationProgram && $educationProgram !== 'all') $gradeQuery->where('education_program', $educationProgram);
        $gradeMap = $gradeQuery->get(['id', 'class_level'])->pluck('class_level', 'id')->all();

        $statsData = DB::table('class_bulk_attendance')
            ->whereIn('institution_id', $scope['school_ids'])
            ->whereIn('grade_id', array_keys($gradeMap))
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->selectRaw('institution_id as inst_id, grade_id, SUM(COALESCE(daily_attendance_rate, 0) * total_students) as rates, SUM(total_students) as denom')
            ->groupBy('institution_id', 'grade_id')
            ->get();

        $schoolStatsMap = [];
        foreach ($scope['schools'] as $school) {
            $schoolStatsMap[(int)$school->id] = ['id' => (int)$school->id, 'name' => $school->name, 'grades' => array_fill(0, 12, null)];
        }

        $regAggData = [];
        foreach ($statsData as $row) {
            $level = $gradeMap[(int)$row->grade_id] ?? null;
            if ($level !== null && $row->denom > 0) {
                $schoolStatsMap[(int)$row->inst_id]['grades'][$level] = round($row->rates / $row->denom, 2);
                $regAggData[$level]['r'] = ($regAggData[$level]['r'] ?? 0) + $row->rates;
                $regAggData[$level]['d'] = ($regAggData[$level]['d'] ?? 1) + $row->denom;
            }
        }

        $regionalAverages = array_fill(0, 12, null);
        foreach ($regAggData as $level => $data) { if ($data['d'] > 0) $regionalAverages[$level] = round($data['r'] / $data['d'], 2); }

        return [
            'schools' => array_values($schoolStatsMap),
            'regional_averages' => $regionalAverages,
            'period' => ['start_date' => $startDate, 'end_date' => $endDate],
        ];
    }

    /**
     * Format empty grade level stats response.
     */
    protected function formatEmptyGradeLevelStats(array $scope, string $start, string $end): array
    {
        $levels = [];
        for ($i = 0; $i <= 11; $i++) $levels[] = ['class_level' => $i, 'class_level_display' => $this->getRomanNumeral($i), 'student_count' => 0, 'school_count' => 0, 'average_attendance_rate' => 0, 'uniform_compliance_rate' => 0, 'schools' => []];
        return [
            'summary' => ['total_students' => 0, 'total_schools' => 0, 'overall_average_attendance' => 0, 'period' => ['start_date' => $start, 'end_date' => $end]],
            'grade_levels' => $levels,
        ];
    }

    /**
     * Convert number to Roman numeral.
     */
    public function getRomanNumeral(int $number): string
    {
        if ($number === 0) return '0';
        $numerals = [1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI'];
        return $numerals[$number] ?? (string)$number;
    }
}
