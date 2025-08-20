<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportResult extends Model
{
    use HasFactory;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'report_id',
        'result_data',
        'file_path',
        'generation_duration',
        'is_latest',
        'metadata',
        'generated_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'result_data' => 'array',
            'generation_duration' => 'integer',
            'is_latest' => 'boolean',
            'metadata' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    /**
     * Get the report that this result belongs to.
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /**
     * Get generation duration in human readable format.
     */
    public function getGenerationDurationHumanAttribute(): string
    {
        if (!$this->generation_duration) {
            return 'N/A';
        }

        if ($this->generation_duration < 1000) {
            return $this->generation_duration . 'ms';
        }

        return round($this->generation_duration / 1000, 2) . 's';
    }

    /**
     * Get file size if file exists.
     */
    public function getFileSizeAttribute(): ?int
    {
        if (!$this->file_path || !file_exists($this->file_path)) {
            return null;
        }

        return filesize($this->file_path);
    }

    /**
     * Get file size in human readable format.
     */
    public function getFileSizeHumanAttribute(): ?string
    {
        $size = $this->file_size;
        if (!$size) {
            return null;
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $power = $size > 0 ? floor(log($size, 1024)) : 0;
        return number_format($size / pow(1024, $power), 2) . ' ' . $units[$power];
    }

    /**
     * Scope to get latest results.
     */
    public function scopeLatest($query)
    {
        return $query->where('is_latest', true);
    }

    /**
     * Scope to get results by report.
     */
    public function scopeByReport($query, int $reportId)
    {
        return $query->where('report_id', $reportId);
    }

    /**
     * Scope to get recent results.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('generated_at', '>=', now()->subDays($days));
    }
}