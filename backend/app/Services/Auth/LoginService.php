<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\SecurityEvent;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginService
{
    /**
     * Attempt to authenticate the user.
     *
     * @param array $credentials
     * @param string|null $deviceName
     * @param string|null $deviceId
     * @return array
     * @throws ValidationException
     */
    public function attemptLogin(array $credentials, ?string $deviceName = null, ?string $deviceId = null): array
    {
        $identifierHash = null;
        $identifierType = null;

        try {
            $login = $credentials['login'];
            $password = $credentials['password'];
            $identifierType = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
            $identifierHash = hash('sha256', mb_strtolower($login));
            $hasDeviceContext = !empty($deviceId) || !empty($deviceName);

            logger()->info('Login attempt', [
                'identifier_type' => $identifierType,
                'identifier_hash' => $identifierHash,
                'device_context' => $hasDeviceContext
            ]);

            // Find user by username or email
            $user = User::where('username', $login)
                ->orWhere('email', $login)
                ->first();

            logger()->debug('Login user lookup', [
                'identifier_hash' => $identifierHash,
                'user_found' => (bool) $user,
                'user_active' => $user?->is_active
            ]);

            // Check if user exists and password is correct
            if (!$user || !Hash::check($password, $user->password)) {
                logger()->warning('Authentication failed - invalid credentials', [
                    'identifier_hash' => $identifierHash,
                    'user_found' => (bool) $user
                ]);
                
                $this->logFailedAttempt($login, $user);
                throw ValidationException::withMessages([
                    'login' => 'İstifadəçi adı, email və ya şifrə yanlışdır.',
                ]);
            }

            logger()->info('Password check passed', ['user_id' => $user->id]);

            // Check if user is active
            if (!$user->is_active) {
                throw ValidationException::withMessages([
                    'login' => 'Hesabınız deaktiv edilib. Zəhmət olmasa inzibatçı ilə əlaqə saxlayın.',
                ]);
            }

            // Check if user needs to change password
            if ($user->password_change_required) {
                return [
                    'requires_password_change' => true,
                    'user' => $user,
                    'token' => $this->createPasswordResetToken($user)
                ];
            }

            // Authenticate the user
            $token = $this->createAuthToken($user, $deviceName);
            $this->updateUserDevice($user, $deviceId, $deviceName);
            $this->logSuccessfulLogin($user);

            // Load user with all relations
            $user->load(['profile', 'roles', 'institution']);
            
            // Get roles and permissions CORRECTLY
            $roles = $user->getRoleNames()->toArray();
            $permissions = $user->getAllPermissions()->pluck('name')->toArray();
            
            logger()->debug('Login service - access context prepared', [
                'user_id' => $user->id,
                'role_count' => count($roles),
                'permission_count' => count($permissions)
            ]);
            
            // User data with proper role/permission arrays
            $userData = $user->toArray();
            $userData['roles'] = $roles;
            $userData['permissions'] = $permissions;

            return [
                'token' => $token,
                'user' => $userData,
                'requires_password_change' => false
            ];
        
        } catch (\Exception $e) {
            logger()->error('Login attempt failed with exception', [
                'identifier_hash' => $identifierHash,
                'error' => $e->getMessage()
            ]);

            throw ValidationException::withMessages([
                'login' => 'Giriş zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.',
            ]);
        }
    }

    /**
     * Create a new authentication token for the user.
     */
    protected function createAuthToken(User $user, ?string $deviceName = null): string
    {
        $tokenName = $deviceName ?? 'auth_token';
        $expirationMinutes = config('sanctum.expiration');
        $expiresAt = is_numeric($expirationMinutes) ? now()->addMinutes((int) $expirationMinutes) : null;

        return $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;
    }

    /**
     * Update or create user device information.
     */
    protected function updateUserDevice(User $user, ?string $deviceId, ?string $deviceName): void
    {
        if (!$deviceId) {
            return;
        }

        $ipAddress = request()->ip() ?? '127.0.0.1';
        $userAgent = request()->userAgent() ?? '';
        $now = now();
        $normalizedName = mb_substr($deviceName ?? 'web-browser', 0, 255);

        $device = $user->devices()->where('device_id', $deviceId)->first();

        if ($device) {
            $device->update([
                'device_name' => $normalizedName,
                'user_agent' => $userAgent,
                'last_ip_address' => $ipAddress,
                'last_seen_at' => $now,
                'last_login_at' => $now,
            ]);

            return;
        }

        $user->devices()->create([
            'device_id' => $deviceId,
            'device_name' => $normalizedName,
            'device_type' => 'desktop',
            'browser_name' => null,
            'browser_version' => null,
            'operating_system' => null,
            'platform' => null,
            'user_agent' => $userAgent,
            'screen_resolution' => null,
            'timezone' => request()->header('Time-Zone') ?? null,
            'language' => request()->header('Accept-Language') ?? null,
            'device_fingerprint' => [
                'language' => request()->getPreferredLanguage(),
                'user_agent_hash' => $userAgent ? hash('sha256', $userAgent) : null,
            ],
            'last_ip_address' => $ipAddress,
            'registration_ip' => $ipAddress,
            'last_location_country' => null,
            'last_location_city' => null,
            'is_trusted' => false,
            'is_active' => true,
            'trusted_at' => null,
            'last_seen_at' => $now,
            'last_login_at' => $now,
            'registered_at' => $now,
            'requires_verification' => false,
            'failed_verification_attempts' => 0,
            'verification_blocked_until' => null,
        ]);
    }

    /**
     * Log a failed login attempt.
     */
    protected function logFailedAttempt(string $login, ?User $user): void
    {
        SecurityEvent::create([
            'event_type' => 'login_failed',
            'severity' => 'medium',
            'description' => "Uğursuz giriş cəhdi: {$login}",
            'user_id' => $user?->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => [
                'login_method' => 'password',
                'login_attempt' => $login
            ]
        ]);
    }

    /**
     * Log a successful login.
     */
    protected function logSuccessfulLogin(User $user): void
    {
        // Log security event
        SecurityEvent::create([
            'event_type' => 'login_success',
            'severity' => 'info',
            'description' => 'Uğurlu giriş',
            'user_id' => $user->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);

        // Update last login time
        $user->update([
            'last_login_at' => now(),
            'login_attempts' => 0,
            'must_change_password' => false
        ]);
    }

    /**
     * Create a password reset token.
     */
    protected function createPasswordResetToken(User $user): string
    {
        $token = Str::random(60);
        \DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now()
            ]
        );
        return $token;
    }
}
