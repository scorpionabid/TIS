<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
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

        if (empty($schoolIds)) {
            return $this->formatEmptyOverview($scope, $startDate, $endDate);
        }

        // Aggregate per school directly in SQL — avoids loading 100K+ rows into PHP memory
        $schoolAggregates = ClassBulkAttendance::selectRaw(
            'institution_id,
             COUNT(DISTINCT attendance_date) AS reported_days,
             COUNT(DISTINCT grade_id)        AS reported_classes,
             COUNT(*)                        AS records,
             SUM(morning_present)            AS total_morning_present,
             SUM(evening_present)            AS total_evening_present,
             SUM(morning_excused + morning_unexcused)   AS morning_absent,
             SUM(evening_excused + evening_unexcused)   AS evening_absent,
             SUM(total_students)             AS total_possible,
             AVG(daily_attendance_rate)      AS avg_rate'
        )
            ->whereIn('institution_id', $schoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->groupBy('institution_id')
            ->get()
            ->keyBy('institution_id');

        // Aggregate per date for trend chart
        $trendAggregates = ClassBulkAttendance::selectRaw(
            'attendance_date,
             AVG(daily_attendance_rate) AS avg_rate,
             COUNT(*)                   AS records'
        )
            ->whereIn('institution_id', $schoolIds)
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->groupBy('attendance_date')
            ->orderBy('attendance_date')
            ->get()
            ->keyBy(fn ($r) => (string) $r->attendance_date);

        $gradeStudentCounts = Grade::query()
            ->whereIn('institution_id', $schoolIds)
            ->get(['id', 'institution_id', 'student_count', 'class_level', 'name'])
            ->groupBy('institution_id')
            ->map(fn (Collection $grades) => [
                'student_total' => (int) $grades->sum(fn ($grade) => (int) ($grade->student_count ?? 0)),
                'grades' => $grades,
            ]);

        // Build sector name map for lookup without N+1
        $sectorNamesById = collect($scope['sectors'])->pluck('name', 'id');

        $schoolStats = $this->buildSchoolStats(
            $scope['schools'],
            $schoolAggregates,
            $gradeStudentCounts,
            $scope['school_days'],
            $sectorNamesById
        );

        $sectorStats = $this->buildSectorStats(
            $scope['sectors'],
            $schoolStats
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

        $gradeMap = Grade::query()
            ->where('institution_id', $school->id)
            ->get(['id', 'name', 'class_level', 'student_count'])
            ->keyBy('id');

        $records = ClassBulkAttendance::with([
            'grade:id,institution_id,name,class_level,student_count',
        ])
            ->where('institution_id', $school->id)
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
            ->get(['id', 'name', 'level', 'parent_id', 'type'])
            ->keyBy('id');

        $sectors = $institutions
            ->where('level', 3)
            ->values();

        $schools = $institutions
            ->where('level', 4)
            ->values();

        if ($targetSectorId) {
            if (! $sectors->contains('id', (int) $targetSectorId)) {
                throw ValidationException::withMessages([
                    'sector_id' => 'Bu sektora baxmaq üçün icazəniz yoxdur.',
                ]);
            }

            $activeSector = $activeSector ?: $sectors->firstWhere('id', (int) $targetSectorId);
            $schools = $schools->where('parent_id', (int) $targetSectorId)->values();
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
     * @param  Collection  $schoolAggregates  Keyed by institution_id — result of GROUP BY SQL query
     * @param  Collection  $sectorNamesById   sector_id → name map for label lookup
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
            $totals      = $gradeStudentCounts->get($school->id, ['student_total' => 0]);
            $agg         = $schoolAggregates->get($school->id);
            $reportedDays = (int) ($agg?->reported_days ?? 0);
            $avgRate      = round((float) ($agg?->avg_rate ?? 0), 2);

            $stat = [
                'school_id'             => $school->id,
                'name'                  => $school->name,
                'sector_id'             => $school->parent_id,
                'sector_name'           => $sectorNamesById->get($school->parent_id, 'Naməlum'),
                'total_students'        => (int) ($totals['student_total'] ?? 0),
                'expected_school_days'  => $schoolDays,
                'records'               => (int) ($agg?->records ?? 0),
                'reported_days'         => $reportedDays,
                'reported_classes'      => (int) ($agg?->reported_classes ?? 0),
                'actual_attendance'     => round(((float) ($agg?->total_morning_present ?? 0) + (float) ($agg?->total_evening_present ?? 0)) / 2, 2),
                'possible_attendance'   => (int) ($agg?->total_possible ?? 0),
                'morning_absent'        => (int) ($agg?->morning_absent ?? 0),
                'evening_absent'        => (int) ($agg?->evening_absent ?? 0),
                'average_attendance_rate' => $avgRate,
                'reporting_gap'         => max(0, $schoolDays - $reportedDays),
                'warnings'              => [],
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
    private function buildSectorStats(array $sectors, array $schoolStats): array
    {
        $sectorStats = [];

        foreach ($sectors as $sector) {
            $sectorStats[$sector->id] = [
                'sector_id' => $sector->id,
                'name' => $sector->name,
                'school_count' => 0,
                'total_students' => 0,
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
            $sectorStats[$sectorId]['total_students'] += $schoolStat['total_students'];
            $sectorStats[$sectorId]['reported_days'] += $schoolStat['reported_days'];
            $denominator = max($schoolStat['total_students'], 1);
            $sectorStats[$sectorId]['weighted_rates'] += $schoolStat['average_attendance_rate'] * $denominator;
            $sectorStats[$sectorId]['weighted_denominator'] += $denominator;
            $sectorStats[$sectorId]['schools'][] = $schoolStat;
        }

        foreach ($sectorStats as &$stat) {
            $stat['average_attendance_rate'] = $stat['weighted_denominator'] > 0
                ? round($stat['weighted_rates'] / $stat['weighted_denominator'], 2)
                : 0;

            unset($stat['weighted_rates'], $stat['weighted_denominator']);
        }

        return $sectorStats;
    }

    private function buildSummary(array $schoolStats, array $sectorStats, string $startDate, string $endDate, int $schoolDays): array
    {
        $totalStudents = array_sum(array_column($schoolStats, 'total_students'));
        $weightedRates = 0;
        $weightedDenominator = 0;
        $totalReportedDays = array_sum(array_column($schoolStats, 'reported_days'));

        foreach ($schoolStats as $stat) {
            $denominator = max($stat['total_students'], 1);
            $weightedRates += $stat['average_attendance_rate'] * $denominator;
            $weightedDenominator += $denominator;
        }

        $averageRate = $weightedDenominator > 0
            ? round($weightedRates / $weightedDenominator, 2)
            : 0;

        return [
            'total_sectors' => count($sectorStats),
            'total_schools' => count($schoolStats),
            'total_students' => $totalStudents,
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
     * @param  Collection  $trendAggregates  Keyed by 'Y-m-d' date string
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
                    'date'       => $dateStr,
                    'short_date' => $current->format('d.m'),
                    'rate'       => $agg ? round((float) $agg->avg_rate, 2) : 0,
                    'reported'   => $agg !== null,
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
                    'unique_dates' => [],
                    'warnings' => [],
                    'expected_school_days' => $schoolDays,
                ];
            }

            $stat = &$classStats[$gradeId ?? 0];
            $classTotal = max((int) ($record->grade?->student_count ?? $record->total_students ?? 0), 0);
            $morningPresent = (int) $record->morning_present;
            $eveningPresent = (int) $record->evening_present;
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
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'school_days' => $schoolDays,
                ],
            ];
        }

        $totalClasses = count($classStats);
        $reportedClasses = collect($classStats)->where('reported_days', '>', 0)->count();
        $weightedRates = 0;
        $denominator = 0;

        foreach ($classStats as $stat) {
            $weight = max($stat['student_count'], 1);
            $weightedRates += $stat['average_attendance_rate'] * $weight;
            $denominator += $weight;
        }

        return [
            'total_classes' => $totalClasses,
            'reported_classes' => $reportedClasses,
            'average_attendance_rate' => $denominator > 0 ? round($weightedRates / $denominator, 2) : 0,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'school_days' => $schoolDays,
            ],
        ];
    }
}
