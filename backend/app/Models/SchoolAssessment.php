<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolAssessment extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'assessment_type_id',
        'assessment_stage_id',
        'institution_id',
        'created_by',
        'scheduled_date',
        'title',
        'subjects',
        'grade_levels',
        'total_students',
        'participants_count',
        'status',
        'notes',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'subjects' => 'array',
        'grade_levels' => 'array',
        'total_students' => 'integer',
        'participants_count' => 'integer',
    ];

    protected $appends = ['generated_title'];

    public const STATUS_DRAFT = 'draft';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_SUBMITTED = 'submitted';

    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(AssessmentStage::class, 'assessment_stage_id');
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function classResults(): HasMany
    {
        return $this->hasMany(ClassAssessmentResult::class);
    }

    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Auto-generated title from assessment type and stage
     */
    public function getGeneratedTitleAttribute(): string
    {
        $typeName = $this->assessmentType->name ?? 'N/A';
        $stageName = $this->stage->name ?? 'N/A';

        return $typeName . ' - ' . $stageName;
    }
}
