<?php

namespace App\Http\Controllers;

use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingsController extends Controller
{
    /**
     * Get notification settings
     */
    public function getNotifications(): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $preferences = UserNotificationPreference::getForUser($user->id);

        return response()->json([
            'success' => true,
            'data' => [
                // Task notifications
                'task_deadline_reminder' => $preferences->task_deadline_reminder,
                'task_reminder_days' => $preferences->task_reminder_days,
                'task_assigned_notification' => $preferences->task_assigned_notification,
                'task_status_change_notification' => $preferences->task_status_change_notification,
                'task_comment_notification' => $preferences->task_comment_notification,
                'task_mention_notification' => $preferences->task_mention_notification,

                // Email preferences
                'email_enabled' => $preferences->email_enabled,
                'email_daily_digest' => $preferences->email_daily_digest,
                'email_digest_time' => $preferences->email_digest_time,

                // In-app notification preferences
                'in_app_enabled' => $preferences->in_app_enabled,
                'browser_push_enabled' => $preferences->browser_push_enabled,

                // Quiet hours
                'quiet_hours_enabled' => $preferences->quiet_hours_enabled,
                'quiet_hours_start' => $preferences->quiet_hours_start,
                'quiet_hours_end' => $preferences->quiet_hours_end,
            ],
        ]);
    }

    /**
     * Update notification settings
     */
    public function updateNotifications(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $validated = $request->validate([
            // Task notifications
            'task_deadline_reminder' => 'boolean',
            'task_reminder_days' => 'integer|min:1|max:14',
            'task_assigned_notification' => 'boolean',
            'task_status_change_notification' => 'boolean',
            'task_comment_notification' => 'boolean',
            'task_mention_notification' => 'boolean',

            // Email preferences
            'email_enabled' => 'boolean',
            'email_daily_digest' => 'boolean',
            'email_digest_time' => 'string|date_format:H:i',

            // In-app notification preferences
            'in_app_enabled' => 'boolean',
            'browser_push_enabled' => 'boolean',

            // Quiet hours
            'quiet_hours_enabled' => 'boolean',
            'quiet_hours_start' => 'string|date_format:H:i',
            'quiet_hours_end' => 'string|date_format:H:i',
        ]);

        $preferences = UserNotificationPreference::getForUser($user->id);
        $preferences->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Bildiriş tənzimləmələri uğurla yeniləndi',
            'data' => $preferences->fresh(),
        ]);
    }

    /**
     * Get system health status
     */
    public function getHealth(): JsonResponse
    {
        // Basic system health checks
        $health = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'storage' => $this->checkStorage(),
            'memory' => $this->checkMemory(),
            'disk_space' => $this->checkDiskSpace(),
        ];

        $overallStatus = collect($health)->every(fn ($check) => $check['status'] === 'healthy')
            ? 'healthy'
            : 'warning';

        return response()->json([
            'success' => true,
            'data' => [
                'overall_status' => $overallStatus,
                'checks' => $health,
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * Check database connection
     */
    private function checkDatabase(): array
    {
        try {
            \DB::connection()->getPdo();

            return [
                'status' => 'healthy',
                'message' => 'Database connection successful',
                'response_time' => '< 1ms',
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'response_time' => null,
            ];
        }
    }

    /**
     * Check cache system
     */
    private function checkCache(): array
    {
        try {
            cache()->put('health_check', 'test', 60);
            $value = cache()->get('health_check');

            return [
                'status' => $value === 'test' ? 'healthy' : 'warning',
                'message' => $value === 'test' ? 'Cache working properly' : 'Cache not functioning correctly',
                'response_time' => '< 1ms',
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Cache system error: ' . $e->getMessage(),
                'response_time' => null,
            ];
        }
    }

    /**
     * Check storage accessibility
     */
    private function checkStorage(): array
    {
        try {
            $path = storage_path('framework/cache');
            $writable = is_writable($path);

            return [
                'status' => $writable ? 'healthy' : 'error',
                'message' => $writable ? 'Storage is writable' : 'Storage is not writable',
                'path' => $path,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Storage check failed: ' . $e->getMessage(),
                'path' => null,
            ];
        }
    }

    /**
     * Check memory usage
     */
    private function checkMemory(): array
    {
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = ini_get('memory_limit');

        // Convert memory limit to bytes
        $limitBytes = $this->convertToBytes($memoryLimit);
        $usagePercent = ($memoryUsage / $limitBytes) * 100;

        $status = $usagePercent < 80 ? 'healthy' : ($usagePercent < 95 ? 'warning' : 'error');

        return [
            'status' => $status,
            'message' => sprintf('Memory usage: %.1f%% (%s / %s)',
                $usagePercent,
                $this->formatBytes($memoryUsage),
                $memoryLimit
            ),
            'usage_percent' => round($usagePercent, 1),
        ];
    }

    /**
     * Check disk space
     */
    private function checkDiskSpace(): array
    {
        $path = base_path();
        $freeSpace = disk_free_space($path);
        $totalSpace = disk_total_space($path);

        if ($freeSpace === false || $totalSpace === false) {
            return [
                'status' => 'error',
                'message' => 'Unable to check disk space',
                'free_space' => null,
            ];
        }

        $usedPercent = (($totalSpace - $freeSpace) / $totalSpace) * 100;
        $status = $usedPercent < 85 ? 'healthy' : ($usedPercent < 95 ? 'warning' : 'error');

        return [
            'status' => $status,
            'message' => sprintf('Disk usage: %.1f%% (%s free of %s)',
                $usedPercent,
                $this->formatBytes($freeSpace),
                $this->formatBytes($totalSpace)
            ),
            'usage_percent' => round($usedPercent, 1),
        ];
    }

    /**
     * Convert memory limit string to bytes
     */
    private function convertToBytes(string $value): int
    {
        $value = trim($value);
        $last = strtolower($value[strlen($value) - 1]);
        $value = (int) $value;

        switch ($last) {
            case 'g':
                $value *= 1024;
            case 'm':
                $value *= 1024;
            case 'k':
                $value *= 1024;
        }

        return $value;
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }
}
