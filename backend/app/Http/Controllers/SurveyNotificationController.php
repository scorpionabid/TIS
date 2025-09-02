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
            $notifications = $this->surveyNotificationService->getUserSurveyNotifications(
                $user, 
                $validated
            );

            return $this->successResponse($notifications, 'Survey notifications retrieved successfully');
        } catch (\Exception $e) {
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
            $count = $this->surveyNotificationService->getUserUnreadSurveyCount($user);

            return $this->successResponse([
                'unread_count' => $count
            ], 'Unread count retrieved successfully');
        } catch (\Exception $e) {
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
    public function markAsRead(Request $request, int $surveyId): JsonResponse
    {
        try {
            $user = $request->user();
            $isRead = $this->surveyNotificationService->markSurveyNotificationAsRead($user, $surveyId);

            return $this->successResponse([
                'is_read' => $isRead,
                'survey_id' => $surveyId
            ], $isRead ? 'Survey notification marked as read' : 'Survey not yet completed');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}