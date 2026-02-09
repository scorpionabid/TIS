<?php

namespace App\Models;

use App\Models\Traits\HasActiveScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * PRD: Olimpiada bal cədvəlləri: səviyyə (rayon/region/ölkə/beynəlxalq),
 * tutduğu yer, şagird sayı bonusu
 */
class OlympiadLevelConfig extends Model
{
    use HasFactory, HasActiveScope;

    protected $fillable = [
        'level',
        'placement',
        'base_score',
        'student_bonus',
        'is_active',
    ];

    protected $casts = [
        'placement' => 'integer',
        'base_score' => 'decimal:2',
        'student_bonus' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Olympiad levels
     */
    public const LEVEL_RAYON = 'rayon';
    public const LEVEL_REGION = 'region';
    public const LEVEL_COUNTRY = 'country';
    public const LEVEL_INTERNATIONAL = 'international';

    public const LEVELS = [
        self::LEVEL_RAYON => 'Rayon',
        self::LEVEL_REGION => 'Region',
        self::LEVEL_COUNTRY => 'Ölkə',
        self::LEVEL_INTERNATIONAL => 'Beynəlxalq',
    ];

    /**
     * Scope by level.
     */
    public function scopeByLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    /**
     * PRD: Calculate score for an olympiad achievement.
     *
     * @param string $level Olympiad level (rayon, region, country, international)
     * @param int $placement Position (1, 2, 3, etc.)
     * @param int $studentCount Number of students who achieved this
     * @return float Calculated score
     */
    public static function calculateScore(string $level, int $placement, int $studentCount = 1): float
    {
        $config = self::where('level', $level)
            ->where('placement', $placement)
            ->where('is_active', true)
            ->first();

        if (!$config) {
            return 0;
        }

        // Base score + bonus for additional students (beyond the first one)
        return $config->base_score + ($config->student_bonus * max(0, $studentCount - 1));
    }

    /**
     * Get all active configs grouped by level.
     */
    public static function getAllByLevel(): array
    {
        return self::active()
            ->orderBy('level')
            ->orderBy('placement')
            ->get()
            ->groupBy('level')
            ->toArray();
    }
}
