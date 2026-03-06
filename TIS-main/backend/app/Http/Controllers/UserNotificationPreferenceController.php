<?php

namespace App\Http\Controllers;

use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * User Notification Preference Controller
 *
 * Handles GET/PUT for the current user's notification preferences.
 * Endpoint: GET|PUT /api/settings/notifications
 */
class UserNotificationPreferenceController extends Controller
{
    /**
     * Get current user's notification preferences
     * GET /api/settings/notifications
     */
    public function show(): JsonResponse
    {
        try {
            $user = Auth::user();
            $preferences = UserNotificationPreference::getForUser($user->id);

            return response()->json([
                'success' => true,
                'data'    => $preferences->only([
                    'task_deadline_reminder',
                    'task_reminder_days',
                    'task_assigned_notification',
                    'task_status_change_notification',
                    'task_comment_notification',
                    'task_mention_notification',
                    'email_enabled',
                    'email_daily_digest',
                    'email_digest_time',
                    'in_app_enabled',
                    'browser_push_enabled',
                    'quiet_hours_enabled',
                    'quiet_hours_start',
                    'quiet_hours_end',
                ]),
            ]);
        } catch (\Exception $e) {
            Log::error('UserNotificationPreferenceController::show failed', [
                'user_id' => Auth::id(),
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tənzimləmələr yüklənərkən xəta baş verdi.',
            ], 500);
        }
    }

    /**
     * Update current user's notification preferences
     * PUT /api/settings/notifications
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task_deadline_reminder'        => 'nullable|boolean',
            'task_reminder_days'            => 'nullable|integer|min:1|max:30',
            'task_assigned_notification'    => 'nullable|boolean',
            'task_status_change_notification' => 'nullable|boolean',
            'task_comment_notification'     => 'nullable|boolean',
            'task_mention_notification'     => 'nullable|boolean',
            'email_enabled'                 => 'nullable|boolean',
            'email_daily_digest'            => 'nullable|boolean',
            'email_digest_time'             => 'nullable|date_format:H:i',
            'in_app_enabled'                => 'nullable|boolean',
            'browser_push_enabled'          => 'nullable|boolean',
            'quiet_hours_enabled'           => 'nullable|boolean',
            'quiet_hours_start'             => 'nullable|date_format:H:i',
            'quiet_hours_end'               => 'nullable|date_format:H:i',
        ]);

        try {
            $user = Auth::user();
            $preferences = UserNotificationPreference::getForUser($user->id);
            $preferences->update($validated);

            Log::info('UserNotificationPreference updated', [
                'user_id' => $user->id,
                'changed' => array_keys($validated),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Bildiriş tənzimləmələri yadda saxlanıldı.',
                'data'    => $preferences->fresh()->only([
                    'task_deadline_reminder',
                    'task_reminder_days',
                    'task_assigned_notification',
                    'task_status_change_notification',
                    'task_comment_notification',
                    'task_mention_notification',
                    'email_enabled',
                    'email_daily_digest',
                    'email_digest_time',
                    'in_app_enabled',
                    'browser_push_enabled',
                    'quiet_hours_enabled',
                    'quiet_hours_start',
                    'quiet_hours_end',
                ]),
            ]);
        } catch (\Exception $e) {
            Log::error('UserNotificationPreferenceController::update failed', [
                'user_id' => Auth::id(),
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Tənzimləmələr yadda saxlanılarkən xəta baş verdi.',
            ], 500);
        }
    }
}
