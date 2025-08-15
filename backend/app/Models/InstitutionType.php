<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InstitutionType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'key',
        'label',
        'label_az',
        'label_en',
        'default_level',
        'allowed_parent_types',
        'icon',
        'color',
        'is_active',
        'is_system',
        'metadata',
        'description',
    ];

    protected $casts = [
        'allowed_parent_types' => 'array',
        'metadata' => 'array',
        'is_active' => 'boolean',
        'is_system' => 'boolean',
        'default_level' => 'integer',
    ];

    /**
     * Relationship with institutions
     */
    public function institutions()
    {
        return $this->hasMany(Institution::class, 'type', 'key');
    }

    /**
     * Scope for active types only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for system types only
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope for non-system types only (user-created)
     */
    public function scopeUserCreated($query)
    {
        return $query->where('is_system', false);
    }

    /**
     * Scope to get types by level
     */
    public function scopeByLevel($query, $level)
    {
        return $query->where('default_level', $level);
    }

    /**
     * Get institution types that can be parents of this type
     */
    public function getAvailableParentTypes()
    {
        return self::active()
            ->whereIn('key', $this->allowed_parent_types)
            ->get();
    }

    /**
     * Get institution types that can have this type as a child
     */
    public function getAvailableChildTypes()
    {
        return self::active()
            ->whereJsonContains('allowed_parent_types', $this->key)
            ->get();
    }

    /**
     * Check if this type can have the given parent type
     */
    public function canHaveParentType(string $parentTypeKey): bool
    {
        return in_array($parentTypeKey, $this->allowed_parent_types);
    }

    /**
     * Check if this type can be deleted (not system type and has no institutions)
     */
    public function canBeDeleted(): bool
    {
        return !$this->is_system && $this->institutions()->count() === 0;
    }

    /**
     * Get the display label (defaults to Azerbaijani)
     */
    public function getDisplayLabel(): string
    {
        return $this->label_az ?? $this->label;
    }

    /**
     * Get metadata value by key
     */
    public function getMetadata(string $key, $default = null)
    {
        return $this->metadata[$key] ?? $default;
    }

    /**
     * Set metadata value by key
     */
    public function setMetadata(string $key, $value): void
    {
        $metadata = $this->metadata;
        $metadata[$key] = $value;
        $this->metadata = $metadata;
    }

    /**
     * Boot method to set up model events
     */
    protected static function boot()
    {
        parent::boot();

        // Prevent deletion of system types
        static::deleting(function ($institutionType) {
            if ($institutionType->is_system) {
                throw new \Exception('System institution types cannot be deleted.');
            }

            if ($institutionType->institutions()->count() > 0) {
                throw new \Exception('Cannot delete institution type with existing institutions.');
            }
        });
    }
}