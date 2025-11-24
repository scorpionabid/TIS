<?php

namespace App\Jobs;

use App\Models\Survey;
use App\Models\Task;
use App\Services\InstitutionNotificationHelper;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendDeadlineReminders implements ShouldQueue
{
    use Queueable;

    protected NotificationService $notificationService;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        $this->notificationService = app(NotificationService::class);
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('Starting deadline reminder job');

        try {
            $this->processSurveyDeadlines();
            $this->processTaskDeadlines();

            Log::info('Deadline reminder job completed successfully');
        } catch (\Exception $e) {
            Log::error('Deadline reminder job failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Process survey deadline reminders
     */
    protected function processSurveyDeadlines(): void
    {
        $now = Carbon::now();

        // Find surveys with deadlines approaching (3 days, 1 day, same day)
        $deadlineThresholds = [
            ['days' => 3, 'action' => 'deadline_3_days'],
            ['days' => 1, 'action' => 'deadline_1_day'],
            ['days' => 0, 'action' => 'deadline_today'],
        ];

        foreach ($deadlineThresholds as $threshold) {
            $targetDate = $now->clone()->addDays($threshold['days']);

            // Find surveys ending on this date
            $surveys = Survey::where('status', 'published')
                ->whereDate('end_date', $targetDate->toDateString())
                ->where('end_date', '>', $now) // Still active
                ->get();

            foreach ($surveys as $survey) {
                $this->sendSurveyDeadlineReminder($survey, $threshold['action'], $threshold['days']);
            }
        }

        // Find overdue surveys
        $overdueSurveys = Survey::where('status', 'published')
            ->where('end_date', '<', $now)
            ->whereDoesntHave('notifications', function ($query) use ($now) {
                $query->where('type', 'survey_overdue')
                    ->where('created_at', '>=', $now->subDay());
            })
            ->get();

        foreach ($overdueSurveys as $survey) {
            $this->sendSurveyDeadlineReminder($survey, 'overdue', 0);
        }
    }

    /**
     * Process task deadline reminders
     */
    protected function processTaskDeadlines(): void
    {
        $now = Carbon::now();

        // Find tasks with deadlines approaching (3 days, 1 day, same day)
        $deadlineThresholds = [
            ['days' => 3, 'action' => 'deadline_3_days'],
            ['days' => 1, 'action' => 'deadline_1_day'],
            ['days' => 0, 'action' => 'deadline_today'],
        ];

        foreach ($deadlineThresholds as $threshold) {
            $targetDate = $now->clone()->addDays($threshold['days']);

            // Find tasks due on this date
            $tasks = Task::whereIn('status', ['pending', 'in_progress'])
                ->whereDate('due_date', $targetDate->toDateString())
                ->where('due_date', '>', $now) // Still active
                ->with(['assignments', 'assignedInstitution'])
                ->get();

            foreach ($tasks as $task) {
                $this->sendTaskDeadlineReminder($task, $threshold['action'], $threshold['days']);
            }
        }

        // Find overdue tasks
        $overdueTasks = Task::whereIn('status', ['pending', 'in_progress'])
            ->where('due_date', '<', $now)
            ->whereDoesntHave('notifications', function ($query) use ($now) {
                $query->where('type', 'task_overdue')
                    ->where('created_at', '>=', $now->subDay());
            })
            ->with(['assignments', 'assignedInstitution'])
            ->get();

        foreach ($overdueTasks as $task) {
            $this->sendTaskDeadlineReminder($task, 'overdue', 0);
        }
    }

    /**
     * Send survey deadline reminder
     */
    protected function sendSurveyDeadlineReminder(Survey $survey, string $action, int $daysLeft): void
    {
        try {
            // Get target user IDs from survey institutions
            $targetUserIds = [];
            if ($survey->target_institutions) {
                $targetRoles = config('notification_roles.survey_notification_roles', [
                    'schooladmin', 'məktəbadmin', 'müəllim', 'teacher',
                ]);

                $targetUserIds = InstitutionNotificationHelper::expandInstitutionsToUsers(
                    $survey->target_institutions,
                    $targetRoles
                );
            }

            if (! empty($targetUserIds)) {
                $deadlineText = $this->getDeadlineText($daysLeft, $action);

                $extraData = [
                    'days_left' => $daysLeft,
                    'deadline_text' => $deadlineText,
                    'deadline_formatted' => $survey->end_date ? $survey->end_date->format('d.m.Y H:i') : '',
                    'urgency_level' => $this->getUrgencyLevel($daysLeft),
                ];

                $this->notificationService->sendSurveyNotification(
                    $survey,
                    $action,
                    $targetUserIds,
                    $extraData
                );

                Log::info('Survey deadline reminder sent', [
                    'survey_id' => $survey->id,
                    'action' => $action,
                    'days_left' => $daysLeft,
                    'recipients' => count($targetUserIds),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send survey deadline reminder', [
                'survey_id' => $survey->id,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send task deadline reminder
     */
    protected function sendTaskDeadlineReminder(Task $task, string $action, int $daysLeft): void
    {
        try {
            // Get assigned user IDs from task assignments
            $assignedUserIds = $task->assignments()->pluck('assigned_user_id')->filter()->toArray();

            if (! empty($assignedUserIds)) {
                $deadlineText = $this->getDeadlineText($daysLeft, $action);

                $extraData = [
                    'days_left' => $daysLeft,
                    'deadline_text' => $deadlineText,
                    'deadline_formatted' => $task->due_date ? $task->due_date->format('d.m.Y H:i') : '',
                    'urgency_level' => $this->getUrgencyLevel($daysLeft),
                    'task_priority' => $task->priority ?? 'normal',
                    'task_category' => $task->category ?? 'other',
                ];

                $this->notificationService->sendTaskNotification(
                    $task,
                    $action,
                    $assignedUserIds,
                    $extraData
                );

                Log::info('Task deadline reminder sent', [
                    'task_id' => $task->id,
                    'action' => $action,
                    'days_left' => $daysLeft,
                    'recipients' => count($assignedUserIds),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send task deadline reminder', [
                'task_id' => $task->id,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get deadline text in Azerbaijani
     */
    protected function getDeadlineText(int $daysLeft, string $action): string
    {
        return match ($action) {
            'deadline_3_days' => '3 gün qalıb',
            'deadline_1_day' => '1 gün qalıb',
            'deadline_today' => 'Bu gün bitir',
            'overdue' => 'Müddət keçib',
            default => "{$daysLeft} gün qalıb",
        };
    }

    /**
     * Get urgency level based on days left
     */
    protected function getUrgencyLevel(int $daysLeft): string
    {
        return match (true) {
            $daysLeft < 0 => 'critical',
            $daysLeft === 0 => 'urgent',
            $daysLeft === 1 => 'high',
            $daysLeft <= 3 => 'medium',
            default => 'normal',
        };
    }
}
