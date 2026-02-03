<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'notes'
    ];

    protected $casts = [
        'date' => 'date',
        'verification_status' => 'boolean',
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
}
