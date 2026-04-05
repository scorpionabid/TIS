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

class RegionalAttendanceService
{
    /**
     * Build aggregated attendance overview for the given user scope.
     */
    public function getOverview(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);

        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        $schoolIds = $scope['school_ids'];
        $schools = collect($scope['schools']);
        $scope['schools'] = $schools;
        $scope['sectors'] = collect($scope['sectors']);

        if (empty($schoolIds)) {
            return $this->formatEmptyOverview($scope, $startDate, $endDate);
        }

        $educationProgram = $filters['education_program'] ?? null;

        $schoolAggregates = ClassBulkAttendance::selectRaw(
            'class_bulk_attendance.institution_id,
             COUNT(DISTINCT attendance_date) AS reported_days,
             COUNT(DISTINCT class_bulk_attendance.grade_id) AS reported_classes,
             COUNT(*)                        AS records,
             SUM(morning_present)            AS total_morning_present,
             SUM(evening_present)            AS total_evening_present,
             SUM(uniform_violation)          AS total_uniform_violations,
             SUM(CASE WHEN morning_recorded_at IS NOT NULL THEN (
                 CASE WHEN morning_present = 0 AND morning_excused = 0 AND morning_unexcused = 0 THEN total_students ELSE morning_present END
             ) ELSE 0 END) AS eff_morning_present,
             SUM(CASE WHEN evening_recorded_at IS NOT NULL THEN (
                 CASE WHEN evening_present = 0 AND evening_excused = 0 AND evening_unexcused = 0 THEN total_students ELSE evening_present END
             ) ELSE 0 END) AS eff_evening_present,
             SUM(morning_excused + morning_unexcused)   AS morning_absent,
             SUM(evening_excused + evening_unexcused)   AS evening_absent,
             SUM(total_students)             AS total_possible,
             AVG(daily_attendance_rate)      AS avg_rate'
        )
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate);

        if ($educationProgram && $educationProgram !== 'all') {
            $schoolAggregates->where('grades.education_program', $educationProgram);
        }

        $schoolAggregates = $schoolAggregates
            ->groupBy('class_bulk_attendance.institution_id')
            ->get()
            ->keyBy('institution_id');

        // Aggregate per date for trend chart
        $trendAggregates = ClassBulkAttendance::selectRaw(
            'class_bulk_attendance.attendance_date,
             AVG(daily_attendance_rate) AS avg_rate,
             COUNT(*)                   AS records'
        )
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereDate('class_bulk_attendance.attendance_date', '>=', $startDate)
            ->whereDate('class_bulk_attendance.attendance_date', '<=', $endDate);

        if ($educationProgram && $educationProgram !== 'all') {
            $trendAggregates->where('grades.education_program', $educationProgram);
        }

        $trendAggregates = $trendAggregates
            ->groupBy('class_bulk_attendance.attendance_date')
            ->orderBy('class_bulk_attendance.attendance_date')
            ->get()
            ->keyBy(fn ($r) => (string) $r->attendance_date);

        $gradeStudentCounts = Grade::query()
            ->whereIn('institution_id', $schoolIds);

        if ($educationProgram && $educationProgram !== 'all') {
            $gradeStudentCounts->where('grades.education_program', $educationProgram);

            // Filter schools collection to only those that have matching grades
            $filteredSchoolIds = $gradeStudentCounts->clone()->pluck('institution_id')->unique()->toArray();

            // Sync all relevant variables for further processing
            $schoolIds = $filteredSchoolIds;
            $schools = $schools->whereIn('id', $filteredSchoolIds);
            $scope['schools'] = $schools;
            $scope['school_ids'] = $schoolIds;

            // Also filter sectors to only those that have matching schools
            $activeSectorIds = $schools->pluck('parent_id')->unique()->toArray();
            $scope['sectors'] = $scope['sectors']->whereIn('id', $activeSectorIds);
        }

        $gradeStudentCounts = $gradeStudentCounts
            ->get(['id', 'institution_id', 'student_count', 'class_level', 'name'])
            ->groupBy('institution_id')
            ->map(fn (Collection $grades) => [
                'student_total' => (int) $grades->sum(fn ($grade) => (int) ($grade->student_count ?? 0)),
                'grades' => $grades,
            ]);

        // Build sector name map for lookup without N+1
        $sectorNamesById = collect($scope['sectors'])->pluck('name', 'id');

        $schoolStats = $this->buildSchoolStats(
            $scope['schools']->all(),
            $schoolAggregates,
            $gradeStudentCounts,
            $scope['school_days'],
            $sectorNamesById
        );

        $sectorStats = $this->buildSectorStats(
            $scope['sectors']->all(),
            $schoolStats,
            $schoolIds,
            $startDate,
            $endDate
        );

        $summary = $this->buildSummary($schoolStats, $sectorStats, $startDate, $endDate, $scope['school_days']);
        $trends = $this->buildTrends($trendAggregates, $startDate, $endDate);

        return [
            'summary' => $summary,
            'trends' => $trends,
            'sectors' => array_values($sectorStats),
            'schools' => array_values($schoolStats),
            'alerts' => $this->buildAlerts($schoolStats),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'region_id' => $scope['region']?->id,
                'sector_id' => $scope['active_sector']?->id ?? $filters['sector_id'] ?? null,
                'school_id' => $filters['school_id'] ?? null,
            ],
            'context' => [
                'region' => $scope['region'] ? [
                    'id' => $scope['region']->id,
                    'name' => $scope['region']->name,
                ] : null,
                'active_sector' => $scope['active_sector'] ? [
                    'id' => $scope['active_sector']->id,
                    'name' => $scope['active_sector']->name,
                ] : null,
            ],
        ];
    }

    /**
     * Detailed grade/class breakdown for a single school.
     */
    public function getSchoolClassBreakdown(User $user, Institution $school, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);

        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        if (! in_array($school->id, $scope['school_ids'], true)) {
            throw ValidationException::withMessages([
                'school_id' => 'Bu məktəbin məlumatlarına baxmaq üçün icazəniz yoxdur.',
            ]);
        }

        $educationProgram = $filters['education_program'] ?? null;

        $gradeQuery = Grade::query()
            ->where('institution_id', $school->id);

        if ($educationProgram && $educationProgram !== 'all') {
            $gradeQuery->where('education_program', $educationProgram);
        }

        $gradeMap = $gradeQuery
            ->get(['id', 'name', 'class_level', 'student_count'])
            ->keyBy('id');

        $records = ClassBulkAttendance::query()
            ->where('institution_id', $school->id)
            ->whereIn('grade_id', $gradeMap->keys())
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->get();

        $classStats = $this->buildClassStats($records, $gradeMap, $scope['school_days']);

        $summary = $this->buildSchoolSummary($classStats, $scope['school_days'], $startDate, $endDate);

        return [
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'sector_id' => $school->parent_id,
            ],
            'summary' => $summary,
            'classes' => array_values($classStats),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'expected_school_days' => $scope['school_days'],
            ],
        ];
    }

    /**
     * Determine accessible institutions for the user considering filters.
     */
    private function resolveInstitutionScope(User $user, array $filters, string $startDate, string $endDate): array
    {
        $region = null;
        $activeSector = null;

        $targetRegionId = $filters['region_id'] ?? null;
        $targetSectorId = $filters['sector_id'] ?? null;

        if ($user->hasRole('regionadmin') || $user->hasRole('regionoperator')) {
            $region = $user->institution?->level === 2
                ? $user->institution
                : ($user->institution?->parent?->level === 2 ? $user->institution->parent : null);

            if (! $region) {
                throw ValidationException::withMessages([
                    'region' => 'Region məlumatı tapılmadı. İstifadəçi regiona təyin edilməyib.',
                ]);
            }

            $institutionIds = $region->getAllChildrenIds();
        } elseif ($user->hasRole('sektoradmin')) {
            $sector = $user->institution;
            if (! $sector || $sector->level !== 3) {
                $sector = $user->institution?->parent?->level === 3 ? $user->institution->parent : null;
            }

            if (! $sector) {
                throw ValidationException::withMessages([
                    'sector' => 'Sektor məlumatı tapılmadı. İstifadəçi sektora təyin edilməyib.',
                ]);
            }

            $region = $sector->parent?->level === 2 ? $sector->parent : null;
            $activeSector = $sector;
            $institutionIds = $sector->getAllChildrenIds();
        } elseif ($user->hasRole('superadmin')) {
            if ($targetSectorId) {
                $activeSector = Institution::find($targetSectorId);
                if (! $activeSector || $activeSector->level !== 3) {
                    throw ValidationException::withMessages(['sector_id' => 'Sektor tapılmadı.']);
                }
                $region = $activeSector->parent?->level === 2 ? $activeSector->parent : null;
                $institutionIds = $activeSector->getAllChildrenIds();
            } elseif ($targetRegionId) {
                $region = Institution::find($targetRegionId);
                if (! $region || $region->level !== 2) {
                    throw ValidationException::withMessages(['region_id' => 'Region tapılmadı.']);
                }
                $institutionIds = $region->getAllChildrenIds();
            } else {
                $institutionIds = Institution::pluck('id')->all();
            }
        } else {
            throw ValidationException::withMessages([
                'role' => 'Bu hesabatı görüntüləmək üçün icazəniz yoxdur.',
            ]);
        }

        $institutions = Institution::whereIn('id', $institutionIds)
            ->get(['id', 'name', 'level', 'parent_id', 'type', 'metadata'])
            ->keyBy('id');

        $sectors = $institutions
            ->where('level', 3)
            ->values();

        $schools = $institutions
            ->where('level', 4)
            ->values();

        if ($targetSectorId) {
            $activeSector = $activeSector ?: $sectors->firstWhere('id', (int) $targetSectorId);
            if ($activeSector) {
                $sectorDescendantIds = (new Institution)->forceFill($activeSector->toArray())->getAllChildrenIds();
                $schools = $schools->filter(function ($school) use ($sectorDescendantIds, $targetSectorId) {
                    return $school->parent_id == $targetSectorId || in_array((int) $school->id, $sectorDescendantIds);
                })->values();
            } else {
                $schools = $schools->where('parent_id', (int) $targetSectorId)->values();
            }
        }

        if (isset($filters['school_id'])) {
            $schoolId = (int) $filters['school_id'];
            if (! $schools->contains('id', $schoolId)) {
                throw ValidationException::withMessages([
                    'school_id' => 'Bu məktəb sizin ixtiyarınızdadır.',
                ]);
            }
            $schools = $schools->where('id', $schoolId)->values();
        }

        $schoolDays = $this->calculateSchoolDays($startDate, $endDate);

        return [
            'region' => $region,
            'active_sector' => $activeSector,
            'sectors' => $sectors->all(),
            'schools' => $schools->all(),
            'school_ids' => $schools->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'school_days' => $schoolDays,
        ];
    }

    /**
     * Determine date range ensuring valid order.
     *
     * @return array{string, string}
     */
    private function resolveDateRange(array $filters): array
    {
        $end = isset($filters['end_date'])
            ? CarbonImmutable::parse($filters['end_date'])
            : CarbonImmutable::now();

        $start = isset($filters['start_date'])
            ? CarbonImmutable::parse($filters['start_date'])
            : $end->startOfMonth();

        if ($start->gt($end)) {
            throw ValidationException::withMessages([
                'start_date' => 'Başlanğıc tarixi son tarixdən böyük ola bilməz.',
            ]);
        }

        return [$start->toDateString(), $end->toDateString()];
    }

    private function calculateSchoolDays(string $startDate, string $endDate): int
    {
        $start = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);

        $days = 0;
        $current = $start;
        while ($current->lte($end)) {
            if ($current->isWeekday()) {
                $days++;
            }
            $current = $current->addDay();
        }

        return max($days, 1);
    }

    private function formatEmptyOverview(array $scope, string $startDate, string $endDate): array
    {
        return [
            'summary' => [
                'total_sectors' => count($scope['sectors']),
                'total_schools' => 0,
                'total_students' => 0,
                'average_attendance_rate' => 0,
                'reported_days' => 0,
                'schools_missing_reports' => 0,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'school_days' => $scope['school_days'],
                ],
            ],
            'sectors' => [],
            'schools' => [],
            'alerts' => [
                'missing_reports' => [],
                'low_attendance' => [],
            ],
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'context' => [
                'region' => $scope['region'] ? [
                    'id' => $scope['region']->id,
                    'name' => $scope['region']->name,
                ] : null,
            ],
        ];
    }

    /**
     * Aggregate stats per school from pre-aggregated SQL results.
     *
     * @param  Collection                       $schoolAggregates Keyed by institution_id — result of GROUP BY SQL query
     * @param  Collection                       $sectorNamesById  sector_id → name map for label lookup
     * @return array<int, array<string, mixed>>
     */
    private function buildSchoolStats(
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
            $uniformViolations = (int) ($agg?->total_uniform_violations ?? 0);
            if ($presentTotal > 0) {
                $uniformViolations = min($uniformViolations, $presentTotal);
            }
            $uniformViolationRate = $presentTotal > 0
                ? round(($uniformViolations / $presentTotal) * 100, 2)
                : 0.0;
            $uniformComplianceRate = $presentTotal > 0
                ? round(100 - $uniformViolationRate, 2)
                : 0.0;

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
                'attending_students' => $reportedDays > 0 ? (int) round(((float) ($agg?->total_morning_present ?? 0) + (float) ($agg?->total_evening_present ?? 0)) / (2 * $reportedDays)) : 0,
                'warnings' => [],
            ];

            if ($reportedDays === 0) {
                $stat['warnings'][] = 'reports_missing';
            } elseif ($avgRate < 85) {
                $stat['warnings'][] = 'low_attendance';
            }

            $stats[$school->id] = $stat;
        }

        return $stats;
    }

    /**
     * Aggregate stats on sector level.
     */
    private function buildSectorStats(
        array $sectors,
        array $schoolStats,
        array $schoolIds,
        string $startDate,
        string $endDate
    ): array {
        $sectorStats = [];

        // Get all school IDs grouped by sector for proper date aggregation
        $schoolsBySector = [];
        foreach ($schoolStats as $schoolStat) {
            $sectorId = $schoolStat['sector_id'];
            if (! isset($schoolsBySector[$sectorId])) {
                $schoolsBySector[$sectorId] = [];
            }
            $schoolsBySector[$sectorId][] = $schoolStat['school_id'];
        }

        // Query unique dates per sector
        $sectorUniqueDates = [];
        foreach ($schoolsBySector as $sectorId => $sectorSchoolIds) {
            $uniqueDates = ClassBulkAttendance::whereIn('institution_id', $sectorSchoolIds)
                ->whereDate('attendance_date', '>=', $startDate)
                ->whereDate('attendance_date', '<=', $endDate)
                ->distinct()
                ->pluck('attendance_date')
                ->map(fn ($date) => (string) $date)
                ->toArray();
            $sectorUniqueDates[$sectorId] = array_unique($uniqueDates);
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
            $stat['average_attendance_rate'] = $stat['weighted_denominator'] > 0
                ? round($stat['weighted_rates'] / $stat['weighted_denominator'], 2)
                : 0;

            $presentTotal = (int) ($stat['present_total'] ?? 0);
            $uniformViolations = (int) ($stat['total_uniform_violations'] ?? 0);
            if ($presentTotal > 0) {
                $uniformViolations = min($uniformViolations, $presentTotal);
            }
            $stat['total_uniform_violations'] = $uniformViolations;
            $stat['uniform_violation_rate'] = $presentTotal > 0
                ? round(($uniformViolations / $presentTotal) * 100, 2)
                : 0.0;
            $stat['uniform_compliance_rate'] = $presentTotal > 0
                ? round(100 - $stat['uniform_violation_rate'], 2)
                : 0.0;

            // Set sector reported_days as count of unique dates across all sector schools
            $sectorId = $stat['sector_id'];
            $stat['reported_days'] = count($sectorUniqueDates[$sectorId] ?? []);

            unset($stat['weighted_rates'], $stat['weighted_denominator']);
        }

        return $sectorStats;
    }

    private function buildSummary(array $schoolStats, array $sectorStats, string $startDate, string $endDate, int $schoolDays): array
    {
        $totalStudents = array_sum(array_column($schoolStats, 'total_students'));
        $attendingStudents = array_sum(array_column($schoolStats, 'attending_students'));
        $presentTotal = array_sum(array_map(fn ($s) => (int) ($s['present_total'] ?? 0), $schoolStats));
        $uniformViolations = array_sum(array_map(fn ($s) => (int) ($s['total_uniform_violations'] ?? 0), $schoolStats));
        if ($presentTotal > 0) {
            $uniformViolations = min($uniformViolations, $presentTotal);
        }
        $uniformViolationRate = $presentTotal > 0
            ? round(($uniformViolations / $presentTotal) * 100, 2)
            : 0.0;
        $uniformComplianceRate = $presentTotal > 0
            ? round(100 - $uniformViolationRate, 2)
            : 0.0;
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

        $averageRate = $weightedDenominator > 0
            ? round($weightedRates / $weightedDenominator, 2)
            : 0;

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

    private function buildAlerts(array $schoolStats): array
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
            ->take(50) // Performans üçün cəmi 50 dənəsini göstərək
            ->all();

        $lowAttendance = $schools
            ->where('average_attendance_rate', '<', 85)
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
    private function buildTrends(Collection $trendAggregates, string $startDate, string $endDate): array
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
    private function buildClassStats(Collection $records, Collection $grades, int $schoolDays): array
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
            $stat['average_attendance_rate'] = ($stat['weighted_denominator'] ?? 0) > 0
                ? round($stat['weighted_rates'] / $stat['weighted_denominator'], 2)
                : 0;

            $presentTotal = (int) ($stat['present_total'] ?? 0);
            $uniformViolations = (int) ($stat['total_uniform_violations'] ?? 0);
            if ($presentTotal > 0) {
                $uniformViolations = min($uniformViolations, $presentTotal);
            }
            $stat['total_uniform_violations'] = $uniformViolations;
            $stat['uniform_violation_rate'] = $presentTotal > 0
                ? round(($uniformViolations / $presentTotal) * 100, 2)
                : 0.0;
            $stat['uniform_compliance_rate'] = $presentTotal > 0
                ? round(100 - $stat['uniform_violation_rate'], 2)
                : 0.0;

            $stat['reporting_gap'] = max(0, $stat['expected_school_days'] - $stat['reported_days']);

            if ($stat['reported_days'] === 0) {
                $stat['warnings'][] = 'reports_missing';
            } elseif ($stat['average_attendance_rate'] < 85) {
                $stat['warnings'][] = 'low_attendance';
            }

            unset($stat['unique_dates'], $stat['weighted_rates'], $stat['weighted_denominator']);
        }

        return $classStats;
    }

    private function buildSchoolSummary(array $classStats, int $schoolDays, string $startDate, string $endDate): array
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
        $uniformViolations = array_sum(array_map(fn ($s) => (int) ($s['total_uniform_violations'] ?? 0), $classStats));
        if ($presentTotal > 0) {
            $uniformViolations = min($uniformViolations, $presentTotal);
        }
        $uniformViolationRate = $presentTotal > 0
            ? round(($uniformViolations / $presentTotal) * 100, 2)
            : 0.0;
        $uniformComplianceRate = $presentTotal > 0
            ? round(100 - $uniformViolationRate, 2)
            : 0.0;
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
            'average_attendance_rate' => $denominator > 0 ? round($weightedRates / $denominator, 2) : 0,
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

    /**
     * Get grade level attendance statistics aggregated by class level (1-11).
     * Supports filtering by education program.
     */
    public function getGradeLevelStats(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);

        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        $schoolIds = $scope['school_ids'];

        if (empty($schoolIds)) {
            return $this->formatEmptyGradeLevelStats($scope, $startDate, $endDate);
        }

        $educationProgram = $filters['education_program'] ?? null;

        // 1. Get Grade summary (student counts and school counts per level)
        $gradeQuery = Grade::query()
            ->whereIn('institution_id', $schoolIds)
            ->where('is_active', true);

        if ($educationProgram && $educationProgram !== 'all') {
            $gradeQuery->where('education_program', $educationProgram);
        }

        $allGrades = $gradeQuery->get(['id', 'institution_id', 'class_level', 'student_count']);

        $levelSummaries = $allGrades->groupBy('class_level')->map(function ($grades) {
            return [
                'student_count' => $grades->sum('student_count'),
                'school_count' => $grades->pluck('institution_id')->unique()->count(),
                'grade_ids' => $grades->pluck('id')->toArray(),
                'schools' => $grades->groupBy('institution_id')->map(function ($gs, $sid) {
                    return [
                        'school_id' => $sid,
                        'grade_ids' => $gs->pluck('id')->toArray(),
                        'student_count' => $gs->sum('student_count'),
                    ];
                })->values()->toArray(),
            ];
        });

        // 2. Aggregate Attendance at SQL level grouped by class_level
        // We use a join with grades to ensure we only get active grades and respect filters
        $attendanceAggregates = ClassBulkAttendance::selectRaw('
            grades.class_level,
            SUM(morning_present)            AS total_morning_present,
            SUM(evening_present)            AS total_evening_present,
            SUM(uniform_violation)          AS total_uniform_violations,
            SUM(CASE WHEN morning_recorded_at IS NOT NULL THEN (
                CASE WHEN morning_present = 0 AND morning_excused = 0 AND morning_unexcused = 0 THEN class_bulk_attendance.total_students ELSE morning_present END
            ) ELSE 0 END) AS eff_morning_present,
            SUM(CASE WHEN evening_recorded_at IS NOT NULL THEN (
                CASE WHEN evening_present = 0 AND evening_excused = 0 AND evening_unexcused = 0 THEN class_bulk_attendance.total_students ELSE evening_present END
            ) ELSE 0 END) AS eff_evening_present,
            SUM(class_bulk_attendance.total_students) AS total_possible,
            SUM((morning_present + evening_present) / 2.0) as actual_attendance,
            SUM(daily_attendance_rate * class_bulk_attendance.total_students) as weighted_rates,
            SUM(class_bulk_attendance.total_students) as weighted_denominator,
            COUNT(DISTINCT class_bulk_attendance.institution_id) AS reported_school_count
        ')
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->where('grades.is_active', true)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate);

        if ($educationProgram && $educationProgram !== 'all') {
            $attendanceAggregates->where('grades.education_program', $educationProgram);
        }

        $attendanceResults = $attendanceAggregates
            ->groupBy('grades.class_level')
            ->get()
            ->keyBy('class_level');

        // 3. Combine summaries and attendance stats for levels 0-11
        $gradeLevelStats = [];
        for ($level = 0; $level <= 11; $level++) {
            $summary = $levelSummaries->get($level, [
                'student_count' => 0,
                'school_count' => 0,
                'schools' => [],
            ]);

            $agg = $attendanceResults->get($level);

            $avgRate = 0;
            $uniformComplianceRate = 0;
            $totalPresent = 0;
            $totalUniformViolations = 0;

            if ($agg) {
                $avgRate = $agg->weighted_denominator > 0
                    ? round($agg->weighted_rates / $agg->weighted_denominator, 2)
                    : 0;

                $totalPresent = (int) $agg->eff_morning_present + (int) $agg->eff_evening_present;
                $totalUniformViolations = (int) $agg->total_uniform_violations;

                if ($totalPresent > 0) {
                    $totalUniformViolations = min($totalUniformViolations, $totalPresent);
                    $uniformViolationRate = round(($totalUniformViolations / $totalPresent) * 100, 2);
                    $uniformComplianceRate = round(100 - $uniformViolationRate, 2);
                }
            }

            $gradeLevelStats[$level] = [
                'class_level' => $level,
                'class_level_display' => $this->getRomanNumeral($level),
                'student_count' => $summary['student_count'],
                'school_count' => $summary['school_count'],
                'reported_school_count' => $agg ? (int) $agg->reported_school_count : 0,
                'average_attendance_rate' => $avgRate,
                'uniform_compliance_rate' => $uniformComplianceRate,
                'total_uniform_violations' => $totalUniformViolations,
                'present_total' => $totalPresent,
                'schools' => $summary['schools'],
            ];
        }

        // Build summary
        $totalStudents = array_sum(array_column($gradeLevelStats, 'student_count'));
        $totalSchools = count($schoolIds);

        $overallWeightedRate = 0;
        $overallWeight = 0;
        foreach ($gradeLevelStats as $stat) {
            if ($stat['average_attendance_rate'] > 0 && $stat['student_count'] > 0) {
                $overallWeightedRate += $stat['average_attendance_rate'] * $stat['student_count'];
                $overallWeight += $stat['student_count'];
            }
        }
        $overallAvgRate = $overallWeight > 0 ? round($overallWeightedRate / $overallWeight, 2) : 0;

        return [
            'summary' => [
                'total_students' => $totalStudents,
                'total_schools' => $totalSchools,
                'overall_average_attendance' => $overallAvgRate,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'school_days' => $scope['school_days'],
                ],
            ],
            'grade_levels' => array_values($gradeLevelStats),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'sector_id' => $scope['active_sector']?->id ?? $filters['sector_id'] ?? null,
                'education_program' => $educationProgram,
            ],
            'context' => [
                'region' => $scope['region'] ? [
                    'id' => $scope['region']->id,
                    'name' => $scope['region']->name,
                ] : null,
                'active_sector' => $scope['active_sector'] ? [
                    'id' => $scope['active_sector']->id,
                    'name' => $scope['active_sector']->name,
                ] : null,
            ],
        ];
    }

    /**
     * Format empty grade level stats response.
     */
    private function formatEmptyGradeLevelStats(array $scope, string $startDate, string $endDate): array
    {
        $gradeLevels = [];
        for ($level = 0; $level <= 11; $level++) {
            $gradeLevels[] = [
                'class_level' => $level,
                'class_level_display' => $this->getRomanNumeral($level),
                'student_count' => 0,
                'school_count' => 0,
                'average_attendance_rate' => 0,
                'uniform_compliance_rate' => 0,
                'total_uniform_violations' => 0,
                'present_total' => 0,
                'schools' => [],
            ];
        }

        return [
            'summary' => [
                'total_students' => 0,
                'total_schools' => 0,
                'overall_average_attendance' => 0,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'school_days' => $scope['school_days'],
                ],
            ],
            'grade_levels' => $gradeLevels,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'context' => [
                'region' => $scope['region'] ? [
                    'id' => $scope['region']->id,
                    'name' => $scope['region']->name,
                ] : null,
            ],
        ];
    }

    /**
     * Convert number to Roman numeral (1-11).
     */
    private function getRomanNumeral(int $number): string
    {
        if ($number === 0) {
            return '0';
        }

        $numerals = [
            1 => 'I',
            2 => 'II',
            3 => 'III',
            4 => 'IV',
            5 => 'V',
            6 => 'VI',
            7 => 'VII',
            8 => 'VIII',
            9 => 'IX',
            10 => 'X',
            11 => 'XI',
        ];

        return $numerals[$number] ?? (string) $number;
    }

    /**
     * Export grade level statistics as array for Excel generation.
     */
    public function exportGradeLevelStats(User $user, array $filters = []): array
    {
        $data = $this->getGradeLevelStats($user, $filters);

        $rows = [];
        $rows[] = ['Sinif', 'Şagird sayı', 'Məktəb sayı', 'Orta davamiyyət (%)', 'Məktəbli forma (%)'];

        foreach ($data['grade_levels'] as $level) {
            if ($level['student_count'] > 0) {
                $rows[] = [
                    $level['class_level_display'],
                    $level['student_count'],
                    $level['school_count'],
                    $level['average_attendance_rate'],
                    $level['uniform_compliance_rate'],
                ];
            }
        }

        // Add summary row
        $rows[] = [];
        $rows[] = ['Ümumi məlumat', '', '', '', ''];
        $rows[] = ['Ümumi şagird sayı', $data['summary']['total_students'], '', '', ''];
        $rows[] = ['Məktəb sayı', $data['summary']['total_schools'], '', '', ''];
        $rows[] = ['Orta davamiyyət', $data['summary']['overall_average_attendance'] . '%', '', '', ''];
        $rows[] = ['Hesabat dövrü', $data['summary']['period']['start_date'] . ' - ' . $data['summary']['period']['end_date'], '', '', ''];

        return [
            'filename' => 'sinif_statistikasi_' . $data['summary']['period']['start_date'] . '_' . $data['summary']['period']['end_date'] . '.xlsx',
            'data' => $rows,
            'raw' => $data,
        ];
    }

    /**
     * Get attendance statistics for schools and grade levels (matrix).
     */
    public function getSchoolGradeStats(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        $schoolIds = $scope['school_ids'];

        if (empty($schoolIds)) {
            return [
                'schools' => [],
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
            ];
        }

        $educationProgram = $filters['education_program'] ?? null;

        $scope['schools'] = collect($scope['schools']);

        // 1. Get all grades for these schools to build a grade_id -> class_level map
        $gradeQuery = Grade::whereIn('institution_id', $schoolIds);
        if ($educationProgram && $educationProgram !== 'all') {
            $gradeQuery->where('education_program', $educationProgram);

            // Sync school IDs to only include those that have matching grades
            $schoolIds = $gradeQuery->clone()->pluck('institution_id')->unique()->toArray();
            $scope['schools'] = $scope['schools']->whereIn('id', $schoolIds);
        }
        $gradeMap = $gradeQuery->get(['id', 'class_level'])->pluck('class_level', 'id')->all();
        $relevantGradeIds = array_keys($gradeMap);

        // 2. Get attendance data directly
        $statsData = \Illuminate\Support\Facades\DB::table('class_bulk_attendance')
            ->whereIn('institution_id', $schoolIds)
            ->whereIn('grade_id', $relevantGradeIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->selectRaw('
                institution_id as inst_id, 
                grade_id,
                SUM(COALESCE(daily_attendance_rate, 0) * total_students) as rates,
                SUM(total_students) as denom
            ')
            ->groupBy('institution_id', 'grade_id')
            ->get();

        // 3. Initialize response structure
        $schoolStatsMap = [];
        foreach ($scope['schools'] as $school) {
            $schoolStatsMap[(int) $school->id] = [
                'id' => (int) $school->id,
                'name' => $school->name,
                'grades' => array_fill(0, 12, null),
            ];
        }

        // 4. Aggregate by level in PHP (handling multiple grades per level)
        $aggData = []; // schoolId -> level -> [r, d]
        $regAggData = []; // level -> [r, d]

        foreach ($statsData as $row) {
            $instId = (int) $row->inst_id;
            $level = $gradeMap[(int) $row->grade_id] ?? null;

            if ($level !== null && $level >= 0 && $level <= 11) {
                $r = (float) $row->rates;
                $d = (float) $row->denom;

                if ($d > 0) {
                    if (! isset($aggData[$instId][$level])) {
                        $aggData[$instId][$level] = ['r' => 0, 'd' => 0];
                    }
                    $aggData[$instId][$level]['r'] += $r;
                    $aggData[$instId][$level]['d'] += $d;

                    if (! isset($regAggData[$level])) {
                        $regAggData[$level] = ['r' => 0, 'd' => 0];
                    }
                    $regAggData[$level]['r'] += $r;
                    $regAggData[$level]['d'] += $d;
                }
            }
        }

        // 5. Finalize school stats and regional averages
        foreach ($aggData as $instId => $levels) {
            if (isset($schoolStatsMap[$instId])) {
                foreach ($levels as $level => $data) {
                    if ($data['d'] > 0) {
                        $schoolStatsMap[$instId]['grades'][$level] = round($data['r'] / $data['d'], 2);
                    }
                }
            }
        }

        $regionalAverages = array_fill(0, 12, null);
        foreach ($regAggData as $level => $data) {
            if ($data['d'] > 0) {
                $regionalAverages[$level] = round($data['r'] / $data['d'], 2);
            }
        }

        return [
            'schools' => array_values($schoolStatsMap),
            'regional_averages' => $regionalAverages,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ];
    }

    /**
     * Export school and grade level matrix statistics to Excel.
     */
    public function exportSchoolGradeStats(User $user, array $filters = []): array
    {
        $data = $this->getSchoolGradeStats($user, $filters);

        $headers = ['Məktəb adı'];
        for ($i = 0; $i <= 11; $i++) {
            $headers[] = $this->getRomanNumeral($i);
        }
        $headers[] = 'Orta';

        $rows = [$headers];

        foreach ($data['schools'] as $school) {
            $row = [$school['name']];
            $validRates = [];
            foreach ($school['grades'] as $rate) {
                if ($rate !== null) {
                    $validRates[] = $rate;
                }
                $row[] = $rate !== null ? $rate . '%' : '-';
            }
            // Add school average
            $row[] = count($validRates) > 0
                ? round(array_sum($validRates) / count($validRates), 2) . '%'
                : '-';

            $rows[] = $row;
        }

        // Add regional averages row
        $avgRow = ['Orta (Region)'];
        $regRates = [];
        foreach ($data['regional_averages'] as $rate) {
            if ($rate !== null) {
                $regRates[] = $rate;
            }
            $avgRow[] = $rate !== null ? $rate . '%' : '-';
        }
        // Add overall regional average
        $avgRow[] = count($regRates) > 0
            ? round(array_sum($regRates) / count($regRates), 2) . '%'
            : '-';

        $rows[] = $avgRow;

        return [
            'filename' => 'mekteb_sinif_statistikasi_' . $data['period']['start_date'] . '_' . $data['period']['end_date'] . '.xlsx',
            'data' => $rows,
        ];
    }

    /**
     * Get schools that have not submitted attendance reports for the given date range.
     * Groups results by sector for better organization.
     */
    public function getSchoolsWithMissingReports(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filters);
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        $schoolIds = $scope['school_ids'];

        if (empty($schoolIds)) {
            return [
                'summary' => [
                    'total_schools' => 0,
                    'schools_with_reports' => 0,
                    'schools_missing_reports' => 0,
                    'missing_percentage' => 0,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'baseline_days' => 0,
                    ],
                ],
                'schools' => [],
            ];
        }

        $educationProgram = $filters['education_program'] ?? null;
        $scope['schools'] = collect($scope['schools']);

        if ($educationProgram && $educationProgram !== 'all') {
            $matchingSchoolIds = Grade::whereIn('institution_id', $schoolIds)
                ->where('education_program', $educationProgram)
                ->pluck('institution_id')
                ->unique()
                ->toArray();

            $schoolIds = $matchingSchoolIds;
            $scope['schools'] = $scope['schools']->whereIn('id', $schoolIds);
        }

        // 1. Get unique reporting count for each school in the target scope (respects filters)
        $reportQuery = DB::table('class_bulk_attendance')
            ->join('grades', 'grades.id', '=', 'class_bulk_attendance.grade_id')
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate);

        if ($educationProgram && $educationProgram !== 'all') {
            $reportQuery->where('grades.education_program', $educationProgram);
        }

        $reportCounts = $reportQuery
            ->selectRaw('class_bulk_attendance.institution_id, COUNT(DISTINCT attendance_date) as c')
            ->groupBy('class_bulk_attendance.institution_id')
            ->pluck('c', 'class_bulk_attendance.institution_id')
            ->all();

        // 2. Identify 'Standard Dates' based on the WHOLE region (ignores sector/school filter)
        // This ensures the standard is regional, even if a user filters by a single sector.
        $baselineFilters = $filters;
        unset($baselineFilters['sector_id'], $baselineFilters['school_id']);
        $baselineScope = $this->resolveInstitutionScope($user, $baselineFilters, $startDate, $endDate);
        $regionalSchoolIds = $baselineScope['school_ids'];

        $dateCounts = DB::table('class_bulk_attendance')
            ->whereIn('institution_id', $regionalSchoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->selectRaw('attendance_date, COUNT(DISTINCT institution_id) as school_count')
            ->groupBy('attendance_date')
            ->get();

        $totalRegionalSchools = count($regionalSchoolIds);

        // Group activity by date for quick lookup
        $activityByDate = $dateCounts->pluck('school_count', 'attendance_date')->all();

        // 2. Identify 'Standard Dates' for both regimes
        $start = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);

        $baselineDates5 = [];
        $baselineDates6 = [];

        $current = $start;
        while ($current->lte($end)) {
            $dateStr = $current->toDateString();

            if ($current->isWeekday()) {
                $baselineDates5[] = $dateStr;
                $baselineDates6[] = $dateStr;
            } elseif ($current->isSaturday()) {
                // Saturdays only count for 6-day schools
                $baselineDates6[] = $dateStr;
            }

            $current = $current->addDay();
        }

        $baselineDays5 = count($baselineDates5);
        $baselineDays6 = count($baselineDates6);

        // Final fallback to calendar if region has zero activity at all
        if ($baselineDays5 === 0) {
            $baselineDays5 = $scope['school_days'] ?? 0;
            $baselineDays6 = $baselineDays5;
        }

        // 3. Build results based on baselineDays
        $missingSchools = [];
        $sectorStatsMap = [];

        foreach ($scope['sectors'] as $sector) {
            $sectorStatsMap[$sector->id] = [
                'sector_id' => $sector->id,
                'sector_name' => $sector->name,
                'total_schools' => 0,
                'schools_with_reports' => 0,
                'schools_missing' => 0,
                'missing_percentage' => 0,
                'schools' => [],
            ];
        }

        $sectorNamesById = collect($scope['sectors'])->pluck('name', 'id');
        $schoolsWithAnyReports = 0;

        foreach ($scope['schools'] as $school) {
            $sectorId = $school->parent_id;
            $isSixDay = $this->isSixDaySchool($school);
            $schoolBaseline = $isSixDay ? $baselineDays6 : $baselineDays5;

            $reportedDays = (int) ($reportCounts[$school->id] ?? 0);
            $missingDays = max(0, $schoolBaseline - $reportedDays);

            if ($reportedDays > 0) {
                $schoolsWithAnyReports++;
            }

            if (isset($sectorStatsMap[$sectorId])) {
                $sectorStatsMap[$sectorId]['total_schools']++;
                if ($reportedDays > 0) {
                    $sectorStatsMap[$sectorId]['schools_with_reports']++;
                }

                if ($missingDays > 0 || $schoolBaseline === 0) {
                    $sectorStatsMap[$sectorId]['schools_missing']++;

                    $schoolData = [
                        'school_id' => $school->id,
                        'name' => $school->name,
                        'sector_id' => $sectorId,
                        'sector_name' => $sectorNamesById->get($sectorId, 'Naməlum'),
                        'reported_days' => $reportedDays,
                        'missing_days' => $missingDays,
                        'baseline_days' => $schoolBaseline,
                        'is_six_day' => $isSixDay,
                        'last_report_date' => $this->getLastReportDate($school->id, $startDate),
                    ];

                    $sectorStatsMap[$sectorId]['schools'][] = $schoolData;
                    $missingSchools[] = $schoolData;
                }
            }
        }

        // 4. Calculate summaries
        foreach ($sectorStatsMap as &$stat) {
            if ($stat['total_schools'] > 0) {
                $stat['missing_percentage'] = round(($stat['schools_missing'] / $stat['total_schools']) * 100, 2);
            }
        }

        $totalSchools = count($schoolIds);
        $totalMissing = count($missingSchools);

        // 5. Build results based on baselineDays
        // Sort missing schools: 6-day first, then most missing days first, then name
        usort($missingSchools, function ($a, $b) {
            // is_six_day DESC
            if ($a['is_six_day'] !== $b['is_six_day']) {
                return $b['is_six_day'] <=> $a['is_six_day'];
            }
            // missing_days DESC
            if ($a['missing_days'] !== $b['missing_days']) {
                return $b['missing_days'] <=> $a['missing_days'];
            }

            // name ASC
            return strcmp($a['name'], $b['name']);
        });

        return [
            'summary' => [
                'total_schools' => $totalSchools,
                'schools_with_reports' => $schoolsWithAnyReports,
                'schools_missing_reports' => $totalMissing,
                'missing_percentage' => $totalSchools > 0 ? round(($totalMissing / $totalSchools) * 100, 2) : 0,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'baseline_days' => $baselineDays5,
                ],
            ],
            'sectors' => array_values($sectorStatsMap),
            'schools' => $missingSchools,
        ];
    }

    /**
     * Export schools with missing reports to Excel.
     */
    public function exportMissingReports(User $user, array $filters = []): array
    {
        $data = $this->getSchoolsWithMissingReports($user, $filters);

        $headers = [
            'Məktəb adı',
            'Sektor',
            'Doldurulma sayı',
            'Baza (Mod)',
            'Çatışmayan gün sayı',
            'Son hesabat tarixi',
        ];

        $rows = [$headers];
        foreach ($data['schools'] as $school) {
            $rows[] = [
                $school['name'],
                $school['sector_name'],
                $school['reported_days'],
                $school['baseline_days'],
                $school['missing_days'],
                $school['last_report_date'] ?? 'Hesabat yoxdur',
            ];
        }

        return [
            'filename' => 'doldurmayan_mektebler_' . $data['summary']['period']['start_date'] . '_' . $data['summary']['period']['end_date'] . '.xlsx',
            'data' => $rows,
        ];
    }

    /**
     * Get the last report date for a school before the given date.
     */
    private function getLastReportDate(int $schoolId, string $beforeDate): ?string
    {
        $lastRecord = ClassBulkAttendance::where('institution_id', $schoolId)
            ->whereDate('attendance_date', '<', $beforeDate)
            ->orderBy('attendance_date', 'desc')
            ->first();

        return $lastRecord?->attendance_date?->format('Y-m-d');
    }

    /**
     * Helper to check if a school has a 6-day work week.
     */
    private function isSixDaySchool(Institution $school): bool
    {
        $metadata = $school->metadata ?? [];
        $workingDays = (int) ($metadata['working_days'] ?? 5);

        return $workingDays === 6;
    }

    /**
     * Get attendance rankings for schools based on submission time.
     */
    public function getRankings(User $user, array $filters = []): array
    {
        $date = $filters['date'] ?? now()->toDateString();
        $shiftType = $filters['shift_type'] ?? 'all';

        // Resolve scope to get schools list
        [$startDate, $endDate] = [$date, $date];
        $scope = $this->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        $schoolIds = $scope['school_ids'];

        if (empty($schoolIds)) {
            return [
                'date' => $date,
                'shift_type' => $shiftType,
                'schools' => [],
                'summary' => [
                    'total_schools' => 0,
                    'submitted_count' => 0,
                    'on_time_count' => 0,
                    'late_count' => 0,
                ],
            ];
        }

        // Get submission times for each school on the given date
        $submissions = ClassBulkAttendance::selectRaw(
            'class_bulk_attendance.institution_id,
             MIN(morning_recorded_at) as first_morning_submission,
             MAX(morning_recorded_at) as last_morning_submission,
             MIN(evening_recorded_at) as first_evening_submission,
             MAX(evening_recorded_at) as last_evening_submission,
             COUNT(DISTINCT CASE WHEN morning_recorded_at IS NOT NULL THEN grade_id END) as morning_classes,
             COUNT(DISTINCT CASE WHEN evening_recorded_at IS NOT NULL THEN grade_id END) as evening_classes'
        )
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereDate('attendance_date', $date)
            ->groupBy('class_bulk_attendance.institution_id')
            ->get()
            ->keyBy('institution_id');

        // Build sector name map
        $sectorNamesById = collect($scope['sectors'])->pluck('name', 'id');

        // Define deadlines
        $morningDeadline = CarbonImmutable::parse($date)->setTime(10, 0, 0);
        $eveningDeadline = CarbonImmutable::parse($date)->setTime(14, 30, 0);

        $rankings = [];
        $submittedCount = 0;
        $onTimeCount = 0;
        $lateCount = 0;

        foreach ($scope['schools'] as $school) {
            $submission = $submissions->get($school->id);
            $sectorId = $school->parent_id;

            // Determine which shift to use
            $isMorning = in_array($shiftType, ['morning', 'all']);
            $isEvening = in_array($shiftType, ['evening', 'all']);

            $morningSubmittedAt = $submission?->first_morning_submission
                ? CarbonImmutable::parse($submission->first_morning_submission)
                : null;
            $eveningSubmittedAt = $submission?->first_evening_submission
                ? CarbonImmutable::parse($submission->first_evening_submission)
                : null;

            // Calculate status for each shift
            $morningData = $this->calculateShiftData(
                $morningSubmittedAt,
                $morningDeadline,
                $submission?->morning_classes ?? 0,
                'morning'
            );
            $eveningData = $this->calculateShiftData(
                $eveningSubmittedAt,
                $eveningDeadline,
                $submission?->evening_classes ?? 0,
                'evening'
            );

            // Use the earliest submission for ranking
            $primaryData = null;
            if ($isMorning && $morningData['submitted']) {
                $primaryData = $morningData;
            } elseif ($isEvening && $eveningData['submitted']) {
                $primaryData = $eveningData;
            } elseif ($isMorning && $isEvening) {
                // Both shifts - use the earlier one
                if ($morningData['submitted'] && $eveningData['submitted']) {
                    $primaryData = $morningData['submitted_at']->lte($eveningData['submitted_at'])
                        ? $morningData
                        : $eveningData;
                } elseif ($morningData['submitted']) {
                    $primaryData = $morningData;
                } elseif ($eveningData['submitted']) {
                    $primaryData = $eveningData;
                }
            }

            if ($primaryData && $primaryData['submitted']) {
                $submittedCount++;
                if ($primaryData['is_late']) {
                    $lateCount++;
                } else {
                    $onTimeCount++;
                }
            }

            $rankings[] = [
                'school_id' => $school->id,
                'name' => $school->name,
                'sector_id' => $sectorId,
                'sector_name' => $sectorNamesById->get($sectorId, 'Naməlum'),
                'shift_type' => $primaryData ? $primaryData['shift_type'] : null,
                'deadline_time' => $primaryData ? $primaryData['deadline_time'] : null,
                'submitted_at' => $primaryData ? $primaryData['submitted_at']->setTimezone('Asia/Baku')->toDateTimeString() : null,
                'is_late' => $primaryData ? $primaryData['is_late'] : false,
                'late_minutes' => $primaryData ? $primaryData['late_minutes'] : 0,
                'classes_count' => $primaryData ? $primaryData['classes_count'] : 0,
                'status' => $this->getRankingStatus($primaryData),
                'morning' => [
                    'submitted' => $morningData['submitted'],
                    'submitted_at' => $morningData['submitted'] ? $morningData['submitted_at']->setTimezone('Asia/Baku')->toDateTimeString() : null,
                    'is_late' => $morningData['is_late'],
                    'late_minutes' => $morningData['late_minutes'],
                ],
                'evening' => [
                    'submitted' => $eveningData['submitted'],
                    'submitted_at' => $eveningData['submitted'] ? $eveningData['submitted_at']->setTimezone('Asia/Baku')->toDateTimeString() : null,
                    'is_late' => $eveningData['is_late'],
                    'late_minutes' => $eveningData['late_minutes'],
                ],
            ];
        }

        // Sort by submission time (earliest first), then by school name
        usort($rankings, function ($a, $b) {
            // Submitted schools first
            if ($a['submitted_at'] === null && $b['submitted_at'] !== null) {
                return 1;
            }
            if ($a['submitted_at'] !== null && $b['submitted_at'] === null) {
                return -1;
            }
            // By submission time (earlier first)
            if ($a['submitted_at'] && $b['submitted_at']) {
                $cmp = strcmp($a['submitted_at'], $b['submitted_at']);
                if ($cmp !== 0) {
                    return $cmp;
                }
            }

            // By name if same time
            return strcmp($a['name'], $b['name']);
        });

        return [
            'date' => $date,
            'shift_type' => $shiftType,
            'morning_deadline' => $morningDeadline->toDateTimeString(),
            'evening_deadline' => $eveningDeadline->toDateTimeString(),
            'schools' => $rankings,
            'summary' => [
                'total_schools' => count($schoolIds),
                'submitted_count' => $submittedCount,
                'on_time_count' => $onTimeCount,
                'late_count' => $lateCount,
                'not_submitted_count' => count($schoolIds) - $submittedCount,
            ],
        ];
    }

    /**
     * Calculate shift-specific data for rankings.
     */
    private function calculateShiftData(
        ?CarbonImmutable $submittedAt,
        CarbonImmutable $deadline,
        int $classesCount,
        string $shiftType
    ): array {
        if ($submittedAt === null) {
            return [
                'submitted' => false,
                'submitted_at' => null,
                'deadline' => $deadline,
                'deadline_time' => $shiftType === 'morning' ? '10:00' : '14:30',
                'shift_type' => $shiftType,
                'is_late' => false,
                'late_minutes' => 0,
                'classes_count' => $classesCount,
            ];
        }

        $isLate = $submittedAt->gt($deadline);
        $lateMinutes = $isLate ? (int) round($submittedAt->diffInMinutes($deadline, false) * -1) : 0;

        return [
            'submitted' => true,
            'submitted_at' => $submittedAt,
            'deadline' => $deadline,
            'deadline_time' => $shiftType === 'morning' ? '10:00' : '14:30',
            'shift_type' => $shiftType,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
            'classes_count' => $classesCount,
        ];
    }

    /**
     * Get human-readable status for ranking.
     */
    private function getRankingStatus(?array $data): string
    {
        if ($data === null || ! $data['submitted']) {
            return 'not_submitted';
        }
        if ($data['is_late']) {
            return 'late';
        }

        return 'on_time';
    }
}
