<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Institution Notification Helper Service
 *
 * Handles expansion of institution IDs to user IDs for notification targeting
 * with proper hierarchy support and role filtering.
 */
class InstitutionNotificationHelper
{
    /**
     * Get default target roles from config
     */
    private function getDefaultTargetRoles(): array
    {
        return config('notification_roles.default_target_roles', [
            'schooladmin', 'məktəbadmin', 'müəllim', 'teacher',
        ]);
    }

    /**
     * Expand institution IDs to user IDs with hierarchy support
     *
     * @param  array      $institutionIds  Array of institution IDs
     * @param  array|null $targetRoles     Array of role names to target (null = use defaults)
     * @param  bool       $includeInactive Whether to include inactive users
     * @return array      Array of user IDs
     */
    public function doExpandInstitutionsToUsers(
        array $institutionIds,
        ?array $targetRoles = null,
        bool $includeInactive = false
    ): array {
        if (empty($institutionIds)) {
            return [];
        }

        // Use default roles if not specified
        $targetRoles = $targetRoles ?? $this->getDefaultTargetRoles();

        Log::debug('InstitutionNotificationHelper: Expanding institutions to users', [
            'institution_ids' => $institutionIds,
            'target_roles' => $targetRoles,
            'include_inactive' => $includeInactive,
        ]);

        // Get all relevant institution IDs (including children for sectors/regions)
        $allInstitutionIds = collect($institutionIds);

        // For each institution, check if it's a sector/region and include its children
        // Schools (level 4) are NOT expanded to parent - only direct targeting
        foreach ($institutionIds as $institutionId) {
            $institution = Institution::find($institutionId);
            if ($institution) {
                if ($institution->level <= 3) { // Sector or higher level
                    // Add all schools under this sector/region using the existing method
                    $children = $institution->getAllChildrenIds();
                    $allInstitutionIds = $allInstitutionIds->merge($children);

                    Log::debug('InstitutionNotificationHelper: Expanded institution hierarchy (children)', [
                        'parent_institution_id' => $institutionId,
                        'parent_level' => $institution->level,
                        'children_count' => count($children),
                        'children_ids' => $children,
                    ]);
                }
                // NOTE: For schools (level 4), we do NOT add parent institutions
                // Notifications should only go to users IN the targeted school, not to parent admins
            }
        }

        // Remove duplicates
        $finalInstitutionIds = $allInstitutionIds->unique()->values()->toArray();

        // Get users from all relevant institutions
        $usersQuery = User::whereIn('institution_id', $finalInstitutionIds)
            ->whereHas('roles', function ($q) use ($targetRoles) {
                $q->whereIn('name', $targetRoles);
            });

        // Filter by active status if requested
        if (! $includeInactive) {
            $usersQuery->where('is_active', true);
        }

        $userIds = $usersQuery->pluck('id')->toArray();

        Log::info('InstitutionNotificationHelper: Institution expansion completed', [
            'original_institutions' => count($institutionIds),
            'expanded_institutions' => count($finalInstitutionIds),
            'target_users' => count($userIds),
            'target_roles' => $targetRoles,
        ]);

        return $userIds;
    }

