<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserDevice;
use App\Models\UserSession;
use App\Models\AccountLockout;
use App\Models\SecurityAlert;
use App\Models\SessionActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;
use Carbon\Carbon;

class EnhancedAuthService
{
    /**
     * Enhanced login with device and session management
     */
    public function login(Request $request, array $credentials): array
    {
        $login = $credentials['login'];
        $password = $credentials['password'];
        
        // Check rate limiting
        $this->checkRateLimiting($request, $login);
        
        // Find user
        $user = $this->findUser($login);
        if (!$user) {
            $this->recordFailedAttempt($request, $login, 'user_not_found');
            throw new \Exception('İstifadəçi adı və ya parol yanlışdır.');
        }

        // Check account lockout
        if (AccountLockout::isUserLocked($user)) {
            $lockout = AccountLockout::getUserActiveLockout($user);
            throw new \Exception("Hesab müvəqqəti bloklanıb. {$lockout->formatted_remaining_time} sonra yenidən cəhd edin.");
        }

        // Check account status
        if (!$user->is_active) {
            $this->recordFailedAttempt($request, $login, 'account_inactive');
            throw new \Exception('Hesab deaktivdir. İdarə ilə əlaqə saxlayın.');
        }

        // Verify password
        if (!Hash::check($password, $user->password)) {
            $this->recordFailedAttempt($request, $login, 'wrong_password', $user);
            throw new \Exception('İstifadəçi adı və ya parol yanlışdır.');
        }

        // Reset failed attempts on successful login
        $user->update(['failed_login_attempts' => 0]);

        // Handle device registration/recognition
        $device = $this->handleDeviceRegistration($request, $user);

        // Create session
        $token = $user->createToken('auth-token', ['*'], Carbon::now()->addHours(UserSession::SESSION_TIMEOUT_HOURS));
        $session = $this->createSession($user, $device, $token, $request);

        // Log successful login
        SessionActivity::logActivity($session, 'login', [
            'description' => 'User logged in successfully',
            'ip' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
            'country' => $this->getCountryFromIP($request->ip()),
            'city' => $this->getCityFromIP($request->ip()),
        ]);

        // Update user login timestamp
        $user->update(['last_login_at' => now()]);

        // Clear rate limiting on successful login
        $this->clearRateLimiting($request, $login);

        return [
            'user' => $user->load(['roles', 'institution', 'profile']),
            'token' => $token->plainTextToken,
            'session' => $session,
            'device' => $device,
        ];
    }

    /**
     * Enhanced logout with session termination
     */
    public function logout(Request $request): void
    {
        $user = $request->user();
        $token = $request->bearerToken();

        if ($token) {
            // Find the session
            $session = UserSession::where('session_token', hash('sha256', $token))->first();
            if ($session) {
                // Log logout activity
                SessionActivity::logActivity($session, 'logout', [
                    'description' => 'User logged out',
                    'ip' => $request->ip(),
                ]);

                // Terminate session
                $session->terminate('logout', $user);
            }

            // Revoke token
            $personalAccessToken = PersonalAccessToken::findToken($token);
            if ($personalAccessToken) {
                $personalAccessToken->delete();
            }
        }

        // Revoke all tokens if requested
        if ($request->input('logout_all_devices', false)) {
            $this->logoutAllDevices($user);
        }
    }

    /**
     * Logout from all devices
     */
    public function logoutAllDevices(User $user): int
    {
        // Terminate all active sessions
        $activeSessions = $user->activeSessions;
        foreach ($activeSessions as $session) {
            $session->terminate('admin_action', $user);
        }

        // Revoke all tokens
        $user->tokens()->delete();

        return $activeSessions->count();
    }

    /**
     * Get session information
     */
    public function getSessionInfo(Request $request): array
    {
        $token = $request->bearerToken();
        if (!$token) {
            throw new \Exception('No active session found.');
        }

        $session = UserSession::where('session_token', hash('sha256', $token))
                             ->with(['device', 'user'])
                             ->first();

        if (!$session) {
            throw new \Exception('Session not found.');
        }

        // Update session activity
        $session->updateActivity([
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
        ]);

        return [
            'session' => $session,
            'device' => $session->device,
            'is_active' => $session->isActive(),
            'expires_at' => $session->expires_at,
            'remaining_time' => $session->expires_at->diffInMinutes(now()),
            'security_score' => $session->security_score,
            'trust_level' => $session->getTrustLevel(),
        ];
    }

