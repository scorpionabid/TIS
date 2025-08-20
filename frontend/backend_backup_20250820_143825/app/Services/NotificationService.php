<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\User;
use App\Models\Task;
use App\Models\Survey;
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
                    }
                }
            }

            if (isset($recipients['institutions'])) {
                $notificationData['target_institutions'] = $recipients['institutions'];
                $notification = $this->send($notificationData);
                if ($notification) {
                    $notifications[] = $notification;
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
            switch ($notification->channel) {
                case 'email':
                    return $this->sendEmail($notification);
                case 'sms':
                    return $this->sendSMS($notification);
                case 'in_app':
                    return $this->sendInApp($notification);
                case 'push':
                    return $this->sendPush($notification);
                default:
                    Log::warning("Unknown notification channel: {$notification->channel}");
                    return false;
            }
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

    // Quick notification methods for common scenarios

    /**
     * Send task assigned notification
     */
    public function sendTaskAssigned(Task $task): array
    {
        return $this->sendFromTemplate(
            'task_assigned',
            ['users' => [$task->assigned_to]],
            [
                'task_title' => $task->title,
                'task_category' => $task->category_label,
                'creator_name' => $task->creator->name,
                'deadline' => $task->deadline ? $task->deadline->format('d.m.Y H:i') : 'Müddət təyin edilməyib',
            ],
            [
                'related' => $task,
                'priority' => $task->priority === 'tecili' ? 'high' : 'normal',
            ]
        );
    }

    /**
     * Send task deadline warning
     */
    public function sendTaskDeadlineWarning(Task $task): array
    {
        return $this->sendFromTemplate(
            'task_deadline',
            ['users' => [$task->assigned_to, $task->created_by]],
            [
                'task_title' => $task->title,
                'deadline' => $task->deadline->format('d.m.Y H:i'),
                'hours_remaining' => $task->deadline->diffInHours(now()),
            ],
            [
                'related' => $task,
                'priority' => 'high',
            ]
        );
    }

    /**
     * Send survey published notification
     */
    public function sendSurveyPublished(Survey $survey, array $targetUsers): array
    {
        return $this->sendFromTemplate(
            'survey_published',
            ['users' => $targetUsers],
            [
                'survey_title' => $survey->title,
                'survey_description' => $survey->description,
                'creator_name' => $survey->creator->name,
                'deadline' => $survey->deadline ? $survey->deadline->format('d.m.Y H:i') : '',
            ],
            [
                'related' => $survey,
                'priority' => 'normal',
            ]
        );
    }
}