<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Institution;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

/**
 * Normalized attendance reports with daily / weekly / monthly grouping.
 *
 * Extracted from the 338-line reports() method of SchoolAttendanceController.
 * The three groupBy modes share a common query-building phase; only the
 * aggregation and pagination logic branches.
 */
class SchoolAttendanceReportsService
{
    private const SORT_COLUMN_MAP = [
        'date' => 'attendance_date',
        'attendance_rate' => 'daily_attendance_rate',
        'first_lesson' => 'morning_present',
        'last_lesson' => 'evening_present',
    ];

    public function __construct(
        private readonly SchoolAttendanceCalculator $calculator,
        private readonly SchoolAttendanceScopeFilter $scope,
    ) {}

    /**
     * Return paginated or grouped attendance report data.
     *
     * @param  array                                           $validated Pre-validated input from the controller.
     * @return array{data: mixed, meta: array, context: array}
     */
    public function getReports(array $validated, User $user): array
    {
        $groupBy = $validated['group_by'] ?? 'daily';
        $startDate = $validated['start_date'] ?? Carbon::now()->startOfMonth()->format('Y-m-d');
        $endDate = $validated['end_date'] ?? Carbon::now()->format('Y-m-d');
        $sortField = $validated['sort_field'] ?? 'date';
        $sortDirection = strtolower($validated['sort_direction'] ?? 'desc');
        if (! in_array($sortDirection, ['asc', 'desc'], true)) {
            $sortDirection = 'desc';
        }

        $query = ClassBulkAttendance::with([
            'institution:id,name,type',
            'grade:id,name,class_level',
        ]);

        if (! empty($validated['school_id'])) {
            $query->where('institution_id', $validated['school_id']);
        }

        if (! empty($validated['class_name'])) {
            $classFilter = $validated['class_name'];
            // Support both "A" (name only) and "1-A" (level-name) formats
            if (preg_match('/^(\d+)-(.+)$/', $classFilter, $m)) {
                $query->whereHas('grade', fn (Builder $b) => $b->where('class_level', (int) $m[1])->where('name', $m[2]));
            } else {
                $query->whereHas('grade', fn (Builder $b) => $b->where('name', $classFilter));
            }
        }

        $query->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate);

        $this->scope->apply($query, $user, 'institution_id');

        $this->applySorting($query, $sortField, $sortDirection);

        $context = [
            'group_by' => $groupBy,
            'range' => ['start_date' => $startDate, 'end_date' => $endDate],
            'sorting' => ['field' => $sortField, 'direction' => $sortDirection],
        ];

        if ($groupBy === 'daily') {
            return $this->buildDailyPage($query, $validated, $context);
        }

