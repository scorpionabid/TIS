<?php

namespace App\Services\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AttendanceRankingService
{
    /**
     * Get attendance rankings for schools based on submission time.
     * Includes detailed score calculation and shift-based filtering.
     *
     * @param User $user Current user context
     * @param array $filters Query filters (date, shift_type, etc.)
     * @param array $scope Result of resolveInstitutionScope
     * @return array Ranking report data
     */
    public function getRankings(User $user, array $filters, array $scope): array
    {
        $shiftType = $filters['shift_type'] ?? 'all';
        $startDate = $scope['start_date'];
        $endDate = $scope['end_date'];
        $schoolIds = $scope['school_ids'];
        $region = $scope['region'];
        $activeSector = $scope['active_sector'];

        if (empty($schoolIds)) {
            return $this->formatEmptyRanking($startDate, $endDate, $shiftType);
        }

        $rankings = $this->calculateRankingsForSchools($schoolIds, $startDate, $endDate, $shiftType);

        // Calculate summary based on standard rankings
        $submittedCount = count(array_filter($rankings, fn($r) => $r['status'] !== 'not_submitted'));
        $onTimeCount = count(array_filter($rankings, fn($r) => $r['status'] === 'on_time'));
        $lateCount = count(array_filter($rankings, fn($r) => $r['status'] === 'late'));

        $morningDeadline = CarbonImmutable::parse($startDate)->setTimezone('Asia/Baku')->setTime(10, 0, 0);
        $eveningDeadline = CarbonImmutable::parse($startDate)->setTimezone('Asia/Baku')->setTime(15, 0, 0);

        // Find my_school_rank
        $targetSchoolId = (int) ($filters['school_id'] ?? $user->institution_id);
        $mySchoolRank = null;
        $mySchoolSummary = null;

        if ($targetSchoolId) {
            foreach ($rankings as $index => $r) {
                if ((int) $r['school_id'] === (int) $targetSchoolId) {
                    $mySchoolRank = [
                        'rank' => $index + 1,
                        'total_schools' => count($rankings),
                        'data' => $r,
                        'region_rank' => null,
                        'region_total' => 0
                    ];
                    
                    $mySchoolSummary = [
                        'is_late' => $r['is_late'],
                        'late_minutes' => $r['late_minutes'],
                        'status' => $r['status']
                    ];
                    break;
                }
            }

            // Calculate regional rank (filter to actual schools only — getAllChildrenIds also returns sectors)
            if ($mySchoolRank && $region) {
                $regionAllIds = $region->getAllChildrenIds();
                $regionSchoolIds = Institution::whereIn('id', $regionAllIds)
                    ->where('level', 4)
                    ->whereIn('type', ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'])
                    ->where('is_active', true)
                    ->pluck('id')
                    ->toArray();
                $regionRankings = $this->calculateRankingsForSchools($regionSchoolIds, $startDate, $endDate, $shiftType);
                
                foreach ($regionRankings as $idx => $rr) {
                    if ((int)$rr['school_id'] === $targetSchoolId) {
                        $mySchoolRank['region_rank'] = $idx + 1;
                        $mySchoolRank['region_total'] = count($regionRankings);
                        break;
                    }
                }
            }
        }

        return [
            'date' => $startDate,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'shift_type' => $shiftType,
            'morning_deadline' => $morningDeadline->setTimezone('Asia/Baku')->toDateTimeString(),
            'evening_deadline' => $eveningDeadline->setTimezone('Asia/Baku')->toDateTimeString(),
            'schools' => $rankings,
            'my_school_rank' => $mySchoolRank,
            'my_school_summary' => $mySchoolSummary,
            'active_sector' => $activeSector ? [
                'id' => $activeSector->id,
                'name' => $activeSector->name,
                'level' => $activeSector->level
            ] : null,
            'active_region' => $region ? [
                'id' => $region->id,
                'name' => $region->name,
            ] : null,
            'summary' => [
                'total_schools' => count($schoolIds),
                'submitted_count' => $submittedCount,
                'on_time_count' => $onTimeCount,
                'late_count' => $lateCount,
                'not_submitted_count' => count($schoolIds) - $submittedCount,
                'has_data' => $submittedCount > 0,
            ],
        ];
    }

    /**
     * Core logic to calculate rankings for a list of school IDs.
     * Uses a weighted scoring system (percentage) and tie-breaking by late submission time.
     */
    public function calculateRankingsForSchools(array $schoolIds, string $startDate, string $endDate, string $shiftType): array
    {
        if (empty($schoolIds)) return [];

        $isMultipleDays = $startDate !== $endDate;
        $workdays = [];
        $current = CarbonImmutable::parse($startDate);
        $end = CarbonImmutable::parse($endDate);
        while ($current->lte($end)) {
            if (! $current->isSunday()) {
                $workdays[] = $current->toDateString();
            }
            $current = $current->addDay();
        }

        $schools = Institution::whereIn('id', $schoolIds)->select('id', 'name', 'parent_id')->get();
        $parentIds = $schools->pluck('parent_id')->unique()->filter()->toArray();
        $sectorNamesById = Institution::whereIn('id', $parentIds)->pluck('name', 'id');

        $allGrades = Grade::withoutGlobalScopes()
            ->whereIn('institution_id', $schoolIds)
            ->where('is_active', true)
            ->select('id', 'institution_id', 'teaching_shift')
            ->get()
            ->groupBy('institution_id');

        $submissions = ClassBulkAttendance::withoutGlobalScopes()
            ->selectRaw(
            'institution_id, attendance_date, grade_id, morning_recorded_at, evening_recorded_at'
        )
            ->whereIn('institution_id', $schoolIds)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->get()
            ->groupBy(['institution_id', function ($item) {
                return $item->attendance_date->toDateString();
            }]);

        $rankings = [];
        $morningDeadlineTime = '10:00:00';
        $eveningDeadlineTime = '15:00:00';
        $lastDayInWorkdays = ! empty($workdays) ? $workdays[count($workdays) - 1] : null;

        foreach ($schools as $school) {
            $instSubmissionsByDate = $submissions->get($school->id, collect());
            $schoolGrades = $allGrades->get($school->id, collect());
            $totalGradesCount = $schoolGrades->count();
            $totalScoreInPeriod = 0;
            $schoolLateCount = 0;
            
            $absFirstSubmission = null;
            $absLastSubmission = null;

            $lastDaySubmissions = $lastDayInWorkdays ? $instSubmissionsByDate->get($lastDayInWorkdays, collect()) : collect();
            $displaySubmissions = $isMultipleDays ? $lastDaySubmissions : (! empty($workdays) ? $instSubmissionsByDate->get($workdays[0], collect()) : collect());

            // Detect if this is a 6-day school based on metadata or actual Saturday submission
            $isSixDaySchool = $this->detectSixDayStatus($school, $instSubmissionsByDate, $workdays);

            $actualWorkdaysForSchool = 0;
            $hasIntervalViolation = false;

            foreach ($workdays as $day) {
                $isSaturday = CarbonImmutable::parse($day)->isSaturday();
                if ($isSaturday && ! $isSixDaySchool) continue;

                $actualWorkdaysForSchool++;
                $daySubmissions = $instSubmissionsByDate->get($day, collect());
                
                if ($totalGradesCount > 0) {
                    $gradeSubmissionMap = $daySubmissions->keyBy('grade_id');
                    foreach ($schoolGrades as $grade) {
                        $gradeSub = $gradeSubmissionMap->get($grade->id);
                        
                        // Check for 3-hour interval violation if both sessions are present
                        if ($gradeSub && $gradeSub->morning_recorded_at && $gradeSub->evening_recorded_at) {
                            $mTime = CarbonImmutable::parse($gradeSub->morning_recorded_at);
                            $eTime = CarbonImmutable::parse($gradeSub->evening_recorded_at);
                            if ($eTime->diffInMinutes($mTime) < 180) {
                                $hasIntervalViolation = true;
                            }
                        }

                        $shift = $grade->teaching_shift ?? '1';
                        $isAfternoon = str_contains($shift, '2');
                        $limitTime = $isAfternoon ? $eveningDeadlineTime : $morningDeadlineTime;
                        $deadlineDT = CarbonImmutable::parse($day, 'Asia/Baku')->setTimeFromTimeString($limitTime);

                        $recordedAt = null;
                        if ($gradeSub) {
                            $recordedAt = ($isAfternoon ? $gradeSub->evening_recorded_at : $gradeSub->morning_recorded_at) 
                                ?? $gradeSub->morning_recorded_at 
                                ?? $gradeSub->evening_recorded_at;
                        }

                        if ($recordedAt) {
                            $recordedAtCI = CarbonImmutable::parse($recordedAt, 'UTC')->setTimezone('Asia/Baku');
                            if ($absFirstSubmission === null || $recordedAtCI->lt($absFirstSubmission)) $absFirstSubmission = $recordedAtCI;
                            if ($absLastSubmission === null || $recordedAtCI->gt($absLastSubmission)) $absLastSubmission = $recordedAtCI;

                            if ($recordedAtCI->lte($deadlineDT)) {
                                $totalScoreInPeriod += 1.0;
                            } else {
                                $lateMinutes = $recordedAtCI->diffInMinutes($deadlineDT, false) * -1;
                                $penalty = ($lateMinutes / 60) * 0.10; // 10% penalty per hour
                                $totalScoreInPeriod += max(0, 1.0 - $penalty);
                                $schoolLateCount++;
                            }
                        }
                    }
                }
            }

            $finalScorePercent = ($actualWorkdaysForSchool > 0 && $totalGradesCount > 0)
                ? ($totalScoreInPeriod / ($actualWorkdaysForSchool * $totalGradesCount)) * 100
                : 0;
            
            // Apply 0.5 point penalty for 3-hour interval violations
            if ($hasIntervalViolation) {
                $finalScorePercent = max(0, $finalScorePercent - 0.5);
            }

            $displayDay = $isMultipleDays ? $lastDayInWorkdays : $workdays[0];
            $displayDateObj = CarbonImmutable::parse($displayDay)->setTimezone('Asia/Baku');
            
            $morningDeadline = $displayDateObj->setTime(10, 0, 0);
            $eveningDeadline = $displayDateObj->setTime(15, 0, 0);

            $morningSubmittedAt = $displaySubmissions->whereNotNull('morning_recorded_at')->min('morning_recorded_at');
            $eveningSubmittedAt = $displaySubmissions->whereNotNull('evening_recorded_at')->max('evening_recorded_at');

            $morningData = $this->calculateShiftData($morningSubmittedAt ? CarbonImmutable::parse($morningSubmittedAt) : null, $morningDeadline, 'morning');
            $eveningData = $this->calculateShiftData($eveningSubmittedAt ? CarbonImmutable::parse($eveningSubmittedAt) : null, $eveningDeadline, 'evening');

            $primaryData = null;
            if (in_array($shiftType, ['morning', 'all']) && $morningData['submitted']) {
                $primaryData = $morningData;
            } elseif (in_array($shiftType, ['evening', 'all']) && $eveningData['submitted']) {
                $primaryData = $eveningData;
            }

            // Display timestamps should prioritize the viewed day (displaySubmissions)
            $firstSub = $morningSubmittedAt ?: ($displaySubmissions->min('morning_recorded_at') ?: $displaySubmissions->min('evening_recorded_at'));
            $lastSub = $eveningSubmittedAt ?: ($displaySubmissions->max('evening_recorded_at') ?: $displaySubmissions->max('morning_recorded_at'));

            $rankings[] = [
                'school_id' => $school->id,
                'name' => $school->name,
                'sector_id' => $school->parent_id,
                'sector_name' => $sectorNamesById->get($school->parent_id, 'Naməlum'),
                'shift_type' => $primaryData ? $primaryData['shift_type'] : null,
                'deadline_time' => $primaryData ? $primaryData['deadline_time'] : null,
                'first_submission_at' => $firstSub ? CarbonImmutable::parse($firstSub)->setTimezone('Asia/Baku')->toDateTimeString() : null,
                'submitted_at' => $lastSub ? CarbonImmutable::parse($lastSub)->setTimezone('Asia/Baku')->toDateTimeString() : null,
                'is_late' => $primaryData ? $primaryData['is_late'] : false,
                'late_minutes' => $primaryData ? $primaryData['late_minutes'] : 0,
                'late_count' => $schoolLateCount,
                'score' => round($finalScorePercent, 4),
                'score_percent' => round($finalScorePercent, 2),
                'status' => $this->getRankingStatus($primaryData),
                'last_submission_at' => $lastSub ? CarbonImmutable::parse($lastSub)->setTimezone('Asia/Baku')->toDateTimeString() : null,
                'abs_first' => $absFirstSubmission ? $absFirstSubmission->setTimezone('Asia/Baku')->toDateTimeString() : null,
                'abs_last' => $absLastSubmission ? $absLastSubmission->setTimezone('Asia/Baku')->toDateTimeString() : null,
            ];
        }

        usort($rankings, function ($a, $b) {
            if ($a['score'] !== $b['score']) return $b['score'] <=> $a['score'];
            if ($a['last_submission_at'] !== $b['last_submission_at']) {
                if ($a['last_submission_at'] === null) return 1;
                if ($b['last_submission_at'] === null) return -1;
                return strcmp($a['last_submission_at'], $b['last_submission_at']);
            }
            return strcmp($a['name'], $b['name']);
        });

        return $rankings;
    }

    /**
     * Calculate shift-specific data for rankings.
     */
    private function calculateShiftData(?CarbonImmutable $submittedAt, CarbonImmutable $deadline, string $shiftType): array
    {
        if ($submittedAt === null) {
            return [
                'submitted' => false,
                'submitted_at' => null,
                'deadline' => $deadline,
                'deadline_time' => $shiftType === 'morning' ? '10:00' : '15:00',
                'shift_type' => $shiftType,
                'is_late' => false,
                'late_minutes' => 0,
            ];
        }

        $isLate = $submittedAt->gt($deadline);
        $lateMinutes = $isLate ? (int) $submittedAt->diffInMinutes($deadline) : 0;

        return [
            'submitted' => true,
            'submitted_at' => $submittedAt,
            'deadline' => $deadline,
            'deadline_time' => $shiftType === 'morning' ? '10:00' : '15:00',
            'shift_type' => $shiftType,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
        ];
    }

    /**
     * Get human-readable status for ranking.
     */
    private function getRankingStatus(?array $data): string
    {
        if ($data === null || ! $data['submitted']) return 'not_submitted';
        return $data['is_late'] ? 'late' : 'on_time';
    }

    /**
     * Detect if school follows a 6-day work week.
     */
    private function detectSixDayStatus(Institution $school, Collection $submissionsByDate, array $workdays): bool
    {
        if ((int) ($school->metadata['working_days'] ?? 5) === 6) return true;
        
        foreach ($workdays as $day) {
            if (CarbonImmutable::parse($day)->isSaturday() && $submissionsByDate->has($day)) return true;
        }

        return false;
    }

    /**
     * Format an empty ranking response when no schools are found.
     */
    private function formatEmptyRanking(string $startDate, string $endDate, string $shiftType): array
    {
        return [
            'date' => $startDate,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'shift_type' => $shiftType,
            'schools' => [],
            'summary' => [
                'total_schools' => 0,
                'submitted_count' => 0,
                'on_time_count' => 0,
                'late_count' => 0,
                'not_submitted_count' => 0,
            ],
        ];
    }
}
