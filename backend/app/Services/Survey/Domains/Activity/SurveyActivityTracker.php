<?php

namespace App\Services\Survey\Domains\Activity;

use App\Models\Survey;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Auth;

/**
 * Survey Activity Tracker
 *
 * Handles activity logging, audit trails, and notifications.
 */
class SurveyActivityTracker
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Log user activity
     */
    public function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);

        ActivityLog::logActivity($data);
    }

    /**
     * Log survey audit
     */
    public function logSurveyAudit(Survey $survey, string $action, string $description, array $additionalData = []): void
    {
        SurveyAuditLog::create([
            'survey_id' => $survey->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'old_values' => $additionalData['old_values'] ?? null,
            'new_values' => $additionalData['new_values'] ?? null,
            'metadata' => $additionalData,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }

    /**
     * Send survey notification to target institutions
     */
    public function sendSurveyNotification(Survey $survey, string $action, array $targetInstitutions): void
    {
        $variables = [
            'survey_title' => $survey->title,
            'survey_description' => $survey->description ?? '',
            'creator_name' => $survey->creator->name ?? 'Sistem',
            'deadline' => $survey->end_date ? $survey->end_date->format('d.m.Y H:i') : 'Müddət təyin edilməyib',
        ];

        $recipients = [
            'institutions' => $targetInstitutions
        ];

        $options = [
            'related' => $survey,
            'priority' => $survey->priority ?? 'normal',
            'channels' => ['in_app', 'email'],
        ];

        $notifications = $this->notificationService->sendFromTemplate($action, $recipients, $variables, $options);

        \Log::info('Survey notification sent', [
            'survey_id' => $survey->id,
            'action' => $action,
            'target_institutions' => $targetInstitutions,
            'notifications_sent' => count($notifications),
        ]);
    }
}
