<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'criteria' => 'array',
        'grade_levels' => 'array',
        'subjects' => 'array',
        'max_score' => 'integer',
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
}