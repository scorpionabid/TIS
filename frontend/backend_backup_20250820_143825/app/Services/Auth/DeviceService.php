<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DeviceService
{
    /**
     * Get all devices for a user.
     */
    public function getUserDevices(User $user): Collection
    {
        return $user->devices()
            ->orderBy('last_login_at', 'desc')
            ->get();
    }

    /**
     * Get a specific device.
     */
    public function getDevice(User $user, string $deviceId): ?UserDevice
    {
        return $user->devices()
            ->where('device_id', $deviceId)
            ->first();
    }

    /**
     * Revoke a device.
     */
    public function revokeDevice(User $user, string $deviceId): bool
    {
        $device = $this->getDevice($user, $deviceId);
        
        if (!$device) {
            return false;
        }

        // Delete any tokens associated with this device
        $user->tokens()
            ->where('name', $device->device_name)
            ->delete();

        // Delete the device
        return $device->delete();
    }

    /**
     * Revoke all devices except the current one.
     */
    public function revokeOtherDevices(User $user, string $currentDeviceId): int
    {
        // Get all device names except the current one
        $devices = $user->devices()
            ->where('device_id', '!=', $currentDeviceId)
            ->pluck('device_name')
            ->toArray();

        // Delete all tokens for other devices
        $deleted = $user->tokens()
            ->whereIn('name', $devices)
            ->delete();

        // Delete all other devices
        $user->devices()
            ->where('device_id', '!=', $currentDeviceId)
            ->delete();

        return $deleted;
    }

    /**
     * Update device trust status.
     */
    public function updateTrustStatus(User $user, string $deviceId, bool $isTrusted): bool
    {
        return (bool) $user->devices()
            ->where('device_id', $deviceId)
            ->update(['is_trusted' => $isTrusted]);
    }

    /**
     * Clean up old devices.
     */
    public function cleanupOldDevices(int $days = 90): int
    {
        $cutoff = now()->subDays($days);
        
        return UserDevice::query()
            ->where('last_login_at', '<', $cutoff)
            ->delete();
    }
}
