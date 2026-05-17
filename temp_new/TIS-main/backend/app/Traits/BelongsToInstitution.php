<?php

namespace App\Traits;

use App\Scopes\InstitutionScope;

/**
 * Trait for models that belong to an institution.
 *
 * Automatically applies InstitutionScope global scope for data isolation.
 * Models using this trait will automatically filter by the authenticated
 * user's accessible institutions.
 *
 * IMPORTANT: The model MUST have an `institution_id` column.
 * The model should also define its own `institution()` BelongsTo relationship.
 *
 * Usage:
 *   use App\Traits\BelongsToInstitution;
 *
 *   class Grade extends Model
 *   {
 *       use BelongsToInstitution;
 *   }
 *
 * To bypass the scope when needed (e.g., in seeders, console commands):
 *   Grade::withoutGlobalScope(InstitutionScope::class)->get();
 */
trait BelongsToInstitution
{
    /**
     * Boot the trait - register the global scope.
     */
    public static function bootBelongsToInstitution(): void
    {
        static::addGlobalScope(new InstitutionScope);
    }

    /**
     * Scope to filter by specific institution.
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where($this->getTable() . '.institution_id', $institutionId);
    }

    /**
     * Scope to filter by multiple institutions.
     */
    public function scopeForInstitutions($query, array $institutionIds)
    {
        return $query->whereIn($this->getTable() . '.institution_id', $institutionIds);
    }
}
