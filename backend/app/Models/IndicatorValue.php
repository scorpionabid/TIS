<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IndicatorValue extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'indicator_id',
        'institution_id',
        'time_period',
        'value_numeric',
        'value_text',
        'source',
        'is_estimated',
        'is_approved',
        'approved_by',
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
            'value_numeric' => 'decimal:5',
            'is_estimated' => 'boolean',
            'is_approved' => 'boolean',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the indicator that this value belongs to.
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class);
    }

    /**
     * Get the institution that this value belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who approved this value.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the appropriate value based on indicator type.
     */
    public function getValue()
    {
        return $this->indicator->isNumeric() ? $this->value_numeric : $this->value_text;
    }

    /**
     * Get formatted value.
     */
    public function getFormattedValueAttribute(): string
    {
        return $this->indicator->formatValue($this->getValue());
    }

    /**
     * Compare with benchmark.
     */
    public function compareWithBenchmark(string $benchmarkKey = 'target'): ?array
    {
        if (!$this->indicator->isNumeric() || $this->value_numeric === null) {
            return null;
        }

        $benchmark = $this->indicator->getBenchmarkValue($benchmarkKey);
        if ($benchmark === null) {
            return null;
        }

        $difference = $this->value_numeric - $benchmark;
        $percentage = $benchmark != 0 ? ($difference / $benchmark) * 100 : 0;

        return [
            'value' => $this->value_numeric,
            'benchmark' => $benchmark,
            'difference' => $difference,
            'percentage' => round($percentage, 2),
            'status' => $difference >= 0 ? 'above' : 'below',
        ];
    }

    /**
     * Approve the value.
     */
    public function approve(User $approver): void
    {
        $this->is_approved = true;
        $this->approved_by = $approver->id;
        $this->save();
    }

    /**
     * Scope to get approved values.
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Scope to get values by indicator.
     */
    public function scopeByIndicator($query, int $indicatorId)
    {
        return $query->where('indicator_id', $indicatorId);
    }

    /**
     * Scope to get values by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get values by time period.
     */
    public function scopeByTimePeriod($query, string $timePeriod)
    {
        return $query->where('time_period', $timePeriod);
    }

    /**
     * Scope to get estimated values.
     */
    public function scopeEstimated($query)
    {
        return $query->where('is_estimated', true);
    }

    /**
     * Scope to get latest values for each institution.
     */
    public function scopeLatestForInstitutions($query, int $indicatorId)
    {
        return $query->where('indicator_id', $indicatorId)
                    ->whereIn('id', function ($subQuery) use ($indicatorId) {
                        $subQuery->selectRaw('max(id)')
                                ->from('indicator_values')
                                ->where('indicator_id', $indicatorId)
                                ->groupBy('institution_id');
                    });
    }
}