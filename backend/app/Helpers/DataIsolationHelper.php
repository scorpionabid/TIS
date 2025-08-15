<?php

namespace App\Helpers;

use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

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
        if (!$primaryRole) {
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
     * Apply RegionAdmin scope
     */
    private static function applyRegionAdminScope(Builder $query, User $user, string $resourceType): Builder
    {
        $userRegion = $user->institution;
        
        if (!$userRegion || $userRegion->level !== 2) {
            return $query->whereRaw('1 = 0');
        }

        // Get all institutions under this region
        $allowedInstitutionIds = Institution::where(function($q) use ($userRegion) {
            $q->where('id', $userRegion->id)
              ->orWhere('parent_id', $userRegion->id)
              ->orWhereHas('parent', function($subQ) use ($userRegion) {
                  $subQ->where('parent_id', $userRegion->id);
              });
        })->pluck('id');

        switch ($resourceType) {
            case 'users':
                return $query->whereIn('institution_id', $allowedInstitutionIds);
                
            case 'institutions':
                return $query->whereIn('id', $allowedInstitutionIds);
                
            case 'departments':
                return $query->whereIn('institution_id', $allowedInstitutionIds);
                
            case 'surveys':
                // RegionAdmin can access surveys targeting their region
                return $query->where(function($q) use ($allowedInstitutionIds) {
                    $q->whereHas('targets', function($subQ) use ($allowedInstitutionIds) {
                        $subQ->whereIn('institution_id', $allowedInstitutionIds);
                    })->orWhere('created_by', auth()->id());
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
        
        if (!$userDepartment || !$userInstitution) {
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
                return $query->where(function($q) use ($userInstitution, $userDepartment) {
                    $q->whereHas('targets', function($subQ) use ($userInstitution, $userDepartment) {
                        $subQ->where('institution_id', $userInstitution->id)
                             ->orWhere('department_id', $userDepartment->id);
                    });
                });
                
            case 'tasks':
                // Can only see tasks assigned to them or their department
                return $query->where(function($q) use ($user, $userDepartment) {
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
        
        if (!$userSector || $userSector->type !== 'sector_education_office') {
            return $query->whereRaw('1 = 0');
        }

        // Get all schools under this sector
        $allowedInstitutionIds = Institution::where('parent_id', $userSector->id)
            ->where('level', 4) // School level
            ->pluck('id')
            ->prepend($userSector->id); // Include sector itself

        switch ($resourceType) {
            case 'users':
                return $query->whereIn('institution_id', $allowedInstitutionIds);
                
            case 'institutions':
                return $query->whereIn('id', $allowedInstitutionIds);
                
            case 'departments':
                return $query->whereIn('institution_id', $allowedInstitutionIds);
                
            case 'surveys':
                return $query->where(function($q) use ($allowedInstitutionIds) {
                    $q->whereHas('targets', function($subQ) use ($allowedInstitutionIds) {
                        $subQ->whereIn('institution_id', $allowedInstitutionIds);
                    })->orWhere('created_by', auth()->id());
                });
                
            case 'students':
                // SektorAdmin can see students from all schools in their sector
                return $query->whereIn('institution_id', $allowedInstitutionIds);
                
            case 'teachers':
                // SektorAdmin can see teachers from all schools in their sector
                return $query->whereIn('institution_id', $allowedInstitutionIds)
                             ->whereHas('roles', function($q) {
                                 $q->where('name', 'müəllim');
                             });
                
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
        
        if (!$userSchool || !in_array($userSchool->type, ['school', 'secondary_school', 'gymnasium', 'vocational'])) {
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
                return $query->where(function($q) use ($userSchool) {
                    $q->whereHas('targets', function($subQ) use ($userSchool) {
                        $subQ->where('institution_id', $userSchool->id);
                    })->orWhere('created_by', auth()->id());
                });
                
            case 'students':
                // Can only see students in their school
                return $query->where('institution_id', $userSchool->id);
                
            case 'teachers':
                // Can only see teachers in their school
                return $query->where('institution_id', $userSchool->id)
                             ->whereHas('roles', function($q) {
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
        
        if (!$userSchool) {
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
                return $query->whereHas('targets', function($subQ) use ($userSchool, $user) {
                    $subQ->where('institution_id', $userSchool->id)
                         ->where(function($q) use ($user) {
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

        $primaryRole = $user->roles->first();
        if (!$primaryRole) {
            return collect([]);
        }

        switch ($primaryRole->name) {
            case 'regionadmin':
                $userRegion = $user->institution;
                if (!$userRegion || $userRegion->level !== 2) {
                    return collect([]);
                }
                
                return Institution::where(function($q) use ($userRegion) {
                    $q->where('id', $userRegion->id)
                      ->orWhere('parent_id', $userRegion->id)
                      ->orWhereHas('parent', function($subQ) use ($userRegion) {
                          $subQ->where('parent_id', $userRegion->id);
                      });
                })->pluck('id');
                
            case 'regionoperator':
                return collect([$user->institution_id]);
                
            case 'sektoradmin':
                $userSector = $user->institution;
                if (!$userSector || $userSector->type !== 'sector_education_office') {
                    return collect([]);
                }
                
                return Institution::where('parent_id', $userSector->id)
                    ->where('level', 4)
                    ->pluck('id')
                    ->prepend($userSector->id);
                
            case 'məktəbadmin':
            case 'müəllim':
                return collect([$user->institution_id]);
                
            default:
                return collect([]);
        }
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
        if (!$primaryRole) {
            return 'none';
        }

        switch ($primaryRole->name) {
            case 'regionadmin':
                return 'regional';
            case 'regionoperator':
                return 'department';
            case 'sektoradmin':
                return 'sector';
            case 'məktəbadmin':
                return 'school';
            case 'müəllim':
                return 'teacher';
            default:
                return 'none';
        }
    }
}