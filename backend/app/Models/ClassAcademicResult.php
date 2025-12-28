<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ClassAcademicResult Model - Student Academic Performance
 */
class ClassAcademicResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'academic_year_id',
        'subject_id',
        'grade',
        'parallel_group',
        'total_students',
        'excellent_count',
        'good_count',
        'satisfactory_count',
        'unsatisfactory_count',
        'success_rate',
        'quality_rate',
    ];

    protected $casts = [
        'grade' => 'integer',
        'total_students' => 'integer',
        'excellent_count' => 'integer',
        'good_count' => 'integer',
        'satisfactory_count' => 'integer',
        'unsatisfactory_count' => 'integer',
        'success_rate' => 'float',
        'quality_rate' => 'float',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class, 'teacher_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function scopeByYear($query, int $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }
}
