<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Models\Institution;
use App\Models\User;

class RegionalDataAccessMiddleware
{
    /**
     * Handle an incoming request to ensure regional data access control
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @param  string  $resourceType
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next, string $resourceType = null)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // SuperAdmin has access to everything
        if ($user->hasRole('superadmin')) {
            return $next($request);
        }

        // Get user's primary role
        $primaryRole = $user->roles->first();
        if (!$primaryRole) {
            return response()->json(['message' => 'İstifadəçinin rolu müəyyən edilməyib'], 403);
        }

        // Validate access based on role and resource type
        $accessValidation = $this->validateRegionalAccess($user, $primaryRole->name, $resourceType, $request);
        
        if (!$accessValidation['allowed']) {
            return response()->json([
                'message' => $accessValidation['message'],
                'error_code' => 'REGIONAL_ACCESS_DENIED'
            ], 403);
        }

        // Add regional scope to request for further processing
        $request->merge([
            'regional_scope' => $accessValidation['scope'],
            'allowed_institutions' => $accessValidation['allowed_institutions'] ?? [],
            'allowed_departments' => $accessValidation['allowed_departments'] ?? []
        ]);

        return $next($request);
    }

    /**
     * Validate regional access based on user role and resource type
     */
    private function validateRegionalAccess($user, $roleName, $resourceType, $request): array
    {
        switch ($roleName) {
            case 'regionadmin':
                return $this->validateRegionAdminAccess($user, $resourceType, $request);
                
            case 'regionoperator':
                return $this->validateRegionOperatorAccess($user, $resourceType, $request);
                
            case 'sektoradmin':
                return $this->validateSektorAdminAccess($user, $resourceType, $request);
                
            case 'məktəbadmin':
                return $this->validateMektebAdminAccess($user, $resourceType, $request);
                
            case 'müəllim':
                return $this->validateMuellimAccess($user, $resourceType, $request);
                
            default:
                return [
                    'allowed' => false,
                    'message' => 'Bilinməyən rol üçün giriş qadağandır'
                ];
        }
    }

