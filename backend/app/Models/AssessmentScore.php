<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AssessmentScore Model - Teacher Professional Assessments
 */
class AssessmentScore extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'academic_year_id',
        'assessment_type',
        'assessment_date',
        'total_score',
        'details',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'total_score' => 'float',
        'details' => 'array',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class, 'teacher_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function scopeByYear($query, int $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('assessment_type', $type);
    }
}
