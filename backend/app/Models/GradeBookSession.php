<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeBookSession extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'institution_id',
        'grade_id',
        'subject_id',
        'academic_year_id',
        'created_by',
        'title',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function columns(): HasMany
    {
        return $this->hasMany(GradeBookColumn::class);
    }

    public function teachers(): HasMany
    {
        return $this->hasMany(GradeBookTeacher::class);
    }

    public function assignedTeachers()
    {
        return $this->belongsToMany(User::class, 'grade_book_teachers', 'grade_book_session_id', 'teacher_id')
            ->withPivot('group_label', 'is_primary', 'assigned_by')
            ->withTimestamps();
    }
}
