<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string|array  $permissions
     */
    public function handle(Request $request, Closure $next, string|array $permissions): Response
    {
        $guard = config('auth.defaults.guard', 'sanctum');
        Auth::shouldUse($guard);

        if (!Auth::guard($guard)->check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = Auth::guard($guard)->user();
        $permissions = is_string($permissions) ? explode('|', $permissions) : $permissions;

        // SuperAdmin has all permissions
        if ($user->hasRole('superadmin')) {
            return $next($request);
        }

        \Log::debug('Permission middleware evaluation', [
            'user_id' => $user->id,
            'permissions_required' => $permissions,
            'guard' => $guard,
            'user_roles' => $user->getRoleNames(),
            'available_guards' => \Spatie\Permission\Guard::getNames($user)->toArray(),
        ]);

        // Check if user has any of the required permissions for the active guard
        foreach ($permissions as $permission) {
            $hasPermission = false;
            try {
                $hasPermission = $user->hasPermissionTo($permission);
            } catch (\Throwable $e) {
                \Log::error('Permission check error', [
                    'user_id' => $user->id,
                    'permission' => $permission,
                    'guard' => $guard,
                    'exception' => $e->getMessage(),
                ]);
            }

            \Log::debug('Permission evaluated', [
                'user_id' => $user->id,
                'permission' => $permission,
                'result' => $hasPermission,
            ]);

            if ($hasPermission) {
                return $next($request);
            }

            // Fallback: allow roles that inherently possess the permission
            $rolesWithPermission = cache()->remember("permission_roles_{$permission}", 300, function () use ($permission, $guard) {
                return \Spatie\Permission\Models\Role::query()
                    ->where('guard_name', $guard)
                    ->whereHas('permissions', fn ($q) => $q->where('name', $permission))
                    ->pluck('name')
                    ->toArray();
            });

            if (!empty($rolesWithPermission) && $user->hasAnyRole($rolesWithPermission)) {
                \Log::info('Permission granted via role fallback', [
                    'user_id' => $user->id,
                    'permission' => $permission,
                    'fallback_roles' => $rolesWithPermission,
                ]);
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'Forbidden. Required permissions: ' . implode(', ', $permissions)
        ], 403);
    }
}
