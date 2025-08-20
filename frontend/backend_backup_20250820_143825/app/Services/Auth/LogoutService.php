<?php

namespace App\Services\Auth;

use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class LogoutService
{
    /**
     * Log the user out of the application.
     *
     * @param User $user
     * @return void
     */
    public function logout(User $user): void
    {
        // Revoke the current access token if it exists
        if ($token = $user->currentAccessToken()) {
            $token->delete();
        }

        // Log the logout event
        $this->logLogout($user);
    }

    /**
     * Logout from all devices.
     *
     * @param User $user
     * @return void
     */
    public function logoutFromAllDevices(User $user): void
    {
        // Revoke all user's tokens
        $user->tokens()->delete();

        // Log the logout from all devices event
        $this->logLogout($user, true);
    }

    /**
     * Log the logout event.
     */
    protected function logLogout(User $user, bool $allDevices = false): void
    {
        SecurityEvent::create([
            'event_type' => $allDevices ? 'logout_all' : 'logout',
            'severity' => 'info',
            'description' => $allDevices 
                ? 'Bütün cihazlardan çıxış edildi' 
                : 'Uğurlu çıxış',
            'user_id' => $user->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => [
                'all_devices' => $allDevices
            ]
        ]);
    }
}
