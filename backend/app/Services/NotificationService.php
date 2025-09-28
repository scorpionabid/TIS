<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\User;
use App\Models\Task;
use App\Models\Survey;
use App\Events\NotificationSent;
use App\Services\InstitutionNotificationHelper;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send a notification
     */
    public function send(array $data): ?Notification
    {
        try {
            // Ensure required fields are present
            $required = ['title', 'message', 'type', 'channel', 'user_id'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    throw new \InvalidArgumentException("Missing required field: {$field}");
                }
            }
            
            // Set default values for optional fields
            $data = array_merge([
                'priority' => 'normal',
                'is_sent' => false,
                'is_read' => false,
                'language' => 'az',
            ], $data);
            
            // Create the notification
            $notification = Notification::create($data);
            
            // Log the creation
            Log::info('Notification created', [
                'id' => $notification->id,
                'type' => $notification->type,
                'user_id' => $notification->user_id,
            ]);
            
            // Send immediately if not scheduled
            if (!($data['scheduled_at'] ?? null)) {
                $this->deliver($notification);
            }
            
            return $notification;
            
        } catch (\Exception $e) {
            Log::error('Failed to create notification', [
                'error' => $e->getMessage(),
                'data' => $data,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Send notification using template
     */
    public function sendFromTemplate(
        string $templateKey, 
        array $recipients, 
        array $variables = [], 
        array $options = []
    ): array {
        Log::debug('Looking for notification template', [
            'key' => $templateKey,
            'recipients' => array_keys($recipients),
            'variables' => array_keys($variables),
            'options' => $options
        ]);
        
        $template = NotificationTemplate::where('key', $templateKey)
                                       ->where('is_active', true)
                                       ->first();
        
        if (!$template) {
            Log::error("Notification template not found: {$templateKey}");
            return [];
        }
        
        Log::debug('Found template', [
            'id' => $template->id,
            'channels' => $template->channels,
            'type' => $template->type
        ]);

        $notifications = [];
        $language = $options['language'] ?? 'az';
        $channels = $options['channels'] ?? $template->channels;

        foreach ($channels as $channel) {
            if (!$template->hasChannel($channel)) {
                continue;
            }

            $notificationData = [
                'title' => $template->render('title_template', $variables, $language),
                'message' => $template->render('message_template', $variables, $language),
                'type' => $template->type,
                'priority' => $options['priority'] ?? $template->priority,
                'channel' => $channel,
                'language' => $language,
                'scheduled_at' => $options['scheduled_at'] ?? null,
                'metadata' => $options['metadata'] ?? [],
                'action_data' => $options['action_data'] ?? [],
            ];

            // Add related entity if provided
            if (isset($options['related'])) {
                $notificationData['related_type'] = get_class($options['related']);
                $notificationData['related_id'] = $options['related']->id;
            }

            // Handle different recipient types
            if (isset($recipients['users'])) {
                $notificationData['target_users'] = $recipients['users'];
                
                // Create individual notifications for better tracking
                foreach ($recipients['users'] as $userId) {
                    $individualData = $notificationData;
                    $individualData['user_id'] = $userId;
                    unset($individualData['target_users']);

                    $notification = $this->send($individualData);
                    if ($notification) {
                        $notifications[] = $notification;

                        // Also broadcast immediately for template-based notifications
                        $user = User::find($userId);
                        if ($user && $notification->channel === 'in_app') {
                            $this->broadcastNotification($notification, $user);
                        }
                    }
                }
            }

            if (isset($recipients['institutions'])) {
                // Expand institution IDs to user IDs using hierarchy
                $targetRoles = $recipients['target_roles'] ?? null;
                $institutionUserIds = InstitutionNotificationHelper::expandInstitutionsToUsers(
                    $recipients['institutions'],
                    $targetRoles
                );

                Log::debug('NotificationService: Institution expansion', [
                    'template_key' => $templateKey,
                    'institutions' => $recipients['institutions'],
                    'target_roles' => $targetRoles,
                    'expanded_users' => count($institutionUserIds)
                ]);

                // Create individual notifications for each user
                foreach ($institutionUserIds as $userId) {
                    $individualData = $notificationData;
                    $individualData['user_id'] = $userId;
                    $individualData['target_institutions'] = $recipients['institutions']; // Keep for reference

                    // Ensure related entity information is preserved
                    if (isset($options['related'])) {
                        $individualData['related_type'] = get_class($options['related']);
                        $individualData['related_id'] = $options['related']->id;
                    }

                    $notification = $this->send($individualData);
                    if ($notification) {
                        $notifications[] = $notification;

                        // Also broadcast immediately for institution-based notifications
                        $user = User::find($userId);
                        if ($user && $notification->channel === 'in_app') {
                            $this->broadcastNotification($notification, $user);
                        }
                    }
                }
            }

            if (isset($recipients['roles'])) {
                $notificationData['target_roles'] = $recipients['roles'];
                $notification = $this->send($notificationData);
                if ($notification) {
                    $notifications[] = $notification;
                }
            }
        }

        return $notifications;
    }

    /**
     * Deliver notification through appropriate channel
     */
    public function deliver(Notification $notification): bool
    {
        try {
            $success = false;

            switch ($notification->channel) {
                case 'email':
                    $success = $this->sendEmail($notification);
                    break;
                case 'sms':
                    $success = $this->sendSMS($notification);
                    break;
                case 'in_app':
                    $success = $this->sendInApp($notification);
                    break;
                case 'push':
                    $success = $this->sendPush($notification);
                    break;
                default:
                    Log::warning("Unknown notification channel: {$notification->channel}");
                    return false;
            }

            // Broadcast real-time notification if successful
            if ($success && $notification->user) {
                $this->broadcastNotification($notification, $notification->user);
            }

            return $success;
        } catch (\Exception $e) {
            Log::error("Failed to deliver notification {$notification->id}: " . $e->getMessage());
            $notification->markAsFailed($e->getMessage());
            return false;
        }
    }

    /**
     * Send email notification
     */
    private function sendEmail(Notification $notification): bool
    {
        if (!$notification->user_id) {
            Log::warning("No user ID for email notification {$notification->id}");
            return false;
        }

        $user = User::find($notification->user_id);
        if (!$user || !$user->email) {
            Log::warning("User not found or no email for notification {$notification->id}");
            return false;
        }

        try {
            // Get email template if available
            $template = NotificationTemplate::where('type', $notification->type)
                                           ->where('is_active', true)
                                           ->first();

            $subject = $notification->getTranslatedTitle($notification->language);
            $body = $notification->getTranslatedMessage($notification->language);
            
            if ($template) {
                $variables = $this->getTemplateVariables($notification);
                $subject = $template->render('subject_template', $variables, $notification->language);
                
                if ($template->email_template) {
                    $body = $template->render('email_template', $variables, $notification->language);
                }
            }

            // Send email using NotificationEmail mailable
            Mail::to($user->email, $user->name)
                ->send(new \App\Mail\NotificationEmail([
                    'title' => $subject,
                    'body' => $body,
                    'notification_id' => $notification->id,
                ], $subject));

            $notification->markAsSent('delivered');
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send email notification {$notification->id}: " . $e->getMessage());
            $notification->markAsFailed("Email failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send SMS notification
     */
    private function sendSMS(Notification $notification): bool
    {
        if (!$notification->user_id) {
            Log::warning("No user ID for SMS notification {$notification->id}");
            return false;
        }

        $user = User::find($notification->user_id);
        if (!$user || !$user->phone) {
            Log::warning("User not found or no phone for notification {$notification->id}");
            return false;
        }

        try {
            // Get SMS template if available
            $template = NotificationTemplate::where('type', $notification->type)
                                           ->where('is_active', true)
                                           ->first();

            $message = $notification->getTranslatedMessage($notification->language);
            
            if ($template && $template->sms_template) {
                $variables = $this->getTemplateVariables($notification);
                $message = $template->render('sms_template', $variables, $notification->language);
            }

            // TODO: Integrate with SMS provider (e.g., local Azerbaijani SMS gateway)
            // For now, just log the message
            Log::info("SMS to {$user->phone}: {$message}");

            $notification->markAsSent('delivered');
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send SMS notification {$notification->id}: " . $e->getMessage());
            $notification->markAsFailed("SMS failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send in-app notification (just mark as sent, will be shown in UI)
     */
    private function sendInApp(Notification $notification): bool
    {
        $notification->markAsSent('delivered');
        return true;
    }

    /**
     * Send push notification
     */
    private function sendPush(Notification $notification): bool
    {
        // TODO: Implement push notification service
        Log::info("Push notification {$notification->id} - not implemented yet");
        $notification->markAsSent('pending');
        return true;
    }

    /**
     * Get template variables for notification
     */
    private function getTemplateVariables(Notification $notification): array
    {
        $variables = [
            'notification_title' => $notification->title,
            'notification_message' => $notification->message,
            'created_at' => $notification->created_at->format('d.m.Y H:i'),
        ];

        // Add user variables
        if ($notification->user) {
            $variables['user_name'] = $notification->user->name;
            $variables['user_email'] = $notification->user->email;
            $variables['user_username'] = $notification->user->username;
        }

        // Add related entity variables
        if ($notification->related) {
            switch ($notification->related_type) {
                case Task::class:
                    $task = $notification->related;
                    $variables['task_title'] = $task->title;
                    $variables['task_category'] = $task->category_label;
                    $variables['task_priority'] = $task->priority_label;
                    $variables['task_deadline'] = $task->deadline ? $task->deadline->format('d.m.Y H:i') : '';
                    break;
                    
                case Survey::class:
                    $survey = $notification->related;
                    $variables['survey_title'] = $survey->title;
                    $variables['survey_description'] = $survey->description;
                    $variables['survey_deadline'] = $survey->deadline ? $survey->deadline->format('d.m.Y H:i') : '';
                    break;
            }
        }

        // Add metadata variables
        if ($notification->metadata) {
            $variables = array_merge($variables, $notification->metadata);
        }

        return $variables;
    }

    /**
     * Process scheduled notifications
     */
    public function processScheduledNotifications(): int
    {
        $notifications = Notification::readyToSend()->get();
        $processed = 0;

        foreach ($notifications as $notification) {
            if ($this->deliver($notification)) {
                $processed++;
            }
        }

        return $processed;
    }

    /**
     * Mark notification as read for user
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = Notification::where('id', $notificationId)
                                   ->where(function ($q) use ($userId) {
                                       $q->where('user_id', $userId)
                                         ->orWhereJsonContains('target_users', $userId);
                                   })
                                   ->first();

        if ($notification) {
            return $notification->markAsRead();
        }

        return false;
    }

    /**
     * Mark all notifications as read for user
     */
    public function markAllAsRead(int $userId): int
    {
        return Notification::forUser($userId)
                          ->unread()
                          ->update([
                              'is_read' => true,
                              'read_at' => now(),
                          ]);
    }

    /**
     * Get unread count for user
     */
    public function getUnreadCount(int $userId): int
    {
        return Notification::forUser($userId)->unread()->count();
    }

    // Unified notification methods for common scenarios


    /**
     * Send survey notification with action
     */
    public function sendSurveyNotification(Survey $survey, string $action, array $users, array $extraData = []): array
    {
        $templateKey = "survey_{$action}"; // survey_assigned, survey_published, survey_approved, etc.

        // Default variables for all survey notifications
        $variables = array_merge([
            'survey_title' => $survey->title,
            'survey_description' => $survey->description ?? '',
            'creator_name' => $survey->creator->name ?? 'Sistem',
            'deadline' => $survey->end_date ? $survey->end_date->format('d.m.Y H:i') : '',
        ], $extraData);

        $recipients = ['users' => $users];
        $options = [
            'related' => $survey,
            'priority' => $this->mapSurveyPriorityToNotificationPriority($survey->priority ?? 'normal'),
        ];

        return $this->sendFromTemplate($templateKey, $recipients, $variables, $options);
    }

    /**
     * Map task priority to notification priority
     */
    private function mapTaskPriorityToNotificationPriority(string $taskPriority): string
    {
        return match ($taskPriority) {
            'urgent', 'tecili' => 'high',
            'high' => 'high',
            'medium' => 'normal',
            'low' => 'low',
            default => 'normal',
        };
    }

    /**
     * Map survey priority to notification priority
     */
    private function mapSurveyPriorityToNotificationPriority(string $surveyPriority): string
    {
        return match ($surveyPriority) {
            'urgent' => 'high',
            'high' => 'high',
            'medium' => 'normal',
            'low' => 'low',
            default => 'normal',
        };
    }

    /**
     * Send document notification
     */
    public function sendDocumentNotification($document, string $action, array $users, array $extraData = []): array
    {
        $templateKey = "document_{$action}"; // document_shared, document_uploaded, etc.

        // Default variables for all document notifications
        $variables = array_merge([
            'document_title' => $document['title'] ?? $document['name'] ?? 'N/A',
            'document_type' => $document['type'] ?? 'document',
            'creator_name' => $extraData['creator_name'] ?? 'Sistem',
            'creator_institution' => $extraData['creator_institution'] ?? '',
            'share_message' => $extraData['share_message'] ?? '',
            'file_size' => isset($document['file_size']) ? $this->formatFileSize($document['file_size']) : '',
            'action_url' => $extraData['action_url'] ?? "/documents/{$document['id']}",
        ], $extraData);

        $recipients = ['users' => $users];
        $options = [
            'related' => is_object($document) ? $document : null,
            'priority' => $extraData['priority'] ?? 'normal',
        ];

        return $this->sendFromTemplate($templateKey, $recipients, $variables, $options);
    }

    /**
     * Send link notification
     */
    public function sendLinkNotification($linkShare, string $action, array $users, array $extraData = []): array
    {
        $templateKey = "link_{$action}"; // link_shared, link_created, etc.

        // Default variables for all link notifications
        $variables = array_merge([
            'link_title' => $linkShare['title'] ?? 'Yeni Bağlantı',
            'link_url' => $linkShare['url'] ?? '',
            'link_type' => $extraData['link_type'] ?? 'external',
            'creator_name' => $extraData['creator_name'] ?? 'Sistem',
            'creator_institution' => $extraData['creator_institution'] ?? '',
            'description' => $extraData['description'] ?? '',
            'share_scope' => $extraData['share_scope'] ?? 'institutional',
            'expires_at' => $extraData['expires_at'] ?? '',
            'action_url' => $extraData['action_url'] ?? "/links/{$linkShare['id']}",
        ], $extraData);

        $recipients = ['users' => $users];
        $options = [
            'related' => is_object($linkShare) ? $linkShare : null,
            'priority' => $extraData['priority'] ?? 'normal',
        ];

        return $this->sendFromTemplate($templateKey, $recipients, $variables, $options);
    }

    /**
     * Send task notification
     */
    public function sendTaskNotification($task, string $action, array $users, array $extraData = []): array
    {
        $templateKey = "task_{$action}"; // task_assigned, task_completed, task_deadline, etc.

        // Default variables for all task notifications
        $variables = array_merge([
            'task_title' => $task->title ?? 'Yeni Tapşırıq',
            'task_category' => $task->category ?? 'other',
            'task_priority' => $task->priority ?? 'normal',
            'creator_name' => $extraData['creator_name'] ?? 'Sistem',
            'creator_institution' => $extraData['creator_institution'] ?? '',
            'description' => $extraData['description'] ?? '',
            'due_date' => $extraData['due_date'] ?? '',
            'target_institution' => $extraData['target_institution'] ?? '',
            'priority_label' => $this->getTaskPriorityLabel($task->priority ?? 'normal'),
            'category_label' => $this->getTaskCategoryLabel($task->category ?? 'other'),
            'action_url' => $extraData['action_url'] ?? "/tasks/{$task->id}",
        ], $extraData);

        $recipients = ['users' => $users];
        $options = [
            'related' => $task,
            'priority' => $this->mapTaskPriorityToNotificationPriority($task->priority ?? 'normal'),
        ];

        return $this->sendFromTemplate($templateKey, $recipients, $variables, $options);
    }

    /**
     * Get task priority label in Azerbaijani
     */
    private function getTaskPriorityLabel(string $priority): string
    {
        return match ($priority) {
            'urgent' => 'Təcili',
            'high' => 'Yüksək',
            'medium' => 'Orta',
            'low' => 'Aşağı',
            default => 'Orta',
        };
    }

    /**
     * Get task category label in Azerbaijani
     */
    private function getTaskCategoryLabel(string $category): string
    {
        return match ($category) {
            'report' => 'Hesabat',
            'maintenance' => 'Təmir',
            'event' => 'Tədbir',
            'audit' => 'Audit',
            'instruction' => 'Təlimat',
            'other' => 'Digər',
            default => 'Digər',
        };
    }

    /**
     * Format file size for display
     */
    private function formatFileSize(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }

    /**
     * Broadcast notification to WebSocket channels
     */
    protected function broadcastNotification(Notification $notification, User $user): void
    {
        try {
            // Use existing NotificationSent event for broadcasting
            NotificationSent::dispatch($notification, $user);

            Log::info("Notification {$notification->id} broadcasted to user {$user->id}", [
                'notification_type' => $notification->type,
                'channel' => $notification->channel,
                'user_id' => $user->id,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to broadcast notification {$notification->id}: " . $e->getMessage());
        }
    }

    /**
     * Broadcast notification to multiple users
     */
    protected function broadcastToMultipleUsers(Notification $notification, array $userIds): void
    {
        foreach ($userIds as $userId) {
            $user = User::find($userId);
            if ($user) {
                $this->broadcastNotification($notification, $user);
            }
        }
    }
}