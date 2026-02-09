<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstitutionImportHistory extends Model
{
    use HasFactory, HasUser;

    protected $table = 'institution_import_history';

    protected $fillable = [
        'user_id',
        'institution_type',
        'file_name',
        'file_size',
        'file_hash',
        'total_rows',
        'successful_imports',
        'failed_imports',
        'skipped_duplicates',
        'warnings_count',
        'import_results',
        'duplicate_analysis',
        'error_summary',
        'import_options',
        'status',
        'started_at',
        'completed_at',
        'processing_time_ms',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'import_results' => 'array',
        'duplicate_analysis' => 'array',
        'error_summary' => 'array',
        'import_options' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get institution type information
     */
    public function institutionType(): BelongsTo
    {
        return $this->belongsTo(InstitutionType::class, 'institution_type', 'key');
    }

    /**
     * Calculate success rate
     */
    public function getSuccessRateAttribute(): float
    {
        if ($this->total_rows == 0) {
            return 0;
        }

        return round(($this->successful_imports / $this->total_rows) * 100, 1);
    }

    /**
     * Get processing time in human readable format
     */
    public function getProcessingTimeHumanAttribute(): string
    {
        if (! $this->processing_time_ms) {
            return 'N/A';
        }

        $seconds = $this->processing_time_ms / 1000;

        if ($seconds < 1) {
            return $this->processing_time_ms . 'ms';
        } elseif ($seconds < 60) {
            return round($seconds, 1) . 's';
        }
        $minutes = floor($seconds / 60);
        $remainingSeconds = $seconds % 60;

        return $minutes . 'm ' . round($remainingSeconds) . 's';
    }

    /**
     * Get file size in human readable format
     */
    public function getFileSizeHumanAttribute(): string
    {
        if (! $this->file_size) {
            return 'N/A';
        }

        $bytes = (int) $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 1) . ' ' . $units[$i];
    }

    /**
     * Scope for recent imports
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope for user imports
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for institution type
     */
    public function scopeByInstitutionType($query, $type)
    {
        return $query->where('institution_type', $type);
    }

    /**
     * Scope for successful imports
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'completed')
            ->where('successful_imports', '>', 0);
    }

    /**
     * Scope for failed imports
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed')
            ->orWhere('successful_imports', 0);
    }
}
