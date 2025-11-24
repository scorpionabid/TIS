<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

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

    protected $appends = [
        'ui_type',
        'display_type',
    ];

    // Constants for notification types
    const TYPES = [
        'task_assigned' => 'Tapşırıq təyin edildi',
        'task_updated' => 'Tapşırıq yeniləndi',
        'task_deadline' => 'Tapşırıq müddəti',
        'survey_published' => 'Yeni sorğu',
        'survey_assigned' => 'Survey təyinatı',
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

    // Type mappings for frontend consistency
    const TYPE_MAPPINGS = [
        'task_assigned' => ['ui_type' => 'task', 'display_type' => 'info'],
        'task_updated' => ['ui_type' => 'task', 'display_type' => 'info'],
        'task_deadline' => ['ui_type' => 'task', 'display_type' => 'warning'],
        'task_status_update' => ['ui_type' => 'task', 'display_type' => 'info'],
        'task_approved' => ['ui_type' => 'task', 'display_type' => 'success'],
        'task_rejected' => ['ui_type' => 'task', 'display_type' => 'warning'],
        'task_overdue' => ['ui_type' => 'task', 'display_type' => 'error'],
        'task_deadline_approaching' => ['ui_type' => 'task', 'display_type' => 'warning'],
        'task_approval_required' => ['ui_type' => 'task', 'display_type' => 'info'],
        'survey_published' => ['ui_type' => 'survey', 'display_type' => 'info'],
        'survey_assigned' => ['ui_type' => 'survey', 'display_type' => 'info'],
        'survey_assignment' => ['ui_type' => 'survey', 'display_type' => 'info'],
        'survey_deadline' => ['ui_type' => 'survey', 'display_type' => 'warning'],
        'survey_approved' => ['ui_type' => 'survey', 'display_type' => 'success'],
        'survey_rejected' => ['ui_type' => 'survey', 'display_type' => 'warning'],
        'system_alert' => ['ui_type' => 'system', 'display_type' => 'error'],
        'maintenance' => ['ui_type' => 'system', 'display_type' => 'warning'],
        'security_alert' => ['ui_type' => 'system', 'display_type' => 'error'],
        'document_shared' => ['ui_type' => 'document', 'display_type' => 'info'],
        'document_updated' => ['ui_type' => 'document', 'display_type' => 'info'],
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
     * Scope: Filter by user with institutional hierarchy
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        // Get user with roles and institution
        $user = User::with(['institution', 'roles'])->find($userId);
        if (! $user) {
            return $query->whereRaw('1 = 0'); // No access if user not found
        }

        // SuperAdmin sees all notifications (no filtering)
        if ($user->hasRole('superadmin')) {
            return $query; // No restrictions for superadmin
        }

        // For other roles, apply institutional hierarchy filtering
        return $query->where(function ($q) use ($userId, $user) {
            // Basic user targeting (direct notifications)
            $q->where('user_id', $userId)
                ->orWhereJsonContains('target_users', $userId);

            // Add institutional scope filtering
            $userInstitutionId = $user->institution_id;
            $userRoles = $user->roles->pluck('name')->toArray();

            if (! $userInstitutionId) {
                // No institutional filtering if user has no institution
                return $q;
            }

            $userInstitution = $user->institution;

            if (in_array('regionadmin', $userRoles)) {
                // RegionAdmin sees notifications for their region and all child institutions
                $this->applyRegionAdminFilter($q, $userInstitution);
            } elseif (in_array('sektoradmin', $userRoles)) {
                // SektorAdmin sees notifications for their sector and all child schools
                $this->applySektorAdminFilter($q, $userInstitution);
            } elseif (in_array('schooladmin', $userRoles) || in_array('teacher', $userRoles)) {
                // SchoolAdmin and Teacher see only their school's notifications
                $this->applySchoolFilter($q, $userInstitutionId);
            }
        });
    }

    /**
     * Apply RegionAdmin institutional filter
     */
    private function applyRegionAdminFilter($query, $userInstitution)
    {
        // RegionAdmin sees all notifications from their region and child institutions
        $regionId = $userInstitution->type === 'region' ? $userInstitution->id : $userInstitution->parent_id;

        if ($regionId) {
            $query->whereHas('user.institution', function ($instQ) use ($regionId) {
                $instQ->where('id', $regionId)
                    ->orWhere('parent_id', $regionId)
                    ->orWhereHas('parent', function ($parentQ) use ($regionId) {
                        $parentQ->where('parent_id', $regionId);
                    });
            });
        }
    }

    /**
     * Apply SektorAdmin institutional filter
     */
    private function applySektorAdminFilter($query, $userInstitution)
    {
        // SektorAdmin sees notifications from their sector and child schools
        $sektorId = $userInstitution->type === 'sector' ? $userInstitution->id : $userInstitution->parent_id;

        if ($sektorId) {
            $query->whereHas('user.institution', function ($instQ) use ($sektorId) {
                $instQ->where('id', $sektorId)
                    ->orWhere('parent_id', $sektorId);
            });
        }
    }

    /**
     * Apply School-level filter
     */
    private function applySchoolFilter($query, $userInstitutionId)
    {
        // SchoolAdmin and Teacher see only their own school's notifications
        $query->whereHas('user.institution', function ($instQ) use ($userInstitutionId) {
            $instQ->where('id', $userInstitutionId);
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
        if (! $this->is_read) {
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
    public function markAsSent(?string $status = null): bool
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
    public function getTranslatedTitle(?string $language = null): string
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
    public function getTranslatedMessage(?string $language = null): string
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
     * Get UI type for frontend components
     */
    public function getUITypeAttribute(): string
    {
        return self::TYPE_MAPPINGS[$this->type]['ui_type'] ?? 'info';
    }

    /**
     * Get display type for frontend styling
     */
    public function getDisplayTypeAttribute(): string
    {
        return self::TYPE_MAPPINGS[$this->type]['display_type'] ?? 'info';
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
