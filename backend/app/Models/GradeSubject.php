<?php

namespace App\Models;

use App\Models\Traits\HasTeacher;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeSubject extends Model
{
    use HasFactory, HasTeacher;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'grade_id',
        'subject_id',
        'weekly_hours',
        'is_teaching_activity',
        'is_extracurricular',
        'is_club',
        'is_split_groups',
        'group_count',
        'calculated_hours',
        'teacher_id',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'grade_id' => 'integer',
            'subject_id' => 'integer',
            'weekly_hours' => 'integer',
            'is_teaching_activity' => 'boolean',
            'is_extracurricular' => 'boolean',
            'is_club' => 'boolean',
            'is_split_groups' => 'boolean',
            'group_count' => 'integer',
            'calculated_hours' => 'integer',
            'teacher_id' => 'integer',
        ];
    }

    /**
     * Boot method for auto-calculating hours.
     */
    protected static function booted(): void
    {
        // Auto-calculate calculated_hours before saving
        static::saving(function (GradeSubject $gradeSubject) {
            $gradeSubject->calculated_hours = $gradeSubject->weekly_hours * $gradeSubject->group_count;
        });
    }

    /**
     * Get the grade that owns this subject assignment.
     */
    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    /**
     * Get the subject.
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the activity types as array.
     */
    public function getActivityTypesAttribute(): array
    {
        $types = [];

        if ($this->is_teaching_activity) {
            $types[] = 'Tədris fəaliyyəti';
        }

        if ($this->is_extracurricular) {
            $types[] = 'Dərsdənkənar məşğələ';
        }

        if ($this->is_club) {
            $types[] = 'Dərnək';
        }

        return $types;
    }

    /**
     * Get formatted weekly hours with group info.
     */
    public function getFormattedHoursAttribute(): string
    {
        if ($this->is_split_groups && $this->group_count > 1) {
            return "{$this->weekly_hours} saat × {$this->group_count} qrup = {$this->calculated_hours} saat";
        }

        return "{$this->weekly_hours} saat";
    }

    /**
     * Scope to get subjects with teaching activity.
     */
    public function scopeTeachingActivity($query)
    {
        return $query->where('is_teaching_activity', true);
    }

    /**
     * Scope to get extracurricular subjects.
     */
    public function scopeExtracurricular($query)
    {
        return $query->where('is_extracurricular', true);
    }

    /**
     * Scope to get club subjects.
     */
    public function scopeClub($query)
    {
        return $query->where('is_club', true);
    }

    /**
     * Scope to get subjects split into groups.
     */
    public function scopeSplitGroups($query)
    {
        return $query->where('is_split_groups', true);
    }
}