    /**
     * Get user devices
     */
    public function getUserDevices(User $user): array
    {
        $devices = $user->devices()->with(['activeSessions'])->get();

        return $devices->map(function ($device) {
            return [
                'id' => $device->id,
                'device_id' => $device->device_id,
                'device_name' => $device->device_name,
                'device_type' => $device->device_type,
                'device_type_label' => $device->device_type_label,
                'browser_name' => $device->browser_name,
                'operating_system' => $device->operating_system,
                'is_trusted' => $device->is_trusted,
                'is_active' => $device->is_active,
                'is_online' => $device->isOnline(),
                'last_seen_at' => $device->last_seen_at,
                'formatted_last_seen' => $device->formatted_last_seen,
                'last_location' => [
                    'country' => $device->last_location_country,
                    'city' => $device->last_location_city,
                ],
                'active_sessions_count' => $device->activeSessions->count(),
                'statistics' => $device->getStatistics(),
            ];
        })->toArray();
    }

    /**
     * Terminate device sessions
     */
    public function terminateDevice(User $user, string $deviceId): bool
    {
        $device = $user->devices()->where('device_id', $deviceId)->first();
        if (!$device) {
            throw new \Exception('Device not found.');
        }

        return $device->deactivate('User requested device termination');
    }

    /**
     * Trust a device
     */
    public function trustDevice(User $user, string $deviceId): bool
    {
        $device = $user->devices()->where('device_id', $deviceId)->first();
        if (!$device) {
            throw new \Exception('Device not found.');
        }

        return $device->markAsTrusted();
    }

    /**
     * Check rate limiting
     */
    protected function checkRateLimiting(Request $request, string $login): void
    {
        $ipRateLimitKey = 'login_ip:' . $request->ip();
        $userRateLimitKey = 'login_user:' . $login;
        
        // Check IP-based rate limiting (15 attempts per 15 minutes)
        if (RateLimiter::tooManyAttempts($ipRateLimitKey, 15)) {
            $seconds = RateLimiter::availableIn($ipRateLimitKey);
            throw new \Exception("Bu IP ünvanından çox sayda cəhd edilib. {$seconds} saniyə sonra yenidən cəhd edin.");
        }
        
        // Check user-based rate limiting (8 attempts per 15 minutes)
        if (RateLimiter::tooManyAttempts($userRateLimitKey, 8)) {
            $seconds = RateLimiter::availableIn($userRateLimitKey);
            throw new \Exception("Bu hesab üçün çox sayda cəhd edilib. {$seconds} saniyə sonra yenidən cəhd edin.");
        }
    }

    /**
     * Clear rate limiting on successful login
     */
    protected function clearRateLimiting(Request $request, string $login): void
    {
        RateLimiter::clear('login_ip:' . $request->ip());
        RateLimiter::clear('login_user:' . $login);
    }

    /**
     * Find user by login (username or email)
     */
    protected function findUser(string $login): ?User
    {
        return User::where('username', $login)
                  ->orWhere('email', $login)
                  ->first();
    }

    /**
     * Record failed login attempt
     */
    protected function recordFailedAttempt(Request $request, string $login, string $reason, ?User $user = null): void
    {
        // Rate limiting
        RateLimiter::hit('login_ip:' . $request->ip(), 900); // 15 minutes
        RateLimiter::hit('login_user:' . $login, 900);

        if ($user) {
            // Increment failed attempts
            $failedAttempts = $user->failed_login_attempts + 1;
            $user->update(['failed_login_attempts' => $failedAttempts]);

            // Create lockout if threshold reached
            if ($failedAttempts >= 5) {
                AccountLockout::createLockout($user, 'failed_attempts', [
                    'failed_attempts' => $failedAttempts,
                    'reason' => $reason,
                    'ip_address' => $request->ip(),
                ]);
            }

            // Create security alert for suspicious activity
            if ($failedAttempts >= 3) {
                SecurityAlert::createAlert([
                    'user_id' => $user->id,
                    'alert_type' => 'failed_login',
                    'severity' => $failedAttempts >= 5 ? 'high' : 'medium',
                    'title' => 'Multiple Failed Login Attempts',
                    'description' => "User {$user->username} has {$failedAttempts} failed login attempts",
                    'alert_data' => [
                        'failed_attempts' => $failedAttempts,
                        'reason' => $reason,
                    ],
                    'source_ip' => $request->ip(),
                    'source_user_agent' => $request->header('User-Agent'),
                    'risk_score' => min(100, $failedAttempts * 15),
                ]);
            }
        }
    }

