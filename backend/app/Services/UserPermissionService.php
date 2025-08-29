<?php

namespace App\Services;

use App\Models\User;
use App\Models\Institution;
use App\Models\Role;
use App\Services\BaseService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

class UserPermissionService extends BaseService
{
    /**
     * Apply regional filtering based on current user's role and institution
     */
    public function applyRegionalFiltering(Builder $query, User $currentUser): void
    {
        // Get user's role name from Spatie roles
        $userRole = $currentUser->roles->first()?->name;
        
        Log::info('🔍 UserPermissionService: Applying regional filtering', [
            'user' => $currentUser->username,
            'role' => $userRole,
            'institution_id' => $currentUser->institution_id
        ]);
        
        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can see all users
                break;
                
            case 'regionadmin':
                // RegionAdmin can only see users in their region and sub-institutions
                $this->applyRegionAdminFiltering($query, $currentUser);
                break;
                
            case 'regionoperator':
                // RegionOperator can see users in their region (same as RegionAdmin but limited create permissions)
                $this->applyRegionAdminFiltering($query, $currentUser);
                break;
                
            case 'sektoradmin':
                // SektorAdmin can only see users in their sector and schools
                $this->applySektorAdminFiltering($query, $currentUser);
                break;
                
            case 'məktəbadmin':
            case 'schooladmin':
                // MəktəbAdmin can only see users in their school
                $query->where('institution_id', $currentUser->institution_id);
                break;
                
            case 'müəllim':
            case 'teacher':
                // Teachers can only see themselves and other teachers in same school
                $query->where('institution_id', $currentUser->institution_id)
                      ->whereHas('roles', function($q) {
                          $q->whereIn('name', ['müəllim', 'teacher', 'məktəbadmin', 'schooladmin']);
                      });
                break;
                
            default:
                // Unknown role - restrict to only their own record
                $query->where('id', $currentUser->id);
                break;
        }
    }

    /**
     * Check if user can access specific user record
     */
    public function canUserAccessRecord(User $currentUser, User $targetUser): bool
    {
        $userRole = $currentUser->roles->first()?->name;
        
        if ($userRole === 'superadmin') {
            return true;
        }
        
        // User can always access their own record
        if ($currentUser->id === $targetUser->id) {
            return true;
        }
        
        switch ($userRole) {
            case 'regionadmin':
            case 'regionoperator':
                return $this->isUserInRegionalScope($currentUser, $targetUser);
                
            case 'sektoradmin':
                return $this->isUserInSectorScope($currentUser, $targetUser);
                
            case 'məktəbadmin':
            case 'schooladmin':
                return $targetUser->institution_id === $currentUser->institution_id;
                
            case 'müəllim':
            case 'teacher':
                // Teachers can only access other teachers in same school
                return $targetUser->institution_id === $currentUser->institution_id &&
                       $targetUser->hasAnyRole(['müəllim', 'teacher', 'məktəbadmin', 'schooladmin']);
                
            default:
                return false;
        }
    }

    /**
     * Check if user can modify specific user record
     */
    public function canUserModifyRecord(User $currentUser, User $targetUser): bool
    {
        $userRole = $currentUser->roles->first()?->name;
        
        if ($userRole === 'superadmin') {
            return true;
        }
        
        // User can modify their own basic profile
        if ($currentUser->id === $targetUser->id) {
            return true;
        }
        
        // Check role hierarchy - users can only modify users with lower-level roles
        $currentUserLevel = $currentUser->roles->first()?->level ?? 999;
        $targetUserLevel = $targetUser->roles->first()?->level ?? 999;
        
        if ($currentUserLevel >= $targetUserLevel) {
            return false; // Cannot modify same or higher level users
        }
        
        return $this->canUserAccessRecord($currentUser, $targetUser);
    }

    /**
     * Check if user can delete specific user record
     */
    public function canUserDeleteRecord(User $currentUser, User $targetUser): bool
    {
        // Only SuperAdmin and the user themselves can delete user records
        if ($currentUser->hasRole('superadmin')) {
            return true;
        }
        
        // Users cannot delete themselves through this method (separate endpoint should exist)
        return false;
    }

    /**
     * Get available institutions for user creation based on current user's permissions
     */
    public function getAvailableInstitutions(User $currentUser): array
    {
        $userRole = $currentUser->roles->first()?->name;
        
        $query = Institution::select(['id', 'name', 'type', 'level', 'parent_id'])
            ->where('is_active', true);
        
        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can assign users to any institution
                break;
                
            case 'regionadmin':
                // RegionAdmin can assign users only to institutions in their region
                $userRegionId = $currentUser->institution_id;
                $allInstitutionIds = $this->getRegionalInstitutions($userRegionId);
                $query->whereIn('id', $allInstitutionIds);
                break;
                
            case 'sektoradmin':
                // SektorAdmin can assign users only to their sector and schools under it
                $userSektorId = $currentUser->institution_id;
                $allInstitutionIds = $this->getSectorInstitutions($userSektorId);
                $query->whereIn('id', $allInstitutionIds);
                break;
                
            case 'məktəbadmin':
            case 'schooladmin':
                // MəktəbAdmin can only assign users to their own school
                $query->where('id', $currentUser->institution_id);
                break;
                
            default:
                // Other roles cannot create users - return empty
                $query->where('id', -1); // Force empty result
                break;
        }
        
        return $query->orderBy('level')
                     ->orderBy('name')
                     ->get()
                     ->map(function($institution) {
                         return [
                             'id' => $institution->id,
                             'name' => $institution->name,
                             'type' => $institution->type,
                             'level' => $institution->level,
                             'parent_id' => $institution->parent_id
                         ];
                     })
                     ->toArray();
    }

    /**
     * Get available roles for user creation based on current user's permissions
     */
    public function getAvailableRoles(User $currentUser): array
    {
        $userRole = $currentUser->roles->first()?->name;
        
        $query = Role::select(['id', 'name', 'display_name', 'level'])
            ->where('is_active', true);
        
        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can assign any role
                break;
                
            case 'regionadmin':
                // RegionAdmin can assign roles: regionoperator, sektoradmin, schooladmin, müəllim
                $query->whereIn('name', ['regionoperator', 'sektoradmin', 'schooladmin', 'müəllim']);
                break;
                
            case 'sektoradmin':
                // SektorAdmin can assign roles: schooladmin, müəllim
                $query->whereIn('name', ['schooladmin', 'müəllim']);
                break;
                
            case 'məktəbadmin':
            case 'schooladmin':
                // MəktəbAdmin can assign role: müəllim
                $query->whereIn('name', ['müəllim']);
                break;
                
            default:
                // Other roles cannot create users
                $query->where('id', -1); // Force empty result
                break;
        }
        
        return $query->orderBy('level')
                     ->get()
                     ->unique('name') // Remove duplicates based on 'name' field
                     ->values() // Reset array keys after filtering
                     ->map(function($role) {
                         return [
                             'id' => $role->id,
                             'name' => $role->name,
                             'display_name' => $role->display_name,
                             'level' => $role->level
                         ];
                     })
                     ->toArray();
    }

    /**
     * Get user's permission context
     */
    public function getPermissionContext(User $user): array
    {
        $role = $user->roles->first();
        
        return [
            'can_create_users' => $this->canUserCreateUsers($user),
            'can_modify_users' => $this->canUserModifyUsers($user),
            'can_delete_users' => $this->canUserDeleteUsers($user),
            'available_institutions' => $this->getAvailableInstitutions($user),
            'available_roles' => $this->getAvailableRoles($user),
            'institutional_scope' => $this->getUserInstitutionalScope($user),
            'role_level' => $role?->level ?? 999,
            'access_level' => $this->determineUserAccessLevel($user)
        ];
    }

    /**
     * Check if user can create users
     */
    public function canUserCreateUsers(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'schooladmin']);
    }

    /**
     * Check if user can modify users
     */
    public function canUserModifyUsers(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'schooladmin']);
    }

    /**
     * Check if user can delete users
     */
    public function canUserDeleteUsers(User $user): bool
    {
        return $user->hasRole('superadmin');
    }

    /**
     * Get user's institutional scope
     */
    public function getUserInstitutionalScope(User $user): array
    {
        $userRole = $user->roles->first()?->name;
        
        switch ($userRole) {
            case 'superadmin':
                return ['type' => 'global', 'institutions' => []];
                
            case 'regionadmin':
            case 'regionoperator':
                $institutions = $this->getRegionalInstitutions($user->institution_id);
                return ['type' => 'regional', 'institutions' => $institutions->toArray()];
                
            case 'sektoradmin':
                $institutions = $this->getSectorInstitutions($user->institution_id);
                return ['type' => 'sectoral', 'institutions' => $institutions->toArray()];
                
            case 'məktəbadmin':
            case 'schooladmin':
                return ['type' => 'institutional', 'institutions' => [$user->institution_id]];
                
            default:
                return ['type' => 'personal', 'institutions' => []];
        }
    }

    /**
     * Apply RegionAdmin filtering - can see users in their region and all sub-institutions
     */
    private function applyRegionAdminFiltering(Builder $query, User $currentUser): void
    {
        $userRegionId = $currentUser->institution_id;
        $allInstitutionIds = $this->getRegionalInstitutions($userRegionId);
        
        // Filter users to only show those in these institutions
        $query->whereIn('institution_id', $allInstitutionIds);
    }

    /**
     * Apply SektorAdmin filtering - can see users in their sector and schools
     */
    private function applySektorAdminFiltering(Builder $query, User $currentUser): void
    {
        $userSektorId = $currentUser->institution_id;
        $allInstitutionIds = $this->getSectorInstitutions($userSektorId);
        
        // Filter users to only show those in these institutions
        $query->whereIn('institution_id', $allInstitutionIds);
    }

    /**
     * Get all institutions in user's region
     */
    private function getRegionalInstitutions($regionId)
    {
        // Get all institutions under this region (sectors and schools)
        $regionInstitutions = Institution::where(function($q) use ($regionId) {
            $q->where('id', $regionId) // The region itself
              ->orWhere('parent_id', $regionId); // Sectors in this region
        })->pluck('id');

        // Get schools under sectors
        $schoolInstitutions = Institution::whereIn('parent_id', $regionInstitutions)->pluck('id');

        // Combine all institution IDs
        return $regionInstitutions->merge($schoolInstitutions);
    }

    /**
     * Get all institutions in user's sector
     */
    private function getSectorInstitutions($sektorId)
    {
        // Get all schools under this sector
        $sektorSchools = Institution::where('parent_id', $sektorId)->pluck('id');
        
        // Include the sector itself
        return $sektorSchools->push($sektorId);
    }

    /**
     * Check if target user is in current user's regional scope
     */
    private function isUserInRegionalScope(User $currentUser, User $targetUser): bool
    {
        $allowedInstitutions = $this->getRegionalInstitutions($currentUser->institution_id);
        return $allowedInstitutions->contains($targetUser->institution_id);
    }

    /**
     * Check if target user is in current user's sector scope
     */
    private function isUserInSectorScope(User $currentUser, User $targetUser): bool
    {
        $allowedInstitutions = $this->getSectorInstitutions($currentUser->institution_id);
        return $allowedInstitutions->contains($targetUser->institution_id);
    }

    /**
     * Determine user's access level
     */
    private function determineUserAccessLevel(User $user): string
    {
        $userRole = $user->roles->first()?->name;
        
        switch ($userRole) {
            case 'superadmin':
                return 'global';
            case 'regionadmin':
            case 'regionoperator':
                return 'regional';
            case 'sektoradmin':
                return 'sectoral';
            case 'məktəbadmin':
            case 'schooladmin':
                return 'institutional';
            case 'müəllim':
            case 'teacher':
                return 'personal';
            default:
                return 'none';
        }
    }

    /**
     * Validate user permissions for specific operation
     */
    public function validateUserPermissions(User $currentUser, User $targetUser, string $operation): array
    {
        $errors = [];

        switch ($operation) {
            case 'view':
                if (!$this->canUserAccessRecord($currentUser, $targetUser)) {
                    $errors[] = 'Bu istifadəçiyə giriş icazəniz yoxdur.';
                }
                break;

            case 'modify':
                if (!$this->canUserModifyRecord($currentUser, $targetUser)) {
                    $errors[] = 'Bu istifadəçini dəyişdirmək icazəniz yoxdur.';
                }
                break;

            case 'delete':
                if (!$this->canUserDeleteRecord($currentUser, $targetUser)) {
                    $errors[] = 'Bu istifadəçini silmək icazəniz yoxdur.';
                }
                break;

            default:
                $errors[] = 'Naməlum əməliyyat.';
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors
        ];
    }
}