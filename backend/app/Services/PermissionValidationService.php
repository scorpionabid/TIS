<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;

/**
 * Permission Validation Service
 *
 * Validates permission assignments based on:
 * - Permission dependencies
 * - Role level compatibility (scope-based)
 * - Department access restrictions
 */
class PermissionValidationService
{
    protected array $dependencies;

    public function __construct()
    {
        $this->dependencies = config('permissions.dependencies', []);
    }

    /**
     * Ensure permission list contains all required dependencies.
     */
    public function validateAndEnrich(array $permissions): array
    {
        $enriched = $permissions;

        foreach ($permissions as $permission) {
            if (isset($this->dependencies[$permission])) {
                foreach ($this->dependencies[$permission] as $dependency) {
                    if (! in_array($dependency, $enriched, true)) {
                        $enriched[] = $dependency;
                    }
                }
            }
        }

        return array_values(array_unique($enriched));
    }

    /**
     * Return missing dependencies keyed by permission.
     */
    public function getMissingDependencies(array $permissions): array
    {
        $missing = [];

        foreach ($permissions as $permission) {
            if (! isset($this->dependencies[$permission])) {
                continue;
            }

            foreach ($this->dependencies[$permission] as $dependency) {
                if (! in_array($dependency, $permissions, true)) {
                    $missing[$permission][] = $dependency;
                }
            }
        }

        return $missing;
    }

    /**
     * Check if a role can have a specific permission based on scope and level.
     */
    public function canRoleHavePermission(Role $role, Permission $permission): bool
    {
        // Check scope compatibility using Permission model's isAllowedForLevel method
        return $permission->isAllowedForLevel($role->level);
    }

    /**
     * Validate permission assignment to a role.
     * Returns detailed validation result.
     */
    public function validatePermissionAssignment(Role $role, Permission $permission): array
    {
        $result = [
            'valid' => true,
            'errors' => [],
            'warnings' => [],
        ];

        // Scope validation
        if (!$permission->isAllowedForLevel($role->level)) {
            $result['valid'] = false;
            $result['errors'][] = sprintf(
                "Permission '%s' (scope: %s) cannot be assigned to role '%s' (level: %d). Maximum level for this scope is %d.",
                $permission->name,
                $permission->scope,
                $role->name,
                $role->level,
                $permission->getMaximumRoleLevel()
            );
        }

        // Check if permission is active
        if (!$permission->is_active) {
            $result['warnings'][] = sprintf(
                "Permission '%s' is currently inactive.",
                $permission->name
            );
        }

        // Department access validation (if applicable)
        if ($permission->department && $role->department_access) {
            $departmentAccess = is_array($role->department_access)
                ? $role->department_access
                : json_decode($role->department_access, true) ?? [];

            if (!in_array($permission->department, $departmentAccess)) {
                $result['valid'] = false;
                $result['errors'][] = sprintf(
                    "Role '%s' does not have access to department '%s' required by permission '%s'.",
                    $role->name,
                    $permission->department,
                    $permission->name
                );
            }
        }

        return $result;
    }

    /**
     * Validate multiple permission assignments to a role.
     * Returns summary of all validation results.
     */
    public function validatePermissionAssignments(Role $role, array $permissionIds): array
    {
        $results = [
            'valid' => true,
            'total_permissions' => count($permissionIds),
            'valid_permissions' => 0,
            'invalid_permissions' => 0,
            'permissions' => [],
            'summary_errors' => [],
            'summary_warnings' => [],
        ];

        foreach ($permissionIds as $permissionId) {
            $permission = Permission::find($permissionId);

            if (!$permission) {
                $results['invalid_permissions']++;
                $results['permissions'][] = [
                    'permission_id' => $permissionId,
                    'valid' => false,
                    'errors' => ["Permission with ID {$permissionId} not found."],
                ];
                continue;
            }

            $validation = $this->validatePermissionAssignment($role, $permission);

            $results['permissions'][] = array_merge([
                'permission_id' => $permission->id,
                'permission_name' => $permission->name,
            ], $validation);

            if ($validation['valid']) {
                $results['valid_permissions']++;
            } else {
                $results['invalid_permissions']++;
                $results['valid'] = false;
                $results['summary_errors'] = array_merge($results['summary_errors'], $validation['errors']);
            }

            if (!empty($validation['warnings'])) {
                $results['summary_warnings'] = array_merge($results['summary_warnings'], $validation['warnings']);
            }
        }

        return $results;
    }

    /**
     * Get assignable permissions for a role (filtered by scope).
     */
    public function getAssignablePermissions(Role $role): array
    {
        return Permission::where('is_active', true)
            ->get()
            ->filter(function ($permission) use ($role) {
                return $this->canRoleHavePermission($role, $permission);
            })
            ->values()
            ->toArray();
    }

    /**
     * Get scope compatibility matrix for all roles.
     */
    public function getScopeCompatibilityMatrix(): array
    {
        $roles = Role::where('is_active', true)->orderBy('level')->get();
        $scopes = ['global', 'system', 'regional', 'sector', 'institution', 'classroom'];

        $matrix = [];

        foreach ($roles as $role) {
            $matrix[$role->id] = [
                'role_name' => $role->name,
                'role_level' => $role->level,
                'compatible_scopes' => [],
                'incompatible_scopes' => [],
            ];

            foreach ($scopes as $scope) {
                // Create a temporary permission to test compatibility
                $tempPermission = new Permission(['scope' => $scope]);

                if ($tempPermission->isAllowedForLevel($role->level)) {
                    $matrix[$role->id]['compatible_scopes'][] = $scope;
                } else {
                    $matrix[$role->id]['incompatible_scopes'][] = $scope;
                }
            }
        }

        return $matrix;
    }

    /**
     * Check if permission assignment would create security risk.
     */
    public function checkSecurityRisk(Role $role, Permission $permission): array
    {
        $risks = [];

        // Check if permission is global/system scope and role is low-level
        if ($permission->isGlobalScope() && $role->level > 1) {
            $risks[] = [
                'severity' => 'critical',
                'message' => 'Global scope permissions should only be assigned to SuperAdmin (level 1)',
            ];
        }

        if ($permission->isSystemScope() && $role->level > 2) {
            $risks[] = [
                'severity' => 'high',
                'message' => 'System scope permissions should only be assigned to SuperAdmin and RegionAdmin (level 1-2)',
            ];
        }

        // Check if permission allows privilege escalation
        $escalationPermissions = ['roles.manage', 'permissions.manage', 'users.assign_roles'];
        if (in_array($permission->name, $escalationPermissions) && $role->level > 2) {
            $risks[] = [
                'severity' => 'high',
                'message' => 'This permission allows privilege escalation and should be restricted to high-level roles',
            ];
        }

        return $risks;
    }
}
