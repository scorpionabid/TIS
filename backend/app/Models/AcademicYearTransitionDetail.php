<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicYearTransitionDetail extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'transition_id',
        'entity_type',
        'source_entity_id',
        'target_entity_id',
        'action',
        'reason',
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
            'metadata' => 'array',
        ];
    }

    /**
     * Entity type constants
     */
    public const ENTITY_GRADE = 'grade';
    public const ENTITY_STUDENT_ENROLLMENT = 'student_enrollment';
    public const ENTITY_GRADE_SUBJECT = 'grade_subject';
    public const ENTITY_TEACHING_LOAD = 'teaching_load';
    public const ENTITY_HOMEROOM_TEACHER = 'homeroom_teacher';

    /**
     * Action constants
     */
    public const ACTION_CREATED = 'created';
    public const ACTION_PROMOTED = 'promoted';
    public const ACTION_GRADUATED = 'graduated';
    public const ACTION_RETAINED = 'retained';
    public const ACTION_SKIPPED = 'skipped';
    public const ACTION_FAILED = 'failed';
    public const ACTION_COPIED = 'copied';

    /**
     * Get the parent transition.
     */
    public function transition(): BelongsTo
    {
        return $this->belongsTo(AcademicYearTransition::class, 'transition_id');
    }

    /**
     * Scope by entity type.
     */
    public function scopeOfType($query, string $entityType)
    {
        return $query->where('entity_type', $entityType);
    }

    /**
     * Scope by action.
     */
    public function scopeWithAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope for grades.
     */
    public function scopeGrades($query)
    {
        return $query->where('entity_type', self::ENTITY_GRADE);
    }

    /**
     * Scope for student enrollments.
     */
    public function scopeStudentEnrollments($query)
    {
        return $query->where('entity_type', self::ENTITY_STUDENT_ENROLLMENT);
    }

    /**
     * Scope for successful actions.
     */
    public function scopeSuccessful($query)
    {
        return $query->whereIn('action', [
            self::ACTION_CREATED,
            self::ACTION_PROMOTED,
            self::ACTION_GRADUATED,
            self::ACTION_COPIED,
        ]);
    }

    /**
     * Scope for failed actions.
     */
    public function scopeFailed($query)
    {
        return $query->where('action', self::ACTION_FAILED);
    }

    /**
     * Check if action was successful.
     */
    public function isSuccessful(): bool
    {
        return in_array($this->action, [
            self::ACTION_CREATED,
            self::ACTION_PROMOTED,
            self::ACTION_GRADUATED,
            self::ACTION_COPIED,
        ]);
    }

    /**
     * Static helper to create a detail record.
     */
    public static function log(
        int $transitionId,
        string $entityType,
        string $action,
        ?int $sourceEntityId = null,
        ?int $targetEntityId = null,
        ?string $reason = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'transition_id' => $transitionId,
            'entity_type' => $entityType,
            'source_entity_id' => $sourceEntityId,
            'target_entity_id' => $targetEntityId,
            'action' => $action,
            'reason' => $reason,
            'metadata' => $metadata,
        ]);
    }
}
