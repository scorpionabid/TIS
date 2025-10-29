<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Spatie\Permission\Exceptions\UnauthorizedException;

class MultiGuardPermissionMiddleware
{
    /**
     * Handle an incoming request.
     * Check permissions across multiple guards (web, api, sanctum)
     */
    public function handle(Request $request, Closure $next, $permission, $guard = null): Response
    {
        $user = $request->user();

        if (!$user) {
            throw UnauthorizedException::notLoggedIn();
        }

        // Try checking permission with multiple guards
        $guards = $guard ? [$guard] : ['web', 'api', 'sanctum'];
        
        foreach ($guards as $guardName) {
            try {
                if ($user->hasPermissionTo($permission, $guardName)) {
                    return $next($request);
                }
            } catch (\Exception $e) {
                // Continue to next guard
                continue;
            }
        }

        throw UnauthorizedException::forPermissions([$permission]);
    }
}
