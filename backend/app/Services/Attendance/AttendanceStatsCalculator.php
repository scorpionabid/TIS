<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class AttendanceStatsCalculator
{
    private const LOW_ATTENDANCE_THRESHOLD = 85;

    private const MAX_ALERT_RECORDS = 50;

    /**
     * Divide pre-accumulated weighted rates by denominator and round.
     */
    public function calculateWeightedRate(float $weightedRates, float $denominator): float
    {
        return $denominator > 0 ? round($weightedRates / $denominator, 2) : 0.0;
    }

    /**
     * Calculate uniform violation and compliance rates.
     *
     * @return array{violations: int, rate: float, compliance: float}
     */
    public function calculateUniformStats(int $presentTotal, int $violations): array
    {
        if ($presentTotal <= 0) {
            return ['violations' => $violations, 'rate' => 0.0, 'compliance' => 0.0];
        }

        $violations = min($violations, $presentTotal);
        $rate = round(($violations / $presentTotal) * 100, 2);

        return [
            'violations' => $violations,
            'rate' => $rate,
            'compliance' => round(100 - $rate, 2),
        ];
    }

    /**
     * Aggregate stats per school from pre-aggregated SQL results.
     *
     * @param  Collection $schoolAggregates Keyed by institution_id — result of GROUP BY SQL query
     * @param  Collection $sectorNamesById  sector_id → name map for label lookup
     * @return array<int, array<string, mixed>>
     */
    public function buildSchoolStats(
        array $schools,
        Collection $schoolAggregates,
        Collection $gradeStudentCounts,
        int $schoolDays,
        Collection $sectorNamesById
    ): array {
        $stats = [];

        foreach ($schools as $school) {
            $totals = $gradeStudentCounts->get($school->id, ['student_total' => 0]);
            $agg = $schoolAggregates->get($school->id);
            $reportedDays = (int) ($agg?->reported_days ?? 0);
            $avgRate = round((float) ($agg?->avg_rate ?? 0), 2);

            $presentTotal = (int) ($agg?->eff_morning_present ?? 0) + (int) ($agg?->eff_evening_present ?? 0);
            $uniformStats = $this->calculateUniformStats($presentTotal, (int) ($agg?->total_uniform_violations ?? 0));
            $uniformViolations = $uniformStats['violations'];
            $uniformViolationRate = $uniformStats['rate'];
            $uniformComplianceRate = $uniformStats['compliance'];

            $stat = [
                'school_id' => $school->id,
                'name' => $school->name,
                'sector_id' => $school->parent_id,
                'sector_name' => $sectorNamesById->get($school->parent_id, 'Naməlum'),
                'total_students' => (int) ($totals['student_total'] ?? 0),
                'expected_school_days' => $schoolDays,
                'records' => (int) ($agg?->records ?? 0),
                'reported_days' => $reportedDays,
                'reported_classes' => (int) ($agg?->reported_classes ?? 0),
                'actual_attendance' => round(((float) ($agg?->total_morning_present ?? 0) + (float) ($agg?->total_evening_present ?? 0)) / 2, 2),
                'possible_attendance' => (int) ($agg?->total_possible ?? 0),
                'morning_absent' => (int) ($agg?->morning_absent ?? 0),
                'evening_absent' => (int) ($agg?->evening_absent ?? 0),
                'present_total' => $presentTotal,
                'total_uniform_violations' => $uniformViolations,
                'uniform_violation_rate' => $uniformViolationRate,
                'uniform_compliance_rate' => $uniformComplianceRate,
                'average_attendance_rate' => $avgRate,
                'reporting_gap' => max(0, $schoolDays - $reportedDays),
                'attending_students' => (int) round($avgRate / 100 * (int) ($totals['student_total'] ?? 0)),
                'warnings' => [],
            ];

            if ($reportedDays === 0) {
                $stat['warnings'][] = 'reports_missing';
            } elseif ($avgRate < self::LOW_ATTENDANCE_THRESHOLD) {
                $stat['warnings'][] = 'low_attendance';
            }

            $stats[$school->id] = $stat;
        }

        return $stats;
    }

    /**
     * Aggregate stats on sector level.
     */
    public function buildSectorStats(
        array $sectors,
        array $schoolStats,
        array $schoolIds,
        string $startDate,
        string $endDate
    ): array {
        $sectorStats = [];

        // Build school_id → sector_id map for batch aggregation
        $schoolToSector = [];
        foreach ($schoolStats as $schoolStat) {
            $schoolToSector[$schoolStat['school_id']] = $schoolStat['sector_id'];
        }

        // Single batch query replaces N per-sector queries
        $sectorUniqueDateCounts = [];
        if (! empty($schoolToSector)) {
            $dateRows = ClassBulkAttendance::whereIn('institution_id', array_keys($schoolToSector))
                ->whereDate('attendance_date', '>=', $startDate)
                ->whereDate('attendance_date', '<=', $endDate)
                ->selectRaw('institution_id, attendance_date')
                ->distinct()
                ->get();

            $sectorDateSets = [];
            foreach ($dateRows as $row) {
                $sid = (int) $row->institution_id;
                $sid_sector = $schoolToSector[$sid] ?? null;
                if ($sid_sector !== null) {
                    $sectorDateSets[$sid_sector][(string) $row->attendance_date] = true;
                }
            }

            foreach ($sectorDateSets as $sid => $dates) {
                $sectorUniqueDateCounts[$sid] = count($dates);
            }
        }

        foreach ($sectors as $sector) {
            $sectorStats[$sector->id] = [
                'sector_id' => $sector->id,
                'name' => $sector->name,
                'school_count' => 0,
                'reported_school_count' => 0,
                'total_students' => 0,
                'attending_students' => 0,
                'present_total' => 0,
                'total_uniform_violations' => 0,
                'uniform_violation_rate' => 0,
                'uniform_compliance_rate' => 0,
                'average_attendance_rate' => 0,
                'reported_days' => 0,
                'weighted_rates' => 0,
                'weighted_denominator' => 0,
                'schools' => [],
            ];
        }

        foreach ($schoolStats as $schoolStat) {
            $sectorId = $schoolStat['sector_id'];
            if (! isset($sectorStats[$sectorId])) {
                continue;
            }

            $sectorStats[$sectorId]['school_count']++;
            if ($schoolStat['reported_days'] > 0) {
                $sectorStats[$sectorId]['reported_school_count']++;
            }
            $sectorStats[$sectorId]['total_students'] += $schoolStat['total_students'];
            $sectorStats[$sectorId]['attending_students'] += $schoolStat['attending_students'];
            $sectorStats[$sectorId]['present_total'] += (int) ($schoolStat['present_total'] ?? 0);
            $sectorStats[$sectorId]['total_uniform_violations'] += (int) ($schoolStat['total_uniform_violations'] ?? 0);

            $reportedDays = (int) ($schoolStat['reported_days'] ?? 0);
            $denominator = (int) ($schoolStat['total_students'] ?? 0);
            if ($reportedDays > 0 && $denominator > 0) {
                $sectorStats[$sectorId]['weighted_rates'] += $schoolStat['average_attendance_rate'] * $denominator;
                $sectorStats[$sectorId]['weighted_denominator'] += $denominator;
            }
            $sectorStats[$sectorId]['schools'][] = $schoolStat;
        }

        foreach ($sectorStats as &$stat) {
            $stat['average_attendance_rate'] = $this->calculateWeightedRate($stat['weighted_rates'], $stat['weighted_denominator']);

            $presentTotal = (int) ($stat['present_total'] ?? 0);
            $uniformStats = $this->calculateUniformStats($presentTotal, (int) ($stat['total_uniform_violations'] ?? 0));
            $stat['total_uniform_violations'] = $uniformStats['violations'];
            $stat['uniform_violation_rate'] = $uniformStats['rate'];
            $stat['uniform_compliance_rate'] = $uniformStats['compliance'];

            // Set sector reported_days as count of unique dates across all sector schools
            $sectorId = $stat['sector_id'];
            $stat['reported_days'] = $sectorUniqueDateCounts[$sectorId] ?? 0;

            unset($stat['weighted_rates'], $stat['weighted_denominator']);
        }

        return $sectorStats;
    }

    public function buildSummary(array $schoolStats, array $sectorStats, string $startDate, string $endDate, int $schoolDays): array
    {
        $totalStudents = array_sum(array_column($schoolStats, 'total_students'));
        $attendingStudents = array_sum(array_column($schoolStats, 'attending_students'));
        $presentTotal = array_sum(array_map(fn ($s) => (int) ($s['present_total'] ?? 0), $schoolStats));
        $uniformStats = $this->calculateUniformStats($presentTotal, array_sum(array_map(fn ($s) => (int) ($s['total_uniform_violations'] ?? 0), $schoolStats)));
        $uniformViolations = $uniformStats['violations'];
        $uniformViolationRate = $uniformStats['rate'];
        $uniformComplianceRate = $uniformStats['compliance'];
        $weightedRates = 0;
        $weightedDenominator = 0;
        $totalReportedDays = array_sum(array_column($schoolStats, 'reported_days'));

        foreach ($schoolStats as $stat) {
            $reportedDays = (int) ($stat['reported_days'] ?? 0);
            $denominator = (int) ($stat['total_students'] ?? 0);
            if ($reportedDays > 0 && $denominator > 0) {
                $weightedRates += $stat['average_attendance_rate'] * $denominator;
                $weightedDenominator += $denominator;
            }
        }

        $averageRate = $this->calculateWeightedRate($weightedRates, $weightedDenominator);

        return [
            'total_sectors' => count($sectorStats),
            'total_schools' => count($schoolStats),
            'total_students' => $totalStudents,
            'attending_students' => $attendingStudents,
            'present_total' => $presentTotal,
            'total_uniform_violations' => $uniformViolations,
            'uniform_violation_rate' => $uniformViolationRate,
            'uniform_compliance_rate' => $uniformComplianceRate,
            'average_attendance_rate' => $averageRate,
            'reported_days' => $totalReportedDays,
            'schools_missing_reports' => collect($schoolStats)
                ->where('reported_days', 0)
                ->count(),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'school_days' => $schoolDays,
            ],
        ];
    }

    public function buildAlerts(array $schoolStats): array
    {
        $schools = collect($schoolStats);

        $missingReports = $schools
            ->where('reported_days', 0)
            ->values()
            ->map(fn ($school) => [
                'school_id' => $school['school_id'] ?? $school['id'],
                'name' => $school['name'],
                'reason' => 'report_missing',
            ])
            ->take(self::MAX_ALERT_RECORDS)
            ->all();

        $lowAttendance = $schools
            ->where('average_attendance_rate', '<', self::LOW_ATTENDANCE_THRESHOLD)
            ->where('reported_days', '>', 0)
            ->values()
            ->map(fn ($school) => [
                'school_id' => $school['school_id'],
                'name' => $school['name'],
                'rate' => $school['average_attendance_rate'],
            ])
            ->all();

        return [
            'missing_reports' => $missingReports,
            'low_attendance' => $lowAttendance,
        ];
    }

    /**
     * Build daily trend data from pre-aggregated SQL results.
     *
     * @param Collection $trendAggregates Keyed by 'Y-m-d' date string
     */
    public function buildTrends(Collection $trendAggregates, string $startDate, string $endDate): array
    {
        $trends = [];
        $current = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);

        while ($current->lte($end)) {
            if ($current->isWeekday()) {
                $dateStr = $current->toDateString();
                $agg = $trendAggregates->get($dateStr);

                $trends[] = [
                    'date' => $dateStr,
                    'short_date' => $current->format('d.m'),
                    'rate' => $agg ? round((float) $agg->avg_rate, 2) : 0,
                    'reported' => $agg !== null,
                ];
            }
            $current = $current->addDay();
        }

        return $trends;
    }

    /**
     * Build grade/class stats for one school.
     */
    public function buildClassStats(Collection $records, Collection $grades, int $schoolDays): array
    {
        $classStats = [];

        foreach ($grades as $grade) {
            $classStats[$grade->id] = [
                'grade_id' => $grade->id,
                'name' => $grade->name,
                'class_level' => $grade->class_level,
                'student_count' => (int) ($grade->student_count ?? 0),
                'records' => 0,
                'reported_days' => 0,
                'average_attendance_rate' => 0,
                'actual_attendance' => 0,
                'possible_attendance' => 0,
                'morning_absent' => 0,
                'evening_absent' => 0,
                'present_total' => 0,
                'total_uniform_violations' => 0,
                'uniform_violation_rate' => 0,
                'uniform_compliance_rate' => 0,
                'unique_dates' => [],
                'warnings' => [],
                'expected_school_days' => $schoolDays,
            ];
        }

        foreach ($records as $record) {
            $gradeId = $record->grade_id;
            if (! $gradeId || ! isset($classStats[$gradeId])) {
                // For classes that do not exist in grade list, initialize lightweight entry
                $classStats[$gradeId ?? 0] ??= [
                    'grade_id' => $gradeId,
                    'name' => $record->grade?->name ?? 'Naməlum',
                    'class_level' => $record->grade?->class_level,
                    'student_count' => (int) ($record->grade?->student_count ?? $record->total_students ?? 0),
                    'records' => 0,
                    'reported_days' => 0,
                    'average_attendance_rate' => 0,
                    'actual_attendance' => 0,
                    'possible_attendance' => 0,
                    'morning_absent' => 0,
                    'evening_absent' => 0,
                    'present_total' => 0,
                    'total_uniform_violations' => 0,
                    'uniform_violation_rate' => 0,
                    'uniform_compliance_rate' => 0,
                    'unique_dates' => [],
                    'warnings' => [],
                    'expected_school_days' => $schoolDays,
                ];
            }

            $stat = &$classStats[$gradeId ?? 0];
            $classTotal = max((int) ($record->grade?->student_count ?? $record->total_students ?? 0), 0);
            $morningPresent = (int) $record->morning_present;
            $eveningPresent = (int) $record->evening_present;

            $hasMorning = $record->morning_recorded_at !== null;
            $hasEvening = $record->evening_recorded_at !== null;

            $noMorningChanges = $morningPresent === 0
                && (int) $record->morning_excused === 0
                && (int) $record->morning_unexcused === 0
                && $hasMorning;
            $noEveningChanges = $eveningPresent === 0
                && (int) $record->evening_excused === 0
                && (int) $record->evening_unexcused === 0
                && $hasEvening;

            $effMorning = $noMorningChanges ? $classTotal : $morningPresent;
            $effEvening = $noEveningChanges ? $classTotal : $eveningPresent;

            if ($hasMorning) {
                $stat['present_total'] += $effMorning;
            }

            if ($hasEvening) {
                $stat['present_total'] += $effEvening;
            }

            $stat['total_uniform_violations'] += (int) ($record->uniform_violation ?? 0);
            $dailyPresent = $classTotal > 0 ? ($morningPresent + $eveningPresent) / 2 : max($morningPresent, $eveningPresent);
            $possible = max($classTotal, 1);
            $dailyRate = $record->daily_attendance_rate ?? ($possible > 0
                ? round(($dailyPresent / $possible) * 100, 2)
                : 0);

            $stat['records']++;
            $stat['actual_attendance'] += $dailyPresent;
            $stat['possible_attendance'] += $possible;
            $stat['morning_absent'] += (int) $record->morning_excused + (int) $record->morning_unexcused;
            $stat['evening_absent'] += (int) $record->evening_excused + (int) $record->evening_unexcused;
            $stat['weighted_rates'] = ($stat['weighted_rates'] ?? 0) + ($dailyRate * $possible);
            $stat['weighted_denominator'] = ($stat['weighted_denominator'] ?? 0) + $possible;

            $dateKey = $record->attendance_date instanceof \DateTimeInterface
                ? $record->attendance_date->format('Y-m-d')
                : (string) $record->attendance_date;
            $stat['unique_dates'][$dateKey] = true;
        }

        foreach ($classStats as &$stat) {
            $stat['reported_days'] = count($stat['unique_dates']);
            $stat['average_attendance_rate'] = $this->calculateWeightedRate((float) ($stat['weighted_rates'] ?? 0), (float) ($stat['weighted_denominator'] ?? 0));

            $presentTotal = (int) ($stat['present_total'] ?? 0);
            $uniformStats = $this->calculateUniformStats($presentTotal, (int) ($stat['total_uniform_violations'] ?? 0));
            $stat['total_uniform_violations'] = $uniformStats['violations'];
            $stat['uniform_violation_rate'] = $uniformStats['rate'];
            $stat['uniform_compliance_rate'] = $uniformStats['compliance'];

            $stat['reporting_gap'] = max(0, $stat['expected_school_days'] - $stat['reported_days']);

            if ($stat['reported_days'] === 0) {
                $stat['warnings'][] = 'reports_missing';
            } elseif ($stat['average_attendance_rate'] < self::LOW_ATTENDANCE_THRESHOLD) {
                $stat['warnings'][] = 'low_attendance';
            }

            unset($stat['unique_dates'], $stat['weighted_rates'], $stat['weighted_denominator']);
        }

        return $classStats;
    }

    public function buildSchoolSummary(array $classStats, int $schoolDays, string $startDate, string $endDate): array
    {
        if (empty($classStats)) {
            return [
                'total_classes' => 0,
                'reported_classes' => 0,
                'average_attendance_rate' => 0,
                'present_total' => 0,
                'total_uniform_violations' => 0,
                'uniform_violation_rate' => 0,
                'uniform_compliance_rate' => 0,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'school_days' => $schoolDays,
                ],
            ];
        }

        $totalClasses = count($classStats);
        $reportedClasses = collect($classStats)->where('reported_days', '>', 0)->count();
        $presentTotal = array_sum(array_map(fn ($s) => (int) ($s['present_total'] ?? 0), $classStats));
        $uniformStats = $this->calculateUniformStats($presentTotal, array_sum(array_map(fn ($s) => (int) ($s['total_uniform_violations'] ?? 0), $classStats)));
        $uniformViolations = $uniformStats['violations'];
        $uniformViolationRate = $uniformStats['rate'];
        $uniformComplianceRate = $uniformStats['compliance'];
        $weightedRates = 0;
        $denominator = 0;
        $totalAttending = 0;

        foreach ($classStats as $stat) {
            $weight = max($stat['student_count'], 1);
            $weightedRates += $stat['average_attendance_rate'] * $weight;
            $denominator += $weight;

            // Calculate attending students for this class (avg students per day)
            $classAvgAttending = ($stat['average_attendance_rate'] / 100) * $weight;
            $totalAttending += $classAvgAttending;
        }

        return [
            'total_classes' => $totalClasses,
            'reported_classes' => $reportedClasses,
            'attending_students' => round($totalAttending),
            'average_attendance_rate' => $this->calculateWeightedRate($weightedRates, $denominator),
            'present_total' => $presentTotal,
            'total_uniform_violations' => $uniformViolations,
            'uniform_violation_rate' => $uniformViolationRate,
            'uniform_compliance_rate' => $uniformComplianceRate,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'school_days' => $schoolDays,
            ],
        ];
    }
}
