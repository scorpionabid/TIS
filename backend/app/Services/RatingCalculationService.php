<?php

namespace App\Services;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\LinkAccessLog;
use App\Models\LinkShare;
use App\Models\Rating;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Models\SurveyResponse;
use App\Models\TaskAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RatingCalculationService
{
    private const CACHE_MINUTES = 5;

    public function calculateRating(int $userId, array $params, bool $force = false): Rating
    {
        try {
            $user = User::findOrFail($userId);
            $institutionId = $user->institution_id;
            $academicYearId = $params['academic_year_id'];
            $period = $params['period'];

            if (! $force) {
                $cached = Rating::where('user_id', $userId)
                    ->where('institution_id', $institutionId)
                    ->where('academic_year_id', $academicYearId)
                    ->where('period', $period)
                    ->first();

                if ($cached && ! $this->isStale($cached)) {
                    return $cached;
                }
            }

            $taskResult = $this->calculateTaskScore($userId, $period);
            $surveyResult = $this->calculateSurveyScore($userId, $period);
            $linkResult = $this->calculateLinkScore($userId, $period);
            $reportResult = $this->calculateReportScore($userId, $period);

            $userRole = $params['user_role'] ?? $user->roles->first()?->name ?? 'schooladmin';

            if ($userRole === 'sektoradmin') {
                $attendanceResult = ['score' => 0, 'on_time' => 0, 'missed' => 0, 'total_days' => 0];
                $approvalResult = $this->calculateApprovalScore($userId, $period);
            } else {
                $attendanceResult = $this->calculateAttendanceScore($userId, $period);
                $approvalResult = ['score' => 0, 'on_time' => 0, 'late' => 0, 'pending_overdue' => 0, 'total' => 0];
            }

            $existingRating = Rating::where('user_id', $userId)
                ->where('institution_id', $institutionId)
                ->where('academic_year_id', $academicYearId)
                ->where('period', $period)
                ->first();

            $manualScore = $existingRating?->manual_score ?? 0;

            if ($userRole === 'sektoradmin') {
                $overallScore = $taskResult['score'] + $surveyResult['score']
                    + $approvalResult['score'] + $linkResult['score']
                    + $reportResult['score'] + $manualScore;
            } else {
                $overallScore = $taskResult['score'] + $surveyResult['score']
                    + $attendanceResult['score'] + $linkResult['score']
                    + $reportResult['score'] + $manualScore;
            }

            $scoreDetails = [
                'tasks_on_time' => $taskResult['on_time'],
                'tasks_late' => $taskResult['late'],
                'tasks_total' => $taskResult['total'],
                'task_score' => $taskResult['score'],
                'surveys_on_time' => $surveyResult['on_time'],
                'surveys_late' => $surveyResult['late'],
                'surveys_total' => $surveyResult['total'],
                'survey_score' => $surveyResult['score'],
                'attendance_on_time' => $attendanceResult['on_time'],
                'attendance_missed' => $attendanceResult['missed'],
                'attendance_total_days' => $attendanceResult['total_days'],
                'attendance_score' => $attendanceResult['score'],
                'links_opened' => $linkResult['opened'],
                'links_missed' => $linkResult['missed'],
                'links_total' => $linkResult['total'],
                'link_score' => $linkResult['score'],
                'approved_on_time' => $approvalResult['on_time'],
                'approved_late' => $approvalResult['late'],
                'approval_pending_overdue' => $approvalResult['pending_overdue'],
                'approval_total' => $approvalResult['total'],
                'approval_score' => $approvalResult['score'],
                'reports_on_time' => $reportResult['on_time'],
                'reports_late' => $reportResult['late'],
                'reports_missed' => $reportResult['missed'],
                'reports_total' => $reportResult['total'],
                'report_score' => $reportResult['score'],
            ];

            $rating = Rating::updateOrCreate(
                [
                    'user_id' => $userId,
                    'institution_id' => $institutionId,
                    'academic_year_id' => $academicYearId,
                    'period' => $period,
                ],
                [
                    'overall_score' => $overallScore,
                    'task_score' => $taskResult['score'],
                    'survey_score' => $surveyResult['score'],
                    'attendance_score' => $attendanceResult['score'],
                    'approval_score' => $approvalResult['score'],
                    'link_score' => $linkResult['score'],
                    'report_score' => $reportResult['score'],
                    'manual_score' => $manualScore,
                    'score_details' => $scoreDetails,
                    'status' => 'published',
                    'metadata' => [
                        'calculation_method' => 'point_system',
                        'calculated_at' => Carbon::now()->toISOString(),
                    ],
                ]
            );

            return $rating;
        } catch (\Exception $e) {
            Log::error('Failed to calculate rating', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function calculateAllRatings(array $params, ?User $currentUser = null, bool $force = false): array
    {
        try {
            $currentUser = $currentUser ?? auth()->user();
            $period = $params['period'];
            $userRole = $params['user_role'] ?? 'schooladmin';

            $allowedIds = $this->getAllowedInstitutionIds($currentUser);

            $users = User::byRole($userRole)
                ->whereIn('institution_id', $allowedIds)
                ->get();

            $results = [];
            $successCount = 0;
            $errorCount = 0;

            foreach ($users as $user) {
                try {
                    $rating = $this->calculateRating($user->id, $params, $force);
                    $results[] = [
                        'user_id' => $user->id,
                        'user_name' => $user->name,
                        'rating' => $rating,
                        'status' => 'success',
                    ];
                    $successCount++;
                } catch (\Exception $e) {
                    $results[] = [
                        'user_id' => $user->id,
                        'user_name' => $user->name,
                        'status' => 'error',
                        'error' => $e->getMessage(),
                    ];
                    $errorCount++;
                }
            }

            return [
                'results' => $results,
                'summary' => [
                    'total_users' => $users->count(),
                    'success_count' => $successCount,
                    'error_count' => $errorCount,
                    'period' => $period,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Failed to calculate all ratings', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function calculateTaskScore(int $userId, string $period): array
    {
        $assignments = TaskAssignment::where('assigned_user_id', $userId)
            ->whereNotNull('due_date')
            ->get();

        $onTime = 0;
        $late = 0;

        foreach ($assignments as $assignment) {
            $dueDate = $assignment->due_date;

            if ($assignment->assignment_status === 'completed' && $assignment->completed_at) {
                if ($assignment->completed_at->lte($dueDate)) {
                    $onTime++;
                } else {
                    $late++;
                }
            } elseif (! in_array($assignment->assignment_status, ['completed', 'cancelled']) && $dueDate->isPast()) {
                $late++;
            }
        }

        return [
            'score' => $onTime - $late,
            'on_time' => $onTime,
            'late' => $late,
            'total' => $assignments->count(),
        ];
    }

    private function calculateSurveyScore(int $userId, string $period): array
    {
        $responses = SurveyResponse::where('respondent_id', $userId)
            ->with('survey')
            ->get();

        $onTime = 0;
        $late = 0;

        foreach ($responses as $response) {
            $deadline = $response->survey?->end_date;

            if (in_array($response->status, ['submitted', 'approved'])) {
                if ($deadline && $response->submitted_at && $response->submitted_at->gt($deadline)) {
                    $late++;
                } else {
                    $onTime++;
                }
            } elseif ($deadline && $deadline->isPast() && ! in_array($response->status, ['submitted', 'approved'])) {
                $late++;
            }
        }

        return [
            'score' => $onTime - $late,
            'on_time' => $onTime,
            'late' => $late,
            'total' => $responses->count(),
        ];
    }

    private function calculateAttendanceScore(int $userId, string $period): array
    {
        $user = User::find($userId);
        $institutionId = $user->institution_id;

        $totalGrades = Grade::withoutGlobalScopes()
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->count();

        if ($totalGrades === 0) {
            return ['score' => 0, 'on_time' => 0, 'missed' => 0, 'total_days' => 0];
        }

        $periodParts = explode('-', $period);
        $year = (int) $periodParts[0];
        $month = (int) ($periodParts[1] ?? 1);
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        if ($endDate->isFuture()) {
            $endDate = Carbon::today();
        }

        if ($startDate->isFuture()) {
            return ['score' => 0, 'on_time' => 0, 'missed' => 0, 'total_days' => 0];
        }

        $workdays = [];
        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            if ($current->isWeekday()) {
                $workdays[] = $current->toDateString();
            }
            $current->addDay();
        }

        if (empty($workdays)) {
            return ['score' => 0, 'on_time' => 0, 'missed' => 0, 'total_days' => 0];
        }

        $attendanceRecords = ClassBulkAttendance::withoutGlobalScopes()
            ->where('institution_id', $institutionId)
            ->whereBetween('attendance_date', [$workdays[0], end($workdays)])
            ->get()
            ->groupBy(fn ($record) => \Carbon\Carbon::parse($record->attendance_date)->toDateString());

        $onTime = 0;
        $missed = 0;

        foreach ($workdays as $dateStr) {
            $dayRecords = $attendanceRecords->get($dateStr, collect());

            $sameDay = $dayRecords->filter(function ($record) use ($dateStr) {
                $morningOk = $record->morning_recorded_at
                    && \Carbon\Carbon::parse($record->morning_recorded_at)->toDateString() === $dateStr;
                $eveningOk = $record->evening_recorded_at
                    && \Carbon\Carbon::parse($record->evening_recorded_at)->toDateString() === $dateStr;

                return $morningOk || $eveningOk;
            })->count();

            if ($sameDay >= $totalGrades) {
                $onTime++;
            } else {
                $missed++;
            }
        }

        return [
            'score' => $onTime - $missed,
            'on_time' => $onTime,
            'missed' => $missed,
            'total_days' => count($workdays),
        ];
    }

    private function calculateLinkScore(int $userId, string $period): array
    {
        $user = User::with('roles')->find($userId);
        $institutionId = $user->institution_id;
        $userRole = $user->roles->first()?->name;

        $links = LinkShare::active()
            ->where(function ($q) use ($userId, $institutionId, $userRole) {
                $q->whereJsonContains('target_users', $userId)
                    ->orWhereJsonContains('target_users', (string) $userId)
                    ->orWhereJsonContains('target_institutions', $institutionId)
                    ->orWhereJsonContains('target_institutions', (string) $institutionId)
                    ->orWhere('share_scope', 'public')
                    ->orWhere(function ($q2) use ($institutionId) {
                        $q2->where('share_scope', 'institutional')
                            ->where('institution_id', $institutionId);
                    });
                if ($userRole) {
                    $q->orWhereJsonContains('target_roles', $userRole);
                }
            })
            ->get();

        $opened = 0;

        $accessedLinkIds = LinkAccessLog::where('user_id', $userId)
            ->whereIn('link_share_id', $links->pluck('id'))
            ->distinct()
            ->pluck('link_share_id')
            ->toArray();

        foreach ($links as $link) {
            if (in_array($link->id, $accessedLinkIds)) {
                $opened++;
            }
        }

        return [
            'score' => $opened - ($links->count() - $opened),
            'opened' => $opened,
            'missed' => $links->count() - $opened,
            'total' => $links->count(),
        ];
    }

    private function calculateApprovalScore(int $userId, string $period): array
    {
        $user = User::find($userId);
        $institutionId = $user->institution_id;

        $childSchoolIds = Institution::where('parent_id', $institutionId)
            ->where('level', 4)
            ->pluck('id')
            ->toArray();

        if (empty($childSchoolIds)) {
            return ['score' => 0, 'on_time' => 0, 'late' => 0, 'pending_overdue' => 0, 'total' => 0];
        }

        $surveyResponses = SurveyResponse::withoutGlobalScopes()
            ->whereIn('institution_id', $childSchoolIds)
            ->whereIn('status', ['submitted', 'approved', 'rejected', 'returned'])
            ->with(['survey', 'approvalRequest.approvalActions' => function ($q) use ($userId) {
                $q->where('approver_id', $userId);
            }])
            ->get();

        $onTime = 0;
        $late = 0;
        $pendingOverdue = 0;

        foreach ($surveyResponses as $response) {
            $deadline = $response->survey?->end_date;
            if (! $deadline) {
                continue;
            }

            $approvalAction = $response->approvalRequest
                ?->approvalActions
                ?->first();

            if ($approvalAction && $approvalAction->action_taken_at) {
                if ($approvalAction->action_taken_at->lte($deadline)) {
                    $onTime++;
                } else {
                    $late++;
                }
            } elseif ($response->approved_by == $userId && $response->approved_at) {
                if ($response->approved_at->lte($deadline)) {
                    $onTime++;
                } else {
                    $late++;
                }
            } elseif ($response->status === 'submitted' && $deadline->isPast()) {
                $pendingOverdue++;
            }
        }

        return [
            'score' => $onTime - $late - $pendingOverdue,
            'on_time' => $onTime,
            'late' => $late,
            'pending_overdue' => $pendingOverdue,
            'total' => $onTime + $late + $pendingOverdue,
        ];
    }

    private function calculateReportScore(int $userId, string $period): array
    {
        $user = User::find($userId);
        $institutionId = $user->institution_id;

        $reportTables = ReportTable::published()
            ->notTemplates()
            ->whereJsonContains('target_institutions', (string) $institutionId)
            ->orWhereJsonContains('target_institutions', $institutionId)
            ->get();

        $onTime = 0;
        $late = 0;
        $missed = 0;

        foreach ($reportTables as $table) {
            $deadline = $table->deadline;

            $response = ReportTableResponse::where('report_table_id', $table->id)
                ->where('institution_id', $institutionId)
                ->first();

            if ($response && $response->status === 'submitted' && $response->submitted_at) {
                if (! $deadline || $response->submitted_at->lte($deadline)) {
                    $onTime++;
                } else {
                    $late++;
                }
            } elseif ($deadline && $deadline->isPast()) {
                $missed++;
            }
        }

        return [
            'score' => $onTime - $late - $missed,
            'on_time' => $onTime,
            'late' => $late,
            'missed' => $missed,
            'total' => $reportTables->count(),
        ];
    }

    private function isStale(Rating $rating): bool
    {
        $metadata = $rating->metadata;
        if (! $metadata || ! isset($metadata['calculated_at'])) {
            return true;
        }

        return Carbon::parse($metadata['calculated_at'])->addMinutes(self::CACHE_MINUTES)->isPast();
    }

    private function getAllowedInstitutionIds(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $institution = $user->institution;
        if (! $institution) {
            return [];
        }

        if ($institution->level === 4) {
            return [$institution->id];
        }

        return $institution->getAllChildrenIds();
    }
}
