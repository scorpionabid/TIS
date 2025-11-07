<?php

namespace App\Services\LinkSharing\Domains\Permission;

use App\Models\LinkShare;
use App\Models\Institution;

/**
 * Link Permission Service
 *
 * Handles all authorization and access control logic for link sharing.
 *
 * CRITICAL: This service implements hierarchical permission checking
 * across 4 scope types (national, regional, sectoral, institutional)
 * and 4 role types (superadmin, regionadmin, sektoradmin, schooladmin).
 */
class LinkPermissionService
{
    /**
     * Check if user can create link with specified scope
     */
    public function canCreateLinkWithScope($user, $scope): bool
    {
        $availableScopes = $this->getAvailableScopesForRole($user->role->name);
        return in_array($scope, array_keys($availableScopes));
    }

    /**
     * Get available scopes for role
     */
    public function getAvailableScopesForRole($roleName): array
    {
        $scopes = [
            'superadmin' => [
                'national' => 'Ümummilli',
                'regional' => 'Regional',
                'sectoral' => 'Sektor',
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ],
            'regionadmin' => [
                'regional' => 'Regional',
                'sectoral' => 'Sektor',
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ],
            'sektoradmin' => [
                'sectoral' => 'Sektor',
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ],
            'schooladmin' => [
                'institutional' => 'Qurum',
                'public' => 'Açıq'
            ]
        ];

        return $scopes[$roleName] ?? ['public' => 'Açıq'];
    }

    /**
     * Get available target roles for user
     */
    public function getAvailableTargetRoles($roleName): array
    {
        $roles = [
            'superadmin' => ['all', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim', 'şagird'],
            'regionadmin' => ['sektoradmin', 'schooladmin', 'müəllim', 'şagird'],
            'sektoradmin' => ['schooladmin', 'müəllim', 'şagird'],
            'schooladmin' => ['müəllim', 'şagird']
        ];

        return $roles[$roleName] ?? [];
    }

    /**
     * Get user's targetable institutions
     */
    public function getUserTargetableInstitutions($user): array
    {
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return [];
        }

        if ($user->hasRole('superadmin')) {
            return Institution::active()->pluck('name', 'id')->toArray();
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            return Institution::whereIn('id', $childIds)->pluck('name', 'id')->toArray();
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            return Institution::whereIn('id', $childIds)->pluck('name', 'id')->toArray();
        }

        // School level users can only target their own institution
        return [$userInstitution->id => $userInstitution->name];
    }

    /**
     * Check if user can modify link
     *
     * LOGIC PRESERVED FROM ORIGINAL (lines 530-559)
     */
    public function canModifyLink($user, $linkShare): bool
    {
        // Owner can always modify
        if ($linkShare->shared_by === $user->id) {
            return true;
        }

        // SuperAdmin can modify all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Higher level administrators can modify links from their hierarchy
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $childIds = $userInstitution->getAllChildrenIds();
            return in_array($linkShare->institution_id, $childIds);
        }

        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $childIds = $userInstitution->getAllChildrenIds();
            return in_array($linkShare->institution_id, $childIds);
        }

        return false;
    }

    /**
     * Check if user can access link
     *
     * CRITICAL LOGIC PRESERVED FROM ORIGINAL (lines 564-618, 55 lines)
     *
     * This method implements the core authorization logic for link access
     * across 4 scope types and multiple role types with hierarchical checks.
     */
    public function canAccessLink($user, $linkShare): bool
    {
        // Public links are accessible to all authenticated users
        if ($linkShare->share_scope === 'public') {
            return true;
        }

        if (!$user) {
            return false;
        }

        // Owner can always access
        if ($linkShare->shared_by === $user->id) {
            return true;
        }

        // SuperAdmin can access all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Check target roles if specified
        if ($linkShare->target_roles) {
            $targetRoles = is_array($linkShare->target_roles) ? $linkShare->target_roles : json_decode($linkShare->target_roles, true);
            if (!in_array($user->role->name, $targetRoles) && !in_array('all', $targetRoles)) {
                return false;
            }
        }

        // Check institutional hierarchy
        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // Check scope-based access
        switch ($linkShare->share_scope) {
            case 'national':
                return true;
            case 'regional':
                $ancestors = $userInstitution->getAncestors();
                $regionInstitution = $ancestors->firstWhere('level', 2) ?? ($userInstitution->level == 2 ? $userInstitution : null);
                return $regionInstitution && ($regionInstitution->id === $linkShare->institution_id ||
                    in_array($linkShare->institution_id, $regionInstitution->getAllChildrenIds()));
            case 'sectoral':
                $ancestors = $userInstitution->getAncestors();
                $sectorInstitution = $ancestors->firstWhere('level', 3) ?? ($userInstitution->level == 3 ? $userInstitution : null);
                return $sectorInstitution && ($sectorInstitution->id === $linkShare->institution_id ||
                    in_array($linkShare->institution_id, $sectorInstitution->getAllChildrenIds()));
            case 'institutional':
                return $userInstitution->id === $linkShare->institution_id;
            default:
                return false;
        }
    }

    /**
     * Check if user can view link statistics
     */
    public function canViewLinkStats($user, $linkShare): bool
    {
        // Owner can view stats
        if ($linkShare->shared_by === $user->id) {
            return true;
        }

        // SuperAdmin can view all stats
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Higher level administrators can view stats from their hierarchy
        return $this->canModifyLink($user, $linkShare);
    }

    /**
     * Get allowed institutions for user based on their role
     *
     * Used for filtering queries to respect hierarchical access
     */
    public function getAllowedInstitutionsForUser($user): array
    {
        $userRole = $user->roles?->first()?->name;
        $userInstitutionId = $user->institution_id;

        switch ($userRole) {
            case 'sektoradmin':
                // Sektoradmin can access all institutions in their sector
                return $this->getSectorInstitutions($userInstitutionId);

            case 'schooladmin':
            case 'müəllim':
            default:
                // Other roles only have access to their own institution
                return [$userInstitutionId];
        }
    }

    /**
     * Get all institutions within a sector (including the sector itself)
     */
    public function getSectorInstitutions($sektorId): array
    {
        return Institution::where('parent_id', $sektorId)
            ->pluck('id')
            ->push($sektorId)
            ->toArray();
    }
}
