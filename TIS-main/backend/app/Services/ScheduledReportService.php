<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\ReportSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ScheduledReportService extends BaseService
{
    /**
     * Get paginated scheduled reports with filters
     */
    public function getScheduledReports(array $filters = [], int $perPage = 15): array
    {
        $query = ReportSchedule::with(['creator'])
            ->when($filters['status'] ?? null, function ($query, $status) {
                return $query->where('status', $status);
            })
            ->when($filters['report_type'] ?? null, function ($query, $type) {
                return $query->where('report_type', $type);
            })
            ->orderBy('created_at', 'desc');

        $schedules = $query->paginate($perPage);

        return [
            'schedules' => $schedules->map(function ($schedule) {
                return $this->formatScheduleForResponse($schedule);
            }),
            'meta' => [
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
                'per_page' => $schedules->perPage(),
                'total' => $schedules->total(),
            ],
        ];
    }

    /**
     * Create new scheduled report
     */
    public function createScheduledReport(array $data, $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $nextRun = $this->calculateNextRun(
                $data['frequency'],
                $data['time'],
                $data['day_of_week'] ?? null,
                $data['day_of_month'] ?? null
            );

            $schedule = ReportSchedule::create([
                'name' => $data['name'],
                'report_type' => $data['report_type'],
                'frequency' => $data['frequency'],
                'format' => $data['format'],
                'recipients' => $data['recipients'],
                'filters' => $data['filters'] ?? [],
                'time' => $data['time'],
                'day_of_week' => $data['day_of_week'] ?? null,
                'day_of_month' => $data['day_of_month'] ?? null,
                'next_run' => $nextRun,
                'status' => 'active',
                'created_by' => $user->id,
            ]);

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $user->id,
                'activity_type' => 'scheduled_report_create',
                'entity_type' => 'ReportSchedule',
                'entity_id' => $schedule->id,
                'description' => "Created scheduled report: {$schedule->name}",
                'properties' => [
                    'report_type' => $schedule->report_type,
                    'frequency' => $schedule->frequency,
                    'recipients_count' => count($schedule->recipients),
                ],
                'institution_id' => $user->institution_id,
            ]);

            return [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'next_run' => $schedule->next_run,
            ];
        });
    }

    /**
     * Update scheduled report
     */
    public function updateScheduledReport(ReportSchedule $schedule, array $data, $user): array
    {
        return DB::transaction(function () use ($schedule, $data, $user) {
            $oldData = $schedule->toArray();

            $updateData = collect($data)->only([
                'name', 'frequency', 'format', 'recipients',
                'filters', 'status', 'time', 'day_of_week', 'day_of_month',
            ])->filter()->toArray();

            // Recalculate next run if frequency or time changed
            if (collect($data)->intersectByKeys(array_flip(['frequency', 'time', 'day_of_week', 'day_of_month']))->isNotEmpty()) {
                $updateData['next_run'] = $this->calculateNextRun(
                    $data['frequency'] ?? $schedule->frequency,
                    $data['time'] ?? $schedule->time,
                    $data['day_of_week'] ?? $schedule->day_of_week,
                    $data['day_of_month'] ?? $schedule->day_of_month
                );
            }

            $schedule->update($updateData);

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $user->id,
                'activity_type' => 'scheduled_report_update',
                'entity_type' => 'ReportSchedule',
                'entity_id' => $schedule->id,
                'description' => "Updated scheduled report: {$schedule->name}",
                'before_state' => $oldData,
                'after_state' => $schedule->toArray(),
                'institution_id' => $user->institution_id,
            ]);

            return [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'status' => $schedule->status,
                'next_run' => $schedule->next_run,
            ];
        });
    }

    /**
     * Delete scheduled report
     */
    public function deleteScheduledReport(ReportSchedule $schedule, $user): void
    {
        $scheduleName = $schedule->name;
        $schedule->delete();

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $user->id,
            'activity_type' => 'scheduled_report_delete',
            'entity_type' => 'ReportSchedule',
            'entity_id' => $schedule->id,
            'description' => "Deleted scheduled report: {$scheduleName}",
            'institution_id' => $user->institution_id,
        ]);
    }

    /**
     * Get report schedules due for execution
     */
    public function getDueSchedules(): \Illuminate\Database\Eloquent\Collection
    {
        return ReportSchedule::where('status', 'active')
            ->where('next_run', '<=', now())
            ->get();
    }

    /**
     * Mark schedule as executed and calculate next run
     */
    public function markAsExecuted(ReportSchedule $schedule): void
    {
        $nextRun = $this->calculateNextRun(
            $schedule->frequency,
            $schedule->time,
            $schedule->day_of_week,
            $schedule->day_of_month
        );

        $schedule->update([
            'last_run' => now(),
            'next_run' => $nextRun,
            'run_count' => $schedule->run_count + 1,
        ]);
    }

    /**
     * Get available report types
     */
    public function getAvailableReportTypes(): array
    {
        return [
            'overview' => 'Ümumi icmal',
            'institutional' => 'Müəssisə hesabatı',
            'survey' => 'Sorğu nəticələri',
            'user_activity' => 'İstifadəçi fəaliyyəti',
        ];
    }

    /**
     * Get frequency options
     */
    public function getFrequencyOptions(): array
    {
        return [
            'daily' => 'Gündəlik',
            'weekly' => 'Həftəlik',
            'monthly' => 'Aylıq',
            'quarterly' => 'Rüblük',
        ];
    }

    /**
     * Get format options
     */
    public function getFormatOptions(): array
    {
        return [
            'csv' => 'CSV',
            'json' => 'JSON',
            'pdf' => 'PDF',
        ];
    }

    /**
     * Calculate next run time based on frequency
     */
    private function calculateNextRun(string $frequency, string $time, ?int $dayOfWeek, ?int $dayOfMonth): Carbon
    {
        $now = now();
        [$hour, $minute] = explode(':', $time);

        switch ($frequency) {
            case 'daily':
                $next = $now->copy()->setTime($hour, $minute);
                if ($next <= $now) {
                    $next->addDay();
                }
                break;

            case 'weekly':
                $next = $now->copy()->next($dayOfWeek ?? 0)->setTime($hour, $minute);
                break;

            case 'monthly':
                $next = $now->copy()->startOfMonth()->addDays(($dayOfMonth ?? 1) - 1)->setTime($hour, $minute);
                if ($next <= $now) {
                    $next->addMonth();
                }
                break;

            case 'quarterly':
                $next = $now->copy()->firstOfQuarter()->addDays(($dayOfMonth ?? 1) - 1)->setTime($hour, $minute);
                if ($next <= $now) {
                    $next->addQuarter();
                }
                break;

            default:
                $next = $now->copy()->addDay();
        }

        return $next;
    }

    /**
     * Format schedule for API response
     */
    private function formatScheduleForResponse(ReportSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'name' => $schedule->name,
            'report_type' => $schedule->report_type,
            'frequency' => $schedule->frequency,
            'format' => $schedule->format,
            'recipients' => $schedule->recipients,
            'status' => $schedule->status,
            'next_run' => $schedule->next_run,
            'last_run' => $schedule->last_run,
            'run_count' => $schedule->run_count ?? 0,
            'created_by' => $schedule->creator?->username,
            'created_at' => $schedule->created_at,
            'filters' => $schedule->filters,
        ];
    }

    /**
     * Validate report data
     */
    public function validateReportData(array $data): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Hesabat adı tələb olunur';
        }

        if (empty($data['report_type']) || ! in_array($data['report_type'], array_keys($this->getAvailableReportTypes()))) {
            $errors['report_type'] = 'Keçərli hesabat növü seçin';
        }

        if (empty($data['frequency']) || ! in_array($data['frequency'], array_keys($this->getFrequencyOptions()))) {
            $errors['frequency'] = 'Keçərli tezlik seçin';
        }

        if (empty($data['format']) || ! in_array($data['format'], array_keys($this->getFormatOptions()))) {
            $errors['format'] = 'Keçərli format seçin';
        }

        if (empty($data['recipients']) || ! is_array($data['recipients'])) {
            $errors['recipients'] = 'Ən azı bir alıcı email adresi tələb olunur';
        } else {
            foreach ($data['recipients'] as $email) {
                if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $errors['recipients'] = 'Bütün email adresləri keçərli olmalıdır';
                    break;
                }
            }
        }

        if (empty($data['time']) || ! preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $data['time'])) {
            $errors['time'] = 'Keçərli vaxt formatı (HH:MM) tələb olunur';
        }

        return $errors;
    }
}
