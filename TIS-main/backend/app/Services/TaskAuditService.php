<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskAuditLog;
use Illuminate\Support\Facades\Auth;

class TaskAuditService
{
    /**
     * Log task creation
     */
    public function logTaskCreated(Task $task): void
    {
        $this->createLog($task, 'created', null, $task->toArray());
    }

    /**
     * Log task update
     */
    public function logTaskUpdated(Task $task, array $oldValues): void
    {
        $newValues = $task->getDirty();

        if (empty($newValues)) {
            return; // No changes
        }

        // Special handling for status changes
        if (isset($newValues['status']) && isset($oldValues['status'])) {
            $this->logStatusChanged(
                $task,
                $oldValues['status'],
                $newValues['status']
            );
        }

        $this->createLog($task, 'updated', $oldValues, $newValues);
    }

    /**
     * Log task deletion
     */
    public function logTaskDeleted(Task $task): void
    {
        $this->createLog($task, 'deleted', $task->toArray(), null);
    }

    /**
     * Log status change
     */
    public function logStatusChanged(Task $task, string $oldStatus, string $newStatus): void
    {
        $this->createLog(
            $task,
            'status_changed',
            ['status' => $oldStatus],
            ['status' => $newStatus]
        );
    }

    /**
     * Log task delegation
     */
    public function logTaskDelegated(Task $task, int $fromUserId, int $toUserId, ?string $reason = null): void
    {
        $this->createLog(
            $task,
            'delegated',
            ['assigned_user_id' => $fromUserId],
            ['assigned_user_id' => $toUserId],
            $reason
        );
    }

    /**
     * Log approval submission
     */
    public function logSubmittedForApproval(Task $task): void
    {
        $this->createLog(
            $task,
            'submitted_for_approval',
            ['approval_status' => null],
            ['approval_status' => 'pending']
        );
    }

    /**
     * Log task approval
     */
    public function logTaskApproved(Task $task, ?string $notes = null): void
    {
        $this->createLog(
            $task,
            'approved',
            ['approval_status' => 'pending'],
            [
                'approval_status' => 'approved',
                'approved_by' => Auth::id(),
                'approved_at' => now()->toISOString(),
            ],
            $notes
        );
    }

    /**
     * Log task rejection
     */
    public function logTaskRejected(Task $task, ?string $notes = null): void
    {
        $this->createLog(
            $task,
            'rejected',
            ['approval_status' => 'pending'],
            [
                'approval_status' => 'rejected',
                'approved_by' => Auth::id(),
                'approved_at' => now()->toISOString(),
            ],
            $notes
        );
    }

    /**
     * Log assignment update
     */
    public function logAssignmentUpdated(Task $task, array $oldValues, array $newValues): void
    {
        $this->createLog($task, 'assignment_updated', $oldValues, $newValues);
    }

    /**
     * Log generic action
     */
    public function logAction(Task $task, string $action, ?array $data = null, ?string $notes = null): void
    {
        $this->createLog($task, $action, null, $data, $notes);
    }

    /**
     * Get task audit history
     */
    public function getTaskHistory(Task $task): array
    {
        return TaskAuditLog::where('task_id', $task->id)
            ->with('user:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_label' => $log->action_label,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->first_name . ' ' . $log->user->last_name,
                    ] : null,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'changes_summary' => $log->getChangesSummary(),
                    'notes' => $log->notes,
                    'created_at' => $log->created_at->toISOString(),
                ];
            })
            ->toArray();
    }

    /**
     * Get approval history for a task
     */
    public function getApprovalHistory(Task $task): array
    {
        return TaskAuditLog::where('task_id', $task->id)
            ->whereIn('action', ['submitted_for_approval', 'approved', 'rejected'])
            ->with('user:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_label' => $log->action_label,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->first_name . ' ' . $log->user->last_name,
                    ] : null,
                    'notes' => $log->notes,
                    'created_at' => $log->created_at->toISOString(),
                ];
            })
            ->toArray();
    }

    /**
     * Get user activity on tasks
     */
    public function getUserActivity(int $userId, int $limit = 50): array
    {
        return TaskAuditLog::where('user_id', $userId)
            ->with(['task:id,title', 'user:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_label' => $log->action_label,
                    'task' => $log->task ? [
                        'id' => $log->task->id,
                        'title' => $log->task->title,
                    ] : null,
                    'created_at' => $log->created_at->toISOString(),
                ];
            })
            ->toArray();
    }

    /**
     * Create audit log entry
     */
    private function createLog(
        Task $task,
        string $action,
        ?array $oldValues,
        ?array $newValues,
        ?string $notes = null
    ): void {
        TaskAuditLog::create([
            'task_id' => $task->id,
            'user_id' => Auth::id() ?? 1, // Fallback to system user
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'notes' => $notes,
        ]);
    }
}
