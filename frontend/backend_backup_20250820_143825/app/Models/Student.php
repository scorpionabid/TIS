<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'student_number',
        'first_name',
        'last_name',
        'institution_id',
        'class_name',
        'grade_level',
        'birth_date',
        'gender',
        'parent_name',
        'parent_phone',
        'parent_email',
        'address',
        'is_active',
        'additional_info',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'is_active' => 'boolean',
        'additional_info' => 'array',
    ];

    protected $appends = [
        'name',
        'age'
    ];

    /**
     * Get the full name attribute
     */
    public function getNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    /**
     * Get the age attribute
     */
    public function getAgeAttribute(): ?int
    {
        if (!$this->birth_date) {
            return null;
        }
        
        return $this->birth_date->diffInYears(now());
    }

    /**
     * Relationship: Student belongs to Institution
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Relationship: Student has many assessment entries
     */
    public function assessmentEntries(): HasMany
    {
        return $this->hasMany(AssessmentEntry::class);
    }

    /**
     * Scope: Filter by institution
     */
    public function scopeForInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope: Filter by grade level
     */
    public function scopeByGradeLevel($query, $gradeLevel)
    {
        return $query->where('grade_level', $gradeLevel);
    }

    /**
     * Scope: Filter by class
     */
    public function scopeByClass($query, $className)
    {
        return $query->where('class_name', $className);
    }

    /**
     * Scope: Only active students
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Search students by name or student number
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%")
              ->orWhere('student_number', 'like', "%{$search}%");
        });
    }
}
