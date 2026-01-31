<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RatingConfig extends Model
{
    use HasFactory;

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
        'config' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the institution that owns the rating config.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the academic year that owns the rating config.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

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
     * Check if the weights are valid (sum to 1.0).
     */
    public function isValidWeights(): bool
    {
        return abs($this->total_weight - 1.0) < 0.01;
    }
}
