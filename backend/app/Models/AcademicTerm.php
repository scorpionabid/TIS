<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicTerm extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_active',
        'academic_year',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    /**
     * Scope to get active academic terms.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to find terms containing provided date.
     */
    public function scopeForDate(Builder $query, Carbon $date): Builder
    {
        $formattedDate = $date->toDateString();

        return $query->where('start_date', '<=', $formattedDate)
            ->where('end_date', '>=', $formattedDate);
    }

    /**
     * Related academic year model if available.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year', 'name');
    }
}
