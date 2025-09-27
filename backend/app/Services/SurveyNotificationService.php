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
     */
    public function getUserSurveyNotifications(User $user, array $options = []): array
    {
        $limit = $options['limit'] ?? 50;
        $onlyUnread = $options['only_unread'] ?? false;
        
        // İstifadəçinin institution-ına target edilmiş published survey-ları tap
        $surveys = Survey::where('status', 'published')
            ->whereJsonContains('target_institutions', $user->institution_id)
            ->orderBy('published_at', 'desc')
            ->limit($limit)
            ->get();

        $notifications = [];

        foreach ($surveys as $survey) {
            // User bu survey-ə response veribmi yoxla
            $hasResponse = $survey->responses()
                ->where('user_id', $user->id)
                ->exists();

            // Əgər response varsa və yalnız unread notifications istənirsə, skip et
            if ($hasResponse && $onlyUnread) {
                continue;
            }

            $notifications[] = [
                'id' => 'survey_' . $survey->id,
                'type' => 'survey_assignment',
                'title' => 'Yeni Survey Təyinatı',
                'message' => "Sizə yeni survey təyin edildi: {$survey->title}",
                'data' => [
                    'survey_id' => $survey->id,
                    'survey_title' => $survey->title,
                    'survey_description' => $survey->description,
                    'due_date' => $survey->end_date?->toISOString(),
                    'priority' => $this->getSurveyPriority($survey),
                    'questions_count' => $survey->questions()->count(),
                    'action_url' => "/survey-response/{$survey->id}"
                ],
                'read_at' => $hasResponse ? Carbon::now()->toISOString() : null,
                'created_at' => $survey->published_at?->toISOString() ?? $survey->created_at->toISOString(),
                'is_read' => $hasResponse,
                'priority' => $this->getSurveyPriority($survey),
                'category' => 'survey'
            ];
        }

        return $notifications;
    }

    /**
     * İstifadəçinin okunmamış survey notification sayını əldə et
     */
    public function getUserUnreadSurveyCount(User $user): int
    {
        return Survey::where('status', 'published')
            ->whereJsonContains('target_institutions', $user->institution_id)
            ->whereDoesntHave('responses', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
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