<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * RatingConfiguration Model - Rating Component Weights & Rules
 */
class RatingConfiguration extends Model
{
    use HasFactory;

    protected $table = 'rating_configuration';

    protected $fillable = [
        'component_name',
        'weight',
        'year_weights',
        'growth_bonus_rules',
        'updated_by_user_id',
    ];

    protected $casts = [
        'weight' => 'float',
        'year_weights' => 'array',
        'growth_bonus_rules' => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('weight', '>', 0);
    }

    /**
     * Get year weight for specific academic year
     */
    public function getYearWeight(string $academicYear): float
    {
        $weights = $this->year_weights ?? [];
        return $weights[$academicYear] ?? 0.0;
    }

    /**
     * Check if growth bonus is enabled
     */
    public function hasGrowthBonus(): bool
    {
        return ($this->growth_bonus_rules['enabled'] ?? false) === true;
    }
}
