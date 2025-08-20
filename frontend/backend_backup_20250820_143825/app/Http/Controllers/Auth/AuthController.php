<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\Auth\LoginService;
use App\Services\Auth\LogoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected $loginService;
    protected $logoutService;

    public function __construct(
        LoginService $loginService,
        LogoutService $logoutService
    ) {
        $this->loginService = $loginService;
        $this->logoutService = $logoutService;
    }

    /**
     * Login user
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Validate request and check rate limiting
        $request->ensureIsNotRateLimited();

        try {
            // Attempt to login using the login service
            $result = $this->loginService->attemptLogin(
                $request->only(['login', 'password', 'remember']),
                $request->device_name,
                $request->device_id
            );

            // Clear rate limiting on successful login
            RateLimiter::clear('login_ip:' . $request->ip());
            RateLimiter::clear('login_user:' . $request->login);

            return response()->json([
                'message' => 'Uğurlu giriş',
                'data' => $result
            ]);

        } catch (ValidationException $e) {
            // Increment rate limiting on failed attempt
            RateLimiter::hit('login_ip:' . $request->ip());
            RateLimiter::hit('login_user:' . $request->login);
            
            throw $e;
        }
    }

    /**
     * Logout user (Revoke the token)
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->logoutService->logout($user);

        return response()->json([
            'message' => 'Uğurla çıxış edildi'
        ]);
    }

    /**
     * Get the authenticated User with preferences.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'roles', 'institution']);
        
        // Spatie roles və permissions
        $roles = $user->getRoleNames()->toArray();
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        
        // Get user preferences
        $preferences = null;
        if ($user->profile) {
            $preferences = $user->profile->preferences ?? $this->getDefaultPreferences();
        } else {
            $preferences = $this->getDefaultPreferences();
        }
        
        // User data-nı hazırla
        $userData = $user->toArray();
        $userData['roles'] = $roles;
        $userData['permissions'] = $permissions;
        $userData['preferences'] = $preferences;
        
        \Log::debug('Me endpoint response', [
            'user_id' => $user->id,
            'roles_count' => count($roles),
            'permissions_count' => count($permissions),
            'has_preferences' => !is_null($preferences),
            'roles' => $roles,
            'permissions' => $permissions
        ]);
        
        return response()->json([
            'user' => $userData
        ]);
    }

    /**
     * Get default preferences structure
     */
    private function getDefaultPreferences(): array
    {
        return [
            'theme' => 'auto',
            'language' => 'az',
            'sidebar' => [
                'collapsed' => false,
                'favoriteItems' => []
            ],
            'dashboard' => [
                'widgets' => ['stats', 'recent-activity', 'quick-actions'],
                'layout' => 'grid'
            ],
            'notifications' => [
                'email' => true,
                'browser' => true,
                'sound' => false
            ],
            'accessibility' => [
                'reducedMotion' => false,
                'highContrast' => false,
                'fontSize' => 'medium'
            ]
        ];
    }

    /**
     * Refresh token
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // Delete current token
        $request->user()->currentAccessToken()->delete();

        // Create new token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Token refreshed successfully',
            'token' => $token
        ]);
    }
}