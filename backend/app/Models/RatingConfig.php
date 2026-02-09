<?php

namespace App\Models;

use App\Models\Traits\HasAcademicYear;
use App\Models\Traits\HasInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RatingConfig extends Model
{
    use HasFactory, HasInstitution, HasAcademicYear;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'institution_id',
        'academic_year_id',
        'task_weight',
        'survey_weight',
        'manual_weight',
        // PRD-yə uyğun 6 komponent çəkisi
        'academic_weight',
        'observation_weight',
        'assessment_weight',
        'certificate_weight',
        'olympiad_weight',
        'award_weight',
        'year_weights',
        'calculation_method',
        'config',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'task_weight' => 'decimal:2',
        'survey_weight' => 'decimal:2',
        'manual_weight' => 'decimal:2',
        // PRD-yə uyğun 6 komponent çəkisi
        'academic_weight' => 'decimal:2',
        'observation_weight' => 'decimal:2',
        'assessment_weight' => 'decimal:2',
        'certificate_weight' => 'decimal:2',
        'olympiad_weight' => 'decimal:2',
        'award_weight' => 'decimal:2',
        'year_weights' => 'array',
        'config' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * PRD: Default year weights
     */
    public const DEFAULT_YEAR_WEIGHTS = [
        '2022-2023' => 0.25,
        '2023-2024' => 0.30,
        '2024-2025' => 0.45,
    ];

    /**
     * Scope a query to only include configs for automatic calculation.
     */
    public function scopeAutomatic($query)
    {
        return $query->where('calculation_method', 'automatic');
    }

    /**
     * Scope a query to only include configs for manual calculation.
     */
    public function scopeManual($query)
    {
        return $query->where('calculation_method', 'manual');
    }

    /**
     * Scope a query to only include configs for hybrid calculation.
     */
    public function scopeHybrid($query)
    {
        return $query->where('calculation_method', 'hybrid');
    }

    /**
     * Get the total weight (should sum to 1.0).
     */
    public function getTotalWeightAttribute(): float
    {
        return (float) ($this->task_weight + $this->survey_weight + $this->manual_weight);
    }

    /**
     * PRD: Get the total component weight (should sum to 1.0).
     */
    public function getComponentTotalWeightAttribute(): float
    {
        return (float) (
            $this->academic_weight +
            $this->observation_weight +
            $this->assessment_weight +
            $this->certificate_weight +
            $this->olympiad_weight +
            $this->award_weight
        );
    }

    /**
     * Check if the weights are valid (sum to 1.0).
     */
    public function isValidWeights(): bool
    {
        return abs($this->total_weight - 1.0) < 0.01;
    }

    /**
     * PRD: Check if component weights are valid (sum to 1.0).
     */
    public function isValidComponentWeights(): bool
    {
        return abs($this->component_total_weight - 1.0) < 0.01;
    }

    /**
     * PRD: Get year weights with defaults.
     */
    public function getYearWeightsWithDefaults(): array
    {
        return $this->year_weights ?? self::DEFAULT_YEAR_WEIGHTS;
    }
}
