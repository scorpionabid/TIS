<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class AuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $guard
     */
    public function handle(Request $request, Closure $next, string $guard = 'sanctum'): Response
    {
        if (!Auth::guard($guard)->check()) {
            return response()->json([
                'message' => 'Unauthenticated. Please login to access this resource.'
            ], 401);
        }

        $user = Auth::guard($guard)->user();

        // Check if user is active
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Account is deactivated. Please contact administrator.'
            ], 403);
        }

        // Check if user account is locked
        if ($user->account_locked_until && $user->account_locked_until > now()) {
            return response()->json([
                'message' => 'Account is temporarily locked. Please try again later.'
            ], 423);
        }

        // Check if password change is required
        if ($user->password_change_required && !$this->isPasswordChangeRequest($request)) {
            return response()->json([
                'message' => 'Password change required.',
                'requires_password_change' => true
            ], 428);
        }

        return $next($request);
    }

    /**
     * Check if the current request is for password change
     */
    private function isPasswordChangeRequest(Request $request): bool
    {
        $passwordChangeRoutes = [
            'change-password',
            'api/change-password',
            '/api/change-password'
        ];

        return in_array($request->path(), $passwordChangeRoutes) || 
               str_contains($request->path(), 'change-password');
    }
}