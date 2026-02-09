<?php

namespace App\Models;

use App\Models\Traits\HasActiveScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicYear extends Model
{
    use HasActiveScope, HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_active',
        'metadata',
        'semester_1_start',
        'semester_1_end',
        'semester_2_start',
        'semester_2_end',
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
            'is_active' => 'boolean',
            'metadata' => 'array',
            'semester_1_start' => 'date',
            'semester_1_end' => 'date',
            'semester_2_start' => 'date',
            'semester_2_end' => 'date',
        ];
    }

    /**
     * The attributes that should be appended to the model's array form.
     *
     * @var array<string>
     */
    protected $appends = ['year', 'is_current'];

    /**
     * Get the year attribute (alias for name).
     */
    public function getYearAttribute(): ?string
    {
        return $this->name;
    }

    /**
     * Get the is_current attribute.
     */
    public function getIsCurrentAttribute(): bool
    {
        return (bool) $this->is_active;
    }

    /**
     * Get the grades for this academic year.
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Check if the academic year is current.
     */
    public function isCurrent(): bool
    {
        $today = now()->toDateString();

        return $today >= $this->start_date->toDateString()
            && $today <= $this->end_date->toDateString();
    }

    /**
     * Check if the academic year has started.
     */
    public function hasStarted(): bool
    {
        return now()->toDateString() >= $this->start_date->toDateString();
    }

    /**
     * Check if the academic year has ended.
     */
    public function hasEnded(): bool
    {
        return now()->toDateString() > $this->end_date->toDateString();
    }

    /**
     * Get the duration in days.
     */
    public function getDurationInDays(): int
    {
        return $this->start_date->diffInDays($this->end_date);
    }

    /**
     * Scope to get current academic year.
     */
    public function scopeCurrent($query)
    {
        $today = now()->toDateString();

        return $query->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today);
    }

    /**
     * Scope to get academic years by date range.
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('start_date', [$startDate, $endDate])
                ->orWhereBetween('end_date', [$startDate, $endDate])
                ->orWhere(function ($qq) use ($startDate, $endDate) {
                    $qq->where('start_date', '<=', $startDate)
                        ->where('end_date', '>=', $endDate);
                });
        });
    }
}
