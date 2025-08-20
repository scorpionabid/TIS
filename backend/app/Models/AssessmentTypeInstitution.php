<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentTypeInstitution extends Model
{
    use HasFactory;

    protected $fillable = [
        'assessment_type_id',
        'institution_id',
        'assigned_date',
        'due_date',
        'is_active',
        'notification_settings',
        'assigned_by',
        'notes',
    ];

    protected $casts = [
        'assigned_date' => 'date',
        'due_date' => 'date',
        'is_active' => 'boolean',
        'notification_settings' => 'array',
    ];

    /**
     * Get the assessment type that this assignment belongs to.
     */
    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    /**
     * Get the institution that this assignment belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who assigned this assessment type.
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Check if the assignment is overdue.
     */
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast();
    }

    /**
     * Check if the assignment is due soon (within specified days).
     */
    public function isDueSoon(int $days = 7): bool
    {
        return $this->due_date && $this->due_date->diffInDays(now()) <= $days;
    }

    /**
     * Get notification settings with defaults.
     */
    public function getNotificationSettingsAttribute($value): array
    {
        $settings = $value ? json_decode($value, true) : [];
        
        return array_merge([
            'days_before_due' => 7,
            'enabled' => true,
            'email_notifications' => true,
            'in_app_notifications' => true,
        ], $settings);
    }
}