<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class TaskAuditController extends BaseTaskController
{
    /**
     * Get task audit history
     */
    public function getAuditHistory(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserAccessTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığa giriş icazəniz yoxdur.',
            ], 403);
        }

        try {
            $history = $this->auditService->getTaskHistory($task);

            return response()->json([
                'success' => true,
                'history' => $history,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Audit tarixçəsi alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get approval history for a task
     */
    public function getApprovalHistory(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserAccessTask($task, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığa giriş icazəniz yoxdur.',
            ], 403);
        }

        try {
            $history = $this->auditService->getApprovalHistory($task);

            return response()->json([
                'success' => true,
                'history' => $history,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təsdiq tarixçəsi alınarkən xəta baş verdi.');
        }
    }
}
