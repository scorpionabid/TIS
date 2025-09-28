<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\User;
use Carbon\Carbon;

/**
 * Survey Notification Service
 *
 * Survey assignment-ları notification kimi göstərmək üçün xidmət
 * Həmçinin real notification göndərmək üçün NotificationService ilə inteqrasiya
 */
class SurveyNotificationService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }
    /**
     * İstifadəçinin survey assignment notification-larını əldə et
     * Real notification table-dan survey-related notification-ları oxuyur
     */
    public function getUserSurveyNotifications(User $user, array $options = []): array
    {
        $limit = $options['limit'] ?? 50;
        $onlyUnread = $options['only_unread'] ?? false;

        // Real notification table-dan survey notification-ları əldə et
        $notificationsQuery = \App\Models\Notification::where('user_id', $user->id)
            ->where('type', 'LIKE', 'survey%')
            ->orderBy('created_at', 'desc')
            ->limit($limit);

        if ($onlyUnread) {
            $notificationsQuery->where('is_read', false);
        }

        $notifications = $notificationsQuery->get();

        $result = [];

        foreach ($notifications as $notification) {
            // Survey məlumatları əldə et
            $survey = null;
            if ($notification->related_type === 'App\Models\Survey' && $notification->related_id) {
                $survey = Survey::find($notification->related_id);
            }

            // Survey məlumatlarını notification-dan əldə et
            $surveyIdFromNotification = null;
            if ($notification->related_type === 'App\\Models\\Survey' && $notification->related_id) {
                $surveyIdFromNotification = $notification->related_id;
            } elseif ($notification->data && is_array($notification->data) && isset($notification->data['survey_id'])) {
                $surveyIdFromNotification = $notification->data['survey_id'];
            }

            $result[] = [
                'id' => $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'data' => [
                    'survey_id' => $surveyIdFromNotification ?? $survey?->id,
                    'survey_title' => $survey?->title,
                    'survey_description' => $survey?->description,
                    'due_date' => $survey?->end_date?->toISOString(),
                    'priority' => $notification->priority ?? 'normal',
                    'questions_count' => $survey?->questions()->count() ?? 0,
                    'action_url' => $surveyIdFromNotification ? "/survey-response/{$surveyIdFromNotification}" : null,
                    'related_entity_type' => $notification->related_type,
                    'related_entity_id' => $notification->related_id
                ],
                'read_at' => $notification->read_at?->toISOString(),
                'created_at' => $notification->created_at->toISOString(),
                'is_read' => $notification->is_read,
                'priority' => $notification->priority ?? 'normal',
                'category' => 'survey'
            ];
        }

        return $result;
    }

    /**
     * İstifadəçinin okunmamış survey notification sayını əldə et
     * Real notification table-dan survey-related unread notification sayını qaytarır
     */
    public function getUserUnreadSurveyCount(User $user): int
    {
        return \App\Models\Notification::where('user_id', $user->id)
            ->where('type', 'LIKE', 'survey%')
            ->where('is_read', false)
            ->count();
    }

    /**
     * Survey-in prioritetini təyin et
     */
    protected function getSurveyPriority(Survey $survey): string
    {
        if (!$survey->end_date) {
            return 'normal';
        }

        $now = Carbon::now();
        $daysUntilDeadline = $now->diffInDays($survey->end_date, false);

        if ($daysUntilDeadline < 0) {
            return 'overdue';
        } elseif ($daysUntilDeadline <= 3) {
            return 'high';
        } elseif ($daysUntilDeadline <= 7) {
            return 'medium';
        }

        return 'normal';
    }

    /**
     * Survey notification-ı "oxundu" olaraq işarələ (response yaradarkən)
     */
    public function markSurveyNotificationAsRead(User $user, int $surveyId): bool
    {
        // Bu survey üçün response mövcuddursa, notification "oxundu" sayılır
        return $user->surveyResponses()
            ->where('survey_id', $surveyId)
            ->exists();
    }

    /**
     * Survey assignment üçün özet statistikalar
     */
    public function getSurveyAssignmentStats(User $user): array
    {
        $userInstitutionId = $user->institution_id;
        
        $totalAssigned = Survey::where('status', 'published')
            ->whereJsonContains('target_institutions', $userInstitutionId)
            ->count();

        $completed = Survey::where('status', 'published')
            ->whereJsonContains('target_institutions', $userInstitutionId)
            ->whereHas('responses', function($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->where('status', 'completed');
            })
            ->count();

        $inProgress = Survey::where('status', 'published')
            ->whereJsonContains('target_institutions', $userInstitutionId)
            ->whereHas('responses', function($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->where('status', 'draft');
            })
            ->count();

        $pending = $totalAssigned - $completed - $inProgress;

        $overdue = Survey::where('status', 'published')
            ->whereJsonContains('target_institutions', $userInstitutionId)
            ->where('end_date', '<', now())
            ->whereDoesntHave('responses', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->count();

        return [
            'total_assigned' => $totalAssigned,
            'completed' => $completed,
            'in_progress' => $inProgress,
            'pending' => $pending,
            'overdue' => $overdue,
            'unread_notifications' => $this->getUserUnreadSurveyCount($user)
        ];
    }

    /**
     * Send actual notifications when survey is published/assigned
     */
    public function notifySurveyAssignment(Survey $survey, array $targetUserIds, array $extraData = []): array
    {
        return $this->notificationService->sendSurveyNotification(
            $survey,
            'assignment',
            $targetUserIds,
            $extraData
        );
    }

    /**
     * Send notification when survey is approved
     */
    public function notifySurveyApproved(Survey $survey, array $targetUserIds, array $extraData = []): array
    {
        return $this->notificationService->sendSurveyNotification(
            $survey,
            'approved',
            $targetUserIds,
            $extraData
        );
    }

    /**
     * Send notification when survey deadline is approaching
     */
    public function notifySurveyDeadlineApproaching(Survey $survey, array $targetUserIds, int $daysLeft): array
    {
        return $this->notificationService->sendSurveyNotification(
            $survey,
            'deadline',
            $targetUserIds,
            ['days_left' => $daysLeft]
        );
    }
}