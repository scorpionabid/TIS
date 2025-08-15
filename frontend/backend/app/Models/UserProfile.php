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
            'address' => 'array',
            'education_history' => 'array',
            'employment_history' => 'array',
            'certifications' => 'array',
            'preferences' => 'array',
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