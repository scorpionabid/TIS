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
                $template['permissions'] = array_values(array_filter(
                    $template['permissions'],
                    fn ($permission) => in_array($permission, $granted, true)
                ));

                $template['key'] = $template['key'] ?? $key;

                return $template;
            })
            ->filter(fn ($template) => ! empty($template['permissions']))
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

        $this->assertDependenciesSatisfied($permissions);
        $this->assertRequiredPermissionsPresent($permissions, $roleName);

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

    public function syncDirectPermissions(User $user, array $permissions): void
    {
        Log::info('RegionAdmin sync direct permissions', [
            'admin_id' => auth()->id(),
            'target_user' => $user->id,
            'permission_count' => count($permissions),
        ]);

        $user->syncPermissions($permissions);
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
