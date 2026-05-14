<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegionPerformanceCache extends Model
{
    use HasFactory;

    protected $table = 'region_performance_cache';

    protected $fillable = [
        'region_id',
        'cache_key',
        'data_date',
        'total_institutions',
        'total_assessments',
        'average_score',
        'trend_percentage',
        'performance_distribution',
        'top_performers',
        'low_performers',
        'monthly_trends',
        'subject_performance',
        'district_breakdown',
        'expires_at',
    ];

    protected $casts = [
        'data_date' => 'date',
        'average_score' => 'decimal:2',
        'trend_percentage' => 'decimal:2',
        'performance_distribution' => 'array',
        'top_performers' => 'array',
        'low_performers' => 'array',
        'monthly_trends' => 'array',
        'subject_performance' => 'array',
        'district_breakdown' => 'array',
        'expires_at' => 'datetime',
    ];

    /**
     * Get the region (institution) this cache belongs to.
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'region_id');
    }

    /**
     * Check if the cache is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the cache is still valid.
     */
    public function isValid(): bool
    {
        return ! $this->isExpired();
    }

    /**
     * Generate cache key for region performance data.
     */
    public static function generateCacheKey(int $regionId, ?Carbon $date = null): string
    {
        $date = $date ?? now();

        return "region_performance_{$regionId}_{$date->format('Y_m_d')}";
    }

    /**
     * Get or create cache entry for region.
     */
    public static function getOrCreate(int $regionId, ?Carbon $date = null): self
    {
        $date = $date ?? now();
        $cacheKey = self::generateCacheKey($regionId, $date);

        return self::firstOrNew(
            ['cache_key' => $cacheKey],
            [
                'region_id' => $regionId,
                'data_date' => $date,
                'expires_at' => now()->addHours(6), // Cache for 6 hours
            ]
        );
    }

    /**
     * Update cache with fresh data.
     */
    public function updateData(array $data): bool
    {
        return $this->update(array_merge($data, [
            'expires_at' => now()->addHours(6),
        ]));
    }

    /**
     * Get performance distribution with labels.
     */
    public function getFormattedPerformanceDistribution(): array
    {
        $distribution = $this->performance_distribution ?? [];

        return [
            'excellent' => [
                'count' => $distribution['excellent'] ?? 0,
                'label' => 'Əla (90-100%)',
                'percentage' => $this->total_institutions > 0
                    ? round((($distribution['excellent'] ?? 0) / $this->total_institutions) * 100, 1)
                    : 0,
            ],
            'good' => [
                'count' => $distribution['good'] ?? 0,
                'label' => 'Yaxşı (80-89%)',
                'percentage' => $this->total_institutions > 0
                    ? round((($distribution['good'] ?? 0) / $this->total_institutions) * 100, 1)
                    : 0,
            ],
            'average' => [
                'count' => $distribution['average'] ?? 0,
                'label' => 'Orta (70-79%)',
                'percentage' => $this->total_institutions > 0
                    ? round((($distribution['average'] ?? 0) / $this->total_institutions) * 100, 1)
                    : 0,
            ],
            'poor' => [
                'count' => $distribution['poor'] ?? 0,
                'label' => 'Zəif (0-69%)',
                'percentage' => $this->total_institutions > 0
                    ? round((($distribution['poor'] ?? 0) / $this->total_institutions) * 100, 1)
                    : 0,
            ],
        ];
    }

    /**
     * Clean up expired cache entries.
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<', now())->delete();
    }
}
