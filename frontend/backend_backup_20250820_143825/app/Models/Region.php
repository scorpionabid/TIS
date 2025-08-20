<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Region extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'institution_id',
        'code',
        'name',
        'area_km2',
        'population',
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
            'area_km2' => 'decimal:2',
            'population' => 'integer',
            'metadata' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the institution that this region belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the sectors in this region.
     */
    public function sectors(): HasMany
    {
        return $this->hasMany(Sector::class);
    }

    /**
     * Scope to get active regions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get regions by code.
     */
    public function scopeByCode($query, string $code)
    {
        return $query->where('code', $code);
    }

    /**
     * Scope to search by name.
     */
    public function scopeSearchByName($query, string $search)
    {
        return $query->where('name', 'ILIKE', "%{$search}%");
    }
}