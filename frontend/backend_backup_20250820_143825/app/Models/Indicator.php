<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Indicator extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'code',
        'name',
        'description',
        'category',
        'data_type',
        'unit',
        'calculation_method',
        'data_source',
        'frequency',
        'benchmark',
        'metadata',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'benchmark' => 'array',
            'metadata' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the indicator values for this indicator.
     */
    public function values(): HasMany
    {
        return $this->hasMany(IndicatorValue::class);
    }

    /**
     * Get benchmark value for comparison.
     */
    public function getBenchmarkValue(string $key = 'target')
    {
        return $this->benchmark[$key] ?? null;
    }

    /**
     * Check if indicator is numeric.
     */
    public function isNumeric(): bool
    {
        return in_array($this->data_type, ['integer', 'decimal', 'percentage']);
    }

    /**
     * Format value based on data type.
     */
    public function formatValue($value): string
    {
        if ($value === null) {
            return 'N/A';
        }

        switch ($this->data_type) {
            case 'percentage':
                return number_format($value, 2) . '%';
            case 'decimal':
                return number_format($value, 2) . ($this->unit ? ' ' . $this->unit : '');
            case 'integer':
                return number_format($value, 0) . ($this->unit ? ' ' . $this->unit : '');
            default:
                return (string) $value;
        }
    }

    /**
     * Scope to get active indicators.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get indicators by category.
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to get indicators by data type.
     */
    public function scopeByDataType($query, string $dataType)
    {
        return $query->where('data_type', $dataType);
    }

    /**
     * Scope to get indicators by frequency.
     */
    public function scopeByFrequency($query, string $frequency)
    {
        return $query->where('frequency', $frequency);
    }

    /**
     * Scope to search by name or code.
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'ILIKE', "%{$search}%")
              ->orWhere('code', 'ILIKE', "%{$search}%");
        });
    }
}