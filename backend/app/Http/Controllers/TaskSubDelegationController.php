<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskSubDelegation;
use App\Services\TaskSubDelegationService;
use App\Http\Requests\CreateSubDelegationsRequest;
use App\Http\Requests\UpdateSubDelegationStatusRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskSubDelegationController extends Controller
{
    public function __construct(
        private TaskSubDelegationService $taskSubDelegationService
    ) {
        $this->middleware('auth:sanctum');
    }

    /**
     * GET /tasks/{task}/sub-delegations
     */
    public function index(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $subDelegations = $task->subDelegations()
            ->with(['delegatedToUser', 'delegatedByUser', 'delegatedToInstitution', 'parentAssignment.user'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $subDelegations,
        ]);
    }

    /**
     * POST /tasks/{task}/sub-delegations
     * Body: { delegations: [{user_id, deadline?, notes?}, ...] }
     */
    public function store(CreateSubDelegationsRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validated();
        
        // Find parent assignment (current user's assignment to this task)
        $parentAssignment = $task->assignments()
            ->where('assigned_user_id', Auth::id())
            ->firstOrFail();

        $delegations = $this->taskSubDelegationService->delegateToMultiple(
            $task,
            $parentAssignment,
            $validated['delegations'],
            Auth::user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Tapşırıq uğurla yönləndirildi',
            'data' => $delegations,
        ], 201);
    }

    /**
     * GET /tasks/{task}/sub-delegations/{delegation}
     */
    public function show(Task $task, TaskSubDelegation $delegation): JsonResponse
    {
        $this->authorize('view', $task);
        
        if ($delegation->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'Yönləndirmə tapşırığa aid deyil',
            ], 404);
        }

        $delegation->load([
            'delegatedToUser',
            'delegatedByUser',
            'delegatedToInstitution',
            'parentAssignment.user',
            'task'
        ]);

        return response()->json([
            'success' => true,
            'data' => $delegation,
        ]);
    }

    /**
     * POST /tasks/{task}/sub-delegations/{delegation}/status
     * Body: { status, progress?, completion_notes?, completion_data? }
     */
    public function updateStatus(
        UpdateSubDelegationStatusRequest $request,
        Task $task,
        TaskSubDelegation $delegation
    ): JsonResponse {
        $this->authorize('update', $task);

        if ($delegation->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'Yönləndirmə tapşırığa aid deyil',
            ], 404);
        }

        // Only delegated user or parent assignment user can update status
        if ($delegation->delegated_to_user_id !== Auth::id() && 
            $delegation->parentAssignment->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün səlahiyyətiniz yoxdur',
            ], 403);
        }

        $validated = $request->validated();
        
        $updatedDelegation = $this->taskSubDelegationService->updateStatus(
            $delegation,
            $validated['status'],
            $validated,
            Auth::user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Status uğurla yeniləndi',
            'data' => $updatedDelegation,
        ]);
    }

    /**
     * DELETE /tasks/{task}/sub-delegations/{delegation}
     */
    public function destroy(Task $task, TaskSubDelegation $delegation): JsonResponse
    {
        $this->authorize('update', $task);

        if ($delegation->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'Yönləndirmə tapşırığa aid deyil',
            ], 404);
        }

        // Only parent assignment user can delete delegation
        if ($delegation->parentAssignment->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün səlahiyyətiniz yoxdur',
            ], 403);
        }

        // Cannot delete if delegation is in progress or completed
        if (in_array($delegation->status, ['in_progress', 'completed'])) {
            return response()->json([
                'success' => false,
                'message' => 'İcrada olan və ya tamamlanmış yönləndirmələr silinə bilməz',
            ], 422);
        }

        $this->taskSubDelegationService->deleteDelegation($delegation, Auth::user());

        return response()->json([
            'success' => true,
            'message' => 'Yönləndirmə uğurla silindi',
        ]);
    }

    /**
     * GET /my-delegations
     */
    public function myDelegations(Request $request): JsonResponse
    {
        $subDelegations = TaskSubDelegation::where('delegated_to_user_id', Auth::id())
            ->with(['task', 'delegatedByUser', 'parentAssignment.user', 'delegatedToInstitution'])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->task_id, function ($query, $taskId) {
                $query->where('task_id', $taskId);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $subDelegations,
        ]);
    }

    /**
     * GET /my-delegations/stats
     */
    public function myDelegationStats(): JsonResponse
    {
        $stats = TaskSubDelegation::where('delegated_to_user_id', Auth::id())
            ->selectRaw('
                COUNT(*) as total,
                COUNT(CASE WHEN status = "pending" THEN 1 END) as pending,
                COUNT(CASE WHEN status = "accepted" THEN 1 END) as accepted,
                COUNT(CASE WHEN status = "in_progress" THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = "completed" THEN 1 END) as completed,
                COUNT(CASE WHEN status = "cancelled" THEN 1 END) as cancelled,
                AVG(progress) as average_progress
            ')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
