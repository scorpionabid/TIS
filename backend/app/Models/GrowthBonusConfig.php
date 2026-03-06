<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * PRD: Growth bonus qaydaları (opsional)
 * MVP üçün tövsiyə: 2024-2025 göstəricisi 2022-2023-dən 15+ bal yüksəkdirsə +2,
 * 25+ bal yüksəkdirsə +5 (cap +5)
 */
class GrowthBonusConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'threshold_min',
        'threshold_max',
        'bonus_score',
        'is_active',
    ];

    protected $casts = [
        'threshold_min' => 'decimal:2',
        'threshold_max' => 'decimal:2',
        'bonus_score' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * PRD: Maximum growth bonus cap
     */
    public const MAX_BONUS = 5.0;

    /**
     * Scope active configs.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * PRD: Calculate growth bonus based on improvement amount.
     *
     * The growth bonus rewards teachers who show improvement over time.
     * According to PRD MVP recommendation:
     * - 15+ bal artım = +2 bonus
     * - 25+ bal artım = +5 bonus (capped at +5)
     *
     * @param float $growthAmount The difference between current and baseline score
     * @return float The bonus score to apply
     */
    public static function calculateBonus(float $growthAmount): float
    {
        if ($growthAmount <= 0) {
            return 0;
        }

        // Find the applicable config (highest threshold that applies)
        $config = self::where('is_active', true)
            ->where('threshold_min', '<=', $growthAmount)
            ->where(function ($query) use ($growthAmount) {
                $query->whereNull('threshold_max')
                    ->orWhere('threshold_max', '>=', $growthAmount);
            })
            ->orderBy('threshold_min', 'desc')
            ->first();

        if (!$config) {
            return 0;
        }

        // Apply the bonus with cap
        return min($config->bonus_score, self::MAX_BONUS);
    }

    /**
     * Get all active configs ordered by threshold.
     */
    public static function getAllActive(): \Illuminate\Database\Eloquent\Collection
    {
        return self::active()
            ->orderBy('threshold_min')
            ->get();
    }

    /**
     * Check if growth amount qualifies for any bonus.
     */
    public static function qualifiesForBonus(float $growthAmount): bool
    {
        return self::active()
            ->where('threshold_min', '<=', $growthAmount)
            ->exists();
    }
}
