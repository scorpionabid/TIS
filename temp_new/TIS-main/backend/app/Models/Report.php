<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class Report extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'description',
        'institution_id',
        'type',
        'status',
        'config',
        'parameters',
        'schedule_type',
        'schedule_config',
        'is_active',
        'created_by',
        'updated_by',
        'result_data',
        'result_files',
        'file_path',
        'file_size',
        'generation_time',
        'data_points_count',
        'generation_started_at',
        'generated_at',
        'generation_completed_at',
        'generation_failed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'config' => 'array',
            'parameters' => 'array',
            'schedule_config' => 'array',
            'is_active' => 'boolean',
            'result_data' => 'array',
            'result_files' => 'array',
            'generation_time' => 'integer',
            'data_points_count' => 'integer',
            'generation_started_at' => 'datetime',
            'generated_at' => 'datetime',
            'generation_completed_at' => 'datetime',
            'generation_failed_at' => 'datetime',
        ];
    }

    /**
     * Sync legacy columns when persisting for backwards compatibility.
     */
    protected static function booted(): void
    {
        static::saving(function (self $report) {
            if (Schema::hasColumn('reports', 'title') && $report->name) {
                $report->setAttribute('title', $report->name);
            }

            if (Schema::hasColumn('reports', 'report_type') && $report->type) {
                $report->setAttribute('report_type', $report->type);
            }

            if (Schema::hasColumn('reports', 'creator_id') && $report->created_by) {
                $report->setAttribute('creator_id', $report->created_by);
            }

            if (Schema::hasColumn('reports', 'query_parameters')) {
                $report->setAttribute(
                    'query_parameters',
                    json_encode($report->parameters ?? [])
                );
            }

            if (Schema::hasColumn('reports', 'visualization_config')) {
                $report->setAttribute(
                    'visualization_config',
                    json_encode($report->config ?? [])
                );
            }

            if (Schema::hasColumn('reports', 'data_sources')) {
                $config = $report->config ?? [];
                $report->setAttribute('data_sources', json_encode($config['sources'] ?? []));
            }

            if ($report->description === null) {
                $report->description = '';
            }
        });
    }

    /**
     * Get the user who created this report.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated the report.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the institution the report belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
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
        if (! $this->schedule_type || ! $this->generated_at) {
            return true;
        }

        $scheduleMapping = [
            'daily' => 1,
            'weekly' => 7,
            'monthly' => 30,
            'quarterly' => 90,
        ];

        $days = $scheduleMapping[$this->schedule_type] ?? null;
        if (! $days) {
            return false;
        }

        return $this->generated_at->addDays($days)->isPast();
    }

    /**
     * Mark report as generated.
     */
    public function markAsGenerated(): void
    {
        $this->generated_at = now();
        $this->generation_completed_at = now();
        $this->save();
    }

    /**
     * Scope to get reports by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
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
        return $query->where('is_active', true);
    }

    /**
     * Scope to get active reports (not expired).
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get reports created by user.
     */
    public function scopeCreatedBy($query, int $userId)
    {
        return $query->where('created_by', $userId);
    }

    /**
     * Scope to search by title.
     */
    public function scopeSearchByTitle($query, string $search)
    {
        return $query->where('name', 'ILIKE', "%{$search}%");
    }

    public function getNameAttribute($value): ?string
    {
        if ($value !== null) {
            return $value;
        }

        return $this->attributes['title'] ?? null;
    }

    public function getTypeAttribute($value): ?string
    {
        if ($value !== null) {
            return $value;
        }

        return $this->attributes['report_type'] ?? null;
    }

    public function getCreatedByAttribute($value): ?int
    {
        if ($value !== null) {
            return $value;
        }

        return $this->attributes['creator_id'] ?? null;
    }

    public function getParametersAttribute($value): ?array
    {
        if ($value !== null) {
            return is_string($value) ? json_decode($value, true) : $value;
        }

        if (array_key_exists('query_parameters', $this->attributes)) {
            $raw = $this->attributes['query_parameters'];

            return is_string($raw) ? json_decode($raw, true) : $raw;
        }

        return null;
    }

    public function getConfigAttribute($value): ?array
    {
        if ($value !== null) {
            return is_string($value) ? json_decode($value, true) : $value;
        }

        if (array_key_exists('visualization_config', $this->attributes)) {
            $raw = $this->attributes['visualization_config'];

            return is_string($raw) ? json_decode($raw, true) : $raw;
        }

        return null;
    }
}
