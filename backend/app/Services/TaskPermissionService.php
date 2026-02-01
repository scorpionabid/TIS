<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskAssignment;
use Illuminate\Database\Eloquent\Builder;

class TaskPermissionService extends BaseService
{
    /**
     * Check if user can access a specific task
     */
    public function canUserAccessTask(Task $task, $user): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // Creator can always access their tasks
        if ($task->created_by === $user->id) {
            return true;
        }

        // Check if task is assigned to user's institution or its children
        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($task->assigned_to_institution_id, $childIds, true) ||
                   $task->assigned_to_institution_id === $userInstitution->id ||
                   $this->taskTargetsInstitutions($task, $childIds, 'regionadmin');
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($task->assigned_to_institution_id, $childIds, true) ||
                   $task->assigned_to_institution_id === $userInstitution->id ||
                   $this->taskTargetsInstitutions($task, $childIds, 'sektoradmin');
        }

        if ($user->hasRole('schooladmin')) {
            return $task->assigned_to_institution_id === $userInstitution->id;
        }

        // Check if task is directly assigned to user
        $assignment = TaskAssignment::where('task_id', $task->id)
            ->where('assigned_user_id', $user->id)
            ->first();

        return $assignment !== null;
    }

    /**
     * Check if user can update a specific task
     */
    public function canUserUpdateTask(Task $task, $user): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Creator can update their tasks
        if ($task->created_by === $user->id) {
            return true;
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // Higher level admins can update tasks assigned to their institutions
        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($task->assigned_to_institution_id, $childIds, true) ||
                   $this->taskTargetsInstitutions($task, $childIds, 'regionadmin');
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($task->assigned_to_institution_id, $childIds, true) ||
                   $this->taskTargetsInstitutions($task, $childIds, 'sektoradmin');
        }

        return false;
    }

    /**
     * Check if user can delete a specific task
     */
    public function canUserDeleteTask(Task $task, $user): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Only creator or higher authorities can delete
        if ($task->created_by === $user->id) {
            return true;
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // Higher level admins can delete tasks assigned to their institutions
        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($task->assigned_to_institution_id, $childIds, true) ||
                   $this->taskTargetsInstitutions($task, $childIds, 'regionadmin');
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($task->assigned_to_institution_id, $childIds, true) ||
                   $this->taskTargetsInstitutions($task, $childIds, 'sektoradmin');
        }

        return false;
    }

    /**
     * Check if user can update a task assignment
     */
    public function canUserUpdateAssignment(TaskAssignment $assignment, $user): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // User can update their own assignments
        if ($assignment->assigned_user_id === $user->id) {
            return true;
        }

        $task = $assignment->task;

        // Task creator can update assignments
        if ($task->created_by === $user->id) {
            return true;
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // Institution admins can update assignments in their scope
        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($assignment->institution_id, $childIds);
        }

        // Region operators can update assignments in their scope (same as regionadmin)
        if ($user->hasRole('regionoperator') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($assignment->institution_id, $childIds);
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();

            return in_array($assignment->institution_id, $childIds);
        }

        if ($user->hasRole('schooladmin')) {
            return $assignment->institution_id === $userInstitution->id;
        }

        return false;
    }

    /**
     * Check if user can delegate a task
     * Rules:
     * 1. Superadmin can always delegate
     * 2. User must have an assignment for this task (pending or accepted status)
     * 3. Assignment must not have been delegated already (1-time delegation limit)
     * 4. User must be the direct assignee
     */
    public function canUserDelegateTask($task, $user): bool
    {
        // Superadmin can always delegate
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check if user has an assignment for this task
        $userAssignment = $task->assignments()
            ->where('assigned_user_id', $user->id)
            ->whereIn('assignment_status', ['pending', 'accepted'])
            ->first();

        if (! $userAssignment) {
            return false;  // No assignment = cannot delegate
        }

        // Check if this assignment has already been delegated (1-time limit)
        $existingDelegation = \App\Models\TaskDelegationHistory::where('assignment_id', $userAssignment->id)->exists();

        if ($existingDelegation) {
            return false;  // Already delegated once
        }

        return true;
    }

    /**
     * Apply task access control to query builder
     */
    public function applyTaskAccessControl(Builder $query, $user): Builder
    {
        if ($user->hasRole('superadmin')) {
            return $query; // SuperAdmin can see all tasks
        }

        $userInstitution = $user->institution;

        if (! $userInstitution) {
            // User without institution can only see tasks assigned directly to them
            return $query->whereHas('assignments', function ($q) use ($user) {
                $q->where('assigned_user_id', $user->id);
            });
        }

        $query->where(function ($q) use ($user, $userInstitution) {
            // Tasks created by user
            $q->where('created_by', $user->id);

            if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
                $childIds = $userInstitution->getAllChildrenIds();
                $q->orWhereIn('assigned_to_institution_id', $childIds);
                $this->appendTargetInstitutionFilterToQuery($q, $childIds);
            } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
                $childIds = $userInstitution->getAllChildrenIds();
                $q->orWhereIn('assigned_to_institution_id', $childIds);
                $this->appendTargetInstitutionFilterToQuery($q, $childIds);
            } elseif ($user->hasRole('schooladmin')) {
                $q->orWhere('assigned_to_institution_id', $userInstitution->id);
                $q->orWhereJsonContains('target_institutions', $userInstitution->id);
            }

            // Tasks directly assigned to user
            $q->orWhereHas('assignments', function ($subQ) use ($user) {
                $subQ->where('assigned_user_id', $user->id);
            });
        });

        return $query;
    }

    /**
     * Get user's institutional scope for task operations
     */
    public function getUserInstitutionScope($user, ?string $originScope = null): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return [];
        }

        $scope = [$userInstitution->id];

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $scope = array_unique(array_merge([$userInstitution->id], $userInstitution->getAllChildrenIds()));
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $scope = array_unique(array_merge([$userInstitution->id], $userInstitution->getAllChildrenIds()));
        } elseif ($user->hasRole('schooladmin')) {
            $scope = [$userInstitution->id];
        }

        if ($originScope === 'region') {
            return $this->filterInstitutionIdsByLevels($scope, [2, 3]);
        }

        if ($originScope === 'sector') {
            return $this->filterInstitutionIdsByLevels($scope, [3, 4]);
        }

        return $scope;
    }

    public function filterRolesByOriginScope(array $roles, string $originScope): array
    {
        $scopeRoleMap = [
            'region' => ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'sektoroperator'],
            'sector' => ['superadmin', 'sektoradmin', 'sektoroperator', 'schooladmin'],
        ];

        $allowed = $scopeRoleMap[$originScope] ?? $roles;

        $filtered = array_values(array_intersect($roles, $allowed));

        return empty($filtered) ? $roles : $filtered;
    }

    public function buildInstitutionHierarchyMap(array $institutionIds): array
    {
        if (empty($institutionIds)) {
            return [];
        }

        $collected = collect();
        $pendingIds = array_unique($institutionIds);
        $visited = [];

        while (! empty($pendingIds)) {
            $chunkIds = array_diff($pendingIds, $visited);
            if (empty($chunkIds)) {
                break;
            }

            $institutions = Institution::whereIn('id', $chunkIds)
                ->get(['id', 'name', 'level', 'parent_id']);

            $collected = $collected->merge($institutions);
            $visited = array_unique(array_merge($visited, $chunkIds));

            $parents = $institutions->pluck('parent_id')
                ->filter()
                ->diff($visited)
                ->values()
                ->all();

            $pendingIds = $parents;
        }

        $indexed = $collected->keyBy('id');

        $result = [];

        foreach ($institutionIds as $institutionId) {
            if (! $indexed->has($institutionId)) {
                continue;
            }

            $path = [];
            $currentId = $institutionId;
            $depth = 0;

            while ($currentId && $indexed->has($currentId)) {
                $institution = $indexed->get($currentId);
                $path[] = [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'level' => $institution->level,
                ];
                $currentId = $institution->parent_id;
                $depth++;

                if ($depth > 5) {
                    break;
                }
            }

            $result[$institutionId] = [
                'depth' => max(0, $depth - 1),
                'path' => array_reverse($path),
            ];
        }

        return $result;
    }

    private function filterInstitutionIdsByLevels(array $institutionIds, array $levels): array
    {
        $uniqueIds = array_unique($institutionIds);

        return Institution::whereIn('id', $uniqueIds)
            ->whereIn('level', $levels)
            ->pluck('id')
            ->toArray();
    }

    /**
     * Get institutions user can target for task assignment
     */
    public function getTargetableInstitutions($user): array
    {
        if ($user->hasRole('superadmin')) {
            return Institution::where('is_active', true)
                ->orderBy('level')
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'level', 'parent_id'])
                ->toArray();
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return [];
        }

        $targetableIds = [];

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $targetableIds = $userInstitution->getAllChildrenIds();
        } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $targetableIds = $userInstitution->getAllChildrenIds();
        } elseif ($user->hasRole('schooladmin')) {
            $targetableIds = [$userInstitution->id];
        }

        if (empty($targetableIds)) {
            return [];
        }

        return Institution::whereIn('id', $targetableIds)
            ->where('is_active', true)
            ->orderBy('level')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'level', 'parent_id'])
            ->toArray();
    }

    /**
     * Get roles user can assign tasks to
     */
    public function getAllowedTargetRoles($user): array
    {
        if ($user->hasRole('superadmin')) {
            return [
                'regionadmin',
                'regionoperator',
                'sektoradmin',
                'sektoroperator',
                'schooladmin',
            ];
        }

        if ($user->hasRole('regionadmin')) {
            return [
                'regionadmin',
                'regionoperator',
                'sektoradmin',
                'sektoroperator',
                'schooladmin',
            ];
        }

        if ($user->hasRole('regionoperator')) {
            return [
                'regionoperator',
                'sektoradmin',
                'sektoroperator',
                'schooladmin',
            ];
        }

        if ($user->hasRole('sektoradmin')) {
            return [
                'sektoradmin',
                'sektoroperator',
                'schooladmin',
            ];
        }

        if ($user->hasRole('schooladmin')) {
            return ['schooladmin'];
        }

        return ['schooladmin'];
    }

    /**
     * Check if user can create hierarchical tasks
     */
    public function canCreateHierarchicalTask($user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin']);
    }

    /**
     * Check if user can assign tasks to specific role
     */
    public function canAssignToRole($user, string $targetRole): bool
    {
        $allowedRoles = $this->getAllowedTargetRoles($user);

        return in_array($targetRole, $allowedRoles);
    }

    /**
     * Check if user can assign tasks to specific institution
     */
    public function canAssignToInstitution($user, int $institutionId): bool
    {
        $targetableIds = $this->getUserInstitutionScope($user);

        return in_array($institutionId, $targetableIds);
    }

    /**
     * Get task creation permissions context
     */
    public function getTaskCreationContext($user): array
    {
        return [
            'can_create_basic_task' => true,
            'can_create_hierarchical_task' => $this->canCreateHierarchicalTask($user),
            'targetable_institutions' => $this->getTargetableInstitutions($user),
            'allowed_target_roles' => $this->getAllowedTargetRoles($user),
            'institution_scope' => $this->getUserInstitutionScope($user),
            'user_role' => $user->roles->pluck('name')->toArray(),
            'user_institution' => $user->institution ? [
                'id' => $user->institution->id,
                'name' => $user->institution->name,
                'level' => $user->institution->level,
                'type' => $user->institution->type,
            ] : null,
        ];
    }

    /**
     * Validate task assignment permissions
     */
    public function validateAssignmentPermissions($user, array $assignmentData): array
    {
        $errors = [];

        // Check institution access
        if (isset($assignmentData['institution_id'])) {
            if (! $this->canAssignToInstitution($user, $assignmentData['institution_id'])) {
                $errors[] = 'Bu müəssisəyə tapşırıq təyin etmək icazəniz yoxdur';
            }
        }

        // Check role assignment
        if (isset($assignmentData['target_role'])) {
            if (! $this->canAssignToRole($user, $assignmentData['target_role'])) {
                $errors[] = 'Bu rola tapşırıq təyin etmək icazəniz yoxdur';
            }
        }

        // Check hierarchical task creation
        if (isset($assignmentData['is_hierarchical']) && $assignmentData['is_hierarchical']) {
            if (! $this->canCreateHierarchicalTask($user)) {
                $errors[] = 'Ierarxik tapşırıq yaratmaq icazəniz yoxdur';
            }
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get assignment access control query
     */
    public function applyAssignmentAccessControl(Builder $query, $user): Builder
    {
        if ($user->hasRole('superadmin')) {
            return $query;
        }

        $userInstitution = $user->institution;

        if (! $userInstitution) {
            return $query->where('assigned_user_id', $user->id);
        }

        $query->where(function ($q) use ($user, $userInstitution) {
            // Assignments to the user
            $q->where('assigned_user_id', $user->id);

            // Assignments in user's institutional scope
            if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
                $childIds = $userInstitution->getAllChildrenIds();
                $q->orWhereIn('institution_id', $childIds);
            } elseif ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
                $childIds = $userInstitution->getAllChildrenIds();
                $q->orWhereIn('institution_id', $childIds);
            } elseif ($user->hasRole('schooladmin')) {
                $q->orWhere('institution_id', $userInstitution->id);
            }

            // Tasks created by user
            $q->orWhereHas('task', function ($taskQuery) use ($user) {
                $taskQuery->where('created_by', $user->id);
            });
        });

        return $query;
    }

    /**
     * Check bulk operation permissions
     */
    public function canPerformBulkOperations($user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin']);
    }

    /**
     * Get permission summary for user
     */
    public function getPermissionSummary($user): array
    {
        return [
            'can_create_tasks' => true,
            'can_create_hierarchical_tasks' => $this->canCreateHierarchicalTask($user),
            'can_perform_bulk_operations' => $this->canPerformBulkOperations($user),
            'institutional_scope_count' => count($this->getUserInstitutionScope($user)),
            'targetable_institutions_count' => count($this->getTargetableInstitutions($user)),
            'allowed_target_roles' => $this->getAllowedTargetRoles($user),
            'access_level' => $this->determineAccessLevel($user),
        ];
    }

    /**
     * Check if task targets any of the provided institutions
     */
    private function taskTargetsInstitutions(Task $task, array $institutionIds, string $roleName): bool
    {
        if (empty($institutionIds)) {
            return false;
        }

        if ($roleName === 'regionadmin' && $task->target_scope === 'regional') {
            return true;
        }

        if ($roleName === 'sektoradmin' && in_array($task->target_scope, ['sector', 'sectoral'], true)) {
            return true;
        }

        $targets = $task->target_institutions;

        if (! is_array($targets) || empty($targets)) {
            return false;
        }

        $normalizedTargets = array_map('intval', $targets);
        $normalizedInstitutions = array_map('intval', $institutionIds);

        return count(array_intersect($normalizedTargets, $normalizedInstitutions)) > 0;
    }

    /**
     * Append target institution JSON conditions to query
     */
    private function appendTargetInstitutionFilterToQuery(Builder $query, array $institutionIds): void
    {
        $ids = array_values(array_unique(array_map('intval', array_filter($institutionIds))));

        if (empty($ids)) {
            return;
        }

        $firstId = array_shift($ids);

        $query->orWhere(function ($targetQuery) use ($firstId, $ids) {
            $targetQuery->whereJsonContains('target_institutions', $firstId);

            foreach ($ids as $childId) {
                $targetQuery->orWhereJsonContains('target_institutions', $childId);
            }
        });
    }

    /**
     * Determine user's access level
     */
    private function determineAccessLevel($user): string
    {
        if ($user->hasRole('superadmin')) {
            return 'global';
        }

        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return 'personal';
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            return 'regional';
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            return 'sectoral';
        }

        if ($user->hasRole('schooladmin')) {
            return 'institutional';
        }

        return 'personal';
    }
}
