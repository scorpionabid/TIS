<?php

namespace App\Http\Controllers;

use App\Services\SurveyNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ResponseHelpers;

/**
 * Survey Notification Controller
 * 
 * Survey assignment notification-larını idarə etmək üçün controller
 */
class SurveyNotificationController extends BaseController
{
    use ResponseHelpers;

    protected SurveyNotificationService $surveyNotificationService;

    public function __construct(SurveyNotificationService $surveyNotificationService)
    {
        $this->surveyNotificationService = $surveyNotificationService;
    }

    /**
     * İstifadəçinin survey notification-larını əldə et
     */
    public function index(Request $request): JsonResponse
    {

        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
            'only_unread' => 'nullable|boolean'
        ]);

        try {
            $user = $request->user();

            \Log::info('SurveyNotificationController: index called', [
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'user_roles' => $user?->roles->pluck('name')->toArray(),
                'validated' => $validated
            ]);

            if (!$user) {
                \Log::warning('SurveyNotificationController: No authenticated user');
                return $this->errorResponse('Unauthenticated', 401);
            }

            $notifications = $this->surveyNotificationService->getUserSurveyNotifications(
                $user,
                $validated
            );

            \Log::info('SurveyNotificationController: Notifications retrieved', [
                'user_id' => $user->id,
                'count' => count($notifications)
            ]);

            return $this->successResponse($notifications, 'Survey notifications retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('SurveyNotificationController: Exception in index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Okunmamış survey notification sayını əldə et
     */
    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            \Log::info('SurveyNotificationController: unreadCount called', [
                'user_id' => $user?->id,
                'user_name' => $user?->name
            ]);

            if (!$user) {
                \Log::warning('SurveyNotificationController: No authenticated user for unreadCount');
                return $this->errorResponse('Unauthenticated', 401);
            }

            $count = $this->surveyNotificationService->getUserUnreadSurveyCount($user);

            \Log::info('SurveyNotificationController: Unread count retrieved', [
                'user_id' => $user->id,
                'unread_count' => $count
            ]);

            return $this->successResponse([
                'unread_count' => $count
            ], 'Unread count retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('SurveyNotificationController: Exception in unreadCount', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Survey assignment statistikalarını əldə et
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $stats = $this->surveyNotificationService->getSurveyAssignmentStats($user);

            return $this->successResponse($stats, 'Survey assignment stats retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Survey notification-ı "oxundu" olaraq işarələ
     */
    public function markAsRead(Request $request, int $notificationId): JsonResponse
    {
        try {
            $user = $request->user();

            // Real notification table-dan notification-u tap və işarələ
            $notification = \App\Models\Notification::where('id', $notificationId)
                ->where('user_id', $user->id)
                ->where('type', 'LIKE', 'survey%')
                ->first();

            if (!$notification) {
                return $this->errorResponse('Notification not found', 404);
            }

            // Notification-u read olaraq işarələ
            $notification->update([
                'is_read' => true,
                'read_at' => now()
            ]);

            return $this->successResponse([
                'is_read' => true,
                'notification_id' => $notificationId
            ], 'Notification marked as read');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}