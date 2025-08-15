<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Builder;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'message',
        'type',
        'priority',
        'channel',
        'user_id',
        'target_users',
        'target_institutions',
        'target_roles',
        'related_type',
        'related_id',
        'is_sent',
        'is_read',
        'sent_at',
        'read_at',
        'scheduled_at',
        'email_status',
        'sms_status',
        'delivery_error',
        'language',
        'translations',
        'metadata',
        'action_data',
    ];

    protected $casts = [
        'target_users' => 'array',
        'target_institutions' => 'array',
        'target_roles' => 'array',
        'is_sent' => 'boolean',
        'is_read' => 'boolean',
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'translations' => 'array',
        'metadata' => 'array',
        'action_data' => 'array',
    ];

    // Constants for notification types
    const TYPES = [
        'task_assigned' => 'Tapşırıq təyin edildi',
        'task_updated' => 'Tapşırıq yeniləndi',
        'task_deadline' => 'Tapşırıq müddəti',
        'survey_published' => 'Yeni sorğu',
        'survey_deadline' => 'Sorğu müddəti',
        'survey_approved' => 'Sorğu təsdiqləndi',
        'survey_rejected' => 'Sorğu rədd edildi',
        'system_alert' => 'Sistem bildirişi',
        'maintenance' => 'Sistem təmiri',
        'security_alert' => 'Təhlükəsizlik xəbərdarlığı',
    ];

    const PRIORITIES = [
        'low' => 'Aşağı',
        'normal' => 'Normal',
        'high' => 'Yüksək',
        'critical' => 'Kritik',
    ];

    const CHANNELS = [
        'in_app' => 'Tətbiq daxili',
        'email' => 'Email',
        'sms' => 'SMS',
        'push' => 'Push bildiriş',
    ];

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Polymorphic relationship to related entity
     */
    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope: Filter by user
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('user_id', $userId)
              ->orWhereJsonContains('target_users', $userId);
        });
    }

    /**
     * Scope: Filter by type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Filter by channel
     */
    public function scopeByChannel(Builder $query, string $channel): Builder
    {
        return $query->where('channel', $channel);
    }

    /**
     * Scope: Filter by priority
     */
    public function scopeByPriority(Builder $query, string $priority): Builder
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope: Unread notifications
     */
    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope: Read notifications
     */
    public function scopeRead(Builder $query): Builder
    {
        return $query->where('is_read', true);
    }

    /**
     * Scope: Unsent notifications
     */
    public function scopeUnsent(Builder $query): Builder
    {
        return $query->where('is_sent', false);
    }

    /**
     * Scope: Scheduled notifications ready to send
     */
    public function scopeReadyToSend(Builder $query): Builder
    {
        return $query->where('is_sent', false)
                    ->where(function ($q) {
                        $q->whereNull('scheduled_at')
                          ->orWhere('scheduled_at', '<=', now());
                    });
    }

    /**
     * Scope: Filter by institution access
     */
    public function scopeForInstitution(Builder $query, int $institutionId): Builder
    {
        return $query->whereJsonContains('target_institutions', $institutionId);
    }

    /**
     * Scope: Filter by role
     */
    public function scopeForRole(Builder $query, string $role): Builder
    {
        return $query->whereJsonContains('target_roles', $role);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(): bool
    {
        if (!$this->is_read) {
            return $this->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        }
        return true;
    }

    /**
     * Mark notification as sent
     */
    public function markAsSent(string $status = null): bool
    {
        $data = [
            'is_sent' => true,
            'sent_at' => now(),
        ];

        if ($status && $this->channel === 'email') {
            $data['email_status'] = $status;
        } elseif ($status && $this->channel === 'sms') {
            $data['sms_status'] = $status;
        }

        return $this->update($data);
    }

    /**
     * Mark delivery as failed
     */
    public function markAsFailed(string $error): bool
    {
        $data = [
            'delivery_error' => $error,
        ];

        if ($this->channel === 'email') {
            $data['email_status'] = 'failed';
        } elseif ($this->channel === 'sms') {
            $data['sms_status'] = 'failed';
        }

        return $this->update($data);
    }

    /**
     * Get translated title
     */
    public function getTranslatedTitle(string $language = null): string
    {
        $language = $language ?? $this->language ?? 'az';
        
        if ($this->translations && isset($this->translations[$language]['title'])) {
            return $this->translations[$language]['title'];
        }
        
        return $this->title;
    }

    /**
     * Get translated message
     */
    public function getTranslatedMessage(string $language = null): string
    {
        $language = $language ?? $this->language ?? 'az';
        
        if ($this->translations && isset($this->translations[$language]['message'])) {
            return $this->translations[$language]['message'];
        }
        
        return $this->message;
    }

    /**
     * Get type label
     */
    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    /**
     * Get priority label
     */
    public function getPriorityLabelAttribute(): string
    {
        return self::PRIORITIES[$this->priority] ?? $this->priority;
    }

    /**
     * Get channel label
     */
    public function getChannelLabelAttribute(): string
    {
        return self::CHANNELS[$this->channel] ?? $this->channel;
    }

    /**
     * Check if notification is for user (directly or through targeting)
     */
    public function isForUser(int $userId): bool
    {
        if ($this->user_id === $userId) {
            return true;
        }

        if ($this->target_users && in_array($userId, $this->target_users)) {
            return true;
        }

        // Check role-based targeting
        if ($this->target_roles) {
            $user = User::find($userId);
            if ($user) {
                foreach ($this->target_roles as $role) {
                    if ($user->hasRole($role)) {
                        return true;
                    }
                }
            }
        }

        // Check institution-based targeting
        if ($this->target_institutions) {
            $user = User::find($userId);
            if ($user && $user->institution_id && in_array($user->institution_id, $this->target_institutions)) {
                return true;
            }
        }

        return false;
    }
}