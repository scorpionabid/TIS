<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeacherAchievement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'date',
        'type',
        'impact_level',
        'institution',
        'certificate_url',
        'verification_status',
        'notes',
        'category',
        'tags',
        'approval_status',
        'approval_rejection_reason',
        'approved_at',
        'approved_by'
    ];

    protected $casts = [
        'date' => 'date',
        'verification_status' => 'boolean',
        'tags' => 'array',
        'approved_at' => 'datetime',
    ];

    /**
     * Achievement types
     */
    const TYPE_AWARD = 'award';
    const TYPE_CERTIFICATION = 'certification';
    const TYPE_MILESTONE = 'milestone';
    const TYPE_RECOGNITION = 'recognition';
    const TYPE_PUBLICATION = 'publication';
    const TYPE_PRESENTATION = 'presentation';

    /**
     * Impact levels
     */
    const IMPACT_HIGH = 'high';
    const IMPACT_MEDIUM = 'medium';
    const IMPACT_LOW = 'low';

    /**
     * Get the user that owns the achievement.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the teacher profile that owns the achievement.
     */
    public function teacherProfile(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class);
    }

    /**
     * Get the approval requests for the achievement.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(TeacherProfileApproval::class, 'model_id')
                    ->where('model_type', TeacherProfileApproval::MODEL_TEACHER_ACHIEVEMENT);
    }

    /**
     * Get the admin who approved the achievement.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope to get achievements by type.
     */
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get achievements by impact level.
     */
    public function scopeByImpactLevel($query, $impactLevel)
    {
        return $query->where('impact_level', $impactLevel);
    }

    /**
     * Scope to get achievements by date range.
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope to get verified achievements.
     */
    public function scopeVerified($query)
    {
        return $query->where('verification_status', true);
    }

    /**
     * Scope to get achievements by year.
     */
    public function scopeByYear($query, $year)
    {
        return $query->whereYear('date', $year);
    }

    /**
     * Get formatted date.
     */
    public function getFormattedDateAttribute(): string
    {
        return $this->date ? $this->date->format('d.m.Y') : '';
    }

    /**
     * Get year from date.
     */
    public function getYearAttribute(): string
    {
        return $this->date ? $this->date->format('Y') : '';
    }

    /**
     * Get impact level color.
     */
    public function getImpactColorAttribute(): string
    {
        switch ($this->impact_level) {
            case self::IMPACT_HIGH:
                return 'red';
            case self::IMPACT_MEDIUM:
                return 'yellow';
            case self::IMPACT_LOW:
                return 'green';
            default:
                return 'gray';
        }
    }

    /**
     * Get type icon.
     */
    public function getTypeIconAttribute(): string
    {
        switch ($this->type) {
            case self::TYPE_AWARD:
                return 'award';
            case self::TYPE_CERTIFICATION:
                return 'certificate';
            case self::TYPE_MILESTONE:
                return 'milestone';
            case self::TYPE_RECOGNITION:
                return 'recognition';
            case self::TYPE_PUBLICATION:
                return 'publication';
            case self::TYPE_PRESENTATION:
                return 'presentation';
            default:
                return 'default';
        }
    }

    /**
     * Check if achievement is recent (within last year).
     */
    public function isRecent(): bool
    {
        return $this->date && $this->date->diffInDays(now()) <= 365;
    }

    /**
     * Get achievement age in years.
     */
    public function getAgeInYearsAttribute(): int
    {
        return $this->date ? $this->date->diffInYears(now()) : 0;
    }

    /**
     * Get achievement type display name.
     */
    public function getTypeDisplayNameAttribute(): string
    {
        switch ($this->type) {
            case self::TYPE_AWARD:
                return 'Mükafat';
            case self::TYPE_CERTIFICATION:
                return 'Sertifikat';
            case self::TYPE_MILESTONE:
                return 'Mərhələ';
            case self::TYPE_RECOGNITION:
                return 'Tanınma';
            case self::TYPE_PUBLICATION:
                return 'Nəşr';
            case self::TYPE_PRESENTATION:
                return 'Təqdimat';
            default:
                return 'Digər';
        }
    }

    /**
     * Get impact level display name.
     */
    public function getImpactDisplayNameAttribute(): string
    {
        switch ($this->impact_level) {
            case self::IMPACT_HIGH:
                return 'Yüksək';
            case self::IMPACT_MEDIUM:
                return 'Orta';
            case self::IMPACT_LOW:
                return 'Aşağı';
            default:
                return 'Məlum deyil';
        }
    }

    /**
     * Approval statuses
     */
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * Scope to get pending achievements.
     */
    public function scopePending($query)
    {
        return $query->where('approval_status', self::STATUS_PENDING);
    }

    /**
     * Scope to get approved achievements.
     */
    public function scopeApproved($query)
    {
        return $query->where('approval_status', self::STATUS_APPROVED);
    }

    /**
     * Scope to get rejected achievements.
     */
    public function scopeRejected($query)
    {
        return $query->where('approval_status', self::STATUS_REJECTED);
    }

    /**
     * Check if achievement is pending approval.
     */
    public function isPending(): bool
    {
        return $this->approval_status === self::STATUS_PENDING;
    }

    /**
     * Check if achievement is approved.
     */
    public function isApproved(): bool
    {
        return $this->approval_status === self::STATUS_APPROVED;
    }

    /**
     * Check if achievement is rejected.
     */
    public function isRejected(): bool
    {
        return $this->approval_status === self::STATUS_REJECTED;
    }

    /**
     * Approve the achievement.
     */
    public function approve(int $approvedBy): void
    {
        $this->update([
            'approval_status' => self::STATUS_APPROVED,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
            'approval_rejection_reason' => null
        ]);
    }

    /**
     * Reject the achievement.
     */
    public function reject(int $approvedBy, string $reason): void
    {
        $this->update([
            'approval_status' => self::STATUS_REJECTED,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
            'approval_rejection_reason' => $reason
        ]);
    }

    /**
     * Submit for approval.
     */
    public function submitForApproval(): void
    {
        $this->update([
            'approval_status' => self::STATUS_PENDING,
            'approval_rejection_reason' => null
        ]);
    }

    /**
     * Get approval status display name.
     */
    public function getApprovalStatusDisplayNameAttribute(): string
    {
        switch ($this->approval_status) {
            case self::STATUS_PENDING:
                return 'Gözləyir';
            case self::STATUS_APPROVED:
                return 'Təsdiqləndi';
            case self::STATUS_REJECTED:
                return 'Rədd edildi';
            default:
                return 'Məlum deyil';
        }
    }

    /**
     * Get approval status color.
     */
    public function getApprovalStatusColorAttribute(): string
    {
        switch ($this->approval_status) {
            case self::STATUS_PENDING:
                return 'yellow';
            case self::STATUS_APPROVED:
                return 'green';
            case self::STATUS_REJECTED:
                return 'red';
            default:
                return 'gray';
        }
    }
}
