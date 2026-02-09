<?php

namespace App\Models;

use App\Models\Traits\HasActiveScope;
use App\Models\Traits\HasInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sector extends Model
{
    use HasFactory, HasInstitution, HasActiveScope;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'institution_id',
        'region_id',
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
     * Get the region that this sector belongs to.
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /**
     * Scope to get sectors by region.
     */
    public function scopeByRegion($query, int $regionId)
    {
        return $query->where('region_id', $regionId);
    }

    /**
     * Scope to get sectors by code.
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
