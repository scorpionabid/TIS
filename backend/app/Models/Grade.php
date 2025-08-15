<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grade extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'class_level',
        'academic_year_id',
        'institution_id',
        'room_id',
        'homeroom_teacher_id',
        'student_count',
        'specialty',
        'metadata',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'class_level' => 'integer',
            'student_count' => 'integer',
            'metadata' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the academic year that this grade belongs to.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Get the institution that this grade belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the room assigned to this grade.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get the homeroom teacher for this grade.
     */
    public function homeroomTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'homeroom_teacher_id');
    }

    /**
     * Get the full grade name with level.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->class_level}-{$this->name}";
    }

    /**
     * Get the display name for the grade.
     */
    public function getDisplayNameAttribute(): string
    {
        $parts = array_filter([
            "{$this->class_level} sinif",
            $this->name,
            $this->specialty
        ]);
        return implode(' - ', $parts);
    }

    /**
     * Check if grade is elementary (1-4).
     */
    public function isElementary(): bool
    {
        return $this->class_level >= 1 && $this->class_level <= 4;
    }

    /**
     * Check if grade is middle school (5-9).
     */
    public function isMiddleSchool(): bool
    {
        return $this->class_level >= 5 && $this->class_level <= 9;
    }

    /**
     * Check if grade is high school (10-12).
     */
    public function isHighSchool(): bool
    {
        return $this->class_level >= 10 && $this->class_level <= 12;
    }

    /**
     * Get students enrolled in this grade.
     */
    public function students()
    {
        return $this->belongsToMany(User::class, 'student_enrollments', 'grade_id', 'student_id')
                    ->withPivot(['enrollment_date', 'status', 'notes'])
                    ->withTimestamps();
    }

    /**
     * Get active students in this grade.
     */
    public function activeStudents()
    {
        return $this->students()->wherePivot('status', 'active');
    }

    /**
     * Get student enrollments for this grade.
     */
    public function studentEnrollments(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class, 'grade_id');
    }

    /**
     * Get active student enrollments.
     */
    public function activeStudentEnrollments(): HasMany
    {
        return $this->studentEnrollments()->where('status', 'active');
    }

    /**
     * Get subjects assigned to this grade.
     */
    public function subjects()
    {
        return $this->belongsToMany(Subject::class, 'teacher_subjects', 'grade_id', 'subject_id')
                    ->withPivot(['teacher_id', 'weekly_hours', 'academic_year_id', 'is_active'])
                    ->withTimestamps();
    }

    /**
     * Get active subjects for this grade.
     */
    public function activeSubjects()
    {
        return $this->subjects()->wherePivot('is_active', true);
    }

    /**
     * Get teacher subject assignments for this grade.
     */
    public function teacherSubjects(): HasMany
    {
        return $this->hasMany(TeacherSubject::class, 'grade_id');
    }

    /**
     * Get schedules for this grade.
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'grade_id');
    }

    /**
     * Get available subjects for this grade level.
     */
    public function getAvailableSubjects()
    {
        return Subject::active()->forClassLevel($this->class_level)->get();
    }

    /**
     * Get current student count (dynamically calculated).
     */
    public function getCurrentStudentCount(): int
    {
        return $this->activeStudentEnrollments()->count();
    }

    /**
     * Check if grade has available capacity.
     */
    public function hasCapacity(): bool
    {
        if (!$this->room) {
            return true; // No room limit set
        }
        
        return $this->getCurrentStudentCount() < $this->room->capacity;
    }

    /**
     * Get remaining capacity.
     */
    public function getRemainingCapacity(): int
    {
        if (!$this->room) {
            return 999; // No limit
        }
        
        return max(0, $this->room->capacity - $this->getCurrentStudentCount());
    }

    /**
     * Scope to get active grades.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get grades by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get grades by academic year.
     */
    public function scopeByAcademicYear($query, int $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    /**
     * Scope to get grades by class level.
     */
    public function scopeByClassLevel($query, int $classLevel)
    {
        return $query->where('class_level', $classLevel);
    }

    /**
     * Scope to get grades by specialty.
     */
    public function scopeBySpecialty($query, string $specialty)
    {
        return $query->where('specialty', $specialty);
    }

    /**
     * Scope to get elementary grades.
     */
    public function scopeElementary($query)
    {
        return $query->whereBetween('class_level', [1, 4]);
    }

    /**
     * Scope to get middle school grades.
     */
    public function scopeMiddleSchool($query)
    {
        return $query->whereBetween('class_level', [5, 9]);
    }

    /**
     * Scope to get high school grades.
     */
    public function scopeHighSchool($query)
    {
        return $query->whereBetween('class_level', [10, 12]);
    }

    /**
     * Scope to search by name.
     */
    public function scopeSearchByName($query, string $search)
    {
        return $query->where('name', 'ILIKE', "%{$search}%");
    }
}