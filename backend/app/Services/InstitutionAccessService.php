<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\User;

class InstitutionAccessService
{
    /**
     * Get institutions accessible by the user based on their role.
     *
     * @return array<int>
     */
    public static function getAccessibleInstitutions(User $user): array
    {
        // Superadmin can access all institutions
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id')->toArray();
        }

        $userInstitutionId = $user->institution_id;

        // RegionAdmin can access their region and all schools/sektors under it
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if (! $userInstitution) {
                return [];
            }

            // Get all institutions in the same region (level 3 and 4)
            return Institution::where(function ($query) use ($userInstitutionId, $userInstitution) {
                $query->where('id', $userInstitutionId)
                    ->orWhere('parent_id', $userInstitutionId)
                    ->orWhere('region_id', $userInstitution->id);
            })->pluck('id')->toArray();
        }

        // SektorAdmin can access their sektor and all schools under it
        if ($user->hasRole('sektoradmin')) {
            return Institution::where(function ($query) use ($userInstitutionId) {
                $query->where('id', $userInstitutionId)
                    ->orWhere('parent_id', $userInstitutionId);
            })->pluck('id')->toArray();
        }

        // School-level users can only access their own institution
        if ($user->hasAnyRole(['schooladmin', 'müavin', 'müəllim'])) {
            return [$userInstitutionId];
        }

        return [];
    }
}
