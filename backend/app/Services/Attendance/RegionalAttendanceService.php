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
    private const MORNING_SUBMISSION_DEADLINE = '10:00:00';

    private const EVENING_SUBMISSION_DEADLINE = '15:00:00';

    public function __construct(
        private readonly AttendanceScopeResolver $scopeResolver,
        private readonly AttendanceStatsCalculator $statsCalculator,
    ) {}

    /**
     * Build aggregated attendance overview for the given user scope.
     */
    public function getOverview(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->scopeResolver->resolveDateRange($filters);

        $scope = $this->scopeResolver->resolveInstitutionScope($user, $filters, $startDate, $endDate);
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

        $schoolStats = $this->statsCalculator->buildSchoolStats(
            $scope['schools']->all(),
            $schoolAggregates,
            $gradeStudentCounts,
            $scope['school_days'],
            $sectorNamesById
        );

        $sectorStats = $this->statsCalculator->buildSectorStats(
            $scope['sectors']->all(),
            $schoolStats,
            $schoolIds,
            $startDate,
            $endDate
        );

        $summary = $this->statsCalculator->buildSummary($schoolStats, $sectorStats, $startDate, $endDate, $scope['school_days']);
        $trends = $this->statsCalculator->buildTrends($trendAggregates, $startDate, $endDate);

        return [
            'summary' => $summary,
            'trends' => $trends,
            'sectors' => array_values($sectorStats),
            'schools' => array_values($schoolStats),
            'alerts' => $this->statsCalculator->buildAlerts($schoolStats),
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
        [$startDate, $endDate] = $this->scopeResolver->resolveDateRange($filters);

        $scope = $this->scopeResolver->resolveInstitutionScope($user, $filters, $startDate, $endDate);
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

        $classStats = $this->statsCalculator->buildClassStats($records, $gradeMap, $scope['school_days']);

        $summary = $this->statsCalculator->buildSchoolSummary($classStats, $scope['school_days'], $startDate, $endDate);

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
     * Get grade level attendance statistics aggregated by class level (1-11).
     * Supports filtering by education program.
     */
    public function getGradeLevelStats(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->scopeResolver->resolveDateRange($filters);

        $scope = $this->scopeResolver->resolveInstitutionScope($user, $filters, $startDate, $endDate);
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
            $totalPresent = 0;
            $totalUniformViolations = 0;
            $uniformComplianceRate = 0;

            if ($agg) {
                $avgRate = $this->statsCalculator->calculateWeightedRate((float) $agg->weighted_rates, (float) $agg->weighted_denominator);

                $totalPresent = (int) $agg->eff_morning_present + (int) $agg->eff_evening_present;
                $uniformStats = $this->statsCalculator->calculateUniformStats($totalPresent, (int) $agg->total_uniform_violations);
                $totalUniformViolations = $uniformStats['violations'];
                $uniformComplianceRate = $uniformStats['compliance'];
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
        $overallAvgRate = $this->statsCalculator->calculateWeightedRate($overallWeightedRate, $overallWeight);

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
     * Get attendance statistics for schools and grade levels (matrix).
     */
    public function getSchoolGradeStats(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->scopeResolver->resolveDateRange($filters);
        $scope = $this->scopeResolver->resolveInstitutionScope($user, $filters, $startDate, $endDate);
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
     * Get schools that have not submitted attendance reports for the given date range.
     * Groups results by sector for better organization.
     */
    public function getSchoolsWithMissingReports(User $user, array $filters = []): array
    {
        [$startDate, $endDate] = $this->scopeResolver->resolveDateRange($filters);
        $scope = $this->scopeResolver->resolveInstitutionScope($user, $filters, $startDate, $endDate);
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
        $baselineScope = $this->scopeResolver->resolveInstitutionScope($user, $baselineFilters, $startDate, $endDate);
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

        // Batch-fetch last report date per school (before $startDate) — replaces N+1 per-school queries
        $lastReportDates = ClassBulkAttendance::whereIn('institution_id', $schoolIds)
            ->whereDate('attendance_date', '<', $startDate)
            ->selectRaw('institution_id, MAX(attendance_date) as last_date')
            ->groupBy('institution_id')
            ->pluck('last_date', 'institution_id')
            ->all();

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
            $isSixDay = $this->scopeResolver->isSixDaySchool($school);
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
                        'last_report_date' => isset($lastReportDates[$school->id]) ? (string) $lastReportDates[$school->id] : null,
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
     * Get attendance rankings for schools based on submission time.
     */
    public function getRankings(User $user, array $filters = []): array
    {
        $shiftType = $filters['shift_type'] ?? 'all';

        // Resolve scope to get schools list and date range
        [$startDate, $endDate] = $this->scopeResolver->resolveDateRange($filters);
        if (isset($filters['date']) && ! isset($filters['start_date'])) {
            $startDate = $filters['date'];
            $endDate = $filters['date'];
        }

        $scope = $this->scopeResolver->resolveInstitutionScope($user, $filters, $startDate, $endDate);
        $schoolIds = $scope['school_ids'];

        $isMultipleDays = $startDate !== $endDate;
        $workdays = [];
        $current = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);
        while ($current->lte($end)) {
            // Include Mondays through Saturdays
            if (! $current->isSunday()) {
                $workdays[] = $current->toDateString();
            }
            $current = $current->addDay();
        }

        $standardDaysCount = 0;
        foreach ($workdays as $wd) {
            // Count Mon-Fri days as the standard comparison base
            if (CarbonImmutable::parse($wd)->isWeekday()) {
                $standardDaysCount++;
            }
        }

        if (empty($schoolIds) || empty($workdays)) {
            return [
                'date' => $startDate,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'shift_type' => $shiftType,
                'schools' => [],
                'summary' => [
                    'total_schools' => count($schoolIds),
                    'submitted_count' => 0,
                    'on_time_count' => 0,
                    'late_count' => 0,
                    'not_submitted_count' => count($schoolIds),
                ],
            ];
        }

        // Get all active grades for these schools to calculate score
        $allGrades = Grade::withoutGlobalScopes()
            ->whereIn('institution_id', $schoolIds)
            ->where('is_active', true)
            ->select('id', 'institution_id', 'teaching_shift')
            ->get()
            ->groupBy('institution_id');

        // Get submission times for each school in the range
        $submissions = ClassBulkAttendance::selectRaw(
            'class_bulk_attendance.institution_id,
             class_bulk_attendance.attendance_date,
             class_bulk_attendance.grade_id,
             morning_recorded_at,
             evening_recorded_at'
        )
            ->whereIn('class_bulk_attendance.institution_id', $schoolIds)
            ->whereBetween('class_bulk_attendance.attendance_date', [$startDate, $endDate])
            ->get()
            ->groupBy(['institution_id', function ($item) {
                return $item->attendance_date->toDateString();
            }]);

        // Initialize counters and range data
        $rankings = [];
        $submittedCount = 0;
        $onTimeCount = 0;
        $lateCount = 0;

        $morningDeadlineTime = self::MORNING_SUBMISSION_DEADLINE;
        $eveningDeadlineTime = self::EVENING_SUBMISSION_DEADLINE;
        $morningDeadline = CarbonImmutable::parse($workdays[0])->setTime(10, 0, 0);
        $eveningDeadline = CarbonImmutable::parse($workdays[0])->setTime(15, 0, 0);
        $sectorNamesById = collect($scope['sectors'])->pluck('name', 'id');

        $lastDayInWorkdays = ! empty($workdays) ? $workdays[count($workdays) - 1] : null;

        foreach ($scope['schools'] as $school) {
            $instSubmissionsByDate = $submissions->get($school->id, collect());
            $sectorId = $school->parent_id;

            $schoolGrades = $allGrades->get($school->id, collect());
            $totalGradesCount = $schoolGrades->count();
            $totalScoreInPeriod = 0;

            // For range result summary (speed of last day or earliest day)
            $lastDaySubmissions = $lastDayInWorkdays ? $instSubmissionsByDate->get($lastDayInWorkdays, collect()) : collect();
            $firstDaySubmissions = ! empty($workdays) ? $instSubmissionsByDate->get($workdays[0], collect()) : collect();

            // We use the last day's submission details for display purposes in the row
            $displaySubmissions = $isMultipleDays ? $lastDaySubmissions : $firstDaySubmissions;

            $actualWorkdaysForSchool = 0;
            $isSixDaySchool = false;

            // Detect if 6-day school by checking Saturday submissions in the entire date range
            foreach ($workdays as $day) {
                if (CarbonImmutable::parse($day)->isSaturday()) {
                    if ($instSubmissionsByDate->has($day)) {
                        $isSixDaySchool = true;
                        break;
                    }
                }
            }

            foreach ($workdays as $day) {
                $isSaturday = CarbonImmutable::parse($day)->isSaturday();

                // If it's a 5-day school, skip Saturday points but also don't count it as a workday
                if ($isSaturday) {
                    if (! $isSixDaySchool) {
                        continue;
                    }
                    // For 6-day schools, Saturday is a penalty-only day, so we don't increment the workday counter (divisor)
                } else {
                    $actualWorkdaysForSchool++;
                }
                $daySubmissions = $instSubmissionsByDate->get($day, collect());
                $onTimeCountForScore = 0;
                $lateCountForScore = 0;

                if ($totalGradesCount > 0) {
                    $gradeSubmissionMap = $daySubmissions->keyBy('grade_id');

                    foreach ($schoolGrades as $grade) {
                        $gradeSub = $gradeSubmissionMap->get($grade->id);
                        $shift = $grade->teaching_shift ?? '1';
                        $isAfternoon = str_contains($shift, '2');
                        $limitTime = $isAfternoon ? $eveningDeadlineTime : $morningDeadlineTime;

                        $recordedAt = null;
                        if ($gradeSub) {
                            $recordedAt = $isAfternoon ? $gradeSub->evening_recorded_at : $gradeSub->morning_recorded_at;
                            if (! $recordedAt) {
                                $recordedAt = $gradeSub->morning_recorded_at ?? $gradeSub->evening_recorded_at;
                            }
                        }

                        if ($recordedAt) {
                            $recordTime = CarbonImmutable::parse($recordedAt)->format('H:i:s');
                            if ($recordTime <= $limitTime) {
                                $onTimeCountForScore++;
                            } else {
                                $lateCountForScore++;
                            }
                        } else {
                            $lateCountForScore++;
                        }
                    }
                    $dayScore = ($onTimeCountForScore - $lateCountForScore) / $totalGradesCount;

                    if ($isSaturday && $isSixDaySchool) {
                        // Penalty-only logic for Saturdays: 0 if 100% on-time, negative if any delays
                        // (onTimeCountForScore / totalGradesCount) - 1.0 gives:
                        // 100% on-time -> 0.0 (no advantage)
                        // 80% on-time -> -0.2 (penalty)
                        // 0% on-time -> -1.0 (full penalty)
                        $totalScoreInPeriod += (($onTimeCountForScore / $totalGradesCount) - 1.0);
                    } else {
                        $totalScoreInPeriod += $dayScore;
                    }
                }
            }

            // Normalization: Fairly compare 5-day and 6-day schools
            if ($actualWorkdaysForSchool > 0) {
                $averagePerformance = $totalScoreInPeriod / $actualWorkdaysForSchool;
                // For totals, normalize to the standard 5-day week length in results
                $finalPeriodScore = $isMultipleDays && $standardDaysCount > 0
                    ? $averagePerformance * $standardDaysCount
                    : $totalScoreInPeriod;
            } else {
                $finalPeriodScore = 0;
            }

            $morningSubmittedAt = $displaySubmissions->whereNotNull('morning_recorded_at')->min('morning_recorded_at');
            $eveningSubmittedAt = $displaySubmissions->whereNotNull('evening_recorded_at')->min('evening_recorded_at');

            // Shift data for ranking display (last day)
            $morningData = $this->calculateShiftData(
                $morningSubmittedAt ? CarbonImmutable::parse($morningSubmittedAt) : null,
                $morningDeadline,
                $displaySubmissions->whereNotNull('morning_recorded_at')->count(),
                'morning'
            );
            $eveningData = $this->calculateShiftData(
                $eveningSubmittedAt ? CarbonImmutable::parse($eveningSubmittedAt) : null,
                $eveningDeadline,
                $displaySubmissions->whereNotNull('evening_recorded_at')->count(),
                'evening'
            );

            $primaryData = null;
            $isMorning = in_array($shiftType, ['morning', 'all']);
            $isEvening = in_array($shiftType, ['evening', 'all']);

            if ($isMorning && $morningData['submitted']) {
                $primaryData = $morningData;
            } elseif ($isEvening && $eveningData['submitted']) {
                $primaryData = $eveningData;
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
                'submitted_at' => $primaryData && $primaryData['submitted_at'] ? $primaryData['submitted_at']->setTimezone('Asia/Baku')->toDateTimeString() : null,
                'is_late' => $primaryData ? $primaryData['is_late'] : false,
                'late_minutes' => $primaryData ? $primaryData['late_minutes'] : 0,
                'classes_count' => $totalGradesCount,
                'score' => round($finalPeriodScore, 2),
                'per_day_score' => round($totalScoreInPeriod / ($actualWorkdaysForSchool ?: 1), 2),
                'is_six_day' => $isSixDaySchool,
                'workday_count' => $actualWorkdaysForSchool,
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

        // Sort by Score DESC, then name
        usort($rankings, function ($a, $b) {
            if ($a['score'] !== $b['score']) {
                return $b['score'] <=> $a['score'];
            }

            return strcmp($a['name'], $b['name']);
        });

        return [
            'date' => $startDate,
            'start_date' => $startDate,
            'end_date' => $endDate,
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
                'deadline_time' => $shiftType === 'morning' ? '10:00' : '15:00',
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
            'deadline_time' => $shiftType === 'morning' ? '10:00' : '15:00',
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
