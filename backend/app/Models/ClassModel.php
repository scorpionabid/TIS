<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassModel extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'institution_id',
        'academic_year_id',
        'name',
        'grade_level',
        'section',
        'max_capacity',
        'current_enrollment',
        'status',
        'class_teacher_id',
        'classroom_location',
        'schedule_preferences',
        'metadata',
    ];

    protected $casts = [
        'schedule_preferences' => 'array',
        'metadata' => 'array',
    ];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }
}

