<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\UserDevice;
use App\Models\SecurityEvent;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
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
        try {
            $login = $credentials['login'];
            $password = $credentials['password'];
            
            logger()->info('Login attempt', ['login' => $login]);

            // Find user by username or email
            $user = User::where('username', $login)
                ->orWhere('email', $login)
                ->first();

            logger()->info('User lookup result', [
                'login' => $login,
                'user_found' => $user ? true : false,
                'user_id' => $user ? $user->id : null,
                'user_active' => $user ? $user->is_active : null
            ]);

            // Check if user exists and password is correct
            if (!$user || !Hash::check($password, $user->password)) {
                logger()->warning('Authentication failed - invalid credentials', [
                    'login' => $login,
                    'user_exists' => $user ? true : false,
                    'password_match' => $user ? Hash::check($password, $user->password) : false
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
        
        \Log::debug('Login service - roles and permissions', [
            'user_id' => $user->id,
            'roles' => $roles,
            'permissions' => $permissions,
            'spatie_roles' => $user->roles->pluck('name')->toArray(),
            'has_spatie_trait' => method_exists($user, 'getRoleNames')
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
                'login' => $credentials['login'] ?? 'unknown',
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
        return $user->createToken($tokenName)->plainTextToken;
    }

    /**
     * Update or create user device information.
     */
    protected function updateUserDevice(User $user, ?string $deviceId, ?string $deviceName): void
    {
        if (!$deviceId) {
            return;
        }

        $user->devices()->updateOrCreate(
            ['device_id' => $deviceId],
            [
                'last_login_at' => now(),
                'device_name' => $deviceName,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'is_trusted' => true,
            ]
        );
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