        return $this->buildGroupedPage($query, $validated, $user, $groupBy, $startDate, $endDate, $context);
    }

    // -------------------------------------------------------------------------
    // Private — daily
    // -------------------------------------------------------------------------

    private function buildDailyPage(\Illuminate\Database\Eloquent\Builder $query, array $validated, array $context): array
    {
        $perPage = $validated['per_page'] ?? 20;
        $records = (clone $query)->paginate($perPage);

        $data = collect($records->items())
            ->map(fn (ClassBulkAttendance $r) => $this->formatDailyRecord($r));

        return [
            'data' => $data,
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
                'from' => $records->firstItem(),
                'to' => $records->lastItem(),
            ],
            'context' => $context,
        ];
    }

    private function formatDailyRecord(ClassBulkAttendance $record): array
    {
        $total = (int) $record->total_students;
        $counts = $this->calculator->effectiveCounts($record);
        $em = $counts['effMorning'];
        $ee = $counts['effEvening'];
        $hm = $counts['hasMorning'];
        $he = $counts['hasEvening'];

        $attendanceRate = $this->calculator->effectiveRate($record);
        $morningRate = ($hm && $total > 0) ? round(($em / $total) * 100, 2) : 0.0;
        $eveningRate = ($he && $total > 0) ? round(($ee / $total) * 100, 2) : 0.0;

        $presentTotal = ($hm ? $em : 0) + ($he ? $ee : 0);
        $uniformViolations = (int) ($record->uniform_violation ?? 0);
        $uniform = $this->calculator->uniformStats($presentTotal, $uniformViolations);

        return [
            'id' => $record->id,
            'date' => $record->attendance_date?->format('Y-m-d'),
            'date_label' => $record->attendance_date?->format('Y-m-d'),
            'school_name' => $record->institution?->name,
            'class_name' => $record->grade?->name ?? '',
            'grade_level' => $record->grade?->class_level,
            'total_students' => $total,
            'start_count' => $em,
            'end_count' => $ee,
            'first_session_absent' => (int) $record->morning_excused + (int) $record->morning_unexcused,
            'last_session_absent' => (int) $record->evening_excused + (int) $record->evening_unexcused,
            'morning_notes' => $record->morning_notes,
            'evening_notes' => $record->evening_notes,
            'attendance_rate' => $attendanceRate,
            'morning_attendance_rate' => $morningRate,
            'evening_attendance_rate' => $eveningRate,
            'notes' => $this->calculator->formatBulkNotes($record->morning_notes, $record->evening_notes),
            'uniform_violation' => $uniform['violations'],
            'present_total' => $presentTotal,
            'uniform_violation_rate' => $uniform['violation_rate'],
            'uniform_compliance_rate' => $uniform['compliance_rate'],
            'morning_recorded_at' => $record->morning_recorded_at?->toISOString(),
            'evening_recorded_at' => $record->evening_recorded_at?->toISOString(),
            'school' => $record->institution ? [
                'id' => $record->institution->id,
                'name' => $record->institution->name,
                'type' => $record->institution->type,
            ] : null,
        ];
    }

    // -------------------------------------------------------------------------
    // Private — weekly / monthly grouped
    // -------------------------------------------------------------------------

    private function buildGroupedPage(
        \Illuminate\Database\Eloquent\Builder $query,
        array $validated,
        User $user,
        string $groupBy,
        string $startDate,
        string $endDate,
        array $context
    ): array {
        $allRecords = (clone $query)->get();

        [$schoolLabel, $schoolContext] = $this->resolveSchoolContext($validated, $user);
        $classLabel = $validated['class_name'] ?? 'Bütün siniflər';

        $grouped = $allRecords
            ->groupBy(fn ($r) => $this->groupKey($r, $groupBy))
            ->map(fn ($items, $key) => $this->formatGroupPeriod($key, $items, $groupBy, $schoolLabel, $classLabel))
            ->values()
            ->sortByDesc('date')
            ->values();

        $context['school'] = $schoolContext;
        $context['class'] = $classLabel;

        return [
            'data' => $grouped,
            'meta' => ['total' => $grouped->count()],
            'context' => $context,
        ];
    }

    private function groupKey(ClassBulkAttendance $record, string $groupBy): string
    {
        $date = Carbon::parse($record->attendance_date);

        return $groupBy === 'weekly'
            ? $date->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d')
            : $date->format('Y-m');
    }

    private function formatGroupPeriod(
        string $key,
        \Illuminate\Support\Collection $items,
        string $groupBy,
        string $schoolLabel,
        string $classLabel
    ): array {
        if ($groupBy === 'weekly') {
            $rangeStart = Carbon::parse($key)->startOfWeek(Carbon::MONDAY);
            $rangeEnd = $rangeStart->copy()->endOfWeek(Carbon::SUNDAY);
            $dateLabel = $rangeStart->format('d.m') . ' - ' . $rangeEnd->format('d.m.Y');
        } else {
            $rangeStart = Carbon::createFromFormat('Y-m', $key)->startOfMonth();
            $rangeEnd = $rangeStart->copy()->endOfMonth();
            $dateLabel = $rangeStart->translatedFormat('F Y');
        }

        $totalStudents = (int) $items->sum('total_students');

        $totalStart = (int) $items->sum(function (ClassBulkAttendance $item) {
            $counts = $this->calculator->effectiveCounts($item);

            return $counts['effMorning'];
        });

        $totalEnd = (int) $items->sum(function (ClassBulkAttendance $item) {
            $counts = $this->calculator->effectiveCounts($item);

            return $counts['effEvening'];
        });

        $attendanceRate = $this->calculator->weightedRate($items);

        $presentTotal = (int) $items->sum(fn (ClassBulkAttendance $item) => $this->calculator->effectivePresentTotal($item));

        $uniformRaw = (int) $items->sum(fn (ClassBulkAttendance $item) => (int) ($item->uniform_violation ?? 0));
        $uniform = $this->calculator->uniformStats($presentTotal, $uniformRaw);

        return [
            'id' => md5($key . $classLabel . $schoolLabel),
            'date' => $rangeStart->toDateString(),
            'date_label' => $dateLabel,
            'range_start' => $rangeStart->toDateString(),
            'range_end' => $rangeEnd->toDateString(),
            'school_name' => $schoolLabel,
            'class_name' => $classLabel,
            'total_students' => $totalStudents,
            'start_count' => $totalStart,
            'end_count' => $totalEnd,
            'attendance_rate' => $attendanceRate,
            'uniform_violation' => $uniform['violations'],
            'present_total' => $presentTotal,
            'uniform_violation_rate' => $uniform['violation_rate'],
            'uniform_compliance_rate' => $uniform['compliance_rate'],
            'notes' => $items->count() . ' qeyd',
            'record_count' => $items->count(),
        ];
    }

    // -------------------------------------------------------------------------
    // Private — utilities
    // -------------------------------------------------------------------------

    private function applySorting(\Illuminate\Database\Eloquent\Builder $query, string $sortField, string $sortDirection): void
    {
        if ($sortField === 'class_name') {
            $query->leftJoin('grades as sort_grades', 'class_bulk_attendance.grade_id', '=', 'sort_grades.id')
                ->select('class_bulk_attendance.*')
                ->orderBy('sort_grades.name', $sortDirection);

            return;
        }

        $column = self::SORT_COLUMN_MAP[$sortField] ?? 'attendance_date';
        $query->orderBy("class_bulk_attendance.{$column}", $sortDirection);
    }

    /**
     * Resolve the school display label and context object for grouped reports.
     *
     * @return array{0: string, 1: array|null}
     */
    private function resolveSchoolContext(array $validated, User $user): array
    {
        if (! empty($validated['school_id'])) {
            $school = Institution::find($validated['school_id']);
            if ($school) {
                return [
                    $school->name,
                    ['id' => $school->id, 'name' => $school->name, 'type' => $school->type],
                ];
            }
        }

        if ($user->institution) {
            return [
                $user->institution->name,
                ['id' => $user->institution->id, 'name' => $user->institution->name, 'type' => $user->institution->type],
            ];
        }

        return ['Bütün məktəblər', null];
    }
}
