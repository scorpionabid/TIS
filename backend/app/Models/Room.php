<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'room_number',
        'institution_id',
        'building',
        'floor',
        'room_type',
        'capacity',
        'facilities',
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
            'floor' => 'integer',
            'capacity' => 'integer',
            'facilities' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the institution that owns this room.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the grades assigned to this room.
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Check if room has a specific facility.
     */
    public function hasFacility(string $facility): bool
    {
        return in_array($facility, $this->facilities ?? []);
    }

    /**
     * Add a facility to the room.
     */
    public function addFacility(string $facility): void
    {
        $facilities = $this->facilities ?? [];
        if (!in_array($facility, $facilities)) {
            $facilities[] = $facility;
            $this->facilities = $facilities;
            $this->save();
        }
    }

    /**
     * Remove a facility from the room.
     */
    public function removeFacility(string $facility): void
    {
        $facilities = $this->facilities ?? [];
        $key = array_search($facility, $facilities);
        if ($key !== false) {
            unset($facilities[$key]);
            $this->facilities = array_values($facilities);
            $this->save();
        }
    }

    /**
     * Get the full room identifier.
     */
    public function getFullIdentifierAttribute(): string
    {
        $parts = array_filter([
            $this->building,
            $this->room_number ?: $this->name
        ]);
        return implode(' - ', $parts);
    }

    /**
     * Scope to get active rooms.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get rooms by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get rooms by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('room_type', $type);
    }

    /**
     * Scope to get rooms by building.
     */
    public function scopeByBuilding($query, string $building)
    {
        return $query->where('building', $building);
    }

    /**
     * Scope to get rooms by floor.
     */
    public function scopeByFloor($query, int $floor)
    {
        return $query->where('floor', $floor);
    }

    /**
     * Scope to get rooms with specific facility.
     */
    public function scopeWithFacility($query, string $facility)
    {
        return $query->whereJsonContains('facilities', $facility);
    }

    /**
     * Scope to get rooms with minimum capacity.
     */
    public function scopeWithMinCapacity($query, int $capacity)
    {
        return $query->where('capacity', '>=', $capacity);
    }

    /**
     * Scope to search by name or number.
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'ILIKE', "%{$search}%")
              ->orWhere('room_number', 'ILIKE', "%{$search}%");
        });
    }
}