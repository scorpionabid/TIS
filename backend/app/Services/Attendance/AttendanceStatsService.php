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
            
            $reported = $agg ? $agg->reported_days : 0;
            $missing = max(0, $days - $reported);

            $stats[$school->id] = [
                'id' => $school->id,
                'name' => $school->name,
                'sector_id' => $school->parent_id,
                'sector_name' => $sectorNames->get($school->parent_id, 'Naməlum'),
                'attendance_rate' => $agg ? round($agg->avg_rate, 2) : 0,
                'reported_days' => $reported,
                'missing_days' => $missing,
                'student_count' => $count ? $count['student_total'] : 0,
                'last_morning_recorded' => $agg ? $agg->last_morning_recorded : null,
                'last_evening_recorded' => $agg ? $agg->last_evening_recorded : null,
                'is_compliant' => $missing === 0,
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
        $avgRate = $totalSchools > 0 ? array_sum(array_column($schoolStats, 'attendance_rate')) / $totalSchools : 0;
        
        return [
            'period_start' => $start,
            'period_end' => $end,
            'expected_days' => $days,
            'total_schools' => $totalSchools,
            'average_attendance' => round($avgRate, 2),
            'sector_count' => count($sectorStats),
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
            $avgRate = $reported > 0 ? $classRecords->avg('daily_attendance_rate') : 0;

            $stats[$id] = [
                'id' => $id,
                'name' => $grade->name,
                'level' => $grade->class_level,
                'student_count' => $grade->student_count,
                'reported_days' => $reported,
                'missing_days' => max(0, $days - $reported),
                'average_rate' => round($avgRate, 2),
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
        $avgRate = $totalClasses > 0 ? array_sum(array_column($classStats, 'average_rate')) / $totalClasses : 0;

        return [
            'total_classes' => $totalClasses,
            'average_rate' => round($avgRate, 2),
            'period_days' => $days,
        ];
    }

    /**
     * Formats an empty overview response.
     */
    protected function formatEmptyOverview(array $scope, string $start, string $end): array
    {
        return [
            'summary' => ['average_attendance' => 0, 'total_schools' => 0],
            'trends' => [],
            'sectors' => [],
            'schools' => [],
            'alerts' => [],
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

        $missing = [];
        foreach ($scope['schools'] as $school) {
            $reported = (int)($reportCounts[$school->id] ?? 0);
            $baseline = $scope['school_days'];
            if ($reported < $baseline) {
                $missing[] = [
                    'school_id' => $school->id,
                    'name' => $school->name,
                    'reported_days' => $reported,
                    'missing_days' => $baseline - $reported,
                    'last_report_date' => $this->getLastReportDate($school->id, $startDate),
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

    private function getLastReportDate(int $schoolId, string $before): ?string
    {
        $rec = ClassBulkAttendance::where('institution_id', $schoolId)->whereDate('attendance_date', '<', $before)->orderByDesc('attendance_date')->first();
        return $rec?->attendance_date?->format('Y-m-d');
    }
}
