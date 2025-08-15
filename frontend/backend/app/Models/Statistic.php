<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Statistic extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'institution_id',
        'time_period',
        'category',
        'data',
        'source',
        'is_verified',
        'verified_by',
        'verified_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'is_verified' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * Get the institution that this statistic belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who verified this statistic.
     */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Get a specific data point from the statistics.
     */
    public function getDataPoint(string $key, $default = null)
    {
        return $this->data[$key] ?? $default;
    }

    /**
     * Set a specific data point in the statistics.
     */
    public function setDataPoint(string $key, $value): void
    {
        $data = $this->data ?? [];
        $data[$key] = $value;
        $this->data = $data;
    }

    /**
     * Verify the statistic.
     */
    public function verify(User $verifier): void
    {
        $this->is_verified = true;
        $this->verified_by = $verifier->id;
        $this->verified_at = now();
        $this->save();
    }

    /**
     * Unverify the statistic.
     */
    public function unverify(): void
    {
        $this->is_verified = false;
        $this->verified_by = null;
        $this->verified_at = null;
        $this->save();
    }

    /**
     * Get time period type (year, quarter, month).
     */
    public function getTimePeriodTypeAttribute(): string
    {
        if (preg_match('/^\d{4}$/', $this->time_period)) {
            return 'year';
        }

        if (preg_match('/^\d{4}-Q[1-4]$/', $this->time_period)) {
            return 'quarter';
        }

        if (preg_match('/^\d{4}-\d{2}$/', $this->time_period)) {
            return 'month';
        }

        return 'unknown';
    }

    /**
     * Get human readable time period.
     */
    public function getTimePeriodHumanAttribute(): string
    {
        $type = $this->time_period_type;

        return match ($type) {
            'year' => $this->time_period . ' ili',
            'quarter' => str_replace('-Q', ' ili ', $this->time_period) . ' rüb',
            'month' => str_replace('-', ' ili ', $this->time_period) . ' ayı',
            default => $this->time_period,
        };
    }

    /**
     * Scope to get verified statistics.
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope to get unverified statistics.
     */
    public function scopeUnverified($query)
    {
        return $query->where('is_verified', false);
    }

    /**
     * Scope to get statistics by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get statistics by category.
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get statistics by time period.
     */
    public function scopeByTimePeriod($query, string $timePeriod)
    {
        return $query->where('time_period', $timePeriod);
    }

    /**
     * Scope to get statistics by time period type.
     */
    public function scopeByTimePeriodType($query, string $type)
    {
        return match ($type) {
            'year' => $query->where('time_period', 'REGEXP', '^\d{4}$'),
            'quarter' => $query->where('time_period', 'REGEXP', '^\d{4}-Q[1-4]$'),
            'month' => $query->where('time_period', 'REGEXP', '^\d{4}-\d{2}$'),
            default => $query,
        };
    }

    /**
     * Scope to get statistics by source.
     */
    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }

    /**
     * Scope to get recent statistics.
     */
    public function scopeRecent($query, int $months = 12)
    {
        $cutoffPeriod = now()->subMonths($months)->format('Y-m');
        return $query->where('time_period', '>=', $cutoffPeriod);
    }
}