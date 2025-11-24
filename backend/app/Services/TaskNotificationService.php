<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Notification;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class TaskNotificationService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Send notification when a new task is created
     */
    public function notifyTaskCreated(Task $task): void
    {
        try {
            $task->loadMissing(['creator', 'assignedInstitution']);
            $targetUserIds = $this->getUsersInInstitutions($task->target_institutions ?? []);

            if (! empty($targetUserIds)) {
                $this->notificationService->sendTaskNotification(
                    $task,
                    'assigned',
                    $targetUserIds,
                    [
                        'creator_name' => $task->creator->name ?? 'Sistem',
                        'creator_institution' => $task->creator?->institution?->name
                            ?? $task->assignedInstitution?->name
                            ?? 'N/A',
                        'description' => $task->description ?? '',
                        'due_date' => $task->deadline?->format('d.m.Y H:i'),
                        'target_institution' => $task->assignedInstitution?->name ?? '',
                        'action_url' => "/tasks/{$task->id}",
                    ]
                );
            }

            Log::info('Task creation notification sent', [
                'task_id' => $task->id,
                'created_by' => $task->created_by,
                'target_institutions' => $task->target_institutions,
                'target_users' => count($targetUserIds),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send task creation notification', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send notification when task status is updated
     */
    public function notifyTaskStatusUpdate(Task $task, string $oldStatus, User $updatedBy): void
    {
        try {
            // Notify task creator about status updates
            if ($task->created_by !== $updatedBy->id) {
                $this->notificationService->sendTaskNotification(
                    $task,
                    'status_update',
                    [$task->created_by],
                    [
                        'old_status' => $oldStatus,
                        'new_status' => $task->status,
                        'updated_by' => $updatedBy->name,
                        'institution' => $updatedBy->institution->name ?? 'Unknown',
                        'action_url' => "/tasks/{$task->id}",
                    ]
                );
            }

            // If task is submitted for review, notify SektorAdmin
            if ($task->status === 'review' && $task->requires_approval) {
                $this->notifySektorAdminForApproval($task, $updatedBy);
            }

            Log::info('Task status update notification sent', [
                'task_id' => $task->id,
                'old_status' => $oldStatus,
                'new_status' => $task->status,
                'updated_by' => $updatedBy->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send task status update notification', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send notification when task is approved or rejected
     */
    public function notifyTaskApprovalDecision(Task $task, string $decision, User $approver, ?string $reason = null): void
    {
        try {
            $isApproved = $decision === 'approved';
            $action = $isApproved ? 'approved' : 'rejected';

            // Collect all recipients: target institution users + task creator
            $targetUserIds = $this->getUsersInInstitutions($task->target_institutions ?? []);
            if ($task->created_by !== $approver->id && ! in_array($task->created_by, $targetUserIds)) {
                $targetUserIds[] = $task->created_by;
            }

            if (! empty($targetUserIds)) {
                $this->notificationService->sendTaskNotification(
                    $task,
                    $action,
                    $targetUserIds,
                    [
                        'decision' => $decision,
                        'approver' => $approver->name,
                        'reason' => $reason,
                        'action_url' => "/tasks/{$task->id}",
                    ],
                    [
                        'priority' => $isApproved ? 'low' : 'medium',
                    ]
                );
            }

            Log::info('Task approval decision notification sent', [
                'task_id' => $task->id,
                'decision' => $decision,
                'approver' => $approver->id,
                'target_users' => count($targetUserIds),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send task approval decision notification', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send notification when task deadline is approaching
     */
    public function notifyTaskDeadlineApproaching(Task $task, int $daysLeft): void
    {
        try {
            $urgencyLevel = $daysLeft <= 1 ? 'high' : ($daysLeft <= 3 ? 'medium' : 'low');
            $targetUserIds = $this->getUsersInInstitutions($task->target_institutions ?? []);

            if (! empty($targetUserIds)) {
                $this->notificationService->sendTaskNotification(
                    $task,
                    'deadline_approaching',
                    $targetUserIds,
                    [
                        'days_left' => $daysLeft,
                        'action_url' => "/tasks/{$task->id}",
                    ],
                    [
                        'priority' => $urgencyLevel,
                    ]
                );
            }

            Log::info('Task deadline approaching notification sent', [
                'task_id' => $task->id,
                'days_left' => $daysLeft,
                'target_users' => count($targetUserIds),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send task deadline notification', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send notification when task is overdue
     */
    public function notifyTaskOverdue(Task $task): void
    {
        try {
            // Collect all recipients: target institution users + task creator
            $targetUserIds = $this->getUsersInInstitutions($task->target_institutions ?? []);
            if (! in_array($task->created_by, $targetUserIds)) {
                $targetUserIds[] = $task->created_by;
            }

            if (! empty($targetUserIds)) {
                $this->notificationService->sendTaskNotification(
                    $task,
                    'overdue',
                    $targetUserIds,
                    [
                        'overdue_days' => now()->diffInDays($task->deadline),
                        'action_url' => "/tasks/{$task->id}",
                    ],
                    [
                        'priority' => 'high',
                    ]
                );
            }

            Log::info('Task overdue notification sent', [
                'task_id' => $task->id,
                'target_users' => count($targetUserIds),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send task overdue notification', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify SektorAdmin when task is submitted for approval
     */
    private function notifySektorAdminForApproval(Task $task, User $submittedBy): void
    {
        if (! $task->target_institutions) {
            return;
        }

        // Find SektorAdmin for the institutions
        $schoolIds = collect($task->target_institutions);
        $sectorIds = Institution::whereIn('id', $schoolIds)->pluck('parent_id')->unique();

        $sektorAdminIds = User::whereHas('roles', function ($q) {
            $q->where('name', 'sektoradmin');
        })
            ->whereIn('institution_id', $sectorIds)
            ->pluck('id')
            ->toArray();

        if (! empty($sektorAdminIds)) {
            $this->notificationService->sendTaskNotification(
                $task,
                'approval_required',
                $sektorAdminIds,
                [
                    'submitted_by' => $submittedBy->name,
                    'institution' => $submittedBy->institution->name ?? 'Unknown',
                    'action_url' => "/tasks/{$task->id}",
                ],
                [
                    'priority' => 'medium',
                ]
            );
        }
    }

    /**
     * Get user IDs in target institutions
     * Uses InstitutionNotificationHelper to avoid code duplication
     */
    private function getUsersInInstitutions(array $institutionIds): array
    {
        $taskRoles = config('notification_roles.task_notification_roles', [
            'schooladmin', 'məktəbadmin', 'müəllim',
        ]);

        return InstitutionNotificationHelper::expandInstitutionsToUsers(
            $institutionIds,
            $taskRoles, // Target roles for tasks from config
            false // Only active users
        );
    }
}
