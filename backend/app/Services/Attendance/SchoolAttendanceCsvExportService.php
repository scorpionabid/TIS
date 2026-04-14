<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\SchoolAttendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * CSV export for school-level attendance data.
 *
 * Handles three export modes:
 *  - daily   → raw SchoolAttendance records, one row per record
 *  - weekly  → ClassBulkAttendance grouped by ISO week
 *  - monthly → ClassBulkAttendance grouped by calendar month
 */
class SchoolAttendanceCsvExportService
{
    public function __construct(
        private readonly SchoolAttendanceScopeFilter $scope,
    ) {}

    /**
     * Build and return the CSV HTTP response.
     */
    public function export(Request $request, User $user): Response
    {
        $groupBy = $request->get('group_by', 'daily');
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        if (in_array($groupBy, ['weekly', 'monthly'], true)) {
            return $this->exportGrouped($request, $user, $groupBy, $startDate, $endDate);
        }

        return $this->exportDaily($request, $user, $startDate, $endDate);
    }

    // -------------------------------------------------------------------------
    // Private — daily export (SchoolAttendance)
    // -------------------------------------------------------------------------

    private function exportDaily(Request $request, User $user, ?string $startDate, ?string $endDate): Response
    {
        $query = SchoolAttendance::with(['school:id,name']);

        if ($request->has('school_id') && $request->school_id) {
            $query->where('school_id', $request->school_id);
        }

        if ($request->has('class_name') && $request->class_name) {
            $query->where('class_name', $request->class_name);
        }

        if ($startDate) {
            $query->whereDate('date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('date', '<=', $endDate);
        }

        $this->scope->apply($query, $user);

        $records = $query->orderBy('date', 'desc')->get();

        $rows = [['Tarix', 'Məktəb', 'Sinif', 'Başlanğıc Sayı', 'Son Sayı', 'Qayıblar', 'Davamiyyət %', 'Qeydlər']];

        foreach ($records as $record) {
            $rows[] = [
                $record->date->format('d.m.Y'),
                $record->school->name ?? '',
                $record->class_name,
                $record->start_count,
                $record->end_count,
                $record->absent_count,
                $record->attendance_rate . '%',
                $record->notes ?? '',
            ];
        }

        return $this->buildCsvResponse($rows, 'davamiyyat-gunluk');
    }

    // -------------------------------------------------------------------------
    // Private — grouped export (ClassBulkAttendance)
    // -------------------------------------------------------------------------

    private function exportGrouped(Request $request, User $user, string $groupBy, ?string $startDate, ?string $endDate): Response
    {
        $query = ClassBulkAttendance::query();

        if ($request->has('school_id') && $request->school_id) {
            $query->where('institution_id', $request->school_id);
        }

        if ($request->has('class_name') && $request->class_name) {
            $query->where('grade_name', $request->class_name);
        }

        if ($startDate) {
            $query->whereDate('attendance_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('attendance_date', '<=', $endDate);
        }

        $this->scope->apply($query, $user, 'institution_id');

        $allRecords = $query->get();

        $grouped = $allRecords
            ->groupBy(fn ($r) => $groupBy === 'weekly'
                ? Carbon::parse($r->attendance_date)->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d')
                : Carbon::parse($r->attendance_date)->format('Y-m')
            )
            ->map(fn ($items, $key) => $this->aggregateGroupedRow($items, $key, $groupBy))
            ->sortByDesc('sort_key')
            ->values();

        $label = $groupBy === 'weekly' ? 'həftəlik' : 'aylıq';
        $rows = [['Dövr', 'Başlanğıc Sayı (Səhər)', 'Son Sayı (Günorta)', 'Davamiyyət %', 'Qeyd Sayı']];

        foreach ($grouped as $row) {
            $rows[] = [
                $row['date_label'],
                $row['start_count'],
                $row['end_count'],
                $row['attendance_rate'] . '%',
                $row['record_count'],
            ];
        }

        return $this->buildCsvResponse($rows, 'davamiyyat-' . $label);
    }

    private function aggregateGroupedRow(\Illuminate\Support\Collection $items, string $key, string $groupBy): array
    {
        if ($groupBy === 'weekly') {
            $rangeStart = Carbon::parse($key)->startOfWeek(Carbon::MONDAY);
            $rangeEnd = $rangeStart->copy()->endOfWeek(Carbon::SUNDAY);
            $dateLabel = $rangeStart->format('d.m') . ' - ' . $rangeEnd->format('d.m.Y');
        } else {
            $rangeStart = Carbon::createFromFormat('Y-m', $key)->startOfMonth();
            $dateLabel = $rangeStart->translatedFormat('F Y');
        }

        $totalStudents = (int) $items->sum('total_students');
        $totalStart = (int) $items->sum('morning_present');
        $totalEnd = (int) $items->sum('evening_present');
        $denominator = $totalStudents * 2;
        $rate = $denominator > 0
            ? round((($totalStart + $totalEnd) / $denominator) * 100, 2)
            : 0.0;

        return [
            'date_label' => $dateLabel,
            'start_count' => $totalStart,
            'end_count' => $totalEnd,
            'attendance_rate' => $rate,
            'record_count' => $items->count(),
            'sort_key' => $key,
        ];
    }

    // -------------------------------------------------------------------------
    // Private — CSV builder
    // -------------------------------------------------------------------------

    private function buildCsvResponse(array $rows, string $filePrefix): Response
    {
        $csv = '';
        foreach ($rows as $row) {
            $csv .= implode(',', array_map(
                fn ($field) => '"' . str_replace('"', '""', (string) $field) . '"',
                $row
            )) . "\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filePrefix . '-' . date('Y-m-d') . '.csv"')
            ->header('Content-Length', strlen($csv));
    }
}
