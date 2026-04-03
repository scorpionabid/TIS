<?php

namespace App\Helpers;

use App\Models\Department;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class DataIsolationHelper
{
    /**
     * Apply regional data isolation to query based on user role
     */
    public static function applyRegionalScope(Builder $query, User $user, string $resourceType = 'default'): Builder
    {
        // SuperAdmin has access to everything
        if ($user->hasRole('superadmin')) {
            return $query;
        }

        $primaryRole = $user->roles->first();
        if (! $primaryRole) {
            // If no role, restrict to impossible condition
            return $query->whereRaw('1 = 0');
        }

        switch ($primaryRole->name) {
            case 'regionadmin':
                return self::applyRegionAdminScope($query, $user, $resourceType);

            case 'regionoperator':
                return self::applyRegionOperatorScope($query, $user, $resourceType);

            case 'sektoradmin':
                return self::applySektorAdminScope($query, $user, $resourceType);

            case 'schooladmin':
            case 'məktəbadmin':
                return self::applyMektebAdminScope($query, $user, $resourceType);

            case 'müəllim':
                return self::applyMuellimScope($query, $user, $resourceType);

            default:
                // Unknown role, restrict access
                return $query->whereRaw('1 = 0');
        }
    }

    /**
     * Apply RegionAdmin scope (recursive - all hierarchy levels)
     */
    private static function applyRegionAdminScope(Builder $query, User $user, string $resourceType): Builder
    {
        $userRegion = $user->institution;

        if (! $userRegion || $userRegion->level !== 2) {
            return $query->whereRaw('1 = 0');
        }

        // Use Institution model's recursive method to get ALL children
        $allowedInstitutionIds = collect($userRegion->getAllChildrenIds());

        switch ($resourceType) {
            case 'users':
                return $query->whereIn('institution_id', $allowedInstitutionIds);

            case 'institutions':
                return $query->whereIn('id', $allowedInstitutionIds);

            case 'departments':
                return $query->whereIn('institution_id', $allowedInstitutionIds);

            case 'surveys':
                // RegionAdmin can access surveys targeting their region
                return $query->where(function ($q) use ($allowedInstitutionIds) {
                    $q->whereHas('targets', function ($subQ) use ($allowedInstitutionIds) {
                        $subQ->whereIn('institution_id', $allowedInstitutionIds);
                    })->orWhere('creator_id', auth()->id());
                });

            default:
                return $query->whereIn('institution_id', $allowedInstitutionIds);
        }
    }

    /**
     * Apply RegionOperator scope
     */
    private static function applyRegionOperatorScope(Builder $query, User $user, string $resourceType): Builder
    {
        $userDepartment = $user->department;
        $userInstitution = $user->institution;

        if (! $userDepartment || ! $userInstitution) {
            Log::warning('RegionOperator scope blocked due to missing department or institution', [
                'user_id' => $user->id,
                'username' => $user->username,
                'has_department' => (bool) $userDepartment,
                'has_institution' => (bool) $userInstitution,
                'resource_type' => $resourceType,
            ]);

            return $query->whereRaw('1 = 0');
        }

        switch ($resourceType) {
            case 'users':
                // Can only see users in same department
                return $query->where('department_id', $userDepartment->id);

            case 'institutions':
                // Can only see their own institution
                return $query->where('id', $userInstitution->id);

            case 'departments':
                // Can only see their own department
                return $query->where('id', $userDepartment->id);

            case 'surveys':
                // Can only see surveys targeting their institution/department
                return $query->where(function ($q) use ($userInstitution, $userDepartment) {
                    $q->whereHas('targets', function ($subQ) use ($userInstitution, $userDepartment) {
                        $subQ->where('institution_id', $userInstitution->id)
                            ->orWhere('department_id', $userDepartment->id);
                    });
                });

            case 'tasks':
                // Can only see tasks assigned to them or their department
                return $query->where(function ($q) use ($user, $userDepartment) {
                    $q->where('assigned_to', $user->id)
                        ->orWhere('department_id', $userDepartment->id);
                });

            default:
                return $query->where('institution_id', $userInstitution->id);
        }
    }

    /**
     * Apply SektorAdmin scope
     */
    private static function applySektorAdminScope(Builder $query, User $user, string $resourceType): Builder
    {
        $userSector = $user->institution;

        // Robust validation: Check institution existence and level
        if (! $userSector) {
            \Log::warning('SektorAdmin user has no institution assigned', [
                'user_id' => $user->id,
                'username' => $user->username,
            ]);

            return $query->whereRaw('1 = 0');
        }

        // Level-based validation (more robust than type checking)
        if ($userSector->level !== 3) {
            \Log::warning('SektorAdmin user institution is not level 3 (sector)', [
                'user_id' => $user->id,
                'username' => $user->username,
                'institution_id' => $userSector->id,
                'institution_name' => $userSector->name,
                'actual_level' => $userSector->level,
                'expected_level' => 3,
            ]);

            return $query->whereRaw('1 = 0');
        }

        // Get all schools under this sector (level 4)
        $allowedInstitutionIds = Institution::where('parent_id', $userSector->id)
            ->where('level', 4) // School level
            ->pluck('id')
            ->prepend($userSector->id); // Include sector itself

        \Log::info('🔒 SektorAdmin Scope Applied', [
            'user_id' => $user->id,
            'username' => $user->username,
            'sector_id' => $userSector->id,
            'sector_name' => $userSector->name,
            'sector_level' => $userSector->level,
            'resource_type' => $resourceType,
            'allowed_institutions_count' => $allowedInstitutionIds->count(),
            'allowed_institution_ids' => $allowedInstitutionIds->toArray(),
        ]);

        switch ($resourceType) {
            case 'users':
                return $query->whereIn('institution_id', $allowedInstitutionIds);

            case 'institutions':
                return $query->whereIn('id', $allowedInstitutionIds);

            case 'departments':
                return $query->whereIn('institution_id', $allowedInstitutionIds);

            case 'surveys':
                return $query->where(function ($q) use ($allowedInstitutionIds) {
                    $q->whereHas('targets', function ($subQ) use ($allowedInstitutionIds) {
                        $subQ->whereIn('institution_id', $allowedInstitutionIds);
                    })->orWhere('creator_id', auth()->id());
                });

            case 'students':
                // SektorAdmin can see students from all schools in their sector
                return $query->whereIn('institution_id', $allowedInstitutionIds);

            case 'teachers':
                // SektorAdmin can see teachers from all schools in their sector
                return $query->whereIn('institution_id', $allowedInstitutionIds)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    });

            case 'approvals':
                // SektorAdmin can see approvals from their sector institutions
                return $query->whereIn('institution_id', $allowedInstitutionIds);

            default:
                return $query->whereIn('institution_id', $allowedInstitutionIds);
        }
    }

    /**
     * Apply MəktəbAdmin scope
     */
    private static function applyMektebAdminScope(Builder $query, User $user, string $resourceType): Builder
    {
        $userSchool = $user->institution;

        // Level-based validation (more robust than type checking - type names can change)
        if (! $userSchool || $userSchool->level !== 4) {
            return $query->whereRaw('1 = 0');
        }

        switch ($resourceType) {
            case 'users':
                // Can only see users in their school
                return $query->where('institution_id', $userSchool->id);

            case 'institutions':
                // Can only see their own school
                return $query->where('id', $userSchool->id);

            case 'departments':
                // Can only see departments in their school
                return $query->where('institution_id', $userSchool->id);

            case 'surveys':
                return $query->where(function ($q) use ($userSchool) {
                    $q->whereHas('targets', function ($subQ) use ($userSchool) {
                        $subQ->where('institution_id', $userSchool->id);
                    })->orWhere('creator_id', auth()->id());
                });

            case 'students':
                // Can only see students in their school
                return $query->where('institution_id', $userSchool->id);

            case 'teachers':
                // Can only see teachers in their school
                return $query->where('institution_id', $userSchool->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    });

            case 'classes':
                // Can only see classes in their school
                return $query->where('institution_id', $userSchool->id);

            default:
                return $query->where('institution_id', $userSchool->id);
        }
    }

    /**
     * Apply Müəllim (Teacher) scope
     */
    private static function applyMuellimScope(Builder $query, User $user, string $resourceType): Builder
    {
        $userSchool = $user->institution;

        if (! $userSchool) {
            return $query->whereRaw('1 = 0');
        }

        switch ($resourceType) {
            case 'users':
                // Can only see themselves
                return $query->where('id', $user->id);

            case 'institutions':
                // Can only see their own school
                return $query->where('id', $userSchool->id);

            case 'surveys':
                // Can only see surveys assigned to them
                return $query->whereHas('targets', function ($subQ) use ($userSchool, $user) {
                    $subQ->where('institution_id', $userSchool->id)
                        ->where(function ($q) use ($user) {
                            $q->where('user_id', $user->id)
                                ->orWhereNull('user_id'); // General school surveys
                        });
                });

            case 'students':
                // Can only see students in their classes (mock implementation)
                return $query->where('institution_id', $userSchool->id)
                    ->where('teacher_id', $user->id);

            case 'classes':
                // Can only see their own classes
                return $query->where('teacher_id', $user->id);

            default:
                return $query->where('institution_id', $userSchool->id);
        }
    }

    /**
     * Get allowed institution IDs for user
     */
    public static function getAllowedInstitutionIds(User $user): Collection
    {
        // SuperAdmin has access to everything
        if ($user->hasRole('superadmin')) {
            return Institution::pluck('id');
        }

        // IMPORTANT: Do not rely on roles->first() ordering.
        // Users may have multiple roles; choose by priority.
        if ($user->hasRole('regionadmin')) {
            $userRegion = $user->institution;
            if (! $userRegion || (int) $userRegion->level !== 2) {
                return collect([]);
            }

            return collect($userRegion->getAllChildrenIds());
        }

        if ($user->hasRole('regionoperator')) {
            $institution = $user->institution;

            if (! $institution) {
                \Log::warning('RegionOperator getAllowedInstitutionIds: missing institution', [
                    'user_id' => $user->id,
                    'username' => $user->username,
                ]);

                return collect([]);
            }

            if ((int) $institution->level === 2) {
                $ids = $institution->getAllChildrenIds();

                \Log::info('RegionOperator scope expanded to full region', [
                    'user_id' => $user->id,
                    'institution_id' => $institution->id,
                    'children_count' => count($ids),
                ]);

                return collect($ids);
            }

            if ((int) $institution->level === 3) {
                $childIds = Institution::where('parent_id', $institution->id)
                    ->where('level', '>=', 3)
                    ->pluck('id');

                return $childIds->prepend($institution->id);
            }

            return collect([$institution->id]);
        }

        if ($user->hasRole('sektoradmin')) {
            $userSector = $user->institution;
            if (! $userSector) {
                return collect([]);
            }

            $sectorId = null;
            if ((int) $userSector->level === 3) {
                $sectorId = $userSector->id;
            } elseif ((int) $userSector->level === 4 && $userSector->parent_id) {
                $sectorId = (int) $userSector->parent_id;
            }

            if ($sectorId) {
                $sector = \App\Models\Institution::find($sectorId);

                return collect($sector ? $sector->getAllChildrenIds() : [$userSector->id]);
            }

            return collect($userSector->getAllChildrenIds());
        }

        if ($user->hasAnyRole(['schooladmin', 'məktəbadmin', 'müəllim'])) {
            return collect([$user->institution_id]);
        }

        return collect([]);
    }

    /**
     * Get allowed department IDs for user
     */
    public static function getAllowedDepartmentIds(User $user): Collection
    {
        // SuperAdmin has access to everything
        if ($user->hasRole('superadmin')) {
            return Department::pluck('id');
        }

        $allowedInstitutionIds = self::getAllowedInstitutionIds($user);

        $departmentQuery = Department::whereIn('institution_id', $allowedInstitutionIds);

        // RegionOperator has additional restrictions
        if ($user->hasRole('regionoperator') && $user->department_id) {
            $departmentQuery->where('id', $user->department_id);
        }

        return $departmentQuery->pluck('id');
    }

    /**
     * Check if user can access specific institution
     */
    public static function canAccessInstitution(User $user, int $institutionId): bool
    {
        $allowedIds = self::getAllowedInstitutionIds($user);

        return $allowedIds->contains($institutionId);
    }

    /**
     * Check if user can access specific department
     */
    public static function canAccessDepartment(User $user, int $departmentId): bool
    {
        $allowedIds = self::getAllowedDepartmentIds($user);

        return $allowedIds->contains($departmentId);
    }

    /**
     * Get user's scope level
     */
    public static function getUserScopeLevel(User $user): string
    {
        if ($user->hasRole('superadmin')) {
            return 'system';
        }

        $primaryRole = $user->roles->first();
        if (! $primaryRole) {
            return 'none';
        }

        switch ($primaryRole->name) {
            case 'regionadmin':
                return 'regional';
            case 'regionoperator':
                return 'department';
            case 'sektoradmin':
                return 'sector';
            case 'schooladmin':
            case 'məktəbadmin':
                return 'school';
            case 'müəllim':
                return 'teacher';
            default:
                return 'none';
        }
    }
}
