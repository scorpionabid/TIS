<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        // New teacher workplace fields
        'position_type',
        'specialty_score',
        'primary_institution_id',
        'has_additional_workplaces',
        'employment_status',
        'contract_start_date',
        'contract_end_date',
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
            // New workplace fields
            'specialty_score' => 'decimal:2',
            'has_additional_workplaces' => 'boolean',
            'contract_start_date' => 'date',
            'contract_end_date' => 'date',
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
     * Get the primary institution.
     */
    public function primaryInstitution(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'primary_institution_id');
    }

    /**
     * Get additional workplaces for this teacher.
     */
    public function additionalWorkplaces(): HasMany
    {
        return $this->hasMany(TeacherWorkplace::class, 'user_id', 'user_id')
            ->where('workplace_priority', '!=', 'primary')
            ->orderBy('workplace_priority');
    }

    /**
     * Get all workplaces (including primary).
     */
    public function allWorkplaces(): HasMany
    {
        return $this->hasMany(TeacherWorkplace::class, 'user_id', 'user_id')
            ->orderBy('workplace_priority');
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

    /**
     * Scope to filter by position type.
     */
    public function scopeByPositionType($query, string $positionType)
    {
        return $query->where('position_type', $positionType);
    }

    /**
     * Scope to filter by employment status.
     */
    public function scopeByEmploymentStatus($query, string $status)
    {
        return $query->where('employment_status', $status);
    }

    /**
     * Get the position type label in Azerbaijani.
     */
    public function getPositionTypeLabelAttribute(): ?string
    {
        if (!$this->position_type) {
            return null;
        }

        return match($this->position_type) {
            'direktor' => 'Direktor',
            'direktor_muavini_tedris' => 'Direktor müavini (Təhsil)',
            'direktor_muavini_inzibati' => 'Direktor müavini (İnzibati)',
            'terbiye_isi_uzre_direktor_muavini' => 'Tərbiyə işi üzrə direktor müavini',
            'metodik_birlesme_rəhbəri' => 'Metodik birləşmə rəhbəri',
            'muəllim_sinif_rəhbəri' => 'Müəllim (Sinif rəhbəri)',
            'muəllim' => 'Müəllim',
            'psixoloq' => 'Psixoloq',
            'kitabxanaçı' => 'Kitabxanaçı',
            'laborant' => 'Laborant',
            'tibb_işçisi' => 'Tibb işçisi',
            'təsərrüfat_işçisi' => 'Təsərrüfat işçisi',
            default => $this->position_type
        };
    }

    /**
     * Get the employment status label.
     */
    public function getEmploymentStatusLabelAttribute(): string
    {
        return match($this->employment_status) {
            'full_time' => 'Tam ştat',
            'part_time' => 'Yarım ştat',
            'contract' => 'Müqavilə',
            'temporary' => 'Müvəqqəti',
            'substitute' => 'Əvəzedici',
            default => 'Naməlum'
        };
    }

    /**
     * Check if contract is active.
     */
    public function getIsContractActiveAttribute(): bool
    {
        if (!$this->contract_start_date) {
            return true; // No contract means permanent
        }

        $now = now();
        $isAfterStart = $now->gte($this->contract_start_date);
        $isBeforeEnd = !$this->contract_end_date || $now->lte($this->contract_end_date);

        return $isAfterStart && $isBeforeEnd;
    }

    /**
     * Get days until contract expiry.
     */
    public function getContractDaysRemainingAttribute(): ?int
    {
        if (!$this->contract_end_date) {
            return null;
        }

        return now()->diffInDays($this->contract_end_date, false);
    }

    /**
     * Check if the user is a leadership position.
     */
    public function getIsLeadershipPositionAttribute(): bool
    {
        $leadershipPositions = [
            'direktor',
            'direktor_muavini_tedris',
            'direktor_muavini_inzibati',
            'terbiye_isi_uzre_direktor_muavini',
            'metodik_birlesme_rəhbəri',
        ];

        return in_array($this->position_type, $leadershipPositions);
    }

    /**
     * Get total workplaces count.
     */
    public function getTotalWorkplacesCountAttribute(): int
    {
        $count = $this->primary_institution_id ? 1 : 0;
        $count += $this->additionalWorkplaces()->count();
        return $count;
    }
}