    /**
     * Handle device registration/recognition
     */
    protected function handleDeviceRegistration(Request $request, User $user): UserDevice
    {
        $deviceInfo = [
            'device_id' => $request->header('X-Device-ID'),
            'user_agent' => $request->header('User-Agent'),
            'screen_resolution' => $request->header('X-Screen-Resolution'),
            'timezone' => $request->header('X-Timezone'),
            'language' => $request->header('Accept-Language'),
            'country' => $this->getCountryFromIP($request->ip()),
            'city' => $this->getCityFromIP($request->ip()),
        ];

        return UserDevice::findOrCreateDevice($user, $deviceInfo);
    }

    /**
     * Create user session
     */
    protected function createSession(User $user, UserDevice $device, $token, Request $request): UserSession
    {
        $context = [
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
            'session_type' => 'web',
            'login_method' => 'password',
            'country' => $this->getCountryFromIP($request->ip()),
            'city' => $this->getCityFromIP($request->ip()),
            'accept_language' => $request->header('Accept-Language'),
            'accept_encoding' => $request->header('Accept-Encoding'),
            'screen_resolution' => $request->header('X-Screen-Resolution'),
            'timezone' => $request->header('X-Timezone'),
        ];

        return UserSession::createSession(
            $user, 
            $device, 
            hash('sha256', $token->plainTextToken), 
            $context
        );
    }

    /**
     * Get country from IP address (placeholder)
     */
    protected function getCountryFromIP(string $ip): ?string
    {
        // In production, integrate with IP geolocation service
        return $ip === '127.0.0.1' ? 'AZ' : null;
    }

    /**
     * Get city from IP address (placeholder)
     */
    protected function getCityFromIP(string $ip): ?string
    {
        // In production, integrate with IP geolocation service
        return $ip === '127.0.0.1' ? 'Baku' : null;
    }

    /**
     * Get security dashboard data
     */
    public function getSecurityDashboard(User $user): array
    {
        return [
            'devices' => [
                'total' => $user->devices()->count(),
                'active' => $user->activeDevices()->count(),
                'trusted' => $user->devices()->where('is_trusted', true)->count(),
                'online' => $user->devices()->whereHas('activeSessions')->count(),
            ],
            'sessions' => [
                'total' => $user->sessions()->count(),
                'active' => $user->activeSessions()->count(),
                'suspicious' => $user->sessions()->where('is_suspicious', true)->count(),
            ],
            'security' => [
                'alerts' => $user->securityAlerts()->where('status', 'open')->count(),
                'lockouts' => $user->accountLockouts()->where('status', 'active')->count(),
                'failed_attempts' => $user->failed_login_attempts,
            ],
            'activity' => [
                'today' => SessionActivity::where('user_id', $user->id)
                                         ->whereDate('created_at', today())
                                         ->count(),
                'this_week' => SessionActivity::where('user_id', $user->id)
                                              ->where('created_at', '>=', now()->startOfWeek())
                                              ->count(),
            ],
        ];
    }

    /**
     * Check session health and security
     */
    public function checkSessionSecurity(Request $request): array
    {
        $token = $request->bearerToken();
        if (!$token) {
            return ['status' => 'no_session'];
        }

        $session = UserSession::where('session_token', hash('sha256', $token))->first();
        if (!$session) {
            return ['status' => 'invalid_session'];
        }

        if (!$session->isActive()) {
            return ['status' => 'expired_session'];
        }

        if ($session->isHijacked()) {
            return ['status' => 'hijacked_session'];
        }

        return [
            'status' => 'healthy',
            'security_score' => $session->security_score,
            'trust_level' => $session->getTrustLevel(),
            'expires_in' => $session->expires_at->diffInMinutes(now()),
        ];
    }
}