    /**
     * Get users with detailed information for debugging
     *
     * @return array Array with detailed user information
     */
    public function doExpandInstitutionsToUsersDetailed(
        array $institutionIds,
        ?array $targetRoles = null,
        bool $includeInactive = false
    ): array {
        if (empty($institutionIds)) {
            return [];
        }

        $targetRoles = $targetRoles ?? $this->getDefaultTargetRoles();

        // Get all relevant institution IDs (including children)
        $allInstitutionIds = collect($institutionIds);

        foreach ($institutionIds as $institutionId) {
            $institution = Institution::find($institutionId);
            if ($institution && $institution->level <= 3) {
                $children = $institution->getAllChildrenIds();
                $allInstitutionIds = $allInstitutionIds->merge($children);
            }
        }

        $finalInstitutionIds = $allInstitutionIds->unique()->values()->toArray();

        // Get users with detailed information
        $usersQuery = User::whereIn('institution_id', $finalInstitutionIds)
            ->whereHas('roles', function ($q) use ($targetRoles) {
                $q->whereIn('name', $targetRoles);
            })
            ->with(['institution', 'roles']);

        if (! $includeInactive) {
            $usersQuery->where('is_active', true);
        }

        $users = $usersQuery->get();

        return $users->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'institution_id' => $user->institution_id,
                'institution_name' => $user->institution?->name ?? 'N/A',
                'roles' => $user->roles->pluck('name')->toArray(),
                'is_active' => $user->is_active,
            ];
        })->toArray();
    }

    /**
     * Get institution hierarchy for notification targeting
     */
    public function doGetInstitutionHierarchy(int $institutionId): array
    {
        $institution = Institution::find($institutionId);

        if (! $institution) {
            return [];
        }

        return [
            'id' => $institution->id,
            'name' => $institution->name,
            'level' => $institution->level,
            'children_ids' => $institution->getAllChildrenIds(),
            'parent_id' => $institution->parent_id,
        ];
    }

    /**
     * Validate target roles against available roles
     *
     * @return array Valid roles
     */
    public function doValidateTargetRoles(array $roles): array
    {
        $validRoles = config('notification_roles.all_valid_roles', [
            'superadmin', 'regionadmin', 'sektoradmin', 'schooladmin',
            'məktəbadmin', 'müəllim', 'teacher', 'təhsilçi',
        ]);

        return array_intersect($roles, $validRoles);
    }

    /**
     * Get notification statistics for institutions
     */
    public function doGetNotificationStatistics(array $institutionIds, ?array $targetRoles = null): array
    {
        $targetRoles = $targetRoles ?? $this->getDefaultTargetRoles();

        $userIds = $this->doExpandInstitutionsToUsers($institutionIds, $targetRoles);
        $detailedUsers = $this->doExpandInstitutionsToUsersDetailed($institutionIds, $targetRoles);

        $stats = [
            'total_institutions' => count($institutionIds),
            'total_target_users' => count($userIds),
            'active_users' => count(array_filter($detailedUsers, fn ($u) => $u['is_active'])),
            'inactive_users' => count(array_filter($detailedUsers, fn ($u) => ! $u['is_active'])),
            'users_by_role' => [],
            'users_by_institution' => [],
        ];

        // Group by roles
        foreach ($detailedUsers as $user) {
            foreach ($user['roles'] as $role) {
                $stats['users_by_role'][$role] = ($stats['users_by_role'][$role] ?? 0) + 1;
            }
        }

        // Group by institution
        foreach ($detailedUsers as $user) {
            $institutionName = $user['institution_name'];
            $stats['users_by_institution'][$institutionName] = ($stats['users_by_institution'][$institutionName] ?? 0) + 1;
        }

        return $stats;
    }

    // Static convenience methods for backward compatibility
    // These delegate to instance methods

    /**
     * Static convenience method for expandInstitutionsToUsers
     *
     * @deprecated Use dependency injection instead
     */
    public static function expandInstitutionsToUsers(
        array $institutionIds,
        ?array $targetRoles = null,
        bool $includeInactive = false
    ): array {
        return (new self)->doExpandInstitutionsToUsers($institutionIds, $targetRoles, $includeInactive);
    }

    /**
     * Static convenience method for expandInstitutionsToUsersDetailed
     *
     * @deprecated Use dependency injection instead
     */
    public static function expandInstitutionsToUsersDetailed(
        array $institutionIds,
        ?array $targetRoles = null,
        bool $includeInactive = false
    ): array {
        return (new self)->doExpandInstitutionsToUsersDetailed($institutionIds, $targetRoles, $includeInactive);
    }

    /**
     * Static convenience method for getInstitutionHierarchy
     *
     * @deprecated Use dependency injection instead
     */
    public static function getInstitutionHierarchy(int $institutionId): array
    {
        return (new self)->doGetInstitutionHierarchy($institutionId);
    }

    /**
     * Static convenience method for validateTargetRoles
     *
     * @deprecated Use dependency injection instead
     */
    public static function validateTargetRoles(array $roles): array
    {
        return (new self)->doValidateTargetRoles($roles);
    }

    /**
     * Static convenience method for getNotificationStatistics
     *
     * @deprecated Use dependency injection instead
     */
    public static function getNotificationStatistics(array $institutionIds, ?array $targetRoles = null): array
    {
        return (new self)->doGetNotificationStatistics($institutionIds, $targetRoles);
    }
}
