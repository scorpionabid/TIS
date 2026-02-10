<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskPermissionController extends BaseController
{
    /**
     * Get targetable institutions for current user
     */
    public function getTargetableInstitutions(): JsonResponse
    {
        $user = Auth::user();

        try {
            $institutions = $this->permissionService->getTargetableInstitutions($user);

            return response()->json([
                'success' => true,
                'data' => $institutions,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Targetable institutions alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get allowed target roles for current user
     */
    public function getAllowedTargetRoles(): JsonResponse
    {
        $user = Auth::user();

        try {
            $roles = $this->permissionService->getAllowedTargetRoles($user);

            return response()->json([
                'success' => true,
                'data' => $roles,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə verilən rollar alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get task creation context
     */
    public function getTaskCreationContext(): JsonResponse
    {
        $user = Auth::user();

        try {
            $context = $this->permissionService->getTaskCreationContext($user);

            return response()->json([
                'success' => true,
                'data' => $context,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Tapşırıq yaradılma konteksti alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get assignable users for task creation based on permissions
     */
    public function getAssignableUsers(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'role' => 'nullable|string',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'search' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:200',
            'origin_scope' => 'nullable|string|in:region,sector',
        ]);

        try {
            $result = $this->permissionService->getAssignableUsers($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'meta' => $result['meta'],
                'links' => $result['links'],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Təyin edilə bilən istifadəçilər alınarkən xəta baş verdi.');
        }
    }

    /**
     * Get mentionable users for task comments
     */
    public function getMentionableUsers(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'task_id' => 'nullable|integer|exists:tasks,id',
            'search' => 'nullable|string|max:100',
        ]);

        try {
            $taskId = $request->task_id;
            $search = $request->search;

            $users = $this->permissionService->getMentionableUsers($user, $taskId, $search);

            return response()->json([
                'success' => true,
                'data' => $users,
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Mention istifadəçiləri alınarkən xəta baş verdi.');
        }
    }
}
