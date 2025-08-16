<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use App\Models\Institution;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

class TaskNotificationService
{
    /**
     * Send notification when a new task is created
     */
    public function notifyTaskCreated(Task $task): void
    {
        try {
            $creator = $task->creator;
            
            // Notify users in target institutions
            if ($task->target_institutions) {
                $this->notifyTargetInstitutions($task, [
                    'title' => 'Yeni Tapşırıq',
                    'message' => "Sizə yeni tapşırıq təyin edildi: {$task->title}",
                    'type' => 'task_assigned',
                    'priority' => $this->mapTaskPriorityToNotificationPriority($task->priority),
                ]);
            }

            Log::info('Task creation notification sent', [
                'task_id' => $task->id,
                'created_by' => $creator->id,
                'target_institutions' => $task->target_institutions,
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
            $statusMessages = [
                'in_progress' => 'Tapşırıq icrasına başlandı',
                'review' => 'Tapşırıq təsdiq üçün göndərildi',
                'completed' => 'Tapşırıq tamamlandı',
                'cancelled' => 'Tapşırıq ləğv edildi',
            ];

            $message = $statusMessages[$task->status] ?? 'Tapşırıq statusu yeniləndi';

            // Notify task creator about status updates
            if ($task->created_by !== $updatedBy->id) {
                $this->createNotification([
                    'title' => 'Tapşırıq Status Yeniləməsi',
                    'message' => "{$task->title} - {$message}",
                    'type' => 'task_status_update',
                    'priority' => 'medium',
                    'user_id' => $task->created_by,
                    'related_type' => Task::class,
                    'related_id' => $task->id,
                    'metadata' => [
                        'task_id' => $task->id,
                        'old_status' => $oldStatus,
                        'new_status' => $task->status,
                        'updated_by' => $updatedBy->name,
                        'institution' => $updatedBy->institution->name ?? 'Unknown',
                    ],
                ]);
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
            $title = $isApproved ? 'Tapşırıq Təsdiqləndi' : 'Tapşırıq Rədd Edildi';
            
            $message = $isApproved 
                ? "Tapşırığınız təsdiqləndi: {$task->title}"
                : "Tapşırığınız rədd edildi: {$task->title}";

            if ($reason && !$isApproved) {
                $message .= " - Səbəb: {$reason}";
            }

            // Notify users in target institutions
            if ($task->target_institutions) {
                $this->notifyTargetInstitutions($task, [
                    'title' => $title,
                    'message' => $message,
                    'type' => $isApproved ? 'task_approved' : 'task_rejected',
                    'priority' => $isApproved ? 'low' : 'medium',
                ], [
                    'decision' => $decision,
                    'approver' => $approver->name,
                    'reason' => $reason,
                ]);
            }

            // Also notify task creator
            if ($task->created_by !== $approver->id) {
                $this->createNotification([
                    'title' => $title,
                    'message' => $message,
                    'type' => $isApproved ? 'task_approved' : 'task_rejected',
                    'priority' => $isApproved ? 'low' : 'medium',
                    'user_id' => $task->created_by,
                    'related_type' => Task::class,
                    'related_id' => $task->id,
                    'metadata' => [
                        'task_id' => $task->id,
                        'decision' => $decision,
                        'approver' => $approver->name,
                        'reason' => $reason,
                    ],
                ]);
            }

            Log::info('Task approval decision notification sent', [
                'task_id' => $task->id,
                'decision' => $decision,
                'approver' => $approver->id,
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
            $dayText = $daysLeft === 1 ? '1 gün' : "{$daysLeft} gün";
            
            if ($task->target_institutions) {
                $this->notifyTargetInstitutions($task, [
                    'title' => 'Tapşırıq Deadline Yaxınlaşır',
                    'message' => "Tapşırıq deadline-ı {$dayText} qalıb: {$task->title}",
                    'type' => 'task_deadline_approaching',
                    'priority' => $urgencyLevel,
                ], [
                    'days_left' => $daysLeft,
                    'deadline' => $task->deadline,
                ]);
            }

            Log::info('Task deadline approaching notification sent', [
                'task_id' => $task->id,
                'days_left' => $daysLeft,
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
            if ($task->target_institutions) {
                $this->notifyTargetInstitutions($task, [
                    'title' => 'Tapşırıq Gecikdi',
                    'message' => "Tapşırıq deadline-ı keçdi: {$task->title}",
                    'type' => 'task_overdue',
                    'priority' => 'high',
                ], [
                    'deadline' => $task->deadline,
                    'overdue_days' => now()->diffInDays($task->deadline),
                ]);
            }

            // Also notify task creator
            $this->createNotification([
                'title' => 'Tapşırıq Gecikdi',
                'message' => "Tapşırıq deadline-ı keçdi: {$task->title}",
                'type' => 'task_overdue',
                'priority' => 'high',
                'user_id' => $task->created_by,
                'related_type' => Task::class,
                'related_id' => $task->id,
                'metadata' => [
                    'task_id' => $task->id,
                    'deadline' => $task->deadline,
                    'overdue_days' => now()->diffInDays($task->deadline),
                ],
            ]);

            Log::info('Task overdue notification sent', ['task_id' => $task->id]);

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
        if (!$task->target_institutions) {
            return;
        }

        // Find SektorAdmin for the institutions
        $schoolIds = collect($task->target_institutions);
        $sectorIds = Institution::whereIn('id', $schoolIds)->pluck('parent_id')->unique();
        
        $sektorAdmins = User::whereHas('roles', function ($q) {
                $q->where('name', 'sektoradmin');
            })
            ->whereIn('institution_id', $sectorIds)
            ->get();

        foreach ($sektorAdmins as $sektorAdmin) {
            $this->createNotification([
                'title' => 'Tapşırıq Təsdiq Gözləyir',
                'message' => "Təsdiq üçün yeni tapşırıq gözləyir: {$task->title}",
                'type' => 'task_approval_required',
                'priority' => 'medium',
                'user_id' => $sektorAdmin->id,
                'related_type' => Task::class,
                'related_id' => $task->id,
                'metadata' => [
                    'task_id' => $task->id,
                    'submitted_by' => $submittedBy->name,
                    'institution' => $submittedBy->institution->name ?? 'Unknown',
                    'deadline' => $task->deadline,
                ],
            ]);
        }
    }

    /**
     * Notify users in target institutions
     */
    private function notifyTargetInstitutions(Task $task, array $notificationData, array $extraMetadata = []): void
    {
        $targetUserIds = $this->getUsersInInstitutions($task->target_institutions);

        foreach ($targetUserIds as $userId) {
            $this->createNotification(array_merge($notificationData, [
                'user_id' => $userId,
                'related_type' => Task::class,
                'related_id' => $task->id,
                'metadata' => array_merge([
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'task_priority' => $task->priority,
                    'task_category' => $task->category,
                    'deadline' => $task->deadline,
                ], $extraMetadata),
            ]));
        }
    }

    /**
     * Get user IDs in target institutions
     */
    private function getUsersInInstitutions(array $institutionIds): array
    {
        // Get all relevant institution IDs (including children for sectors)
        $allInstitutionIds = collect($institutionIds);
        
        // For each institution, check if it's a sector and include its schools
        foreach ($institutionIds as $institutionId) {
            $institution = Institution::find($institutionId);
            if ($institution && $institution->level <= 3) { // Sector or higher level
                // Add all schools under this sector/region
                $children = Institution::where('parent_id', $institutionId)
                    ->where('level', 4) // Schools are level 4
                    ->pluck('id');
                $allInstitutionIds = $allInstitutionIds->merge($children);
            }
        }
        
        return User::whereIn('institution_id', $allInstitutionIds->unique()->toArray())
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['schooladmin', 'məktəbadmin', 'müəllim']);
            })
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();
    }

    /**
     * Create a notification record
     */
    private function createNotification(array $data): void
    {
        Notification::create(array_merge([
            'channel' => 'in_app',
            'language' => 'az',
            'is_sent' => true,
            'sent_at' => now(),
        ], $data));
    }

    /**
     * Map task priority to notification priority
     */
    private function mapTaskPriorityToNotificationPriority(string $taskPriority): string
    {
        return match ($taskPriority) {
            'urgent' => 'high',
            'high' => 'high',
            'medium' => 'medium',
            'low' => 'low',
            default => 'medium',
        };
    }
}