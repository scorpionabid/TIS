<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeacherWorkplace extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'institution_id',
        'workplace_priority',
        'position_type',
        'employment_type',
        'weekly_hours',
        'work_days',
        'subjects',
        'department_id',
        'start_date',
        'end_date',
        'status',
        'salary_amount',
        'salary_currency',
        'notes',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'weekly_hours' => 'decimal:2',
            'salary_amount' => 'decimal:2',
            'work_days' => 'array',
            'subjects' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the teacher/user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the teacher profile.
     */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_id', 'user_id');
    }

    /**
     * Get the institution.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the department.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('workplace_priority', $priority);
    }

    public function scopePrimary($query)
    {
        return $query->where('workplace_priority', 'primary');
    }

    public function scopeSecondary($query)
    {
        return $query->where('workplace_priority', '!=', 'primary');
    }

    public function scopeFullTime($query)
    {
        return $query->where('employment_type', 'full_time');
    }

    public function scopePartTime($query)
    {
        return $query->where('employment_type', 'part_time');
    }

    /**
     * Accessors & Mutators
     */
    public function getPositionTypeLabelAttribute(): string
    {
        return match ($this->position_type) {
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

    public function getEmploymentTypeLabelAttribute(): string
    {
        return match ($this->employment_type) {
            'full_time' => 'Tam ştat',
            'part_time' => 'Yarım ştat',
            'contract' => 'Müqavilə',
            'hourly' => 'Saatlıq',
            default => 'Naməlum'
        };
    }

    public function getWorkplacePriorityLabelAttribute(): string
    {
        return match ($this->workplace_priority) {
            'primary' => 'Əsas iş yeri',
            'secondary' => '2-ci iş yeri',
            'tertiary' => '3-cü iş yeri',
            'quaternary' => '4-cü iş yeri',
            default => $this->workplace_priority
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Aktiv',
            'inactive' => 'Qeyri-aktiv',
            'suspended' => 'Dayandırılıb',
            'terminated' => 'Ləğv edilib',
            default => 'Naməlum'
        };
    }

    /**
     * Helper Methods
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isPrimary(): bool
    {
        return $this->workplace_priority === 'primary';
    }

    public function isFullTime(): bool
    {
        return $this->employment_type === 'full_time';
    }

    public function isContractExpired(): bool
    {
        if (! $this->end_date) {
            return false;
        }

        return now()->gt($this->end_date);
    }

    public function getDaysUntilExpiry(): ?int
    {
        if (! $this->end_date) {
            return null;
        }

        return now()->diffInDays($this->end_date, false);
    }

    public function activate(): bool
    {
        return $this->update(['status' => 'active']);
    }

    public function deactivate(): bool
    {
        return $this->update(['status' => 'inactive']);
    }

    public function suspend(): bool
    {
        return $this->update(['status' => 'suspended']);
    }

    public function terminate($reason = null): bool
    {
        $metadata = $this->metadata ?? [];
        $metadata['termination_reason'] = $reason;
        $metadata['terminated_at'] = now()->toISOString();

        return $this->update([
            'status' => 'terminated',
            'end_date' => now(),
            'metadata' => $metadata,
        ]);
    }

    /**
     * Get formatted work days string.
     */
    public function getFormattedWorkDaysAttribute(): string
    {
        if (! $this->work_days || empty($this->work_days)) {
            return 'Müəyyən edilməyib';
        }

        $dayLabels = [
            'monday' => 'Bazar ertəsi',
            'tuesday' => 'Çərşənbə axşamı',
            'wednesday' => 'Çərşənbə',
            'thursday' => 'Cümə axşamı',
            'friday' => 'Cümə',
            'saturday' => 'Şənbə',
            'sunday' => 'Bazar',
        ];

        $days = array_map(
            fn ($day) => $dayLabels[$day] ?? $day,
            $this->work_days
        );

        return implode(', ', $days);
    }

    /**
     * Get formatted subjects string.
     */
    public function getFormattedSubjectsAttribute(): string
    {
        if (! $this->subjects || empty($this->subjects)) {
            return 'Fənn müəyyən edilməyib';
        }

        return implode(', ', $this->subjects);
    }

    /**
     * Calculate monthly salary based on weekly hours.
     */
    public function getEstimatedMonthlySalaryAttribute(): ?float
    {
        if (! $this->weekly_hours || ! $this->salary_amount) {
            return null;
        }

        // Approximate: 4.33 weeks per month
        return $this->weekly_hours * 4.33 * $this->salary_amount;
    }
}
