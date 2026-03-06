<?php

namespace App\Services;

use App\Helpers\DataIsolationHelper;
use App\Models\User;

/**
 * Centralized service for institution access control.
 *
 * Delegates to DataIsolationHelper for consistent role-based filtering
 * across the entire application. Used by Policies and other services
 * that need to check institution access.
 */
class InstitutionAccessService
{
    /**
     * Get institutions accessible by the user based on their role.
     *
     * Uses DataIsolationHelper.getAllowedInstitutionIds() for consistent
     * role-based institution hierarchy traversal.
     *
     * @return array<int>
     */
    public static function getAccessibleInstitutions(User $user): array
    {
        return DataIsolationHelper::getAllowedInstitutionIds($user)->toArray();
    }

    /**
     * Check if user can access a specific institution.
     */
    public static function canAccess(User $user, int $institutionId): bool
    {
        return DataIsolationHelper::canAccessInstitution($user, $institutionId);
    }
}
