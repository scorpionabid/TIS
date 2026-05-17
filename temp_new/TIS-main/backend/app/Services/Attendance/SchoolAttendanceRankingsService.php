<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Institution;
use Carbon\Carbon;

/**
 * School submission-time rankings within a sector.
 *
 * Ranks all schools in the same sector by when they first submitted
 * morning / evening attendance on a given date, relative to configured deadlines.
 */
class SchoolAttendanceRankingsService
{
    private const MORNING_DEADLINE_TIME = [10, 0, 0];

    private const EVENING_DEADLINE_TIME = [15, 0, 0];

    private const SCHOOL_TYPES = [
        'secondary_school',
        'lyceum',
        'gymnasium',
        'vocational_school',
    ];

    /**
     * Build the full ranking response for a given date and sector.
     *
     * @param string $date      Y-m-d
     * @param string $shiftType 'morning' | 'evening' | 'all'
     * @param int    $schoolId  The requesting user's school (to find their rank).
     * @param int    $sectorId  The sector all schools belong to.
     */
    public function getRankings(string $date, string $shiftType, int $schoolId, int $sectorId): array
    {
        $schools = Institution::where('parent_id', $sectorId)
            ->whereIn('type', self::SCHOOL_TYPES)
            ->where('is_active', true)
            ->get();

        $submissions = ClassBulkAttendance::withoutGlobalScopes()
            ->selectRaw(
            'institution_id,
             MIN(morning_recorded_at) as first_morning_submission,
             MAX(morning_recorded_at) as last_morning_submission,
             MIN(evening_recorded_at) as first_evening_submission,
             MAX(evening_recorded_at) as last_evening_submission'
        )
            ->whereIn('institution_id', $schools->pluck('id'))
            ->whereDate('attendance_date', $date)
            ->groupBy('institution_id')
            ->get()
            ->keyBy('institution_id');

        $morningDeadline = Carbon::parse($date, 'Asia/Baku')->setTime(...self::MORNING_DEADLINE_TIME);
        $eveningDeadline = Carbon::parse($date, 'Asia/Baku')->setTime(...self::EVENING_DEADLINE_TIME);

        $rankings = [];

        foreach ($schools as $school) {
            $rankings[] = $this->buildSchoolEntry(
                $school,
                $submissions->get($school->id),
                $shiftType,
                $morningDeadline,
                $eveningDeadline
            );
        }

        usort($rankings, $this->rankingSorter(...));

        $mySchoolRank = $this->findMyRank($rankings, $schoolId);
        $summary = $this->buildSummary($rankings);

        return [
            'date' => $date,
            'shift_type' => $shiftType,
            'morning_deadline' => $morningDeadline->toDateTimeString(),
            'evening_deadline' => $eveningDeadline->toDateTimeString(),
            'my_school_rank' => $mySchoolRank,
            'schools' => $rankings,
            'summary' => $summary,
        ];
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function buildSchoolEntry(
        Institution $school,
        mixed $submission,
        string $shiftType,
        Carbon $morningDeadline,
        Carbon $eveningDeadline
    ): array {
        $morningSubmittedAt = $submission?->first_morning_submission
            ? Carbon::parse($submission->first_morning_submission, 'UTC')->setTimezone('Asia/Baku')
            : null;

        $eveningSubmittedAt = $submission?->first_evening_submission
            ? Carbon::parse($submission->first_evening_submission, 'UTC')->setTimezone('Asia/Baku')
            : null;

        [$primarySubmittedAt, $primaryShiftType, $primaryDeadline] = $this->resolvePrimary(
            $shiftType,
            $morningSubmittedAt,
            $eveningSubmittedAt,
            $morningDeadline,
            $eveningDeadline
        );

        $isLate = false;
        $lateMinutes = 0;
        $status = 'not_submitted';

        if ($primarySubmittedAt && $primaryDeadline) {
            $isLate = $primarySubmittedAt->gt($primaryDeadline);
            $lateMinutes = $isLate
                ? (int) round($primarySubmittedAt->diffInMinutes($primaryDeadline, false) * -1)
                : 0;
            $status = $isLate ? 'late' : 'on_time';
        }

        return [
            'school_id' => $school->id,
            'name' => $school->name,
            'submitted_at' => $primarySubmittedAt?->setTimezone('Asia/Baku')->toDateTimeString(),
            'shift_type' => $primaryShiftType,
            'deadline_time' => $primaryShiftType === 'morning' ? '10:00' : ($primaryShiftType === 'evening' ? '14:30' : null),
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
            'status' => $status,
        ];
    }

    /**
     * Pick the primary submission time from available shift data.
     *
     * @return array{0: Carbon|null, 1: string|null, 2: Carbon|null}
     */
    private function resolvePrimary(
        string $shiftType,
        ?Carbon $morningAt,
        ?Carbon $eveningAt,
        Carbon $morningDeadline,
        Carbon $eveningDeadline
    ): array {
        $primaryAt = null;
        $primaryShift = null;
        $primaryDeadline = null;

        if (($shiftType === 'morning' || $shiftType === 'all') && $morningAt) {
            $primaryAt = $morningAt;
            $primaryShift = 'morning';
            $primaryDeadline = $morningDeadline;
        }

        if (($shiftType === 'evening' || $shiftType === 'all') && $eveningAt) {
            if (! $primaryAt || $eveningAt->lt($primaryAt)) {
                $primaryAt = $eveningAt;
                $primaryShift = 'evening';
                $primaryDeadline = $eveningDeadline;
            }
        }

        return [$primaryAt, $primaryShift, $primaryDeadline];
    }

    private function rankingSorter(array $a, array $b): int
    {
        if ($a['submitted_at'] === null && $b['submitted_at'] !== null) {
            return 1;
        }

        if ($a['submitted_at'] !== null && $b['submitted_at'] === null) {
            return -1;
        }

        if ($a['submitted_at'] && $b['submitted_at']) {
            return strcmp($a['submitted_at'], $b['submitted_at']);
        }

        return strcmp($a['name'], $b['name']);
    }

    private function findMyRank(array $rankings, int $schoolId): ?array
    {
        foreach ($rankings as $index => $ranking) {
            if ($ranking['school_id'] === $schoolId) {
                return [
                    'rank' => $index + 1,
                    'total_schools' => count($rankings),
                    'data' => $ranking,
                ];
            }
        }

        return null;
    }

    private function buildSummary(array $rankings): array
    {
        $submittedCount = count(array_filter($rankings, fn ($r) => $r['submitted_at'] !== null));
        $onTimeCount = count(array_filter($rankings, fn ($r) => $r['status'] === 'on_time'));
        $lateCount = count(array_filter($rankings, fn ($r) => $r['status'] === 'late'));

        return [
            'total_schools' => count($rankings),
            'submitted_count' => $submittedCount,
            'on_time_count' => $onTimeCount,
            'late_count' => $lateCount,
            'not_submitted_count' => count($rankings) - $submittedCount,
        ];
    }
}
