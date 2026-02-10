<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AcademicYearTransition extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'source_academic_year_id',
        'target_academic_year_id',
        'institution_id',
        'initiated_by',
        'options',
        'status',
        'progress_percentage',
        'current_step',
        'grades_created',
        'grades_skipped',
        'students_promoted',
        'students_graduated',
        'students_retained',
        'students_skipped',
        'teacher_assignments_copied',
        'errors',
        'error_message',
        'can_rollback',
        'rollback_expires_at',
        'rollback_data',
        'started_at',
        'completed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'options' => 'array',
            'errors' => 'array',
            'rollback_data' => 'array',
            'can_rollback' => 'boolean',
            'rollback_expires_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Status constants
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_ROLLED_BACK = 'rolled_back';

    /**
     * Get the source academic year.
     */
    public function sourceAcademicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'source_academic_year_id');
    }

    /**
     * Get the target academic year.
     */
    public function targetAcademicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'target_academic_year_id');
    }

    /**
     * Get the institution.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who initiated the transition.
     */
    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }

    /**
     * Get the transition details.
     */
    public function details(): HasMany
    {
        return $this->hasMany(AcademicYearTransitionDetail::class, 'transition_id');
    }

    /**
     * Scope for pending transitions.
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope for in-progress transitions.
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    /**
     * Scope for completed transitions.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope for failed transitions.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Check if transition can be rolled back.
     */
    public function canBeRolledBack(): bool
    {
        if (! $this->can_rollback) {
            return false;
        }

        if ($this->status !== self::STATUS_COMPLETED) {
            return false;
        }

        if ($this->rollback_expires_at && now()->isAfter($this->rollback_expires_at)) {
            return false;
        }

        return true;
    }

    /**
     * Check if transition is in progress.
     */
    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    /**
     * Check if transition is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if transition has failed.
     */
    public function hasFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Get total entities processed.
     */
    public function getTotalProcessedAttribute(): int
    {
        return $this->grades_created
            + $this->students_promoted
            + $this->students_graduated
            + $this->students_retained
            + $this->teacher_assignments_copied;
    }

    /**
     * Get summary statistics.
     */
    public function getSummary(): array
    {
        return [
            'grades' => [
                'created' => $this->grades_created,
                'skipped' => $this->grades_skipped,
            ],
            'students' => [
                'promoted' => $this->students_promoted,
                'graduated' => $this->students_graduated,
                'retained' => $this->students_retained,
                'skipped' => $this->students_skipped,
            ],
            'teachers' => [
                'assignments_copied' => $this->teacher_assignments_copied,
            ],
        ];
    }

    /**
     * Mark transition as started.
     */
    public function markAsStarted(): void
    {
        $this->update([
            'status' => self::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);
    }

    /**
     * Mark transition as completed.
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'completed_at' => now(),
            'progress_percentage' => 100,
            'rollback_expires_at' => now()->addHours(24),
        ]);
    }

    /**
     * Mark transition as failed.
     */
    public function markAsFailed(string $errorMessage, ?array $errors = null): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessage,
            'errors' => $errors,
            'completed_at' => now(),
        ]);
    }

    /**
     * Update progress.
     */
    public function updateProgress(int $percentage, ?string $currentStep = null): void
    {
        $data = ['progress_percentage' => min(100, max(0, $percentage))];

        if ($currentStep !== null) {
            $data['current_step'] = $currentStep;
        }

        $this->update($data);
    }

    /**
     * Increment counters.
     */
    public function incrementCounter(string $counter, int $amount = 1): void
    {
        $validCounters = [
            'grades_created',
            'grades_skipped',
            'students_promoted',
            'students_graduated',
            'students_retained',
            'students_skipped',
            'teacher_assignments_copied',
        ];

        if (in_array($counter, $validCounters)) {
            $this->increment($counter, $amount);
        }
    }
}
