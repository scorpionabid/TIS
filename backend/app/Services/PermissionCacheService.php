<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Permission Cache Service
 *
 * Provides intelligent caching for permission checks to improve performance.
 * Uses Redis for distributed caching with automatic invalidation.
 */
class PermissionCacheService
{
    /**
     * Cache TTL in seconds (1 hour default)
     */
    private const CACHE_TTL = 3600;

    /**
     * Cache key prefix for permissions
     */
    private const PREFIX_USER_PERMISSIONS = 'user_permissions:';
    private const PREFIX_ROLE_PERMISSIONS = 'role_permissions:';
    private const PREFIX_PERMISSION_USERS = 'permission_users:';
    private const PREFIX_PERMISSION_ROLES = 'permission_roles:';

    /**
     * Get cached user permissions.
     */
    public function getUserPermissions(User $user): array
    {
        $cacheKey = self::PREFIX_USER_PERMISSIONS . $user->id;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($user) {
            Log::info("Cache MISS: User permissions for user {$user->id}");

            // Get all permissions (direct + via roles)
            $permissions = $user->getAllPermissions()->pluck('name')->toArray();

            return $permissions;
        });
    }

    /**
     * Get cached role permissions.
     */
    public function getRolePermissions(Role $role): array
    {
        $cacheKey = self::PREFIX_ROLE_PERMISSIONS . $role->id;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($role) {
            Log::info("Cache MISS: Role permissions for role {$role->id}");

            return $role->permissions()->pluck('name')->toArray();
        });
    }

    /**
     * Check if user has permission (cached).
     */
    public function userHasPermission(User $user, string $permission): bool
    {
        $permissions = $this->getUserPermissions($user);

        return in_array($permission, $permissions, true);
    }

    /**
     * Check if user has any of the permissions (cached).
     */
    public function userHasAnyPermission(User $user, array $permissions): bool
    {
        $userPermissions = $this->getUserPermissions($user);

        return !empty(array_intersect($permissions, $userPermissions));
    }

    /**
     * Check if user has all permissions (cached).
     */
    public function userHasAllPermissions(User $user, array $permissions): bool
    {
        $userPermissions = $this->getUserPermissions($user);

        return empty(array_diff($permissions, $userPermissions));
    }

    /**
     * Get users who have a specific permission (cached).
     */
    public function getUsersWithPermission(Permission $permission): array
    {
        $cacheKey = self::PREFIX_PERMISSION_USERS . $permission->id;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($permission) {
            Log::info("Cache MISS: Users with permission {$permission->id}");

            // Users via roles
            $roleUserIds = $permission->roles()
                ->with('users')
                ->get()
                ->pluck('users')
                ->flatten()
                ->pluck('id')
                ->unique()
                ->toArray();

            return $roleUserIds;
        });
    }

    /**
     * Get roles that have a specific permission (cached).
     */
    public function getRolesWithPermission(Permission $permission): array
    {
        $cacheKey = self::PREFIX_PERMISSION_ROLES . $permission->id;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($permission) {
            Log::info("Cache MISS: Roles with permission {$permission->id}");

            return $permission->roles()->pluck('roles.id')->toArray();
        });
    }

    /**
     * Invalidate user permission cache.
     */
    public function invalidateUserCache(User $user): void
    {
        $cacheKey = self::PREFIX_USER_PERMISSIONS . $user->id;
        Cache::forget($cacheKey);

        Log::info("Cache INVALIDATED: User permissions for user {$user->id}");
    }

    /**
     * Invalidate role permission cache.
     */
    public function invalidateRoleCache(Role $role): void
    {
        $cacheKey = self::PREFIX_ROLE_PERMISSIONS . $role->id;
        Cache::forget($cacheKey);

        Log::info("Cache INVALIDATED: Role permissions for role {$role->id}");

        // Also invalidate all users with this role
        $userIds = $role->users()->pluck('id');
        foreach ($userIds as $userId) {
            $userCacheKey = self::PREFIX_USER_PERMISSIONS . $userId;
            Cache::forget($userCacheKey);
        }

        Log::info("Cache INVALIDATED: {$userIds->count()} users affected by role {$role->id}");
    }

    /**
     * Invalidate permission cache (when permission is modified).
     */
    public function invalidatePermissionCache(Permission $permission): void
    {
        $usersCacheKey = self::PREFIX_PERMISSION_USERS . $permission->id;
        $rolesCacheKey = self::PREFIX_PERMISSION_ROLES . $permission->id;

        Cache::forget($usersCacheKey);
        Cache::forget($rolesCacheKey);

        Log::info("Cache INVALIDATED: Permission {$permission->id} users and roles");

        // Invalidate all users who have this permission
        $userIds = $this->getUsersWithPermission($permission);
        foreach ($userIds as $userId) {
            $userCacheKey = self::PREFIX_USER_PERMISSIONS . $userId;
            Cache::forget($userCacheKey);
        }

        // Invalidate all roles that have this permission
        $roleIds = $this->getRolesWithPermission($permission);
        foreach ($roleIds as $roleId) {
            $roleCacheKey = self::PREFIX_ROLE_PERMISSIONS . $roleId;
            Cache::forget($roleCacheKey);
        }

        Log::info("Cache INVALIDATED: Permission {$permission->id} - " . count($userIds) . " users, " . count($roleIds) . " roles");
    }

    /**
     * Clear all permission caches (use with caution).
     */
    public function clearAllCaches(): void
    {
        // Clear all users
        $users = User::all();
        foreach ($users as $user) {
            $this->invalidateUserCache($user);
        }

        // Clear all roles
        $roles = Role::all();
        foreach ($roles as $role) {
            $this->invalidateRoleCache($role);
        }

        // Clear all permissions
        $permissions = Permission::all();
        foreach ($permissions as $permission) {
            $this->invalidatePermissionCache($permission);
        }

        Log::warning('Cache CLEARED: All permission caches cleared');
    }

    /**
     * Get cache statistics.
     */
    public function getCacheStats(): array
    {
        $stats = [
            'user_permissions_cached' => 0,
            'role_permissions_cached' => 0,
            'permission_users_cached' => 0,
            'permission_roles_cached' => 0,
            'total_cached_keys' => 0,
        ];

        try {
            // Count active users with cache
            $activeUsers = User::where('is_active', true)->get();
            foreach ($activeUsers as $user) {
                $cacheKey = self::PREFIX_USER_PERMISSIONS . $user->id;
                if (Cache::has($cacheKey)) {
                    $stats['user_permissions_cached']++;
                }
            }

            // Count active roles with cache
            $activeRoles = Role::where('is_active', true)->get();
            foreach ($activeRoles as $role) {
                $cacheKey = self::PREFIX_ROLE_PERMISSIONS . $role->id;
                if (Cache::has($cacheKey)) {
                    $stats['role_permissions_cached']++;
                }
            }

            // Count permissions with user cache
            $permissions = Permission::where('is_active', true)->limit(50)->get();
            foreach ($permissions as $permission) {
                $usersCacheKey = self::PREFIX_PERMISSION_USERS . $permission->id;
                if (Cache::has($usersCacheKey)) {
                    $stats['permission_users_cached']++;
                }

                $rolesCacheKey = self::PREFIX_PERMISSION_ROLES . $permission->id;
                if (Cache::has($rolesCacheKey)) {
                    $stats['permission_roles_cached']++;
                }
            }

            $stats['total_cached_keys'] = $stats['user_permissions_cached'] +
                                          $stats['role_permissions_cached'] +
                                          $stats['permission_users_cached'] +
                                          $stats['permission_roles_cached'];
        } catch (\Exception $e) {
            Log::error("Failed to get cache stats: {$e->getMessage()}");
        }

        return $stats;
    }

    /**
     * Warm up cache for a user.
     */
    public function warmupUserCache(User $user): void
    {
        $this->getUserPermissions($user);
        Log::info("Cache WARMUP: User permissions for user {$user->id}");
    }

    /**
     * Warm up cache for a role.
     */
    public function warmupRoleCache(Role $role): void
    {
        $this->getRolePermissions($role);
        Log::info("Cache WARMUP: Role permissions for role {$role->id}");
    }

    /**
     * Warm up cache for all active users.
     */
    public function warmupAllUserCaches(): int
    {
        $users = User::where('is_active', true)->get();
        $count = 0;

        foreach ($users as $user) {
            $this->warmupUserCache($user);
            $count++;
        }

        Log::info("Cache WARMUP: {$count} users warmed up");

        return $count;
    }

    /**
     * Warm up cache for all active roles.
     */
    public function warmupAllRoleCaches(): int
    {
        $roles = Role::where('is_active', true)->get();
        $count = 0;

        foreach ($roles as $role) {
            $this->warmupRoleCache($role);
            $count++;
        }

        Log::info("Cache WARMUP: {$count} roles warmed up");

        return $count;
    }
}
