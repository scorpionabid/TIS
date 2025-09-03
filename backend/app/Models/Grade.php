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
        'description',
        'metadata',
        'is_active',
        'teacher_assigned_at',
        'teacher_removed_at',
        'deactivated_at',
        'deactivated_by',
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
            'teacher_assigned_at' => 'datetime',
            'teacher_removed_at' => 'datetime',
            'deactivated_at' => 'datetime',
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
                    ->withPivot(['enrollment_date', 'enrollment_status', 'enrollment_notes'])
                    ->withTimestamps();
    }

    /**
     * Get active students in this grade.
     */
    public function activeStudents()
    {
        return $this->students()->wherePivot('enrollment_status', 'active');
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
        return $this->studentEnrollments()->where('enrollment_status', 'active');
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

    /**
     * Get the deactivated by user.
     */
    public function deactivatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deactivated_by');
    }

    /**
     * Get capacity status attribute.
     */
    public function getCapacityStatusAttribute(): string
    {
        if (!$this->room) {
            return 'no_room';
        }

        $utilization = $this->getUtilizationRateAttribute();
        
        if ($utilization > 100) {
            return 'over_capacity';
        } elseif ($utilization >= 95) {
            return 'full';
        } elseif ($utilization >= 80) {
            return 'near_capacity';
        } else {
            return 'available';
        }
    }

    /**
     * Get utilization rate attribute.
     */
    public function getUtilizationRateAttribute(): float
    {
        if (!$this->room || $this->room->capacity === 0) {
            return 0;
        }

        return round(($this->student_count / $this->room->capacity) * 100, 2);
    }

    /**
     * Get available spots attribute.
     */
    public function getAvailableSpotsAttribute(): int
    {
        return max(0, ($this->room?->capacity ?? 0) - $this->student_count);
    }

    /**
     * Get performance metrics attribute.
     */
    public function getPerformanceMetricsAttribute(): array
    {
        // This would be populated from attendance and assessment data
        return [
            'attendance_rate' => 0, // TODO: Calculate from attendance records
            'average_grade' => 0, // TODO: Calculate from assessment results
            'homework_completion' => 0, // TODO: Calculate from homework tracking
            'behavior_score' => 0, // TODO: Calculate from behavior records
        ];
    }

    /**
     * Check if grade is overcrowded.
     */
    public function isOvercrowded(): bool
    {
        return $this->room && $this->student_count > $this->room->capacity;
    }

    /**
     * Check if grade needs attention (no teacher or room).
     */
    public function needsAttention(): bool
    {
        return !$this->homeroom_teacher_id || !$this->room_id;
    }

    /**
     * Get grade summary for reporting.
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'full_name' => $this->full_name,
            'display_name' => $this->display_name,
            'class_level' => $this->class_level,
            'student_count' => $this->student_count,
            'capacity' => $this->room?->capacity ?? 0,
            'utilization_rate' => $this->utilization_rate,
            'capacity_status' => $this->capacity_status,
            'has_teacher' => !is_null($this->homeroom_teacher_id),
            'has_room' => !is_null($this->room_id),
            'needs_attention' => $this->needsAttention(),
            'is_active' => $this->is_active,
        ];
    }

    /**
     * Scope for grades that need attention.
     */
    public function scopeNeedsAttention($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('homeroom_teacher_id')
              ->orWhereNull('room_id');
        })->where('is_active', true);
    }

    /**
     * Scope for overcrowded grades.
     */
    public function scopeOvercrowded($query)
    {
        return $query->whereHas('room', function ($q) {
            $q->whereRaw('grades.student_count > rooms.capacity');
        });
    }

    /**
     * Scope for underutilized grades.
     */
    public function scopeUnderutilized($query, int $threshold = 60)
    {
        return $query->whereHas('room', function ($q) use ($threshold) {
            $q->whereRaw('grades.student_count < (rooms.capacity * ? / 100)', [$threshold]);
        });
    }

    /**
     * Scope for grades with capacity status.
     */
    public function scopeByCapacityStatus($query, string $status)
    {
        switch ($status) {
            case 'available':
                return $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count < (rooms.capacity * 0.8)');
                });
            case 'near_capacity':
                return $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count >= (rooms.capacity * 0.8)')
                      ->whereRaw('grades.student_count < (rooms.capacity * 0.95)');
                });
            case 'full':
                return $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count >= (rooms.capacity * 0.95)')
                      ->whereRaw('grades.student_count <= rooms.capacity');
                });
            case 'over_capacity':
                return $query->whereHas('room', function ($q) {
                    $q->whereRaw('grades.student_count > rooms.capacity');
                });
            case 'no_room':
                return $query->whereNull('room_id');
            default:
                return $query;
        }
    }

    /**
     * Get recent activity logs for this grade.
     */
    public function getRecentActivity(int $limit = 10): array
    {
        // This would integrate with activity log system
        return [];
    }

    /**
     * Update student count from active enrollments.
     */
    public function updateStudentCountFromEnrollments(): void
    {
        $activeCount = $this->activeStudentEnrollments()->count();
        $this->update(['student_count' => $activeCount]);
    }

    /**
     * Check if grade can accommodate more students.
     */
    public function canAccommodateStudents(int $count = 1): bool
    {
        return $this->available_spots >= $count;
    }

    /**
     * Get suggested optimal student count based on room capacity.
     */
    public function getOptimalStudentCount(): int
    {
        if (!$this->room) {
            return 25; // Default suggestion
        }

        // Suggest 85% of room capacity as optimal
        return floor($this->room->capacity * 0.85);
    }
}