<?php

namespace App\Notifications;

use App\Models\DataApprovalRequest;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\DatabaseMessage;

/**
 * Survey Approval Notification
 * 
 * Survey-specific notification sistemi
 * Mövcud notification sistemini extend edir
 */
class SurveyApprovalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected DataApprovalRequest $approvalRequest;
    protected string $notificationType;
    protected array $additionalData;

    public function __construct(DataApprovalRequest $approvalRequest, string $notificationType, array $additionalData = [])
    {
        $this->approvalRequest = $approvalRequest;
        $this->notificationType = $notificationType;
        $this->additionalData = $additionalData;
    }

    /**
     * Notification kanalları
     */
    public function via($notifiable): array
    {
        $channels = ['database'];

        // Email notification - role-based settings
        if ($this->shouldSendEmail($notifiable)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Email notification content
     */
    public function toMail($notifiable): MailMessage
    {
        $mailMessage = new MailMessage();

        switch ($this->notificationType) {
            case 'approval_required':
                return $this->approvalRequiredEmail($mailMessage, $notifiable);
            
            case 'approval_completed':
                return $this->approvalCompletedEmail($mailMessage, $notifiable);
            
            case 'approval_rejected':
                return $this->approvalRejectedEmail($mailMessage, $notifiable);
            
            case 'approval_delegated':
                return $this->approvalDelegatedEmail($mailMessage, $notifiable);
            
            case 'approval_deadline_reminder':
                return $this->deadlineReminderEmail($mailMessage, $notifiable);
            
            default:
                return $this->defaultEmail($mailMessage, $notifiable);
        }
    }

    /**
     * Database notification content
     */
    public function toDatabase($notifiable): array
    {
        $surveyInfo = $this->getSurveyInfo();
        
        return [
            'type' => 'survey_approval',
            'subtype' => $this->notificationType,
            'approval_request_id' => $this->approvalRequest->id,
            'title' => $this->getTitle(),
            'message' => $this->getMessage($notifiable),
            'survey_info' => $surveyInfo,
            'action_url' => $this->getActionUrl(),
            'priority' => $this->approvalRequest->priority ?? 'normal',
            'deadline' => $this->approvalRequest->deadline,
            'metadata' => array_merge($this->additionalData, [
                'institution_name' => $this->approvalRequest->institution->name ?? '',
                'submitted_by' => $this->approvalRequest->submitter->name ?? '',
                'current_status' => $this->approvalRequest->current_status,
            ]),
        ];
    }

    /**
     * Təsdiq tələb olunan email
     */
    protected function approvalRequiredEmail(MailMessage $message, $notifiable): MailMessage
    {
        $surveyInfo = $this->getSurveyInfo();
        $institutionName = $this->approvalRequest->institution->name ?? '';
        $submitterName = $this->approvalRequest->submitter->name ?? '';

        return $message
            ->subject("🔔 Yeni Survey Təsdiq Tələbi - {$surveyInfo['survey_title']}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("Sizin təsdiqqinizi gözləyən yeni survey cavabı var:")
            ->line("📋 **Survey:** {$surveyInfo['survey_title']}")
            ->line("🏢 **Müəssisə:** {$institutionName}")
            ->line("👤 **Təqdim edən:** {$submitterName}")
            ->line("📊 **Tamamlanma:** {$surveyInfo['progress_percentage']}%")
            ->line("⏰ **Prioritet:** " . $this->getPriorityLabel($this->approvalRequest->priority))
            ->when($this->approvalRequest->deadline, function ($message) {
                return $message->line("🕒 **Son tarix:** " . $this->approvalRequest->deadline->format('d.m.Y H:i'));
            })
            ->action('Survey Cavabını Yoxla', $this->getActionUrl())
            ->line("Təşəkkür edirik!")
            ->line("**ATİS - Azərbaycan Təhsil İdarəetmə Sistemi**");
    }

    /**
     * Təsdiq tamamlandı email
     */
    protected function approvalCompletedEmail(MailMessage $message, $notifiable): MailMessage
    {
        $surveyInfo = $this->getSurveyInfo();
        $approverName = $this->additionalData['approver_name'] ?? 'Sistem';

        return $message
            ->subject("✅ Survey Cavabınız Təsdiqləndi - {$surveyInfo['survey_title']}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("Survey cavabınız uğurla təsdiqləndi:")
            ->line("📋 **Survey:** {$surveyInfo['survey_title']}")
            ->line("✅ **Təsdiq edən:** {$approverName}")
            ->line("🕒 **Təsdiq tarixi:** " . now()->format('d.m.Y H:i'))
            ->when(isset($this->additionalData['comments']), function ($message) {
                return $message->line("💬 **Qeydlər:** {$this->additionalData['comments']}");
            })
            ->action('Survey Nəticələrini Göstər', $this->getActionUrl())
            ->line("Təşəkkür edirik!")
            ->line("**ATİS - Azərbaycan Təhsil İdarəetmə Sistemi**");
    }

    /**
     * Rədd edildi email
     */
    protected function approvalRejectedEmail(MailMessage $message, $notifiable): MailMessage
    {
        $surveyInfo = $this->getSurveyInfo();
        $rejectorName = $this->additionalData['rejector_name'] ?? 'Sistem';
        $reason = $this->additionalData['rejection_reason'] ?? 'Səbəb qeyd edilməyib';

        return $message
            ->subject("❌ Survey Cavabınız Rədd Edildi - {$surveyInfo['survey_title']}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("Təəssüf ki, survey cavabınız rədd edildi:")
            ->line("📋 **Survey:** {$surveyInfo['survey_title']}")
            ->line("❌ **Rədd edən:** {$rejectorName}")
            ->line("📝 **Səbəb:** {$reason}")
            ->line("🕒 **Rədd tarixi:** " . now()->format('d.m.Y H:i'))
            ->line("Zəhmət olmasa, cavabınızı yenidən nəzərdən keçirin və təkrar təqdim edin.")
            ->action('Survey-ı Yenidən Cavabla', $this->getActionUrl())
            ->line("Təşəkkür edirik!")
            ->line("**ATİS - Azərbaycan Təhsil İdarəetmə Sistemi**");
    }

    /**
     * Həvalə edildi email
     */
    protected function approvalDelegatedEmail(MailMessage $message, $notifiable): MailMessage
    {
        $surveyInfo = $this->getSurveyInfo();
        $delegatorName = $this->additionalData['delegator_name'] ?? '';
        $reason = $this->additionalData['delegation_reason'] ?? '';

        return $message
            ->subject("🔄 Survey Təsdiq Səlahiyyəti Həvalə Edildi - {$surveyInfo['survey_title']}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("Sizə survey təsdiq səlahiyyəti həvalə edildi:")
            ->line("📋 **Survey:** {$surveyInfo['survey_title']}")
            ->line("👤 **Həvalə edən:** {$delegatorName}")
            ->line("📝 **Səbəb:** {$reason}")
            ->line("⏰ **Həvalə müddəti:** " . ($this->additionalData['expiration_date'] ?? '7 gün'))
            ->line("Zəhmət olmasa, ətraflı məlumat üçün sistemi yoxlayın.")
            ->action('Həvalə Olunan Tələbi Yoxla', $this->getActionUrl())
            ->line("Təşəkkür edirik!")
            ->line("**ATİS - Azərbaycan Təhsil İdarəetmə Sistemi**");
    }

    /**
     * Son tarix xatırlatması email
     */
    protected function deadlineReminderEmail(MailMessage $message, $notifiable): MailMessage
    {
        $surveyInfo = $this->getSurveyInfo();
        $daysLeft = $this->additionalData['days_left'] ?? 1;

        return $message
            ->subject("⏰ Survey Təsdiq Deadline-ı - {$surveyInfo['survey_title']}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("Təsdiqqinizi gözləyən survey cavabının deadline-ı yaxınlaşır:")
            ->line("📋 **Survey:** {$surveyInfo['survey_title']}")
            ->line("🕒 **Qalan vaxt:** {$daysLeft} gün")
            ->line("📅 **Son tarix:** " . $this->approvalRequest->deadline->format('d.m.Y H:i'))
            ->line("Zəhmət olmasa, vaxtında təsdiq və ya rədd qərarı verin.")
            ->action('Survey-ı Təsdiq Et', $this->getActionUrl())
            ->line("Təşəkkür edirik!")
            ->line("**ATİS - Azərbaycan Təhsil İdarəetmə Sistemi**");
    }

    /**
     * Default email template
     */
    protected function defaultEmail(MailMessage $message, $notifiable): MailMessage
    {
        $surveyInfo = $this->getSurveyInfo();

        return $message
            ->subject("📋 Survey Bildirişi - {$surveyInfo['survey_title']}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("Survey ilə əlaqədar yeniliyin var:")
            ->line("📋 **Survey:** {$surveyInfo['survey_title']}")
            ->line("📝 **Status:** " . $this->getStatusLabel($this->approvalRequest->current_status))
            ->action('Ətraflı Məlumat', $this->getActionUrl())
            ->line("Təşəkkür edirik!")
            ->line("**ATİS - Azərbaycan Təhsil İdarəetmə Sistemi**");
    }

    /**
     * Email göndərilməli olub-olmadığını yoxla
     */
    protected function shouldSendEmail($notifiable): bool
    {
        // User preferences yoxla (email notification aktiv olub-olmadığı)
        $userPreferences = $notifiable->preferences ?? [];
        
        if (isset($userPreferences['email_notifications']) && !$userPreferences['email_notifications']) {
            return false;
        }

        // Təcili notification-lar həmişə email göndər
        if ($this->approvalRequest->priority === 'high' || $this->notificationType === 'approval_deadline_reminder') {
            return true;
        }

        // Role-based email settings
        $emailRoles = ['regionadmin', 'sektoradmin', 'schooladmin'];
        return in_array($notifiable->role, $emailRoles);
    }

    /**
     * Survey məlumatlarını əldə et
     */
    protected function getSurveyInfo(): array
    {
        $requestData = $this->approvalRequest->request_data ?? [];
        
        if (isset($requestData['survey_response_id'])) {
            $response = SurveyResponse::with(['survey', 'institution', 'respondent'])
                ->find($requestData['survey_response_id']);
            
            if ($response) {
                return [
                    'survey_title' => $response->survey->title,
                    'survey_category' => $response->survey->category ?? 'general',
                    'progress_percentage' => $response->progress_percentage,
                    'institution_name' => $response->institution->name,
                    'respondent_name' => $response->respondent->name,
                ];
            }
        }

        return [
            'survey_title' => $this->approvalRequest->request_title,
            'survey_category' => 'general',
            'progress_percentage' => 100,
            'institution_name' => $this->approvalRequest->institution->name ?? '',
            'respondent_name' => $this->approvalRequest->submitter->name ?? '',
        ];
    }

    /**
     * Notification title
     */
    protected function getTitle(): string
    {
        $titles = [
            'approval_required' => 'Survey Təsdiq Tələbi',
            'approval_completed' => 'Survey Təsdiqləndi',
            'approval_rejected' => 'Survey Rədd Edildi',
            'approval_delegated' => 'Survey Təsdiq Həvaləsi',
            'approval_deadline_reminder' => 'Survey Deadline Xatırlatması',
        ];

        return $titles[$this->notificationType] ?? 'Survey Bildirişi';
    }

    /**
     * Notification message
     */
    protected function getMessage($notifiable): string
    {
        $surveyInfo = $this->getSurveyInfo();
        
        $messages = [
            'approval_required' => "Sizin təsdiqqinizi gözləyən survey cavabı: {$surveyInfo['survey_title']}",
            'approval_completed' => "Survey cavabınız təsdiqləndi: {$surveyInfo['survey_title']}",
            'approval_rejected' => "Survey cavabınız rədd edildi: {$surveyInfo['survey_title']}",
            'approval_delegated' => "Survey təsdiq səlahiyyəti həvalə edildi: {$surveyInfo['survey_title']}",
            'approval_deadline_reminder' => "Survey təsdiq deadline-ı yaxınlaşır: {$surveyInfo['survey_title']}",
        ];

        return $messages[$this->notificationType] ?? "Survey bildirişi: {$surveyInfo['survey_title']}";
    }

    /**
     * Action URL
     */
    protected function getActionUrl(): string
    {
        $baseUrl = config('app.frontend_url', config('app.url'));
        return "{$baseUrl}/surveys/approval/{$this->approvalRequest->id}";
    }

    /**
     * Priority label
     */
    protected function getPriorityLabel(string $priority): string
    {
        $labels = [
            'low' => '🟢 Aşağı',
            'normal' => '🟡 Normal',
            'high' => '🔴 Yüksək',
        ];

        return $labels[$priority] ?? $labels['normal'];
    }

    /**
     * Status label
     */
    protected function getStatusLabel(string $status): string
    {
        $labels = [
            'pending' => 'Gözləyir',
            'in_progress' => 'İcrada',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'cancelled' => 'Ləğv edildi',
        ];

        return $labels[$status] ?? $labels['pending'];
    }
}