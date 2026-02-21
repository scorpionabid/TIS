<?php

namespace App\Services;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\LinkAccessLog;
use App\Models\LinkShare;
use App\Models\Rating;
use App\Models\SurveyResponse;
use App\Models\TaskAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RatingCalculationService
{
    private const CACHE_MINUTES = 5;

    /**
     * Calculate rating for a specific user using +1/-1 point system.
     * Skips calculation if rating was calculated within CACHE_MINUTES (unless $force=true).
     */
    public function calculateRating(int $userId, array $params, bool $force = false): Rating
    {
        try {
            $user = User::findOrFail($userId);
            $institutionId = $user->institution_id;
            $academicYearId = $params['academic_year_id'];
            $period = $params['period'];

            // Check cache - skip if recently calculated
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

            // Calculate scores with +1/-1 system
            $taskResult = $this->calculateTaskScore($userId, $period);
            $surveyResult = $this->calculateSurveyScore($userId, $period);
            $attendanceResult = $this->calculateAttendanceScore($userId, $period);
            $linkResult = $this->calculateLinkScore($userId, $period);

            // Preserve existing manual_score if rating already exists
            $existingRating = Rating::where('user_id', $userId)
                ->where('institution_id', $institutionId)
                ->where('academic_year_id', $academicYearId)
                ->where('period', $period)
                ->first();

            $manualScore = $existingRating?->manual_score ?? 0;

            // Overall = task + survey + attendance + link + manual
            $overallScore = $taskResult['score'] + $surveyResult['score']
                + $attendanceResult['score'] + $linkResult['score'] + $manualScore;

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
            ];

            // Create or update rating
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
                    'link_score' => $linkResult['score'],
                    'manual_score' => $manualScore,
                    'score_details' => $scoreDetails,
                    'status' => 'published',
                    'metadata' => [
                        'calculation_method' => 'point_system',
                        'calculated_at' => now()->toISOString(),
                    ],
                ]
            );

            Log::info('Rating calculated successfully', [
                'user_id' => $userId,
                'overall_score' => $overallScore,
                'task_score' => $taskResult['score'],
                'survey_score' => $surveyResult['score'],
                'attendance_score' => $attendanceResult['score'],
                'link_score' => $linkResult['score'],
                'manual_score' => $manualScore,
                'period' => $period,
            ]);

            return $rating;
        } catch (\Exception $e) {
            Log::error('Failed to calculate rating', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Calculate ratings for all users in the caller's hierarchy.
     */
    public function calculateAllRatings(array $params, ?User $currentUser = null, bool $force = false): array
    {
        try {
            $currentUser = $currentUser ?? auth()->user();
            $period = $params['period'];
            $userRole = $params['user_role'] ?? 'schooladmin';

            // Get allowed institution IDs based on hierarchy
            $allowedIds = $this->getAllowedInstitutionIds($currentUser);

            // Get users with the target role within allowed institutions
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

            Log::info('Bulk rating calculation completed', [
                'user_role' => $userRole,
                'period' => $period,
                'success_count' => $successCount,
                'error_count' => $errorCount,
            ]);

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

    /**
     * Calculate task score using +1/-1 point system.
     *
     * +1: Task completed on time (completed_at <= due_date)
     * -1: Task completed late (completed_at > due_date) OR overdue (not completed, past due_date)
     */
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

    /**
     * Calculate survey score using +1/-1 point system.
     *
     * +1: Survey response submitted on time (submitted_at <= survey.end_date)
     *     OR submitted for approval (status = submitted/approved)
     * -1: Survey response late (submitted_at > survey.end_date)
     *     OR deadline passed without submission
     */
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

    /**
     * Calculate attendance score using +1/-1 point system.
     *
     * +1: All grades' attendance recorded on the same day as attendance_date
     * -1: At least one grade missing attendance OR not recorded on the same day
     */
    private function calculateAttendanceScore(int $userId, string $period): array
    {
        $user = User::find($userId);
        $institutionId = $user->institution_id;

        // Count active grades at this institution
        $totalGrades = Grade::withoutGlobalScopes()
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->count();

        if ($totalGrades === 0) {
            return ['score' => 0, 'on_time' => 0, 'missed' => 0, 'total_days' => 0];
        }

        // Parse period to get date range (e.g., '2025-01' → Jan 2025)
        $periodParts = explode('-', $period);
        $year = (int) $periodParts[0];
        $month = (int) ($periodParts[1] ?? 1);
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Don't include future days
        if ($endDate->isFuture()) {
            $endDate = Carbon::today();
        }

        // Don't calculate if start date is in the future
        if ($startDate->isFuture()) {
            return ['score' => 0, 'on_time' => 0, 'missed' => 0, 'total_days' => 0];
        }

        // Get workdays (Mon-Fri) in the period
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

        // Batch query: get all attendance records for this institution in the period
        $attendanceRecords = ClassBulkAttendance::withoutGlobalScopes()
            ->where('institution_id', $institutionId)
            ->whereBetween('attendance_date', [$workdays[0], end($workdays)])
            ->get()
            ->groupBy(fn ($record) => $record->attendance_date->toDateString());

        $onTime = 0;
        $missed = 0;

        foreach ($workdays as $dateStr) {
            $dayRecords = $attendanceRecords->get($dateStr, collect());

            // Count grades with same-day recording
            $sameDay = $dayRecords->filter(function ($record) use ($dateStr) {
                $morningOk = $record->morning_recorded_at
                    && $record->morning_recorded_at->toDateString() === $dateStr;
                $eveningOk = $record->evening_recorded_at
                    && $record->evening_recorded_at->toDateString() === $dateStr;

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

    /**
     * Calculate link score using +1/-1 point system.
     *
     * +1: Link opened (has access log entry for this user)
     * -1: Link not opened (no access log entry)
     */
    private function calculateLinkScore(int $userId, string $period): array
    {
        $user = User::with('roles')->find($userId);
        $institutionId = $user->institution_id;
        $userRole = $user->roles->first()?->name;

        // Find active links targeted at this user
        $links = LinkShare::active()
            ->where(function ($q) use ($userId, $institutionId, $userRole) {
                // Directly targeted by user_id
                $q->whereJsonContains('target_users', $userId)
                    ->orWhereJsonContains('target_users', (string) $userId)
                    // Targeted by institution
                    ->orWhereJsonContains('target_institutions', $institutionId)
                    ->orWhereJsonContains('target_institutions', (string) $institutionId)
                    // Public scope
                    ->orWhere('share_scope', 'public')
                    // Same institution scope
                    ->orWhere(function ($q2) use ($institutionId) {
                        $q2->where('share_scope', 'institutional')
                            ->where('institution_id', $institutionId);
                    });
                // Targeted by role
                if ($userRole) {
                    $q->orWhereJsonContains('target_roles', $userRole);
                }
            })
            ->get();

        $opened = 0;
        $notOpened = 0;

        // Batch query: get all access logs for this user and these links
        $accessedLinkIds = LinkAccessLog::where('user_id', $userId)
            ->whereIn('link_share_id', $links->pluck('id'))
            ->distinct()
            ->pluck('link_share_id')
            ->toArray();

        foreach ($links as $link) {
            if (in_array($link->id, $accessedLinkIds)) {
                $opened++;
            } else {
                $notOpened++;
            }
        }

        return [
            'score' => $opened - $notOpened,
            'opened' => $opened,
            'missed' => $notOpened,
            'total' => $links->count(),
        ];
    }

    /**
     * Check if a rating is stale (needs recalculation).
     */
    private function isStale(Rating $rating): bool
    {
        $metadata = $rating->metadata;
        if (! $metadata || ! isset($metadata['calculated_at'])) {
            return true;
        }

        return Carbon::parse($metadata['calculated_at'])
            ->addMinutes(self::CACHE_MINUTES)
            ->isPast();
    }

    /**
     * Get allowed institution IDs based on user's hierarchy level.
     */
    private function getAllowedInstitutionIds(User $user): array
    {
        if ($user->hasRole('superadmin')) {
            return \App\Models\Institution::pluck('id')->toArray();
        }

        $institution = $user->institution;
        if (! $institution) {
            return [];
        }

        // For level 4 (school), return only own institution
        if ($institution->level === 4) {
            return [$institution->id];
        }

        // For level 2 (region) or level 3 (sector), get all children
        $childIds = $institution->getAllChildrenIds();

        return $childIds;
    }
}
