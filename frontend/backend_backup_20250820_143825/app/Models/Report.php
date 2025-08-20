<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Report extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'title',
        'description',
        'creator_id',
        'report_type',
        'query_parameters',
        'data_sources',
        'visualization_config',
        'access_level',
        'format',
        'schedule',
        'last_generated_at',
        'expiration_date',
        'is_featured',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'query_parameters' => 'array',
            'data_sources' => 'array',
            'visualization_config' => 'array',
            'last_generated_at' => 'datetime',
            'expiration_date' => 'datetime',
            'is_featured' => 'boolean',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the user who created this report.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    /**
     * Get the results for this report.
     */
    public function results(): HasMany
    {
        return $this->hasMany(ReportResult::class);
    }

    /**
     * Get the latest result for this report.
     */
    public function latestResult()
    {
        return $this->hasOne(ReportResult::class)->where('is_latest', true);
    }

    /**
     * Check if report has expired.
     */
    public function hasExpired(): bool
    {
        return $this->expiration_date && now()->gt($this->expiration_date);
    }

    /**
     * Check if report needs regeneration based on schedule.
     */
    public function needsRegeneration(): bool
    {
        if (!$this->schedule || !$this->last_generated_at) {
            return true;
        }

        // Simple schedule check - in production, use a proper cron parser
        $scheduleMapping = [
            'daily' => 1,
            'weekly' => 7,
            'monthly' => 30,
            'quarterly' => 90,
        ];

        $days = $scheduleMapping[$this->schedule] ?? null;
        if (!$days) {
            return false;
        }

        return $this->last_generated_at->addDays($days)->isPast();
    }

    /**
     * Mark report as generated.
     */
    public function markAsGenerated(): void
    {
        $this->last_generated_at = now();
        $this->save();
    }

    /**
     * Scope to get reports by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('report_type', $type);
    }

    /**
     * Scope to get reports by access level.
     */
    public function scopeByAccessLevel($query, string $accessLevel)
    {
        return $query->where('access_level', $accessLevel);
    }

    /**
     * Scope to get featured reports.
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to get active reports (not expired).
     */
    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expiration_date')
              ->orWhere('expiration_date', '>', now());
        });
    }

    /**
     * Scope to get reports created by user.
     */
    public function scopeCreatedBy($query, int $userId)
    {
        return $query->where('creator_id', $userId);
    }

    /**
     * Scope to search by title.
     */
    public function scopeSearchByTitle($query, string $search)
    {
        return $query->where('title', 'ILIKE', "%{$search}%");
    }
}