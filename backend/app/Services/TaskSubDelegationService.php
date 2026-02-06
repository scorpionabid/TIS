<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskSubDelegation;
use App\Models\User;
use App\Events\SubDelegationStatusChanged;
use App\Notifications\TaskSubDelegationNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaskSubDelegationService
{
    public function __construct(
        private TaskAssignmentService $taskAssignmentService,
        private NotificationService $notificationService
    ) {}

    /**
     * Çox nəfərə yönləndirmə
     */
    public function delegateToMultiple(
        Task $task,
        TaskAssignment $parentAssignment,
        array $delegations, // [{user_id, institution_id?, deadline?, notes?}]
        User $delegatedBy
    ): Collection {
        return DB::transaction(function () use ($task, $parentAssignment, $delegations, $delegatedBy) {
            $createdDelegations = collect();

            foreach ($delegations as $delegationData) {
                $delegation = TaskSubDelegation::create([
                    'task_id' => $task->id,
                    'parent_assignment_id' => $parentAssignment->id,
                    'delegated_to_user_id' => $delegationData['user_id'],
                    'delegated_to_institution_id' => $delegationData['institution_id'] ?? null,
                    'delegated_by_user_id' => $delegatedBy->id,
                    'deadline' => $delegationData['deadline'] ?? null,
                    'delegation_notes' => $delegationData['notes'] ?? null,
                    'status' => 'pending',
                    'progress' => 0,
                ]);

                $createdDelegations->push($delegation);

                // Bildiriş göndər
                $this->notifyDelegationCreated($delegation);
            }

            // Parent assignment-i yenilə
            $parentAssignment->update([
                'has_sub_delegations' => true,
                'sub_delegation_count' => $createdDelegations->count(),
                'completed_sub_delegations' => 0,
            ]);

            Log::info('Task sub-delegations created', [
                'task_id' => $task->id,
                'parent_assignment_id' => $parentAssignment->id,
                'delegation_count' => $createdDelegations->count(),
                'delegated_by' => $delegatedBy->id,
            ]);

            return $createdDelegations;
        });
    }

    /**
     * Status yeniləmə
     */
    public function updateStatus(
        TaskSubDelegation $delegation,
        string $status,
        array $data,
        User $user
    ): TaskSubDelegation {
        return DB::transaction(function () use ($delegation, $status, $data, $user) {
            $oldStatus = $delegation->status;
            
            // Update delegation
            $updateData = [
                'status' => $status,
                'progress' => $data['progress'] ?? $delegation->progress,
            ];

            // Status-specific updates
            match($status) {
                'accepted' => $updateData['accepted_at'] = now(),
                'in_progress' => $updateData['started_at'] = now(),
                'completed' => $this->applyCompletedStatus($updateData, $data),
                'cancelled' => $updateData['cancelled_at'] = now(),
                default => null
            };

            $delegation->update($updateData);

            // Parent progress-i yenilə
            $this->calculateParentProgress($delegation->parentAssignment);

            // Event yarat
            event(new SubDelegationStatusChanged($delegation, $oldStatus, $status, $user));

            // Bildirişlər göndər
            $this->notifyDelegationStatusChanged($delegation, $oldStatus, $status);

            // Əgər tamamlandısa və hamısı tamamlanıbsa
            if ($status === 'completed' && $this->areAllCompleted($delegation->parentAssignment)) {
                $this->notifyAllDelegationsCompleted($delegation->parentAssignment);
            }

            Log::info('Task sub-delegation status updated', [
                'delegation_id' => $delegation->id,
                'old_status' => $oldStatus,
                'new_status' => $status,
                'updated_by' => $user->id,
            ]);

            return $delegation->refresh();
        });
    }

    /**
     * Progress hesablama (ortalama)
     */
    public function calculateParentProgress(TaskAssignment $parentAssignment): int
    {
        $delegations = $parentAssignment->subDelegations()
            ->whereNotIn('status', ['cancelled'])
            ->get();

        if ($delegations->isEmpty()) {
            return $parentAssignment->progress;
        }

        $totalProgress = $delegations->sum('progress');
        $averageProgress = (int) round($totalProgress / $delegations->count());

        // Parent assignment progress-ini yenilə
        $parentAssignment->update([
            'progress' => $averageProgress,
            'completed_sub_delegations' => $delegations->where('status', 'completed')->count(),
        ]);

        // Task progress-ini də yenilə
        $this->taskAssignmentService->updateTaskProgressFromAssignments($parentAssignment->task);

        return $averageProgress;
    }

    /**
     * Hamısı tamamlanıb?
     */
    public function areAllCompleted(TaskAssignment $parentAssignment): bool
    {
        $totalDelegations = $parentAssignment->subDelegations()
            ->whereNotIn('status', ['cancelled'])
            ->count();

        $completedDelegations = $parentAssignment->subDelegations()
            ->where('status', 'completed')
            ->count();

        return $totalDelegations > 0 && $totalDelegations === $completedDelegations;
    }

    /**
     * Delegation sil
     */
    public function deleteDelegation(TaskSubDelegation $delegation, User $user): bool
    {
        return DB::transaction(function () use ($delegation, $user) {
            $parentAssignment = $delegation->parentAssignment;
            
            $delegation->delete();

            // Parent assignment-i yenilə
            $remainingCount = $parentAssignment->subDelegations()->count();
            $completedCount = $parentAssignment->subDelegations()
                ->where('status', 'completed')
                ->count();

            $parentAssignment->update([
                'has_sub_delegations' => $remainingCount > 0,
                'sub_delegation_count' => $remainingCount,
                'completed_sub_delegations' => $completedCount,
            ]);

            // Progress-i yenilə
            if ($remainingCount > 0) {
                $this->calculateParentProgress($parentAssignment);
            }

            Log::info('Task sub-delegation deleted', [
                'delegation_id' => $delegation->id,
                'deleted_by' => $user->id,
            ]);

            return true;
        });
    }

    /**
     * Completed status üçün updateData-nı yenilə
     */
    private function applyCompletedStatus(array &$updateData, array $data): void
    {
        $updateData['completed_at'] = now();
        $updateData['completion_notes'] = $data['completion_notes'] ?? null;
        $updateData['completion_data'] = $data['completion_data'] ?? null;
        $updateData['progress'] = 100;
    }

    /**
     * Bildiriş göndərmə - Yeni delegation
     */
    private function notifyDelegationCreated(TaskSubDelegation $delegation): void
    {
        $delegation->delegatedToUser->notify(
            new TaskSubDelegationNotification($delegation, 'delegated_to_you')
        );
    }

    /**
     * Bildiriş göndərmə - Status dəyişikliyi
     */
    private function notifyDelegationStatusChanged(
        TaskSubDelegation $delegation,
        string $oldStatus,
        string $newStatus
    ): void {
        // Parent assignment user-ına bildiriş
        $delegation->parentAssignment->user->notify(
            new TaskSubDelegationNotification($delegation, 'status_changed', [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ])
        );

        // Status-a görə xüsusi bildirişlər
        match($newStatus) {
            'accepted' => $this->notifyDelegationAccepted($delegation),
            'completed' => $this->notifyDelegationCompleted($delegation),
            default => null
        };
    }

    /**
     * Qəbul edildi bildirişi
     */
    private function notifyDelegationAccepted(TaskSubDelegation $delegation): void
    {
        $delegation->parentAssignment->user->notify(
            new TaskSubDelegationNotification($delegation, 'delegation_accepted')
        );
    }

    /**
     * Tamamlandı bildirişi
     */
    private function notifyDelegationCompleted(TaskSubDelegation $delegation): void
    {
        $delegation->parentAssignment->user->notify(
            new TaskSubDelegationNotification($delegation, 'delegation_completed')
        );
    }

    /**
     * Hamısı tamamlandı bildirişi
     */
    private function notifyAllDelegationsCompleted(TaskAssignment $parentAssignment): void
    {
        $parentAssignment->user->notify(
            new TaskSubDelegationNotification($parentAssignment, 'all_completed')
        );

        // Task yaradıcısına da bildiriş
        if ($parentAssignment->task->creator) {
            $parentAssignment->task->creator->notify(
                new TaskSubDelegationNotification($parentAssignment, 'task_completed')
            );
        }
    }
}
