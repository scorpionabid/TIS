<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'short_name',
        'code',
        'category',
        'description',
        'is_active',
        'grade_levels',
        'weekly_hours',
        'metadata',
        'institution_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'grade_levels' => 'array',
            'weekly_hours' => 'integer',
            'metadata' => 'array',
        ];
    }

    /**
     * Get teacher assignments for this subject.
     */
    public function teacherAssignments(): HasMany
    {
        return $this->hasMany(TeacherSubject::class, 'subject_id');
    }

    /**
     * Get active teacher assignments.
     */
    public function activeTeacherAssignments(): HasMany
    {
        return $this->teacherAssignments()->where('is_active', true);
    }

    /**
     * Get all teachers assigned to this subject.
     */
    public function teachers()
    {
        return $this->belongsToMany(User::class, 'teacher_subjects', 'subject_id', 'teacher_id')
            ->where('teacher_subjects.is_active', true)
            ->withPivot(['grade_id', 'weekly_hours', 'academic_year_id']);
    }

    /**
     * Get grades that have this subject.
     */
    public function grades()
    {
        return $this->belongsToMany(Grade::class, 'teacher_subjects', 'subject_id', 'grade_id')
            ->where('teacher_subjects.is_active', true)
            ->withPivot(['teacher_id', 'weekly_hours']);
    }

    /**
     * Get curriculum assignments for this subject.
     */
    public function gradeSubjects(): HasMany
    {
        return $this->hasMany(GradeSubject::class);
    }

    /**
     * Check if subject is available for a specific class level.
     */
    public function isAvailableForLevel(int $classLevel): bool
    {
        // If no grade levels specified, available for all
        if (empty($this->grade_levels)) {
            return true;
        }

        // Check if class level is in the grade_levels array
        return in_array($classLevel, $this->grade_levels);
    }

    /**
     * Get the range of class levels as string.
     */
    public function getClassLevelRangeAttribute(): string
    {
        if (empty($this->grade_levels)) {
            return 'Bütün siniflər';
        }

        $levels = $this->grade_levels;
        sort($levels);

        // If consecutive range (e.g., [1,2,3,4,5])
        if ($this->isConsecutiveRange($levels)) {
            if (count($levels) === 1) {
                return "Sinif {$levels[0]}";
            }

            return "Sinif {$levels[0]}-{$levels[count($levels) - 1]}";
        }

        // Otherwise, show as list (e.g., "Sinif 1, 3, 5, 7")
        return 'Sinif ' . implode(', ', $levels);
    }

    /**
     * Check if array represents consecutive numbers.
     */
    private function isConsecutiveRange(array $numbers): bool
    {
        if (count($numbers) <= 1) {
            return true;
        }

        for ($i = 1; $i < count($numbers); $i++) {
            if ($numbers[$i] !== $numbers[$i - 1] + 1) {
                return false;
            }
        }

        return true;
    }

    /**
     * Scope to get active subjects.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get subjects by category.
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get subjects for a specific class level.
     *
     * Uses JSON_CONTAINS for databases that support it,
     * or falls back to LIKE search for SQLite.
     */
    public function scopeForClassLevel($query, int $classLevel)
    {
        return $query->where(function ($q) use ($classLevel) {
            // Subjects with no grade_levels are available for all
            $q->whereNull('grade_levels')
                ->orWhereJsonLength('grade_levels', 0)
              // Check if class level is in grade_levels array
                ->orWhereJsonContains('grade_levels', $classLevel);
        });
    }

    /**
     * Scope to search by name or code.
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'ILIKE', "%{$search}%")
                ->orWhere('short_name', 'ILIKE', "%{$search}%")
                ->orWhere('code', 'ILIKE', "%{$search}%");
        });
    }

    /**
     * Scope to get subjects for a specific institution.
     *
     * Returns both institution-specific subjects and global subjects (null institution_id).
     */
    public function scopeForInstitution($query, ?int $institutionId)
    {
        if ($institutionId === null) {
            return $query->whereNull('institution_id');
        }

        return $query->where(function ($q) use ($institutionId) {
            $q->where('institution_id', $institutionId)
                ->orWhereNull('institution_id'); // Include global subjects
        });
    }

    /**
     * Scope to get only global subjects (available to all institutions).
     */
    public function scopeGlobalOnly($query)
    {
        return $query->whereNull('institution_id');
    }

    /**
     * Scope to get only institution-specific subjects.
     */
    public function scopeInstitutionSpecificOnly($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Check if subject is global (available to all institutions).
     */
    public function isGlobal(): bool
    {
        return $this->institution_id === null;
    }

    /**
     * Get institution relationship.
     */
    public function institution()
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Validation rules for category field.
     */
    public static function validCategories(): array
    {
        return [
            'core',
            'science',
            'humanities',
            'language',
            'arts',
            'physical',
            'technical',
            'elective',
        ];
    }

    /**
     * Validate grade levels array.
     */
    public static function validateGradeLevels(?array $gradeLevels): bool
    {
        if ($gradeLevels === null || empty($gradeLevels)) {
            return true; // Null/empty means available for all
        }

        // Check all values are integers between 1 and 12
        foreach ($gradeLevels as $level) {
            if (! is_int($level) || $level < 1 || $level > 12) {
                return false;
            }
        }

        return true;
    }
}
