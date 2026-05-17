<?php

namespace App\Scopes;

use App\Helpers\DataIsolationHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Global Scope that automatically filters queries by user's accessible institutions.
 *
 * This scope ensures data isolation at the model level, preventing
 * cross-region/cross-institution data leakage even when developers
 * forget to manually apply filtering in controllers/services.
 *
 * Bypassed in:
 * - Console commands (artisan)
 * - Queue workers
 * - When no user is authenticated
 * - SuperAdmin role (via DataIsolationHelper)
 * - Explicitly via withoutGlobalScope(InstitutionScope::class)
 */
class InstitutionScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // Skip if no authenticated user.
        // This naturally handles console commands, seeders, queue workers
        // (where no user is authenticated) while still applying in tests
        // (where actingAs sets a user) and web requests.
        $user = Auth::user();
        if (! $user) {
            return;
        }

        // SuperAdmin sees everything - DataIsolationHelper handles this
        if ($user->hasRole('superadmin')) {
            return;
        }

        // Get allowed institution IDs from the centralized helper
        $allowedInstitutionIds = DataIsolationHelper::getAllowedInstitutionIds($user);

        if ($allowedInstitutionIds->isEmpty()) {
            // No allowed institutions - block all data
            $builder->whereRaw('1 = 0');

            return;
        }

        // Determine the correct column name
        $column = $model->getTable() . '.institution_id';

        $builder->whereIn($column, $allowedInstitutionIds);
    }
}