    /**
     * Validate RegionAdmin access
     */
    private function validateRegionAdminAccess($user, $resourceType, $request): array
    {
        $userRegion = $user->institution;
        
        if (!$userRegion || $userRegion->level !== 2) {
            return [
                'allowed' => false,
                'message' => 'RegionAdmin regional idarəyə təyin edilməlidir'
            ];
        }

        // Get all institutions under this region
        $allowedInstitutions = Institution::where(function($query) use ($userRegion) {
            $query->where('id', $userRegion->id)
                  ->orWhere('parent_id', $userRegion->id)
                  ->orWhereHas('parent', function($q) use ($userRegion) {
                      $q->where('parent_id', $userRegion->id);
                  });
        })->pluck('id')->toArray();

        // Check if requested resource is within regional scope
        if ($this->hasInstitutionIdInRequest($request)) {
            $requestedInstitutionId = $this->getInstitutionIdFromRequest($request);
            if (!in_array($requestedInstitutionId, $allowedInstitutions)) {
                return [
                    'allowed' => false,
                    'message' => 'Bu təşkilata giriş səlahiyyətiniz yoxdur'
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'regional',
            'allowed_institutions' => $allowedInstitutions,
            'region_id' => $userRegion->id
        ];
    }

    /**
     * Validate RegionOperator access
     */
    private function validateRegionOperatorAccess($user, $resourceType, $request): array
    {
        $userDepartment = $user->department;
        $userInstitution = $user->institution;
        
        if (!$userDepartment || !$userInstitution) {
            return [
                'allowed' => false,
                'message' => 'RegionOperator departament və təşkilata təyin edilməlidir'
            ];
        }

        // RegionOperator can only access their department's data
        $allowedInstitutions = [$userInstitution->id];
        $allowedDepartments = [$userDepartment->id];

        // Validate department access for resource requests
        if ($this->hasDepartmentIdInRequest($request)) {
            $requestedDepartmentId = $this->getDepartmentIdFromRequest($request);
            if ($requestedDepartmentId !== $userDepartment->id) {
                return [
                    'allowed' => false,
                    'message' => 'Bu departamenta giriş səlahiyyətiniz yoxdur'
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'department',
            'allowed_institutions' => $allowedInstitutions,
            'allowed_departments' => $allowedDepartments,
            'department_id' => $userDepartment->id
        ];
    }

    /**
     * Validate SektorAdmin access
     */
    private function validateSektorAdminAccess($user, $resourceType, $request): array
    {
        $userSector = $user->institution;
        
        if (!$userSector || $userSector->type !== 'sector_education_office') {
            return [
                'allowed' => false,
                'message' => 'SektorAdmin sektora təyin edilməlidir'
            ];
        }

        // Get all schools under this sector
        $allowedInstitutions = Institution::where('parent_id', $userSector->id)
            ->where('level', 4) // School level
            ->pluck('id')
            ->prepend($userSector->id) // Include sector itself
            ->toArray();

        // Check if requested resource is within sector scope
        if ($this->hasInstitutionIdInRequest($request)) {
            $requestedInstitutionId = $this->getInstitutionIdFromRequest($request);
            if (!in_array($requestedInstitutionId, $allowedInstitutions)) {
                return [
                    'allowed' => false,
                    'message' => 'Bu təşkilata giriş səlahiyyətiniz yoxdur'
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'sector',
            'allowed_institutions' => $allowedInstitutions,
            'sector_id' => $userSector->id
        ];
    }

    /**
     * Validate MəktəbAdmin access
     */
    private function validateMektebAdminAccess($user, $resourceType, $request): array
    {
        $userSchool = $user->institution;
        
        if (!$userSchool || !in_array($userSchool->type, ['school', 'secondary_school', 'gymnasium', 'vocational'])) {
            return [
                'allowed' => false,
                'message' => 'MəktəbAdmin məktəbə təyin edilməlidir'
            ];
        }

        // MəktəbAdmin can only access their school's data
        $allowedInstitutions = [$userSchool->id];

        // Check if requested resource is within school scope
        if ($this->hasInstitutionIdInRequest($request)) {
            $requestedInstitutionId = $this->getInstitutionIdFromRequest($request);
            if ($requestedInstitutionId !== $userSchool->id) {
                return [
                    'allowed' => false,
                    'message' => 'Bu məktəbə giriş səlahiyyətiniz yoxdur'
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'school',
            'allowed_institutions' => $allowedInstitutions,
            'school_id' => $userSchool->id
        ];
    }

    /**
     * Validate Müəllim (Teacher) access
     */
    private function validateMuellimAccess($user, $resourceType, $request): array
    {
        $userSchool = $user->institution;
        $userDepartment = $user->department;
        
        if (!$userSchool) {
            return [
                'allowed' => false,
                'message' => 'Müəllim məktəbə təyin edilməlidir'
            ];
        }

        // Teachers have limited access - only to their own data and school surveys
        $allowedInstitutions = [$userSchool->id];
        $allowedDepartments = $userDepartment ? [$userDepartment->id] : [];

        // Restrict access to certain resource types
        $restrictedResources = ['users', 'institutions', 'roles', 'system'];
        if (in_array($resourceType, $restrictedResources)) {
            return [
                'allowed' => false,
                'message' => 'Bu resursa giriş səlahiyyətiniz yoxdur'
            ];
        }

        return [
            'allowed' => true,
            'scope' => 'teacher',
            'allowed_institutions' => $allowedInstitutions,
            'allowed_departments' => $allowedDepartments,
            'school_id' => $userSchool->id
        ];
    }

    /**
     * Check if request contains institution ID
     */
    private function hasInstitutionIdInRequest($request): bool
    {
        return $request->has('institution_id') || 
               $request->route('institution') ||
               $request->route('institutionId');
    }

    /**
     * Get institution ID from request
     */
    private function getInstitutionIdFromRequest($request): ?int
    {
        if ($request->has('institution_id')) {
            return (int) $request->input('institution_id');
        }
        
        if ($request->route('institution')) {
            return (int) $request->route('institution');
        }
        
        if ($request->route('institutionId')) {
            return (int) $request->route('institutionId');
        }
        
        return null;
    }

    /**
     * Check if request contains department ID
     */
    private function hasDepartmentIdInRequest($request): bool
    {
        return $request->has('department_id') || 
               $request->route('department') ||
               $request->route('departmentId');
    }

    /**
     * Get department ID from request
     */
    private function getDepartmentIdFromRequest($request): ?int
    {
        if ($request->has('department_id')) {
            return (int) $request->input('department_id');
        }
        
        if ($request->route('department')) {
            return (int) $request->route('department');
        }
        
        if ($request->route('departmentId')) {
            return (int) $request->route('departmentId');
        }
        
        return null;
    }
}