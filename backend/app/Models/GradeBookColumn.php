<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeBookColumn extends Model
{
    use HasFactory;

    protected $fillable = [
        'grade_book_session_id',
        'assessment_type_id',
        'assessment_stage_id',
        'semester',
        'column_label',
        'assessment_date',
        'max_score',
        'display_order',
        'column_type',
        'created_by',
        'is_archived',
    ];

    protected $casts = [
        'semester' => 'string',
        'column_type' => 'string',
        'assessment_date' => 'date',
        'max_score' => 'decimal:2',
        'is_archived' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(GradeBookSession::class, 'grade_book_session_id');
    }

    public function assessmentType(): BelongsTo
    {
        return $this->belongsTo(AssessmentType::class);
    }

    public function assessmentStage(): BelongsTo
    {
        return $this->belongsTo(AssessmentStage::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function cells(): HasMany
    {
        return $this->hasMany(GradeBookCell::class);
    }

    public function scopeInput($query)
    {
        return $query->where('column_type', 'input');
    }

    public function scopeCalculated($query)
    {
        return $query->where('column_type', 'calculated');
    }

    public function scopeBySemester($query, string $semester)
    {
        return $query->where('semester', $semester);
    }

    public function isCalculated(): bool
    {
        return $this->column_type === 'calculated';
    }
}
