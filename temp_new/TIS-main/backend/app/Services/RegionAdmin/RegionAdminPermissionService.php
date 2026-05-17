<?php

namespace App\Services\RegionAdmin;

use App\Models\User;
use App\Services\PermissionValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class RegionAdminPermissionService
{
    private ?array $normalizedModules = null;

    public function __construct(
        private readonly PermissionValidationService $permissionValidationService,
        private readonly array $config = []
    ) {}

    private function getConfig(): array
    {
        return $this->config ?: config('assignable_permissions', []);
    }

    private function getNormalizedModules(): array
    {
        if ($this->normalizedModules !== null) {
            return $this->normalizedModules;
        }

        $modules = [];

        foreach ($this->getConfig()['modules'] ?? [] as $key => $rawModule) {
            $moduleKey = $rawModule['key'] ?? $key;
            $normalizedPermissions = array_map(function ($permission) {
                return [
                    'key' => $permission['key'],
                    'label' => $permission['label'] ?? $permission['key'],
                    'description' => $permission['description'] ?? null,
                ];
            }, $rawModule['permissions'] ?? []);

            $module = [
                'key' => $moduleKey,
                'label' => $rawModule['label'] ?? $moduleKey,
                'description' => $rawModule['description'] ?? null,
                'roles' => $rawModule['roles'] ?? [],
                'permissions' => $normalizedPermissions,
                'defaults' => $rawModule['defaults'] ?? [],
                'required' => $rawModule['required'] ?? [],
                'dependencies' => $rawModule['dependencies'] ?? [],
            ];

            $modules[$moduleKey] = $module;
        }

        $this->normalizedModules = $modules;

        return $modules;
    }

    public function getMetadataFor(User $user): array
    {
        $modulesConfig = $this->getNormalizedModules();
        $granted = $this->getUserPermissionNames($user);

        $modules = collect($modulesConfig)
            ->map(function (array $module) use ($granted) {
                $permissions = array_map(function (array $permission) use ($granted) {
                    $key = $permission['key'];

                    return [
                        'key' => $key,
                        'label' => $permission['label'] ?? $key,
                        'description' => $permission['description'] ?? null,
                        'shareable' => in_array($key, $granted, true),
                    ];
                }, $module['permissions'] ?? []);

                if (empty($permissions)) {
                    return;
                }

                $module['permissions'] = $permissions;

                return $module;
            })
            ->filter()
            ->values()
            ->all();

        $templates = collect($this->getConfig()['templates'] ?? [])
            ->map(function (array $template, $key) use ($granted) {
                $originalPermissions = $template['permissions'] ?? [];
                $available = array_values(array_filter(
                    $originalPermissions,
                    fn ($permission) => in_array($permission, $granted, true)
                ));

                $template['permissions'] = $available;
                $template['key'] = $template['key'] ?? $key;
                $template['total_permissions'] = count($originalPermissions);
                $template['available_permissions'] = count($available);
                $template['coverage_percent'] = $template['total_permissions'] > 0
                    ? intval(floor(($template['available_permissions'] / $template['total_permissions']) * 100))
                    : 0;

                return $template;
            })
            ->values()
            ->all();

        return [
            'modules' => $modules,
            'templates' => $templates,
            'granted_permissions' => $granted,
            'role_matrix' => $this->buildRolePermissionMatrix(),
        ];
    }

    public function extractRequestedPermissions(Request $request): array
    {
        $payload = $request->all();
        $permissions = $payload['assignable_permissions'] ?? [];

        if (is_string($permissions)) {
            $permissions = array_filter(array_map('trim', explode(',', $permissions)));
        }

        if (! is_array($permissions)) {
            return [];
        }

        return array_values(array_map('strval', array_unique($permissions)));
    }

    public function validateForRole(array $permissions, string $roleName, User $regionAdmin): array
    {
        $allowedForRole = $this->collectAllowedPermissionsForRole($roleName);
        $adminPermissions = $this->getUserPermissionNames($regionAdmin);

        // 🔧 FIX: Auto-add required permissions for this role
        $requiredPermissions = $this->getRequiredPermissionsForRole($roleName);
        $permissions = array_unique(array_merge($permissions, $requiredPermissions));

        foreach ($permissions as $permission) {
            if (! $allowedForRole->contains($permission)) {
                throw ValidationException::withMessages([
                    'assignable_permissions' => [__('Bu səlahiyyəti bu rol üçün təyin etmək olmaz: :permission', ['permission' => $permission])],
                ]);
            }

            if (! in_array($permission, $adminPermissions, true)) {
                throw ValidationException::withMessages([
                    'assignable_permissions' => [__('Sizin səlahiyyətiniz yoxdur: :permission', ['permission' => $permission])],
                ]);
            }
        }

        // ✅ AUTO-ENRICH: Automatically add missing dependencies instead of throwing error
        $permissions = $this->permissionValidationService->validateAndEnrich($permissions);

        // No need to assert required permissions anymore since we auto-added them
        // $this->assertRequiredPermissionsPresent($permissions, $roleName);

        return $permissions;
    }

    public function getDefaultPermissionsForRole(string $roleName): array
    {
        $modules = $this->getNormalizedModules();

        return collect($modules)
            ->filter(function (array $module) use ($roleName) {
                $roles = $module['roles'] ?? [];

                return empty($roles) || in_array($roleName, $roles, true);
            })
            ->flatMap(function (array $module) {
                return $module['defaults'] ?? [];
            })
            ->unique()
            ->values()
            ->all();
    }

    public function getRequiredPermissionsForRole(string $roleName): array
    {
        $modules = $this->getNormalizedModules();

        return collect($modules)
            ->filter(function (array $module) use ($roleName) {
                $roles = $module['roles'] ?? [];

                return empty($roles) || in_array($roleName, $roles, true);
            })
            ->flatMap(function (array $module) {
                return $module['required'] ?? [];
            })
            ->unique()
            ->values()
            ->all();
    }

    public function syncDirectPermissions(User $user, array $permissions): void
    {
        // Compute before/after diffs for audit
        $old = $this->getDirectPermissions($user);
        $added = array_values(array_filter(array_unique(array_diff($permissions, $old))));
        $removed = array_values(array_filter(array_unique(array_diff($old, $permissions))));

        Log::info('RegionAdmin sync direct permissions', [
            'admin_id' => auth()->id(),
            'target_user' => $user->id,
            'permission_count' => count($permissions),
            'added_count' => count($added),
            'removed_count' => count($removed),
            'added' => $added,
            'removed' => $removed,
        ]);

        // Perform the actual sync
        $user->syncPermissions($permissions);

        // 🔧 CRITICAL FIX: Force clear Spatie permission cache for this user
        // Spatie should auto-clear cache, but explicitly force it to ensure fresh data
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // Also refresh the user model to clear any Laravel model cache
        $user->refresh();

        Log::info('🔄 Spatie permission cache forcibly cleared after sync', [
            'user_id' => $user->id,
            'synced_permissions_count' => count($permissions),
        ]);

        // Record an audit log entry for the permission change
        try {
            \App\Models\AuditLog::createAudit([
                'user_id' => auth()->id(),
                'event' => 'admin_permission_change',
                'auditable_type' => 'user',
                'auditable_id' => $user->id,
                'old_values' => ['direct_permissions' => $old],
                'new_values' => ['direct_permissions' => $permissions],
                'tags' => ['permissions', 'regionadmin'],
                'institution_id' => $user->institution_id,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to write permission audit log', [
                'error' => $e->getMessage(),
                'admin_id' => auth()->id(),
                'target_user' => $user->id,
            ]);
        }
    }

    public function getDirectPermissions(User $user): array
    {
        return $user->getDirectPermissions()
            ->pluck('name')
            ->values()
            ->all();
    }

    /**
     * Get all permissions for a user (both direct and via roles)
     * Used for displaying user's effective permissions in edit modal
     */
    public function getAllUserPermissions(User $user): array
    {
        return $user->getAllPermissions()
            ->pluck('name')
            ->values()
            ->all();
    }

    /**
     * Get detailed permission breakdown for user
     * Returns separated direct and role-based permissions for better UI control
     *
     * @return array{direct: array, via_roles: array, all: array, role_metadata: array}
     */
    public function getUserPermissionsDetailed(User $user): array
    {
        return \App\DTOs\UserPermissionsDTO::fromUser($user)->toArray();
    }

    /**
     * Dry-run validation for permission changes. Does not persist changes.
     * Returns added/removed and lists of issues (missing_dependencies, missing_required, not_allowed, admin_missing_permissions)
     *
     * @param User|null   $targetUser          The user being edited (null for new user)
     * @param array       $proposedPermissions The desired direct permissions
     * @param string|null $roleName            The target role name (if known)
     * @param User        $admin               The admin performing the change (for checking granted permissions)
     */
    public function dryRunValidate(?User $targetUser, array $proposedPermissions, ?string $roleName, User $admin): array
    {
        $current = [];
        if ($targetUser) {
            $current = $this->getDirectPermissions($targetUser);
        }

        $added = array_values(array_filter(array_unique(array_diff($proposedPermissions, $current))));
        $removed = array_values(array_filter(array_unique(array_diff($current, $proposedPermissions))));

        // Missing dependencies (using permissionValidationService)
        $missingDependencies = $this->permissionValidationService->getMissingDependencies($proposedPermissions);

        // Missing required permissions for the role (do not throw)
        $modules = $this->getNormalizedModules();
        $missingRequired = [];
        if ($roleName) {
            foreach ($modules as $module) {
                $roles = $module['roles'] ?? [];
                if (! empty($roles) && ! in_array($roleName, $roles, true)) {
                    continue;
                }
                foreach ($module['required'] ?? [] as $requiredPermission) {
                    if (! in_array($requiredPermission, $proposedPermissions, true)) {
                        $missingRequired[] = $requiredPermission;
                    }
                }
            }
            $missingRequired = array_values(array_unique($missingRequired));
        }

        // Permissions not allowed for role
        $notAllowed = [];
        if ($roleName) {
            $allowed = $this->collectAllowedPermissionsForRole($roleName)->values()->all();
            foreach ($proposedPermissions as $p) {
                if (! in_array($p, $allowed, true)) {
                    $notAllowed[] = $p;
                }
            }
        }

        // Admin missing permissions (admin must have granted permissions to assign)
        $adminGranted = $this->getUserPermissionNames($admin);
        $adminMissing = [];
        foreach ($proposedPermissions as $p) {
            if (! in_array($p, $adminGranted, true)) {
                $adminMissing[] = $p;
            }
        }

        return [
            'added' => $added,
            'removed' => $removed,
            'missing_dependencies' => $missingDependencies,
            'missing_required' => $missingRequired,
            'not_allowed' => array_values(array_unique($notAllowed)),
            'admin_missing_permissions' => array_values(array_unique($adminMissing)),
        ];
    }

    private function collectAllowedPermissionsForRole(string $roleName): Collection
    {
        $modules = $this->getNormalizedModules();

        return collect($modules)
            ->filter(function (array $module) use ($roleName) {
                $roles = $module['roles'] ?? [];

                return empty($roles) || in_array($roleName, $roles, true);
            })
            ->flatMap(function (array $module) {
                return collect($module['permissions'] ?? [])
                    ->pluck('key');
            })
            ->unique()
            ->values();
    }

    private function assertDependenciesSatisfied(array $permissions): void
    {
        $missing = $this->permissionValidationService->getMissingDependencies($permissions);

        if (empty($missing)) {
            return;
        }

        $messages = [];
        foreach ($missing as $permission => $deps) {
            $messages[] = __('":permission" seçimi üçün :dependencies lazımdır.', [
                'permission' => $permission,
                'dependencies' => implode(', ', $deps),
            ]);
        }

        throw ValidationException::withMessages([
            'assignable_permissions' => $messages,
        ]);
    }

    private function assertRequiredPermissionsPresent(array $permissions, string $roleName): void
    {
        $modules = $this->getNormalizedModules();
        $missingRequired = [];

        foreach ($modules as $module) {
            $roles = $module['roles'] ?? [];
            if (! empty($roles) && ! in_array($roleName, $roles, true)) {
                continue;
            }

            foreach ($module['required'] ?? [] as $requiredPermission) {
                if (! in_array($requiredPermission, $permissions, true)) {
                    $missingRequired[] = $requiredPermission;
                }
            }
        }

        if (! empty($missingRequired)) {
            throw ValidationException::withMessages([
                'assignable_permissions' => [
                    __('Aşağıdakı səlahiyyətlər məcburidir: :permissions', [
                        'permissions' => implode(', ', $missingRequired),
                    ]),
                ],
            ]);
        }
    }

    private function getUserPermissionNames(User $user): array
    {
        if (! $user->relationLoaded('permissions')) {
            $user->load('permissions');
        }

        return $user->getAllPermissions()
            ->pluck('name')
            ->values()
            ->all();
    }

    /**
     * Build holistic role-permission matrix for front-end UX.
     */
    private function buildRolePermissionMatrix(): array
    {
        $modules = $this->getNormalizedModules();
        $roles = $this->getAssignableRoleNames($modules);

        $matrix = [];
        foreach ($roles as $role) {
            $matrix[$role] = [
                'allowed' => [],
                'defaults' => [],
                'required' => [],
            ];
        }

        foreach ($modules as $module) {
            $permissionKeys = array_column($module['permissions'] ?? [], 'key');
            if (empty($permissionKeys)) {
                continue;
            }

            $targetRoles = $module['roles'] ?? [];
            if (empty($targetRoles)) {
                $targetRoles = $roles;
            } else {
                $targetRoles = array_map('strtolower', $targetRoles);
            }

            foreach ($targetRoles as $role) {
                if (! isset($matrix[$role])) {
                    continue;
                }

                $matrix[$role]['allowed'] = array_values(array_unique(array_merge(
                    $matrix[$role]['allowed'],
                    $permissionKeys
                )));

                $defaults = $module['defaults'] ?? [];
                if (! empty($defaults)) {
                    $matrix[$role]['defaults'] = array_values(array_unique(array_merge(
                        $matrix[$role]['defaults'],
                        $defaults
                    )));
                }

                $required = $module['required'] ?? [];
                if (! empty($required)) {
                    $matrix[$role]['required'] = array_values(array_unique(array_merge(
                        $matrix[$role]['required'],
                        $required
                    )));
                }
            }
        }

        return $matrix;
    }

    private function getAssignableRoleNames(array $modules): array
    {
        $roles = collect($modules)
            ->pluck('roles')
            ->flatten()
            ->filter()
            ->map(fn ($role) => strtolower($role))
            ->unique()
            ->values()
            ->all();

        // Modules with empty role arrays apply to every assignable role we allow.
        $defaultRoles = ['regionoperator', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim'];

        return array_values(array_unique(array_merge($roles, $defaultRoles)));
    }
}
