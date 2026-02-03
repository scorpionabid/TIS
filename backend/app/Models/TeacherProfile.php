<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeacherProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'phone',
        'bio',
        'qualifications',
        'experience_years',
        'specialization',
        'photo',
        'school',
        'subject',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_email',
        'social_links',
        'preferences'
    ];

    protected $casts = [
        'qualifications' => 'array',
        'social_links' => 'array',
        'preferences' => 'array',
        'experience_years' => 'integer',
    ];

    /**
     * Get the user that owns the teacher profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the achievements for the teacher.
     */
    public function achievements(): HasMany
    {
        return $this->hasMany(TeacherAchievement::class);
    }

    /**
     * Get the certificates for the teacher.
     */
    public function certificates(): HasMany
    {
        return $this->hasMany(TeacherCertificate::class);
    }

    /**
     * Get the education history for the teacher.
     */
    public function educationHistory(): HasMany
    {
        return $this->hasMany(TeacherEducation::class);
    }

    /**
     * Get the work experience for the teacher.
     */
    public function workExperience(): HasMany
    {
        return $this->hasMany(TeacherWorkExperience::class);
    }

    /**
     * Get the skills for the teacher.
     */
    public function skills(): HasMany
    {
        return $this->hasMany(TeacherSkill::class);
    }

    /**
     * Scope to get teachers by subject.
     */
    public function scopeBySubject($query, $subject)
    {
        return $query->where('subject', $subject);
    }

    /**
     * Scope to get teachers by school.
     */
    public function scopeBySchool($query, $school)
    {
        return $query->where('school', $school);
    }

    /**
     * Scope to get teachers by experience years.
     */
    public function scopeByExperienceYears($query, $minYears, $maxYears = null)
    {
        $query->where('experience_years', '>=', $minYears);
        
        if ($maxYears !== null) {
            $query->where('experience_years', '<=', $maxYears);
        }
        
        return $query;
    }

    /**
     * Get the full name of the teacher.
     */
    public function getFullNameAttribute(): string
    {
        return $this->user ? $this->user->name : '';
    }

    /**
     * Get the email of the teacher.
     */
    public function getEmailAttribute(): string
    {
        return $this->user ? $this->user->email : '';
    }

    /**
     * Get formatted phone number.
     */
    public function getFormattedPhoneAttribute(): string
    {
        $phone = $this->phone;
        
        if (!$phone) {
            return '';
        }
        
        // Format: +994 XX XXX XX XX
        if (preg_match('/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/', $phone, $matches)) {
            return "+{$matches[1]} {$matches[2]} {$matches[3]} {$matches[4]} {$matches[5]}";
        }
        
        return $phone;
    }

    /**
     * Check if teacher has specific qualification.
     */
    public function hasQualification(string $qualification): bool
    {
        return in_array($qualification, $this->qualifications ?? []);
    }

    /**
     * Add a new qualification.
     */
    public function addQualification(string $qualification): void
    {
        $qualifications = $this->qualifications ?? [];
        $qualifications[] = $qualification;
        $this->qualifications = array_unique($qualifications);
        $this->save();
    }

    /**
     * Remove a qualification.
     */
    public function removeQualification(string $qualification): void
    {
        $qualifications = $this->qualifications ?? [];
        $qualifications = array_values(array_filter($qualifications, fn($q) => $q !== $qualification));
        $this->qualifications = $qualifications;
        $this->save();
    }

    /**
     * Get experience level based on years.
     */
    public function getExperienceLevelAttribute(): string
    {
        $years = $this->experience_years;
        
        if ($years < 2) return 'Beginner';
        if ($years < 5) return 'Intermediate';
        if ($years < 10) return 'Experienced';
        if ($years < 15) return 'Senior';
        return 'Expert';
    }

    /**
     * Get profile completion percentage.
     */
    public function getProfileCompletionAttribute(): int
    {
        $fields = [
            'phone' => $this->phone ? 10 : 0,
            'bio' => $this->bio ? 10 : 0,
            'qualifications' => !empty($this->qualifications) ? 15 : 0,
            'specialization' => $this->specialization ? 10 : 0,
            'school' => $this->school ? 10 : 0,
            'subject' => $this->subject ? 10 : 0,
            'address' => $this->address ? 5 : 0,
            'emergency_contact_name' => $this->emergency_contact_name ? 5 : 0,
            'emergency_contact_phone' => $this->emergency_contact_phone ? 5 : 0,
            'photo' => $this->photo ? 10 : 0,
        ];

        // Add achievements, certificates, and education completion
        $fields['achievements'] = $this->achievements()->count() > 0 ? 5 : 0;
        $fields['certificates'] = $this->certificates()->count() > 0 ? 5 : 0;
        $fields['education'] = $this->educationHistory()->count() > 0 ? 5 : 0;

        return array_sum($fields);
    }

    /**
     * Get profile completion status.
     */
    public function getProfileCompletionStatusAttribute(): string
    {
        $completion = $this->profile_completion;
        
        if ($completion >= 90) return 'Excellent';
        if ($completion >= 70) return 'Good';
        if ($completion >= 50) return 'Fair';
        return 'Incomplete';
    }
}
