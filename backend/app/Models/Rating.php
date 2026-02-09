<?php

namespace App\Models;

use App\Models\Traits\HasAcademicYear;
use App\Models\Traits\HasInstitution;
use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rating extends Model
{
    use HasFactory, HasUser, HasInstitution, HasAcademicYear;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'institution_id',
        'academic_year_id',
        'period',
        'overall_score',
        'task_score',
        'survey_score',
        'manual_score',
        // PRD-yə uyğun yeni komponent skorları
        'academic_score',
        'observation_score',
        'assessment_score',
        'certificate_score',
        'olympiad_score',
        'award_score',
        'growth_bonus',
        'yearly_breakdown',
        'status',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'overall_score' => 'decimal:2',
        'task_score' => 'decimal:2',
        'survey_score' => 'decimal:2',
        'manual_score' => 'decimal:2',
        // PRD-yə uyğun yeni komponent skorları
        'academic_score' => 'decimal:2',
        'observation_score' => 'decimal:2',
        'assessment_score' => 'decimal:2',
        'certificate_score' => 'decimal:2',
        'olympiad_score' => 'decimal:2',
        'award_score' => 'decimal:2',
        'growth_bonus' => 'decimal:2',
        'yearly_breakdown' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope a query to only include published ratings.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope a query to only include ratings for a specific period.
     */
    public function scopeForPeriod($query, string $period)
    {
        return $query->where('period', $period);
    }

    /**
     * Scope a query to only include ratings for a specific academic year.
     */
    public function scopeForAcademicYear($query, int $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }
}
