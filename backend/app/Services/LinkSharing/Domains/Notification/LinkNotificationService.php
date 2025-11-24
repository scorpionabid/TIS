<?php

namespace App\Services\LinkSharing\Domains\Notification;

use App\Models\LinkShare;
use App\Services\LinkSharing\Domains\Configuration\LinkConfigurationService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

/**
 * Link Notification Service
 *
 * Handles sending notifications for link sharing events.
 */
class LinkNotificationService
{
    public function __construct(
        protected NotificationService $notificationService,
        protected LinkConfigurationService $configService
    ) {}

    /**
     * Send link sharing notification to target institutions
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 733-765)
     */
    public function sendLinkNotification(LinkShare $linkShare, string $action, array $targetInstitutions, $user): array
    {
        $templateKey = $action; // 'link_shared'

        // Prepare notification variables
        $variables = [
            'link_title' => $linkShare->title,
            'link_description' => $linkShare->description ?? '',
            'creator_name' => $user->name ?? 'Sistem',
            'link_url' => $linkShare->url,
        ];

        // Prepare recipients with institution-based targeting
        $recipients = [
            'institutions' => $targetInstitutions,
            'target_roles' => $linkShare->target_roles ?? null,
        ];

        $options = [
            'related' => $linkShare,
            'priority' => $this->configService->mapLinkPriorityToNotificationPriority($linkShare->priority ?? 'normal'),
        ];

        Log::info('Sending link notification', [
            'template_key' => $templateKey,
            'link_id' => $linkShare->id,
            'target_institutions' => $targetInstitutions,
            'target_roles' => $linkShare->target_roles,
            'variables' => array_keys($variables),
        ]);

        return $this->notificationService->sendFromTemplate($templateKey, $recipients, $variables, $options);
    }
}
