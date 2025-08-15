<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\SecurityEvent;
use Illuminate\Support\Facades\Cache;

class SessionService
{
    /**
     * Get all active sessions for a user.
     */
    public function getActiveSessions(User $user): array
    {
        $sessions = [];
        
        // Get all tokens
        foreach ($user->tokens as $token) {
            $session = [
                'id' => $token->id,
                'name' => $token->name,
                'last_used' => $token->last_used_at,
                'expires_at' => $token->expires_at,
                'current' => false,
                'device' => null
            ];

            // Try to find device info
            $device = $user->devices()
                ->where('device_name', $token->name)
                ->first();

            if ($device) {
                $session['device'] = [
                    'id' => $device->device_id,
                    'name' => $device->device_name,
                    'platform' => $device->platform,
                    'browser' => $device->browser,
                    'ip' => $device->ip_address,
                    'last_used' => $device->last_login_at,
                    'is_trusted' => $device->is_trusted
                ];
            }

            $sessions[] = $session;
        }

        return $sessions;
    }

    /**
     * Get the current session information.
     */
    public function getCurrentSession(User $user, string $tokenId): ?array
    {
        $token = $user->tokens()
            ->where('id', $tokenId)
            ->first();

        if (!$token) {
            return null;
        }

        $session = [
            'id' => $token->id,
            'name' => $token->name,
            'last_used' => $token->last_used_at,
            'expires_at' => $token->expires_at,
            'current' => true,
            'device' => null
        ];

        // Try to find device info
        $device = $user->devices()
            ->where('device_name', $token->name)
            ->first();

        if ($device) {
            $session['device'] = [
                'id' => $device->device_id,
                'name' => $device->device_name,
                'platform' => $device->platform,
                'browser' => $device->browser,
                'ip' => $device->ip_address,
                'last_used' => $device->last_login_at,
                'is_trusted' => $device->is_trusted
            ];
        }

        return $session;
    }

    /**
     * Revoke a session.
     */
    public function revokeSession(User $user, string $tokenId): bool
    {
        $token = $user->tokens()
            ->where('id', $tokenId)
            ->first();

        if (!$token) {
            return false;
        }

        // Delete the token
        $token->delete();

        // Log the session revocation
        $this->logSessionRevoked($user, $token->name, false);

        return true;
    }

    /**
     * Revoke all other sessions.
     */
    public function revokeOtherSessions(User $user, string $currentTokenId): int
    {
        $tokens = $user->tokens()
            ->where('id', '!=', $currentTokenId)
            ->get();

        $count = $tokens->count();

        foreach ($tokens as $token) {
            $token->delete();
            $this->logSessionRevoked($user, $token->name, true);
        }

        return $count;
    }

    /**
     * Log session revocation.
     */
    protected function logSessionRevoked(User $user, string $sessionName, bool $allSessions = false): void
    {
        SecurityEvent::create([
            'event_type' => $allSessions ? 'session_revoked_all' : 'session_revoked',
            'severity' => 'medium',
            'description' => $allSessions 
                ? "Bütün digər sessiyalar ləğv edildi" 
                : "Sessiya ləğv edildi: {$sessionName}",
            'user_id' => $user->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => [
                'session_name' => $sessionName,
                'all_sessions' => $allSessions
            ]
        ]);
    }
}
