<?php

namespace App\Services;

use App\Models\DataApprovalRequest;
use App\Models\Survey;
use App\Models\SurveyResponse;
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
    protected InstitutionNotificationHelper $institutionNotificationHelper;

    public function __construct(
        NotificationService $notificationService,
        InstitutionNotificationHelper $institutionNotificationHelper
    ) {
        $this->notificationService = $notificationService;
        $this->institutionNotificationHelper = $institutionNotificationHelper;
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
     * Send notification when survey is published to institution targets
     */
    public function notifySurveyPublished(Survey $survey): void
    {
        $targetUserIds = $this->expandSurveyTargetUsers($survey);
        if (empty($targetUserIds)) {
            return;
        }

        $actionData = [
            'action_url' => "/survey-response/{$survey->id}",
            'survey_id' => $survey->id,
        ];

        $this->notificationService->sendSurveyNotification(
            $survey,
            'published',
            $targetUserIds,
            $actionData,
            [
                'action_data' => $actionData,
                'channels' => ['in_app'],
            ]
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

    /**
     * Notify submitter/respondent that their response was rejected
     *
     * Delegated from SurveyApprovalService (Sprint 7 Phase 2)
     */
    public function notifySubmitterAboutRejection(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver,
        ?string $reason
    ): void {
        $approvalRequest->loadMissing(['submitter', 'institution']);
        $response->loadMissing(['institution', 'respondent']);
        $response->loadMissing('survey');

        $recipient = $approvalRequest->submitter ?? $response->respondent;

        if (!$recipient instanceof User) {
            return;
        }

        // Avoid notifying the same user who performed the rejection
        if ($recipient->id === $approver->id) {
            return;
        }

        $additionalData = [
            'survey_id' => $response->survey_id,
            'institution_name' => $response->institution->name ?? '',
            'rejector_name' => $approver->name ?? $approver->username ?? $approver->email,
            'rejection_reason' => $reason ?? 'Səbəb qeyd edilməyib',
            'status' => 'rejected',
            'submitted_by' => $approvalRequest->submitter->name ?? null,
            'response_id' => $response->id,
        ];

        try {
            $notification = new \App\Notifications\SurveyApprovalNotification(
                $approvalRequest,
                'approval_rejected',
                $additionalData
            );

            if (method_exists($notification, 'afterCommit')) {
                $notification->afterCommit();
            }

            \Illuminate\Support\Facades\Notification::sendNow($recipient, $notification);
        } catch (\Throwable $e) {
            \Log::warning('Failed to send survey rejection notification', [
                'approval_request_id' => $approvalRequest->id,
                'response_id' => $response->id,
                'recipient_id' => $recipient->id,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $title = 'Survey cavabınız rədd edildi';
            $message = sprintf(
                '%s sorğusunun cavabı %s tərəfindən rədd edildi. Səbəb: %s',
                $response->survey->title ?? 'Survey',
                $approver->name ?? $approver->username ?? 'Naməlum',
                $reason ?? 'Səbəb qeyd edilməyib'
            );

            $this->notificationService->send([
                'user_id' => $recipient->id,
                'title' => $title,
                'message' => $message,
                'type' => 'survey_approval_rejected',
                'channel' => 'in_app',
                'priority' => 'high',
                'related_type' => Survey::class,
                'related_id' => $response->survey_id,
                'metadata' => [
                    'survey_id' => $response->survey_id,
                    'response_id' => $response->id,
                    'rejection_reason' => $reason,
                    'rejector_id' => $approver->id,
                    'rejector_name' => $approver->name ?? $approver->username ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Failed to create in-app rejection notification', [
                'approval_request_id' => $approvalRequest->id,
                'response_id' => $response->id,
                'recipient_id' => $recipient->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify submitter about approval success
     */
    public function notifySubmitterAboutApproval(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver
    ): void {
        $submitter = $approvalRequest->submitter;

        if (!$submitter instanceof User) {
            return;
        }

        $survey = $response->survey ?? $approvalRequest->survey ?? null;

        $message = sprintf(
            '%s tərəfindən "%s" sorğusuna verdiyiniz cavab təsdiqləndi.',
            $approver->name ?? 'Sistem',
            $survey?->title ?? 'Survey'
        );

        $this->notificationService->send([
            'user_id' => $submitter->id,
            'title' => 'Survey cavabınız təsdiqləndi',
            'message' => $message,
            'type' => 'approval_completed',
            'channel' => 'in_app',
            'priority' => 'normal',
            'related_type' => Survey::class,
            'related_id' => $response->survey_id,
            'metadata' => [
                'survey_id' => $response->survey_id,
                'response_id' => $response->id,
                'approver_id' => $approver->id,
                'approver_name' => $approver->name ?? $approver->username ?? null,
            ],
        ]);
    }

    /**
     * Notify submitter about revision requirement
     */
    public function notifySubmitterAboutRevision(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver,
        ?string $comments
    ): void {
        $submitter = $approvalRequest->submitter;

        if (!$submitter instanceof User) {
            return;
        }

        $survey = $response->survey ?? $approvalRequest->survey ?? null;

        $message = sprintf(
            '%s cavabınızı yenidən baxılması üçün geri göndərdi.',
            $approver->name ?? 'Sistem'
        );

        $this->notificationService->send([
            'user_id' => $submitter->id,
            'title' => 'Survey cavabında düzəliş tələb olunur',
            'message' => $message,
            'type' => 'revision_required',
            'channel' => 'in_app',
            'priority' => 'normal',
            'related_type' => Survey::class,
            'related_id' => $response->survey_id,
            'metadata' => [
                'survey_id' => $response->survey_id,
                'response_id' => $response->id,
                'approver_id' => $approver->id,
                'approver_name' => $approver->name ?? $approver->username ?? null,
                'comments' => $comments,
            ],
        ]);
    }

    /**
     * Expand survey target institutions to user IDs
     */
    private function expandSurveyTargetUsers(Survey $survey): array
    {
        $institutionIds = $survey->target_institutions ?? [];
        if (empty($institutionIds)) {
            return [];
        }

        $targetRoles = config('notification_roles.survey_notification_roles', [
            'schooladmin', 'məktəbadmin', 'müəllim', 'teacher'
        ]);

        return $this->institutionNotificationHelper->doExpandInstitutionsToUsers(
            $institutionIds,
            $targetRoles
        );
    }
}
