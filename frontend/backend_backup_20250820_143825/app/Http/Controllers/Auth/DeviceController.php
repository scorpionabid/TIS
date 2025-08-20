<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\DeviceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    protected $deviceService;

    public function __construct(DeviceService $deviceService)
    {
        $this->deviceService = $deviceService;
    }

    /**
     * Get user's registered devices.
     */
    public function index(Request $request): JsonResponse
    {
        $devices = $this->deviceService->getUserDevices($request->user());
        
        return response()->json([
            'devices' => $devices
        ]);
    }

    /**
     * Register a new device.
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'device_name' => 'required|string|max:100',
            'device_id' => 'required|string|max:100',
            'device_type' => 'nullable|string|max:50',
            'device_model' => 'nullable|string|max:100',
            'os_version' => 'nullable|string|max:50',
            'app_version' => 'nullable|string|max:50',
        ]);

        $device = $this->deviceService->registerDevice(
            $request->user(),
            $request->only(['device_name', 'device_id', 'device_type', 'device_model', 'os_version', 'app_version'])
        );

        return response()->json([
            'message' => 'Device registered successfully',
            'device' => $device
        ]);
    }

    /**
     * Update device information.
     */
    public function update(Request $request, string $deviceId): JsonResponse
    {
        $request->validate([
            'device_name' => 'sometimes|string|max:100',
            'device_type' => 'sometimes|string|max:50',
            'device_model' => 'sometimes|string|max:100',
            'os_version' => 'sometimes|string|max:50',
            'app_version' => 'sometimes|string|max:50',
        ]);

        $device = $this->deviceService->updateDevice(
            $request->user(),
            $deviceId,
            $request->only(['device_name', 'device_type', 'device_model', 'os_version', 'app_version'])
        );

        if (!$device) {
            return response()->json([
                'message' => 'Device not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Device updated successfully',
            'device' => $device
        ]);
    }

    /**
     * Remove a device.
     */
    public function destroy(Request $request, string $deviceId): JsonResponse
    {
        $removed = $this->deviceService->removeDevice($request->user(), $deviceId);

        if (!$removed) {
            return response()->json([
                'message' => 'Device not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Device removed successfully'
        ]);
    }

    /**
     * Get device statistics.
     */
    public function stats(Request $request): JsonResponse
    {
        $stats = $this->deviceService->getDeviceStats($request->user());
        
        return response()->json([
            'stats' => $stats
        ]);
    }
}