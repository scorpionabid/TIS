<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * EducationHistory Model - Teacher Education Background
 */
class EducationHistory extends Model
{
    use HasFactory;

    protected $table = 'education_history';

    protected $fillable = [
        'teacher_id',
        'degree_level',
        'university_name',
        'faculty',
        'specialty',
        'graduation_year',
        'gpa',
        'diploma_number',
    ];

    protected $casts = [
        'graduation_year' => 'integer',
        'gpa' => 'float',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class, 'teacher_id');
    }
}
