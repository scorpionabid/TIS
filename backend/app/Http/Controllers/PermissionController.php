<?php

namespace App\Http\Controllers;

use App\Services\RoleHierarchyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends BaseController
{
    private const AUTH_GUARD = 'sanctum';

    private RoleHierarchyService $hierarchyService;

    public function __construct(RoleHierarchyService $hierarchyService)
    {
        $this->hierarchyService = $hierarchyService;
    }

    /**
     * Get all permissions with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $guard = $this->resolveGuard($request);

        $query = Permission::where('guard_name', $guard);

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('display_name', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Category filter
        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Resource filter
        if ($request->has('resource') && $request->resource !== 'all') {
            $query->where('resource', $request->resource);
        }

        // Action filter
        if ($request->has('action') && $request->action !== 'all') {
            $query->where('action', $request->action);
        }

        // Scope filter
        if ($request->has('scope') && $request->scope !== 'all') {
            $query->where('scope', $request->scope);
        }

        // Status filter
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === true);
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $perPage = $request->get('per_page', 20);
        $page = $request->get('page', 1);

        $permissions = $query->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        // Add role and user counts
        $permissions = $permissions->map(function ($permission) {
            $rolesCount = DB::table('permission_role')
                ->where('permission_id', $permission->id)
                ->count();

            $usersCount = DB::table('model_has_permissions')
                ->where('permission_id', $permission->id)
                ->count();

            // Add direct role users count
            $roleUserIds = DB::table('permission_role')
                ->join('model_has_roles', 'permission_role.role_id', '=', 'model_has_roles.role_id')
                ->where('permission_role.permission_id', $permission->id)
                ->distinct('model_has_roles.model_id')
                ->pluck('model_has_roles.model_id');

            $totalUsersCount = $usersCount + $roleUserIds->count();

            // Parse resource and action from permission name
            $parsed = $this->parsePermissionName($permission->name);

            return [
                'id' => $permission->id,
                'name' => $permission->name,
                'display_name' => $permission->display_name,
                'description' => $permission->description,
                'guard_name' => $permission->guard_name,
                'category' => $permission->category ?? $parsed['category'],
                'department' => $permission->department,
                'resource' => $permission->resource ?? $parsed['resource'],
                'action' => $permission->action ?? $parsed['action'],
                'is_active' => $permission->is_active,
                'scope' => $permission->scope ?? $this->getPermissionScope($permission->name),
                'roles_count' => $rolesCount,
                'users_count' => $totalUsersCount,
                'created_at' => $permission->created_at,
                'updated_at' => $permission->updated_at,
            ];
        });

        return response()->json([
            'permissions' => $permissions,
            'total' => $total,
            'per_page' => (int) $perPage,
            'current_page' => (int) $page,
            'last_page' => ceil($total / $perPage),
        ]);
    }

    /**
     * Get specific permission details with usage stats
     */
    public function show(Permission $permission): JsonResponse
    {
        $roles = DB::table('permission_role')
            ->join('roles', 'permission_role.role_id', '=', 'roles.id')
            ->where('permission_role.permission_id', $permission->id)
            ->select('roles.id', 'roles.name', 'roles.display_name', 'roles.level')
            ->get();

        $usersCount = $this->getPermissionUsersCount($permission->id);

        return response()->json([
            'permission' => [
                'id' => $permission->id,
                'name' => $permission->name,
                'display_name' => $permission->display_name,
                'description' => $permission->description,
                'guard_name' => $permission->guard_name,
                'category' => $permission->category,
                'department' => $permission->department,
                'resource' => $permission->resource,
                'action' => $permission->action,
                'is_active' => $permission->is_active,
                'scope' => $permission->scope ?? $this->getPermissionScope($permission->name),
                'roles_count' => $roles->count(),
                'users_count' => $usersCount,
                'roles' => $roles,
                'created_at' => $permission->created_at,
                'updated_at' => $permission->updated_at,
            ],
        ]);
    }

    /**
     * Update permission metadata
     */
    public function update(Request $request, Permission $permission): JsonResponse
    {
        $request->validate([
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        // Check if trying to deactivate a system permission
        if ($request->has('is_active') && ! $request->is_active) {
            if ($this->isSystemPermission($permission)) {
                return response()->json([
                    'message' => 'Sistem səlahiyyətləri deaktiv edilə bilməz',
                ], 422);
            }

            // Impact analysis
            $usersCount = $this->getPermissionUsersCount($permission->id);
            if ($usersCount > 50) {
                // Warning but allow
                $warning = "Bu əməliyyat {$usersCount} istifadəçiyə təsir edəcək";
            }
        }

        $permission->update($request->only(['display_name', 'description', 'is_active']));

        return response()->json([
            'message' => 'Səlahiyyət uğurla yeniləndi',
            'permission' => [
                'id' => $permission->id,
                'name' => $permission->name,
                'display_name' => $permission->display_name,
                'description' => $permission->description,
                'is_active' => $permission->is_active,
            ],
            'warning' => $warning ?? null,
        ]);
    }

    /**
     * Bulk update permissions
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
            'data' => 'required|array',
            'data.is_active' => 'nullable|boolean',
        ]);

        $permissionIds = $request->permission_ids;
        $data = $request->data;

        // Check for system permissions
        $permissions = Permission::whereIn('id', $permissionIds)->get();
        $systemPermissions = $permissions->filter(function ($permission) {
            return $this->isSystemPermission($permission);
        });

        if ($systemPermissions->count() > 0 && isset($data['is_active']) && ! $data['is_active']) {
            return response()->json([
                'message' => 'Sistem səlahiyyətləri deaktiv edilə bilməz',
                'system_permissions' => $systemPermissions->pluck('name'),
            ], 422);
        }

        // Update permissions
        $updatedCount = Permission::whereIn('id', $permissionIds)->update($data);

        return response()->json([
            'message' => "{$updatedCount} səlahiyyət uğurla yeniləndi",
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * Get usage statistics for a permission
     */
    public function getUsageStats(Permission $permission): JsonResponse
    {
        $roles = DB::table('permission_role')
            ->join('roles', 'permission_role.role_id', '=', 'roles.id')
            ->where('permission_role.permission_id', $permission->id)
            ->select('roles.id', 'roles.name', 'roles.display_name', 'roles.level')
            ->get();

        $usersCount = $this->getPermissionUsersCount($permission->id);

        // Get recent assignments (simplified - would need audit log for real data)
        $recentAssignments = [];

        // Usage timeline (simplified - would need historical data)
        $usageTimeline = [];

        return response()->json([
            'permission' => [
                'id' => $permission->id,
                'name' => $permission->name,
                'display_name' => $permission->display_name,
            ],
            'roles_count' => $roles->count(),
            'users_count' => $usersCount,
            'roles' => $roles,
            'recent_assignments' => $recentAssignments,
            'usage_timeline' => $usageTimeline,
        ]);
    }

    /**
     * Get permission-role matrix
     */
    public function getPermissionMatrix(Request $request): JsonResponse
    {
        $guard = $this->resolveGuard($request);

        $roles = Role::where('guard_name', $guard)
            ->orderBy('level')
            ->get(['id', 'name', 'display_name', 'level']);

        $permissions = Permission::where('guard_name', $guard)->get();

        // Build matrix
        $matrix = [];
        foreach ($roles as $role) {
            $matrix[$role->id] = [];
            $rolePermissions = DB::table('permission_role')
                ->where('role_id', $role->id)
                ->pluck('permission_id')
                ->toArray();

            foreach ($permissions as $permission) {
                $matrix[$role->id][$permission->id] = in_array($permission->id, $rolePermissions);
            }
        }

        return response()->json([
            'roles' => $roles,
            'permissions' => $permissions->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'display_name' => $permission->display_name,
                    'category' => $permission->category,
                    'scope' => $this->getPermissionScope($permission->name),
                ];
            }),
            'matrix' => $matrix,
        ]);
    }

    /**
     * Get grouped permissions
     */
    public function getGroupedPermissions(Request $request): JsonResponse
    {
        $groupBy = $request->get('group_by', 'category');
        $guard = $this->resolveGuard($request);

        $permissions = Permission::where('guard_name', $guard)->get();

        $grouped = [];

        foreach ($permissions as $permission) {
            $groupKey = match ($groupBy) {
                'category' => $permission->category ?? 'other',
                'resource' => $permission->resource ?? 'other',
                'scope' => $this->getPermissionScope($permission->name),
                default => 'other',
            };

            if (! isset($grouped[$groupKey])) {
                $grouped[$groupKey] = [
                    'label' => $this->getGroupLabel($groupBy, $groupKey),
                    'permissions' => [],
                    'count' => 0,
                ];
            }

            $grouped[$groupKey]['permissions'][] = [
                'id' => $permission->id,
                'name' => $permission->name,
                'display_name' => $permission->display_name,
                'is_active' => $permission->is_active,
            ];
            $grouped[$groupKey]['count']++;
        }

        return response()->json([
            'grouped' => $grouped,
            'group_by' => $groupBy,
        ]);
    }

    /**
     * Sync role permissions
     */
    public function syncRolePermissions(Request $request): JsonResponse
    {
        $request->validate([
            'role_id' => 'required|exists:roles,id',
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
            'action' => 'required|in:assign,revoke,replace',
        ]);

        $role = Role::findOrFail($request->role_id);
        $permissionIds = $request->permission_ids;
        $action = $request->action;

        $user = Auth::user();

        // Check if user can manage this role
        $manageableRoles = $this->hierarchyService->getUserManageableRoles($user);
        if (! $manageableRoles->contains('id', $role->id)) {
            return response()->json([
                'message' => 'Bu rolu idarə etmək üçün icazəniz yoxdur',
            ], 403);
        }

        // Validate permissions for role level
        $allowedPermissions = $this->hierarchyService->getPermissionScopeForLevel($role->level);
        $requestedPermissionNames = Permission::whereIn('id', $permissionIds)->pluck('name')->toArray();
        $invalidPermissions = array_diff($requestedPermissionNames, $allowedPermissions);

        if (! empty($invalidPermissions) && $action !== 'revoke') {
            return response()->json([
                'message' => 'Bu rol səviyyəsi üçün uyğun olmayan səlahiyyətlər',
                'invalid_permissions' => $invalidPermissions,
            ], 422);
        }

        // Perform action
        $permissions = Permission::whereIn('id', $permissionIds)->get();

        switch ($action) {
            case 'assign':
                $role->givePermissionTo($permissions);
                $message = count($permissionIds) . ' səlahiyyət əlavə edildi';
                break;
            case 'revoke':
                $role->revokePermissionTo($permissions);
                $message = count($permissionIds) . ' səlahiyyət çıxarıldı';
                break;
            case 'replace':
                $role->syncPermissions($permissions);
                $message = 'Səlahiyyətlər əvəz edildi';
                break;
        }

        return response()->json([
            'message' => $message,
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
            ],
            'permissions_count' => $role->permissions()->count(),
        ]);
    }

    /**
     * Get unique categories
     */
    public function getCategories(): JsonResponse
    {
        $categories = Permission::select('category', DB::raw('count(*) as count'))
            ->whereNotNull('category')
            ->groupBy('category')
            ->get();

        return response()->json([
            'categories' => $categories->map(function ($item) {
                return [
                    'name' => $item->category,
                    'count' => $item->count,
                ];
            }),
        ]);
    }

    /**
     * Get available scopes
     */
    public function getScopes(): JsonResponse
    {
        // Get actual scope counts from database
        $scopeCounts = Permission::select('scope', DB::raw('count(*) as count'))
            ->whereNotNull('scope')
            ->groupBy('scope')
            ->pluck('count', 'scope')
            ->toArray();

        $scopes = [
            ['name' => 'global', 'label' => 'Global', 'count' => $scopeCounts['global'] ?? 0],
            ['name' => 'system', 'label' => 'Sistem', 'count' => $scopeCounts['system'] ?? 0],
            ['name' => 'regional', 'label' => 'Regional', 'count' => $scopeCounts['regional'] ?? 0],
            ['name' => 'sector', 'label' => 'Sektor', 'count' => $scopeCounts['sector'] ?? 0],
            ['name' => 'institution', 'label' => 'Məktəb', 'count' => $scopeCounts['institution'] ?? 0],
            ['name' => 'classroom', 'label' => 'Sinif', 'count' => $scopeCounts['classroom'] ?? 0],
        ];

        return response()->json(['scopes' => $scopes]);
    }

    /**
     * Helper: Determine permission scope based on name
     */
    private function getPermissionScope(string $permissionName): string
    {
        if (str_contains($permissionName, 'system')) {
            return 'system';
        }
        if (str_contains($permissionName, 'reports') || str_contains($permissionName, 'analytics')) {
            return 'global';
        }
        if (str_contains($permissionName, 'institutions') || str_contains($permissionName, 'institution-types')) {
            return 'regional';
        }
        if (str_contains($permissionName, 'users') && str_contains($permissionName, 'manage')) {
            return 'sector';
        }
        if (str_contains($permissionName, 'surveys') || str_contains($permissionName, 'tasks') || str_contains($permissionName, 'documents')) {
            return 'institution';
        }

        return 'classroom';
    }

    /**
     * Helper: Parse permission name to extract resource, action, and category
     */
    private function parsePermissionName(string $permissionName): array
    {
        // Default values
        $result = [
            'resource' => null,
            'action' => null,
            'category' => null,
        ];

        // Handle space-separated format (e.g., "create teacher_performance")
        if (str_contains($permissionName, ' ')) {
            $parts = explode(' ', $permissionName, 2);
            $result['action'] = $parts[0];
            $result['resource'] = $parts[1] ?? null;
            $result['category'] = $this->getCategoryFromResource($parts[1] ?? '');

            return $result;
        }

        // Handle dot-separated format (e.g., "users.create")
        if (str_contains($permissionName, '.')) {
            $parts = explode('.', $permissionName, 2);
            $result['resource'] = $parts[0];
            $result['action'] = $parts[1] ?? null;
            $result['category'] = $this->getCategoryFromResource($parts[0]);

            return $result;
        }

        // Single word permission
        $result['resource'] = $permissionName;
        $result['category'] = $this->getCategoryFromResource($permissionName);

        return $result;
    }

    /**
     * Helper: Determine category from resource name
     */
    private function getCategoryFromResource(string $resource): string
    {
        $categoryMap = [
            'users' => 'users',
            'institutions' => 'institutions',
            'surveys' => 'surveys',
            'roles' => 'roles',
            'departments' => 'departments',
            'assessments' => 'assessments',
            'assessment-types' => 'assessments',
            'students' => 'students',
            'classes' => 'classes',
            'subjects' => 'subjects',
            'approvals' => 'approvals',
            'rooms' => 'rooms',
            'events' => 'events',
            'psychology' => 'psychology',
            'inventory' => 'inventory',
            'teachers' => 'teachers',
            'teacher_performance' => 'teachers',
            'teaching-loads' => 'teachers',
            'tasks' => 'tasks',
            'documents' => 'documents',
            'links' => 'documents',
            'reports' => 'reports',
            'analytics' => 'reports',
            'institution-types' => 'institutions',
            'preschools' => 'institutions',
            'attendance' => 'academic',
            'grades' => 'academic',
            'system' => 'system',
        ];

        return $categoryMap[$resource] ?? 'other';
    }

    /**
     * Helper: Check if permission is a system permission
     */
    private function isSystemPermission(Permission $permission): bool
    {
        return str_contains($permission->name, 'system.') ||
               in_array($permission->name, ['roles.create', 'roles.delete', 'users.delete']);
    }

    /**
     * Helper: Get total users count affected by permission
     */
    private function getPermissionUsersCount(int $permissionId): int
    {
        // Direct permission assignments
        $directUsers = DB::table('model_has_permissions')
            ->where('permission_id', $permissionId)
            ->count();

        // Users through roles
        $roleUserIds = DB::table('permission_role')
            ->join('model_has_roles', 'permission_role.role_id', '=', 'model_has_roles.role_id')
            ->where('permission_role.permission_id', $permissionId)
            ->distinct('model_has_roles.model_id')
            ->pluck('model_has_roles.model_id');

        return $directUsers + $roleUserIds->count();
    }

    /**
     * Helper: Get group label
     */
    private function getGroupLabel(string $groupBy, string $key): string
    {
        if ($groupBy === 'scope') {
            return match ($key) {
                'global' => 'Global',
                'system' => 'Sistem',
                'regional' => 'Regional',
                'sector' => 'Sektor',
                'institution' => 'Məktəb',
                'classroom' => 'Sinif',
                default => ucfirst($key),
            };
        }

        return ucfirst($key);
    }

    /**
     * Resolve guard parameter, defaulting to Sanctum
     */
    private function resolveGuard(Request $request): string
    {
        return $request->get('guard', self::AUTH_GUARD);
    }
}
