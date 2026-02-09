<?php

namespace App\Models;

use App\Models\Traits\HasInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class AssessmentExcelImport extends Model
{
    use HasFactory, HasInstitution;

    protected $fillable = [
        'import_id',
        'assessment_type_id',
        'institution_id',
        'uploaded_by',
        'original_filename',
        'file_path',
        'file_size',
        'assessment_date',
        'grade_level',
        'class_name',
        'status',
        'total_rows',
        'successful_imports',
        'failed_imports',
        'errors',
        'warnings',
        'metadata',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'errors' => 'array',
        'warnings' => 'array',
        'metadata' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->import_id)) {
                $model->import_id = 'import_' . Str::random(16) . '_' . time();
            }
        });
    }

    /**
     * Get the assessment type for this import.
     */
    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    /**
     * Get the user who uploaded this file.
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Get the assessment entries created from this import.
     */
    public function assessmentEntries(): HasMany
    {
        return $this->hasMany(AssessmentEntry::class, 'excel_import_id');
    }

    /**
     * Calculate success rate as percentage.
     */
    public function getSuccessRateAttribute(): float
    {
        if ($this->total_rows === 0) {
            return 0;
        }

        return round(($this->successful_imports / $this->total_rows) * 100, 2);
    }

    /**
     * Check if import is in progress.
     */
    public function isInProgress(): bool
    {
        return $this->status === 'processing';
    }

    /**
     * Check if import was successful.
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'completed' && $this->failed_imports === 0;
    }

    /**
     * Check if import had partial success.
     */
    public function hasPartialSuccess(): bool
    {
        return $this->status === 'partial' || ($this->successful_imports > 0 && $this->failed_imports > 0);
    }

    /**
     * Mark import as completed.
     */
    public function markCompleted(): void
    {
        $this->update([
            'status' => $this->failed_imports > 0 ? 'partial' : 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark import as failed.
     */
    public function markFailed(array $errors = []): void
    {
        $this->update([
            'status' => 'failed',
            'errors' => $errors,
            'completed_at' => now(),
        ]);
    }

    /**
     * Add error to the import.
     */
    public function addError(array $error): void
    {
        $errors = $this->errors ?? [];
        $errors[] = $error;
        $this->update(['errors' => $errors]);
    }

    /**
     * Add warning to the import.
     */
    public function addWarning(string $warning): void
    {
        $warnings = $this->warnings ?? [];
        $warnings[] = $warning;
        $this->update(['warnings' => $warnings]);
    }

    /**
     * Get formatted file size.
     */
    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }
}
