<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * LessonObservation Model - Teacher Lesson Observations
 */
class LessonObservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'academic_year_id',
        'observation_date',
        'observer_name',
        'observer_position',
        'lesson_topic',
        'grade',
        'subject_id',
        'total_score',
        'feedback',
    ];

    protected $casts = [
        'observation_date' => 'date',
        'grade' => 'integer',
        'total_score' => 'float',
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
