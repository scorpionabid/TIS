<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Services\NotificationService;
use App\Services\TaskAssignmentService;
use App\Services\TaskAuditService;
use App\Services\TaskNotificationService;
use App\Services\TaskPermissionService;
use App\Services\TaskStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskApprovalController extends BaseTaskController
{
    protected TaskNotificationService $taskNotificationService;

    public function __construct(
        TaskPermissionService $permissionService,
        TaskAssignmentService $assignmentService,
        TaskStatisticsService $statisticsService,
        NotificationService $notificationService,
        TaskAuditService $auditService,
        TaskNotificationService $taskNotificationService
    ) {
        parent::__construct(
            $permissionService,
            $assignmentService,
            $statisticsService,
            $notificationService,
            $auditService
        );
        $this->taskNotificationService = $taskNotificationService;
    }

    /**
     * Submit task for approval
     */
    public function submitForApproval(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserUpdateTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı yeniləməyə icazəniz yoxdur.',
            ], 403);
        }

        if ($task->status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız tamamlanmış tapşırıqlar təsdiq üçün göndərilə bilər.',
            ], 422);
        }

        if (! $task->requires_approval) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırıq təsdiq tələb etmir.',
            ], 422);
        }

        if ($task->approval_status === 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq artıq təsdiq gözləyir.',
            ], 422);
        }

        try {
            $task->update([
                'approval_status' => 'pending',
                'submitted_for_approval_at' => now(),
            ]);

            // Log submission
            $this->auditService->logSubmittedForApproval($task);

            // Notify approver
            $this->taskNotificationService->notifyTaskStatusUpdate($task, 'completed', $user);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq təsdiq üçün göndərildi.',
                'data' => $task->fresh(),
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq təsdiq üçün göndərilərkən xəta baş verdi.');
        }
    }

    /**
     * Approve task
     */
    public function approve(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasPermissionTo('tasks.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq təsdiq etmə səlahiyyətiniz yoxdur.',
            ], 403);
        }

        if ($task->approval_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız gözləyən tapşırıqlar təsdiq edilə bilər.',
            ], 422);
        }

        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $task->update([
                'approval_status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_notes' => $request->notes,
            ]);

            // Log approval
            $this->auditService->logTaskApproved($task, $request->notes);

            // Notify creator and target users
            $this->taskNotificationService->notifyTaskApprovalDecision($task, 'approved', $user, $request->notes);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq təsdiqləndi.',
                'data' => $task->fresh(['creator', 'approver']),
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq təsdiqlənərkən xəta baş verdi.');
        }
    }

    /**
     * Reject task
     */
    public function reject(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasPermissionTo('tasks.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Tapşırıq rədd etmə səlahiyyətiniz yoxdur.',
            ], 403);
        }

        if ($task->approval_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız gözləyən tapşırıqlar rədd edilə bilər.',
            ], 422);
        }

        $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        try {
            $task->update([
                'approval_status' => 'rejected',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_notes' => $request->notes,
                'status' => 'pending', // Reset status for rework
            ]);

            // Log rejection
            $this->auditService->logTaskRejected($task, $request->notes);

            // Notify creator and target users about rejection
            $this->taskNotificationService->notifyTaskApprovalDecision($task, 'rejected', $user, $request->notes);

            return response()->json([
                'success' => true,
                'message' => 'Tapşırıq rədd edildi.',
                'data' => $task->fresh(['creator', 'approver']),
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq rədd edilərkən xəta baş verdi.');
        }
    }
}
