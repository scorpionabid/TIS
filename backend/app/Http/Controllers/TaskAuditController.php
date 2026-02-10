<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class TaskAuditController extends BaseController
{
    /**
     * Get task audit history
     */
    public function getAuditHistory(Task $task): JsonResponse
    {
        $user = Auth::user();

        if (! $this->permissionService->canUserAccessTask($task, $user)) {
            return $this->errorResponse('Bu tapşırığa giriş icazəniz yoxdur.', 403);
        }

        try {
            $history = $this->auditService->getTaskHistory($task);

            return $this->successResponse($history, 'Audit tarixçəsi uğurla alındı.');
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
            return $this->errorResponse('Bu tapşırığa giriş icazəniz yoxdur.', 403);
        }

        try {
            $history = $this->auditService->getApprovalHistory($task);

            return $this->successResponse($history, 'Təsdiq tarixçəsi uğurla alındı.');
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təsdiq tarixçəsi alınarkən xəta baş verdi.');
        }
    }
}
