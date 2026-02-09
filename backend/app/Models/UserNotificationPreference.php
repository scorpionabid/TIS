<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotificationPreference extends Model
{
    use HasFactory, HasUser;

    protected $fillable = [
        'user_id',
        'task_deadline_reminder',
        'task_reminder_days',
        'task_assigned_notification',
        'task_status_change_notification',
        'task_comment_notification',
        'task_mention_notification',
        'email_enabled',
        'email_daily_digest',
        'email_digest_time',
        'in_app_enabled',
        'browser_push_enabled',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
    ];

    protected $casts = [
        'task_deadline_reminder' => 'boolean',
        'task_reminder_days' => 'integer',
        'task_assigned_notification' => 'boolean',
        'task_status_change_notification' => 'boolean',
        'task_comment_notification' => 'boolean',
        'task_mention_notification' => 'boolean',
        'email_enabled' => 'boolean',
        'email_daily_digest' => 'boolean',
        'in_app_enabled' => 'boolean',
        'browser_push_enabled' => 'boolean',
        'quiet_hours_enabled' => 'boolean',
    ];

    /**
     * Default preferences for new users
     */
    public static array $defaults = [
        'task_deadline_reminder' => true,
        'task_reminder_days' => 3,
        'task_assigned_notification' => true,
        'task_status_change_notification' => true,
        'task_comment_notification' => true,
        'task_mention_notification' => true,
        'email_enabled' => true,
        'email_daily_digest' => false,
        'email_digest_time' => '09:00',
        'in_app_enabled' => true,
        'browser_push_enabled' => false,
        'quiet_hours_enabled' => false,
        'quiet_hours_start' => '22:00',
        'quiet_hours_end' => '08:00',
    ];

    /**
     * Get the user that owns this preference
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get or create preferences for a user
     */
    public static function getForUser(int $userId): self
    {
        return self::firstOrCreate(
            ['user_id' => $userId],
            self::$defaults
        );
    }

    /**
     * Check if user wants deadline reminders
     */
    public function wantsDeadlineReminder(): bool
    {
        return $this->task_deadline_reminder && $this->email_enabled;
    }

    /**
     * Check if user wants mention notifications
     */
    public function wantsMentionNotification(): bool
    {
        return $this->task_mention_notification && ($this->email_enabled || $this->in_app_enabled);
    }

    /**
     * Check if it's currently quiet hours
     */
    public function isQuietHours(): bool
    {
        if (! $this->quiet_hours_enabled) {
            return false;
        }

        $now = now()->format('H:i');
        $start = $this->quiet_hours_start;
        $end = $this->quiet_hours_end;

        // Handle overnight quiet hours (e.g., 22:00 - 08:00)
        if ($start > $end) {
            return $now >= $start || $now < $end;
        }

        return $now >= $start && $now < $end;
    }
}
