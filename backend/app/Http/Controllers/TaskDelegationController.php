<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskDelegationController extends BaseTaskController
{
    /**
     * Get eligible users for task delegation
     */
    public function getEligibleDelegates(Request $request, Task $task): JsonResponse
    {
        $currentUser = Auth::user();

        // Check delegation permission using permission service
        if (! $this->permissionService->canUserDelegateTask($task, $currentUser)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı yönləndirmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        // Get current user's role and level
        $currentUserRole = $currentUser->roles->first();
        $currentUserLevel = $currentUserRole?->level ?? 999;

        // Get eligible users: SAME level (özü) OR LOWER authority (aşağı səviyyə)
        // Lower authority = HIGHER level number (level 3 can delegate to 3, 4, 5, 6, 7)
        $eligibleUsers = \App\Models\User::query()
            ->where('id', '!=', $currentUser->id)
            ->where(function ($query) use ($currentUser) {
                // Same institution
                $query->where('institution_id', $currentUser->institution_id);

                // OR subordinate institutions (if user has institutional hierarchy access)
                if ($currentUser->institution) {
                    $subordinateIds = \DB::table('institutions')
                        ->where('parent_id', $currentUser->institution_id)
                        ->pluck('id');

                    if ($subordinateIds->isNotEmpty()) {
                        $query->orWhereIn('institution_id', $subordinateIds);
                    }
                }
            })
            ->whereHas('roles', function ($query) use ($currentUserLevel) {
                // Same level OR lower authority (higher level number)
                // level >= currentUserLevel means same or below in hierarchy
                $query->where('level', '>=', $currentUserLevel);
            })
            ->with(['institution', 'roles'])
            ->get()
            ->map(function ($user) {
                // Generate display name: prefer full name, fallback to email
                $displayName = trim($user->name);
                if (empty($displayName)) {
                    $displayName = $user->email;
                }

                return [
                    'id' => $user->id,
                    'name' => $displayName,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->name,
                    'role_display' => $user->roles->first()?->display_name,
                    'role_level' => $user->roles->first()?->level,
                    'institution' => [
                        'id' => $user->institution?->id,
                        'name' => $user->institution?->name,
                    ],
                ];
            })
            ->sortBy('role_level')  // Sort by level (lower level first)
            ->values();

        return response()->json([
            'success' => true,
            'users' => $eligibleUsers,
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    /**
     * Delegate task to one or more users
     */
    public function delegate(Request $request, Task $task): JsonResponse
    {
        $request->validate([
            'new_assignee_ids' => 'required|array|min:1',
            'new_assignee_ids.*' => 'required|exists:users,id',
            'delegation_reason' => 'nullable|string|max:500',
        ]);

        $currentUser = Auth::user();

        // Check delegation permission using permission service
        if (! $this->permissionService->canUserDelegateTask($task, $currentUser)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu tapşırığı yönləndirmək səlahiyyətiniz yoxdur.',
            ], 403);
        }

        // Get current assignment
        $currentAssignment = $task->assignments()
            ->where('assigned_user_id', $currentUser->id)
            ->whereIn('assignment_status', ['pending', 'accepted', 'in_progress'])
            ->first();

        // Validate all new assignees' levels (must be same or lower authority)
        $currentUserLevel = $currentUser->roles->first()?->level ?? 999;
        $newAssignees = \App\Models\User::with('roles')->whereIn('id', $request->new_assignee_ids)->get();

        foreach ($newAssignees as $newAssignee) {
            $newAssigneeLevel = $newAssignee->roles->first()?->level ?? 999;
            if ($newAssigneeLevel < $currentUserLevel) {
                return response()->json([
                    'success' => false,
                    'message' => "Tapşırığı yalnız öz səviyyənizdə və ya aşağı səviyyəli istifadəçilərə yönləndirə bilərsiniz. ({$newAssignee->name})",
                ], 400);
            }
        }

        DB::beginTransaction();
        try {
            $delegations = [];
            $newAssignments = [];

            // For the first user, update the existing assignment
            $firstAssigneeId = $request->new_assignee_ids[0];

            // Create delegation history for first user
            $delegation = \App\Models\TaskDelegationHistory::create([
                'task_id' => $task->id,
                'assignment_id' => $currentAssignment->id,
                'delegated_from_user_id' => $currentUser->id,
                'delegated_to_user_id' => $firstAssigneeId,
                'delegated_by_user_id' => $currentUser->id,
                'delegation_reason' => $request->delegation_reason,
                'delegation_metadata' => [
                    'previous_status' => $currentAssignment->assignment_status,
                    'previous_progress' => $currentAssignment->progress ?? 0,
                    'is_multi_delegation' => count($request->new_assignee_ids) > 1,
                ],
            ]);
            $delegations[] = $delegation;

            // Update existing assignment to first user
            $currentAssignment->update([
                'assigned_user_id' => $firstAssigneeId,
                'assignment_status' => 'pending',
                'can_update' => true, // Enable update for delegated user
                'updated_by' => $currentUser->id,
            ]);

            // Create new assignment for original user (delegator) with cancelled/delegated status
            $delegatorAssignment = $task->assignments()->create([
                'assigned_user_id' => $currentUser->id,
                'institution_id' => $currentUser->institution_id ?? $currentAssignment->institution_id,
                'assigned_role' => $currentUser->roles->first()?->name,
                'assignment_status' => 'cancelled', // Delegator sees task as cancelled
                'progress' => $currentAssignment->progress,
                'can_update' => false, // Delegator cannot modify anymore
                'assigned_by' => $currentUser->id,
                'created_by' => $currentUser->id,
                'updated_by' => $currentUser->id,
            ]);

            // Log delegation for first user
            $this->auditService->logTaskDelegated(
                $task,
                $currentUser->id,
                $firstAssigneeId,
                $request->delegation_reason
            );

            // For remaining users, create new assignments
            for ($i = 1; $i < count($request->new_assignee_ids); $i++) {
                $assigneeId = $request->new_assignee_ids[$i];

                // Get assignee's institution_id
                $assignee = $newAssignees->firstWhere('id', $assigneeId);

                // Create new assignment
                $newAssignment = $task->assignments()->create([
                    'assigned_user_id' => $assigneeId,
                    'institution_id' => $assignee->institution_id,
                    'assigned_role' => $assignee->roles->first()?->name,
                    'assignment_status' => 'pending',
                    'assigned_by' => $currentUser->id,
                    'created_by' => $currentUser->id,
                    'updated_by' => $currentUser->id,
                ]);
                $newAssignments[] = $newAssignment;

                // Create delegation history for this user
                $delegation = \App\Models\TaskDelegationHistory::create([
                    'task_id' => $task->id,
                    'assignment_id' => $newAssignment->id,
                    'delegated_from_user_id' => $currentUser->id,
                    'delegated_to_user_id' => $assigneeId,
                    'delegated_by_user_id' => $currentUser->id,
                    'delegation_reason' => $request->delegation_reason,
                    'delegation_metadata' => [
                        'is_multi_delegation' => true,
                        'is_additional_assignment' => true,
                        'original_assignment_id' => $currentAssignment->id,
                    ],
                ]);
                $delegations[] = $delegation;

                // Log delegation
                $this->auditService->logTaskDelegated(
                    $task,
                    $currentUser->id,
                    $assigneeId,
                    $request->delegation_reason
                );
            }

            DB::commit();

            // Sync task status with assignments after delegation
            $this->syncTaskStatusWithAssignments($task);

            // Load relationships for all delegations
            foreach ($delegations as $delegation) {
                $delegation->load(['fromUser', 'toUser']);
            }

            return response()->json([
                'success' => true,
                'message' => count($request->new_assignee_ids) > 1
                    ? 'Tapşırıq ' . count($request->new_assignee_ids) . ' nəfərə uğurla yönləndirildi.'
                    : 'Tapşırıq uğurla yönləndirildi.',
                'data' => [
                    'delegations' => $delegations,
                    'delegated_count' => count($request->new_assignee_ids),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return $this->handleError($e, 'Tapşırıq yönləndirilərkən xəta baş verdi.');
        }
    }

    /**
     * Get delegation history for a task
     */
    public function getDelegationHistory(Task $task): JsonResponse
    {
        $history = $task->delegationHistory()
            ->with(['fromUser', 'toUser', 'delegatedBy'])
            ->orderBy('delegated_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'history' => $history,
        ]);
    }
}
