<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AssessmentType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'category',
        'is_active',
        'criteria',
        'max_score',
        'scoring_method',
        'grade_levels',
        'subjects',
        'created_by',
        'institution_id',
        'due_date',
        'is_recurring',
        'recurring_frequency',
        'notification_settings',
        'allows_bulk_entry',
        'allows_excel_import',
        'validation_rules',
        'minimum_score',
        'approval_required',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'criteria' => 'array',
        'grade_levels' => 'array',
        'subjects' => 'array',
        'max_score' => 'integer',
        'due_date' => 'date',
        'is_recurring' => 'boolean',
        'notification_settings' => 'array',
        'allows_bulk_entry' => 'boolean',
        'allows_excel_import' => 'boolean',
        'validation_rules' => 'array',
        'minimum_score' => 'decimal:2',
    ];

    /**
     * Get the user who created this assessment type
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the institution this assessment type belongs to
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get KSQ results for this assessment type
     */
    public function ksqResults(): HasMany
    {
        return $this->hasMany(KSQResult::class);
    }

    /**
     * Get BSQ results for this assessment type
     */
    public function bsqResults(): HasMany
    {
        return $this->hasMany(BSQResult::class);
    }

    /**
     * Get assessment entries for this type
     */
    public function assessmentEntries(): HasMany
    {
        return $this->hasMany(AssessmentEntry::class);
    }

    /**
     * Get assigned institutions for this assessment type
     */
    public function assignedInstitutions(): BelongsToMany
    {
        return $this->belongsToMany(Institution::class, 'assessment_type_institutions')
                    ->withPivot(['assigned_date', 'due_date', 'is_active', 'notification_settings', 'assigned_by', 'notes'])
                    ->withTimestamps();
    }

    /**
     * Get institution assignments for this assessment type
     */
    public function institutionAssignments(): HasMany
    {
        return $this->hasMany(AssessmentTypeInstitution::class);
    }

    /**
     * Get Excel imports for this assessment type
     */
    public function excelImports(): HasMany
    {
        return $this->hasMany(AssessmentExcelImport::class);
    }

    /**
     * Get bulk sessions for this assessment type
     */
    public function bulkSessions(): HasMany
    {
        return $this->hasMany(BulkAssessmentSession::class);
    }

    /**
     * Get analytics for this assessment type
     */
    public function analytics(): HasMany
    {
        return $this->hasMany(AssessmentAnalytics::class);
    }

    /**
     * Scope for active assessment types
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for KSQ types
     */
    public function scopeKSQ($query)
    {
        return $query->where('category', 'ksq');
    }

    /**
     * Scope for BSQ types
     */
    public function scopeBSQ($query)
    {
        return $query->where('category', 'bsq');
    }

    /**
     * Scope for custom types
     */
    public function scopeCustom($query)
    {
        return $query->where('category', 'custom');
    }

    /**
     * Scope for institution-specific types
     */
    public function scopeForInstitution($query, $institutionId)
    {
        return $query->where(function ($q) use ($institutionId) {
            $q->where('institution_id', $institutionId)
              ->orWhereNull('institution_id'); // Global types
        });
    }

    /**
     * Get the category label
     */
    public function getCategoryLabelAttribute(): string
    {
        return match($this->category) {
            'ksq' => 'Kiçik Summativ Qiymətləndirmə',
            'bsq' => 'Böyük Summativ Qiymətləndirmə',
            'custom' => 'Xüsusi Qiymətləndirmə',
            default => 'Bilinməyən'
        };
    }

    /**
     * Get the scoring method label
     */
    public function getScoringMethodLabelAttribute(): string
    {
        return match($this->scoring_method) {
            'percentage' => 'Faiz (%)',
            'points' => 'Bal',
            'grades' => 'Qiymət (A, B, C...)',
            default => 'Bilinməyən'
        };
    }

    /**
     * Assign this assessment type to institutions
     */
    public function assignToInstitutions(array $institutionIds, User $assignedBy, ?string $dueDate = null): void
    {
        $assignments = [];
        foreach ($institutionIds as $institutionId) {
            $assignments[$institutionId] = [
                'assigned_date' => now(),
                'due_date' => $dueDate,
                'is_active' => true,
                'assigned_by' => $assignedBy->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        $this->assignedInstitutions()->sync($assignments);
    }

    /**
     * Check if user can manage this assessment type
     */
    public function canBeEditedBy(User $user): bool
    {
        // SuperAdmin can edit all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can edit in their region
        if ($user->hasRole('regionadmin')) {
            if ($this->institution_id === null) return false; // Global types only for SuperAdmin
            return $this->institution?->region_id === $user->institution?->region_id;
        }

        // Only creator can edit (for other roles)
        return $this->created_by === $user->id;
    }

    /**
     * Check if assessment type is assigned to institution
     */
    public function isAssignedToInstitution(int $institutionId): bool
    {
        return $this->assignedInstitutions()->where('institution_id', $institutionId)->exists();
    }

    /**
     * Check if assessment type allows bulk entry
     */
    public function allowsBulkEntry(): bool
    {
        return $this->allows_bulk_entry;
    }

    /**
     * Check if assessment type allows Excel import
     */
    public function allowsExcelImport(): bool
    {
        return $this->allows_excel_import;
    }

    /**
     * Check if assessment type is overdue
     */
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast();
    }

    /**
     * Check if assessment type is due soon
     */
    public function isDueSoon(int $days = 7): bool
    {
        return $this->due_date && $this->due_date->diffInDays(now()) <= $days;
    }

    /**
     * Get notification settings with defaults
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