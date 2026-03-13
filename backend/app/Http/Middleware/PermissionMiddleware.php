<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     */
    public function handle(Request $request, Closure $next, string|array $permissions): Response
    {
        $guard = config('auth.defaults.guard', 'sanctum');
        Auth::shouldUse($guard);

        if (! Auth::guard($guard)->check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = Auth::guard($guard)->user();
        $permissions = is_string($permissions) ? explode('|', $permissions) : $permissions;

        // SuperAdmin has all permissions
        if ($user->hasRole('superadmin')) {
            return $next($request);
        }

        // Debug log-ları yalnız local mühitdə — production-da hər request-ə yazılmır
        if (config('app.debug')) {
            \Log::debug('Permission middleware evaluation', [
                'user_id' => $user->id,
                'permissions_required' => $permissions,
                'guard' => $guard,
                'user_roles' => $user->getRoleNames(),
                'available_guards' => \Spatie\Permission\Guard::getNames($user)->toArray(),
            ]);
        }

        // Check if user has any of the required permissions for the active guard
        foreach ($permissions as $permission) {
            $hasPermission = false;
            try {
                $hasPermission = $user->hasPermissionTo($permission);
            } catch (\Spatie\Permission\Exceptions\PermissionDoesNotExist $e) {
                // Permission not seeded yet — user definitely does not have it
                $hasPermission = false;
            } catch (\Throwable $e) {
                // Fail-closed: unexpected error — block for safety
                \Log::critical('Permission check FAILED — request blocked for safety', [
                    'user_id' => $user->id,
                    'permission' => $permission,
                    'guard' => $guard,
                    'path' => $request->path(),
                    'exception' => $e->getMessage(),
                ]);

                return response()->json([
                    'message' => 'Permission check temporarily unavailable. Please try again.',
                ], 503);
            }

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

            if (! empty($rolesWithPermission) && $user->hasAnyRole($rolesWithPermission)) {
                \Log::info('Permission granted via role fallback', [
                    'user_id' => $user->id,
                    'permission' => $permission,
                    'fallback_roles' => $rolesWithPermission,
                ]);

                return $next($request);
            }
        }

        return response()->json([
            'message' => 'Forbidden. Required permissions: ' . implode(', ', $permissions),
        ], 403);
    }
}
