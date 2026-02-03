<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherCertificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'issuer',
        'date',
        'expiry_date',
        'credential_id',
        'status',
        'certificate_url',
        'verification_url',
        'description',
        'skills',
        'level',
        'category'
    ];

    protected $casts = [
        'date' => 'date',
        'expiry_date' => 'date',
        'skills' => 'array',
        'verification_url' => 'string',
        'certificate_url' => 'string',
    ];

    /**
     * Certificate statuses
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_EXPIRED = 'expired';
    const STATUS_PENDING = 'pending';
    const STATUS_REVOKED = 'revoked';

    /**
     * Certificate levels
     */
    const LEVEL_BEGINNER = 'beginner';
    const LEVEL_INTERMEDIATE = 'intermediate';
    const LEVEL_ADVANCED = 'advanced';
    const LEVEL_EXPERT = 'expert';

    /**
     * Certificate categories
     */
    const CATEGORY_TEACHING = 'teaching';
    const CATEGORY_TECHNICAL = 'technical';
    const CATEGORY_LANGUAGE = 'language';
    const CATEGORY_MANAGEMENT = 'management';
    const CATEGORY_RESEARCH = 'research';
    const CATEGORY_OTHER = 'other';

    /**
     * Get the user that owns the certificate.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the teacher profile that owns the certificate.
     */
    public function teacherProfile(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class);
    }

    /**
     * Scope to get certificates by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get certificates by level.
     */
    public function scopeByLevel($query, $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope to get certificates by category.
     */
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get certificates by issuer.
     */
    public function scopeByIssuer($query, $issuer)
    {
        return $query->where('issuer', $issuer);
    }

    /**
     * Scope to get active certificates.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope to get expired certificates.
     */
    public function scopeExpired($query)
    {
        return $query->where('status', self::STATUS_EXPIRED)
                    ->orWhere(function ($q) {
                        $q->whereNotNull('expiry_date')
                          ->where('expiry_date', '<', now());
                    });
    }

    /**
     * Scope to get certificates expiring soon (within 30 days).
     */
    public function scopeExpiringSoon($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
                    ->whereNotNull('expiry_date')
                    ->where('expiry_date', '<=', now()->addDays(30))
                    ->where('expiry_date', '>', now());
    }

    /**
     * Scope to get certificates by date range.
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope to get certificates by year.
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
     * Get formatted expiry date.
     */
    public function getFormattedExpiryDateAttribute(): string
    {
        return $this->expiry_date ? $this->expiry_date->format('d.m.Y') : '';
    }

    /**
     * Get year from date.
     */
    public function getYearAttribute(): string
    {
        return $this->date ? $this->date->format('Y') : '';
    }

    /**
     * Check if certificate is expired.
     */
    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        
        return $this->expiry_date->isPast();
    }

    /**
     * Check if certificate is expiring soon (within 30 days).
     */
    public function isExpiringSoon(): bool
    {
        if (!$this->expiry_date || $this->isExpired()) {
            return false;
        }
        
        return $this->expiry_date->diffInDays(now()) <= 30;
    }

    /**
     * Get days until expiry.
     */
    public function getDaysUntilExpiryAttribute(): int
    {
        if (!$this->expiry_date) {
            return -1;
        }
        
        return $this->expiry_date->diffInDays(now());
    }

    /**
     * Get certificate age in years.
     */
    public function getAgeInYearsAttribute(): int
    {
        return $this->date ? $this->date->diffInYears(now()) : 0;
    }

    /**
     * Get status display name.
     */
    public function getStatusDisplayNameAttribute(): string
    {
        switch ($this->status) {
            case self::STATUS_ACTIVE:
                return 'Aktiv';
            case self::STATUS_EXPIRED:
                return 'Bitmiş';
            case self::STATUS_PENDING:
                return 'Gözləyən';
            case self::STATUS_REVOKED:
                return 'Ləğv edilmiş';
            default:
                return 'Məlum deyil';
        }
    }

    /**
     * Get level display name.
     */
    public function getLevelDisplayNameAttribute(): string
    {
        switch ($this->level) {
            case self::LEVEL_BEGINNER:
                return 'Başlanğıc';
            case self::LEVEL_INTERMEDIATE:
                return 'Orta';
            case self::LEVEL_ADVANCED:
                return 'İrəli';
            case self::LEVEL_EXPERT:
                return 'Ekspert';
            default:
                return 'Məlum deyil';
        }
    }

    /**
     * Get category display name.
     */
    public function getCategoryDisplayNameAttribute(): string
    {
        switch ($this->category) {
            case self::CATEGORY_TEACHING:
                return 'Tədris';
            case self::CATEGORY_TECHNICAL:
                return 'Texniki';
            case self::CATEGORY_LANGUAGE:
                return 'Dil';
            case self::CATEGORY_MANAGEMENT:
                return 'İdarəetmə';
            case self::CATEGORY_RESEARCH:
                return 'Tədqiqat';
            case self::CATEGORY_OTHER:
                return 'Digər';
            default:
                return 'Məlum deyil';
        }
    }

    /**
     * Get status color.
     */
    public function getStatusColorAttribute(): string
    {
        if ($this->isExpired()) {
            return 'red';
        }
        
        if ($this->isExpiringSoon()) {
            return 'yellow';
        }
        
        switch ($this->status) {
            case self::STATUS_ACTIVE:
                return 'green';
            case self::STATUS_PENDING:
                return 'blue';
            case self::STATUS_REVOKED:
                return 'red';
            default:
                return 'gray';
        }
    }

    /**
     * Check if certificate has specific skill.
     */
    public function hasSkill(string $skill): bool
    {
        return in_array($skill, $this->skills ?? []);
    }

    /**
     * Add a new skill.
     */
    public function addSkill(string $skill): void
    {
        $skills = $this->skills ?? [];
        $skills[] = $skill;
        $this->skills = array_unique($skills);
        $this->save();
    }

    /**
     * Remove a skill.
     */
    public function removeSkill(string $skill): void
    {
        $skills = $this->skills ?? [];
        $skills = array_values(array_filter($skills, fn($s) => $s !== $skill));
        $this->skills = $skills;
        $this->save();
    }

    /**
     * Get certificate validity period in years.
     */
    public function getValidityPeriodAttribute(): int
    {
        if (!$this->date || !$this->expiry_date) {
            return 0;
        }
        
        return $this->date->diffInYears($this->expiry_date);
    }
}
