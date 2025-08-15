<?php

namespace App\Http\Controllers;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\RoleHierarchyService;
use Illuminate\Support\Facades\Auth;

class RoleController extends Controller
{
    private RoleHierarchyService $hierarchyService;

    public function __construct(RoleHierarchyService $hierarchyService)
    {
        $this->hierarchyService = $hierarchyService;
    }

    /**
     * Get roles list with hierarchy filtering
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $guard = $request->get('guard', 'api');
        
        // Get roles user can manage based on hierarchy
        if ($user && !$user->hasRole('superadmin')) {
            $roles = $this->hierarchyService->getUserManageableRoles($user)
                ->where('guard_name', $guard)
                ->load('permissions');
        } else {
            $roles = Role::with('permissions')->where('guard_name', $guard)->get();
        }

        return response()->json([
            'roles' => $roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name ?? $role->name,
                    'description' => $role->description,
                    'level' => $role->level ?? 1,
                    'role_category' => $role->role_category ?? 'custom',
                    'guard_name' => $role->guard_name,
                    'permissions' => $role->permissions->pluck('name'),
                    'can_create_roles_below_level' => $role->can_create_roles_below_level,
                    'max_institutions_scope' => $role->max_institutions_scope,
                    'created_at' => $role->created_at,
                    'updated_at' => $role->updated_at
                ];
            }),
            'hierarchy_info' => $user ? $this->hierarchyService->getHierarchyVisualization($user) : []
        ]);
    }

    /**
     * Get specific role
     */
    public function show(Role $role): JsonResponse
    {
        $role->load('permissions');

        return response()->json([
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name ?? $role->name,
                'description' => $role->description,
                'level' => $role->level ?? 1,
                'guard_name' => $role->guard_name,
                'permissions' => $role->permissions->pluck('name'),
                'created_at' => $role->created_at,
                'updated_at' => $role->updated_at
            ]
        ]);
    }

    /**
     * Create new role with hierarchy validation
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'İcazəsiz giriş'], 401);
        }

        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'display_name' => 'nullable|string',
            'description' => 'nullable|string',
            'level' => 'required|integer|min:1|max:10',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name'
        ]);

        // Validate role creation with hierarchy service
        $roleData = $request->only(['name', 'display_name', 'description', 'level', 'permissions']);
        $validationErrors = $this->hierarchyService->validateRoleCreation($user, $roleData);
        
        if (!empty($validationErrors)) {
            return response()->json([
                'message' => 'Rol yaradılması uğursuz',
                'errors' => $validationErrors
            ], 422);
        }

        try {
            // Create role using hierarchy service
            $role = $this->hierarchyService->createRole($user, $roleData);
            
            return response()->json([
                'message' => 'Rol uğurla yaradıldı',
                'role' => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name ?? $role->name,
                    'description' => $role->description,
                    'level' => $role->level,
                    'role_category' => $role->role_category,
                    'permissions' => $role->permissions->pluck('name'),
                    'can_create_roles_below_level' => $role->can_create_roles_below_level,
                    'max_institutions_scope' => $role->max_institutions_scope
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Rol yaradılması zamanı xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update role with hierarchy validation
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'İcazəsiz giriş'], 401);
        }

        // Check if user can manage this role
        $manageableRoles = $this->hierarchyService->getUserManageableRoles($user);
        if (!$manageableRoles->contains('id', $role->id)) {
            return response()->json([
                'message' => 'Bu rolu dəyişmək üçün icazəniz yoxdur'
            ], 403);
        }

        // System roles can only update display_name and description
        $allowedFields = ['display_name', 'description'];
        if ($role->role_category === 'custom') {
            $allowedFields[] = 'level';
        }

        $rules = [
            'display_name' => 'nullable|string',
            'description' => 'nullable|string'
        ];
        
        if (in_array('level', $allowedFields)) {
            $rules['level'] = 'nullable|integer|min:1|max:10';
        }
        
        if ($role->role_category === 'custom') {
            $rules['permissions'] = 'nullable|array';
            $rules['permissions.*'] = 'string|exists:permissions,name';
        }

        $request->validate($rules);

        // Validate level change if applicable
        if ($request->has('level') && $role->role_category === 'custom') {
            $newLevel = $request->level;
            if (!$this->hierarchyService->canUserCreateRole($user, $newLevel)) {
                return response()->json([
                    'message' => 'Bu səviyyədə rol yaratmaq üçün icazəniz yoxdur'
                ], 422);
            }
        }

        // Validate permissions if changing
        if ($request->has('permissions') && $role->role_category === 'custom') {
            $targetLevel = $request->level ?? $role->level;
            $allowedPermissions = $this->hierarchyService->getPermissionScopeForLevel($targetLevel);
            $requestedPermissions = $request->permissions ?? [];
            $invalidPermissions = array_diff($requestedPermissions, $allowedPermissions);
            
            if (!empty($invalidPermissions)) {
                return response()->json([
                    'message' => 'Bu səviyyə üçün uyğun olmayan icazələr: ' . implode(', ', $invalidPermissions)
                ], 422);
            }
        }

        $role->update($request->only($allowedFields));

        if ($request->has('permissions') && $role->role_category === 'custom') {
            $role->syncPermissions($request->permissions);
        }

        return response()->json([
            'message' => 'Rol uğurla yeniləndi',
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name ?? $role->name,
                'description' => $role->description,
                'level' => $role->level,
                'role_category' => $role->role_category,
                'permissions' => $role->permissions->pluck('name')
            ]
        ]);
    }

    /**
     * Delete role with hierarchy validation
     */
    public function destroy(Role $role): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'İcazəsiz giriş'], 401);
        }

        // Check if user can delete this role using hierarchy service
        if (!$this->hierarchyService->canDeleteRole($user, $role)) {
            return response()->json([
                'message' => 'Bu rolu silmək üçün icazəniz yoxdur'
            ], 403);
        }

        // Check if role is assigned to users
        if ($role->users()->count() > 0) {
            return response()->json([
                'message' => 'İstifadəçilərə təyin edilmiş rolu silmək olmaz'
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Rol uğurla silindi'
        ]);
    }

    /**
     * Get permissions available to user based on hierarchy
     */
    public function permissions(Request $request): JsonResponse
    {
        $user = Auth::user();
        $guard = $request->get('guard', 'api');
        $level = $request->get('level'); // Optional level filter
        
        if ($user && !$user->hasRole('superadmin')) {
            // Get permissions based on user's authority level
            $userLevel = $this->hierarchyService->getUserMaxAuthorityLevel($user);
            $targetLevel = $level ? max($level, $userLevel) : $userLevel;
            
            if ($targetLevel) {
                $allowedPermissionNames = $this->hierarchyService->getPermissionScopeForLevel($targetLevel);
                $permissions = Permission::where('guard_name', $guard)
                    ->whereIn('name', $allowedPermissionNames)
                    ->get();
            } else {
                $permissions = collect();
            }
        } else {
            $permissions = Permission::where('guard_name', $guard)->get();
        }

        return response()->json([
            'permissions' => $permissions->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'guard_name' => $permission->guard_name,
                    'scope' => $this->getPermissionScope($permission->name),
                    'created_at' => $permission->created_at,
                    'updated_at' => $permission->updated_at
                ];
            }),
            'grouped_by_scope' => $this->groupPermissionsByScope($permissions)
        ]);
    }

    /**
     * Get role hierarchy visualization
     */
    public function hierarchy(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'İcazəsiz giriş'], 401);
        }

        $visualization = $this->hierarchyService->getHierarchyVisualization($user);
        $stats = $this->hierarchyService->getSystemStats();

        return response()->json([
            'hierarchy' => $visualization,
            'stats' => $stats,
            'user_info' => [
                'max_authority_level' => $this->hierarchyService->getUserMaxAuthorityLevel($user),
                'role_creation_limit' => $this->hierarchyService->getUserRoleCreationLimit($user)
            ]
        ]);
    }

    /**
     * Get available roles for a specific level
     */
    public function availableForLevel(Request $request, int $level): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || !$this->hierarchyService->canUserCreateRole($user, $level)) {
            return response()->json([
                'message' => 'Bu səviyyədə rol yaratmaq üçün icazəniz yoxdur'
            ], 403);
        }

        $allowedPermissions = $this->hierarchyService->getPermissionScopeForLevel($level);
        $permissions = Permission::whereIn('name', $allowedPermissions)->get();

        return response()->json([
            'level' => $level,
            'level_name' => \App\Services\RoleHierarchyService::HIERARCHY_LEVELS[$level] ?? 'Custom Level',
            'available_permissions' => $permissions->map(function ($permission) {
                return [
                    'name' => $permission->name,
                    'scope' => $this->getPermissionScope($permission->name)
                ];
            }),
            'scope_info' => \App\Services\RoleHierarchyService::PERMISSION_SCOPES[$level] ?? []
        ]);
    }

    /**
     * Determine permission scope based on name
     */
    private function getPermissionScope(string $permissionName): string
    {
        if (str_contains($permissionName, 'system')) return 'system';
        if (str_contains($permissionName, 'reports') || str_contains($permissionName, 'analytics')) return 'global';
        if (str_contains($permissionName, 'institutions')) return 'regional';
        if (str_contains($permissionName, 'users') && str_contains($permissionName, 'manage')) return 'sector';
        if (str_contains($permissionName, 'surveys')) return 'institution';
        return 'classroom';
    }

    /**
     * Group permissions by scope
     */
    private function groupPermissionsByScope($permissions): array
    {
        $grouped = [];
        
        foreach ($permissions as $permission) {
            $scope = $this->getPermissionScope($permission->name);
            if (!isset($grouped[$scope])) {
                $grouped[$scope] = [];
            }
            $grouped[$scope][] = $permission->name;
        }
        
        return $grouped;
    }
}