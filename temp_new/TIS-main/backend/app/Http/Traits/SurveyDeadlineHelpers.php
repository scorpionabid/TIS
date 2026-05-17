<?php

namespace App\Http\Traits;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Deadline status calculation and filtering helpers shared between
 * SurveyMyController (user-facing) and SurveyAnalyticsController (admin-facing).
 */
trait SurveyDeadlineHelpers
{
    protected int $deadlineApproachingDays = 3;

    /**
     * Resolve deadline status metadata for a survey end date.
     */
    protected function resolveDeadlineStatus(?CarbonInterface $endDate): array
    {
        if (! $endDate) {
            return [
                'status' => 'no_deadline',
                'end_date' => null,
                'days_remaining' => null,
                'days_overdue' => null,
                'approaching_threshold_days' => $this->deadlineApproachingDays,
                'is_due_today' => false,
            ];
        }

        $now = now();

        if ($endDate->lessThan($now)) {
            return [
                'status' => 'overdue',
                'end_date' => $endDate->toISOString(),
                'days_remaining' => 0,
                'days_overdue' => max($endDate->diffInDays($now), 0),
                'approaching_threshold_days' => $this->deadlineApproachingDays,
                'is_due_today' => false,
            ];
        }

        $daysRemaining = max($now->diffInDays($endDate), 0);
        $isDueToday = $endDate->isSameDay($now);
        $status = ($daysRemaining <= $this->deadlineApproachingDays || $isDueToday) ? 'approaching' : 'on_track';

        return [
            'status' => $status,
            'end_date' => $endDate->toISOString(),
            'days_remaining' => $daysRemaining,
            'days_overdue' => 0,
            'approaching_threshold_days' => $this->deadlineApproachingDays,
            'is_due_today' => $isDueToday,
        ];
    }

    /**
     * Apply a deadline status filter to a query builder.
     *
     * @param  Builder  $query
     */
    protected function applyDeadlineFilter($query, string $filter)
    {
        $now = now();
        $thresholdDate = $now->copy()->addDays($this->deadlineApproachingDays);

        return match ($filter) {
            'overdue'    => $query->whereNotNull('end_date')->where('end_date', '<', $now),
            'approaching' => $query->whereNotNull('end_date')->whereBetween('end_date', [$now, $thresholdDate]),
            'on_track'   => $query->whereNotNull('end_date')->where('end_date', '>', $thresholdDate),
            'no_deadline' => $query->whereNull('end_date'),
            default      => $query,
        };
    }
}
