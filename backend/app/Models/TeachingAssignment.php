<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * TeachingAssignment Model - Class Teaching Assignments
 */
class TeachingAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'academic_year_id',
        'subject_id',
        'grade',
        'parallel_group',
        'weekly_hours',
    ];

    protected $casts = [
        'grade' => 'integer',
        'weekly_hours' => 'integer',
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
