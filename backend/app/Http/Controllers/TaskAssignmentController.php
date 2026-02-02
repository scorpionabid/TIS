<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskAssignmentController extends BaseTaskController
{
    /**
     * Get task assignments with filtering
     */
    public function getTaskAssignments(Request $request, int $taskId): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'assigned_to' => 'nullable|integer|exists:users,id',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
        ]);

        try {
            $result = $this->assignmentService->getTaskAssignments($taskId, $user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq təyinatları alınarkən xəta baş verdi.');
        }
    }

    /**
     * Update assignment status
     */
    public function updateAssignmentStatus(Request $request, int $assignmentId): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'status' => 'required|string|in:pending,in_progress,completed,cancelled',
            'progress' => 'nullable|integer|min:0|max:100',
            'completion_notes' => 'nullable|string',
            'completion_data' => 'nullable|array',
        ]);

        try {
            $assignment = $this->assignmentService->updateAssignmentStatus($assignmentId, $request->all(), $user);

            return response()->json([
                'success' => true,
                'message' => 'Təyinat statusu uğurla yeniləndi.',
                'data' => $assignment,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təyinat statusu yenilənərkən xəta baş verdi.');
        }
    }

    /**
     * Bulk update assignment statuses
     */
    public function bulkUpdateAssignments(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'assignment_ids' => 'required|array|min:1',
            'assignment_ids.*' => 'integer|exists:task_assignments,id',
            'status' => 'required|string|in:pending,in_progress,completed,cancelled',
            'progress' => 'nullable|integer|min:0|max:100',
        ]);

        try {
            $results = $this->assignmentService->bulkUpdateAssignments(
                $request->assignment_ids,
                $request->only(['status', 'progress']),
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Kütləvi yenilənmə tamamlandı.',
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Kütləvi yenilənmə zamanı xəta baş verdi.');
        }
    }
}
