<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class BulkAssessmentSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'assessment_type_id',
        'institution_id',
        'created_by',
        'assessment_date',
        'grade_level',
        'class_name',
        'entry_method',
        'status',
        'total_students',
        'completed_entries',
        'bulk_operations_log',
        'validation_errors',
        'started_at',
        'completed_at',
        'submitted_at',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'bulk_operations_log' => 'array',
        'validation_errors' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->session_id)) {
                $model->session_id = 'bulk_' . Str::random(12) . '_' . time();
            }
        });
    }

    /**
     * Get the assessment type for this session.
     */
    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    /**
     * Get the institution for this session.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who created this session.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the assessment entries for this session.
     */
    public function assessmentEntries(): HasMany
    {
        return $this->hasMany(AssessmentEntry::class, 'bulk_session_id', 'session_id');
    }

    /**
     * Calculate completion percentage.
     */
    public function getCompletionPercentageAttribute(): float
    {
        if ($this->total_students === 0) {
            return 0;
        }

        return round(($this->completed_entries / $this->total_students) * 100, 1);
    }

    /**
     * Check if session is active (in progress).
     */
    public function isActive(): bool
    {
        return in_array($this->status, ['draft', 'in_progress']);
    }

    /**
     * Check if session is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if session is submitted.
     */
    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    /**
     * Mark session as in progress.
     */
    public function markInProgress(): void
    {
        $this->update(['status' => 'in_progress']);
    }

    /**
     * Mark session as completed.
     */
    public function markCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark session as submitted.
     */
    public function markSubmitted(): void
    {
        $this->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);
    }

    /**
     * Log a bulk operation.
     */
    public function logBulkOperation(array $operation): void
    {
        $operations = $this->bulk_operations_log ?? [];
        $operations[] = array_merge($operation, [
            'timestamp' => now()->toISOString(),
        ]);

        $this->update(['bulk_operations_log' => $operations]);
    }

    /**
     * Add validation error.
     */
    public function addValidationError(array $error): void
    {
        $errors = $this->validation_errors ?? [];
        $errors[] = $error;
        $this->update(['validation_errors' => $errors]);
    }

    /**
     * Clear validation errors.
     */
    public function clearValidationErrors(): void
    {
        $this->update(['validation_errors' => []]);
    }

    /**
     * Update completion stats.
     */
    public function updateCompletionStats(): void
    {
        $completedCount = $this->assessmentEntries()
            ->whereNotNull('score')
            ->where('score', '!=', '')
            ->count();

        $this->update(['completed_entries' => $completedCount]);
    }

    /**
     * Get session summary.
     */
    public function getSummary(): array
    {
        return [
            'session_id' => $this->session_id,
            'status' => $this->status,
            'total_students' => $this->total_students,
            'completed_entries' => $this->completed_entries,
            'completion_percentage' => $this->completion_percentage,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'submitted_at' => $this->submitted_at,
            'has_validation_errors' => ! empty($this->validation_errors),
            'bulk_operations_count' => count($this->bulk_operations_log ?? []),
        ];
    }
}
