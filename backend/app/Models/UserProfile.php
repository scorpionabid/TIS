<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'utis_code',
        'first_name',
        'last_name',
        'patronymic',
        'birth_date',
        'date_of_birth',
        'gender',
        'national_id',
        'profile_image_path',
        'contact_phone',
        'emergency_contact',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_email',
        'address',
        'education_history',
        'employment_history',
        'certifications',
        'preferences',
        // Professional teacher fields
        'subjects',
        'specialty',
        'experience_years',
        'miq_score',
        'certification_score',
        'last_certification_date',
        'qualifications',
        'training_courses',
        'degree_level',
        'graduation_university',
        'graduation_year',
        'university_gpa',
        // Student academic fields
        'student_miq_score',
        'academic_achievements',
        'extracurricular_activities',
        'health_info',
        'previous_school',
        'parent_occupation',
        'family_income',
        'special_needs',
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
            'birth_date' => 'date',
            'date_of_birth' => 'date',
            'last_certification_date' => 'date',
            'address' => 'array',
            'education_history' => 'array',
            'employment_history' => 'array',
            'certifications' => 'array',
            'preferences' => 'array',
            // Professional teacher fields
            'subjects' => 'array',
            'qualifications' => 'array',
            'training_courses' => 'array',
            // Student academic fields
            'academic_achievements' => 'array',
            'extracurricular_activities' => 'array',
            'health_info' => 'array',
            'parent_occupation' => 'array',
            'special_needs' => 'array',
            // Numeric fields
            'miq_score' => 'decimal:2',
            'certification_score' => 'decimal:2',
            'university_gpa' => 'decimal:2',
            'student_miq_score' => 'decimal:2',
            'family_income' => 'decimal:2',
        ];
    }

    /**
     * Get the user that owns the profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the full name of the user.
     */
    public function getFullNameAttribute(): string
    {
        $parts = array_filter([$this->first_name, $this->patronymic, $this->last_name]);
        return implode(' ', $parts);
    }

    /**
     * Get the display name (first + last name).
     */
    public function getDisplayNameAttribute(): string
    {
        $parts = array_filter([$this->first_name, $this->last_name]);
        return implode(' ', $parts);
    }

    /**
     * Get the age of the user.
     */
    public function getAgeAttribute(): ?int
    {
        return $this->birth_date?->age;
    }

    /**
     * Scope to filter by gender.
     */
    public function scopeByGender($query, string $gender)
    {
        return $query->where('gender', $gender);
    }

    /**
     * Scope to search by name.
     */
    public function scopeSearchByName($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('first_name', 'ILIKE', "%{$search}%")
              ->orWhere('last_name', 'ILIKE', "%{$search}%")
              ->orWhere('patronymic', 'ILIKE', "%{$search}%");
        });
    }
}