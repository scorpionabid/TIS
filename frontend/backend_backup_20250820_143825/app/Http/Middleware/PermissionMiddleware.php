<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

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
        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = Auth::user();
        $permissions = is_string($permissions) ? explode('|', $permissions) : $permissions;

        // SuperAdmin has all permissions
        if ($user->hasRole('superadmin')) {
            return $next($request);
        }

        // Check if user has any of the required permissions
        foreach ($permissions as $permission) {
            if ($user->hasPermissionTo($permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'Forbidden. Required permissions: ' . implode(', ', $permissions)
        ], 403);
    }
}