<?php

namespace App\Http\Middleware;

use App\Models\Institution;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RegionalDataAccessMiddleware
{
    /**
     * Handle an incoming request to ensure regional data access control
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse) $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next, ?string $resourceType = null)
    {
        // DEBUG: Log middleware entry
        Log::info('🔍 RegionalDataAccessMiddleware - ENTRY', [
            'url' => $request->url(),
            'method' => $request->method(),
            'resource_type' => $resourceType,
            'has_authorization_header' => $request->hasHeader('Authorization'),
        ]);

        $user = $request->user();

        if (! $user) {
            Log::warning('❌ RegionalDataAccessMiddleware - No authenticated user', [
                'url' => $request->url(),
            ]);

            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        Log::info('✅ RegionalDataAccessMiddleware - User authenticated', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'institution_id' => $user->institution_id,
        ]);

        // SuperAdmin has access to everything
        if ($user->hasRole('superadmin')) {
            Log::info('🔑 RegionalDataAccessMiddleware - SuperAdmin bypass');

            return $next($request);
        }

        // Get user's primary role
        $primaryRole = $user->roles->first();
        if (! $primaryRole) {
            Log::warning('❌ RegionalDataAccessMiddleware - No role assigned', [
                'user_id' => $user->id,
            ]);

            return response()->json(['message' => 'İstifadəçinin rolu müəyyən edilməyib'], 403);
        }

        Log::info('🎭 RegionalDataAccessMiddleware - Role check', [
            'user_id' => $user->id,
            'primary_role' => $primaryRole->name,
            'all_roles' => $user->roles->pluck('name'),
        ]);

        // Validate access based on role and resource type
        $accessValidation = $this->validateRegionalAccess($user, $primaryRole->name, $resourceType, $request);

        Log::info('🔐 RegionalDataAccessMiddleware - Access validation result', [
            'user_id' => $user->id,
            'allowed' => $accessValidation['allowed'],
            'message' => $accessValidation['message'] ?? 'Access granted',
            'scope' => $accessValidation['scope'] ?? null,
        ]);

        if (! $accessValidation['allowed']) {
            Log::warning('❌ RegionalDataAccessMiddleware - Access DENIED', [
                'user_id' => $user->id,
                'role' => $primaryRole->name,
                'message' => $accessValidation['message'],
            ]);

            return response()->json([
                'message' => $accessValidation['message'],
                'error_code' => 'REGIONAL_ACCESS_DENIED',
            ], 403);
        }

        // Add regional scope to request for further processing
        $request->merge([
            'regional_scope' => $accessValidation['scope'],
            'allowed_institutions' => $accessValidation['allowed_institutions'] ?? [],
            'allowed_departments' => $accessValidation['allowed_departments'] ?? [],
        ]);

        Log::info('✅ RegionalDataAccessMiddleware - Access GRANTED, proceeding to controller');

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

            case 'schooladmin':
                return $this->validateMektebAdminAccess($user, $resourceType, $request);

            case 'müəllim':
                return $this->validateMuellimAccess($user, $resourceType, $request);

            default:
                return [
                    'allowed' => false,
                    'message' => 'Bilinməyən rol üçün giriş qadağandır',
                ];
        }
    }

    /**
     * Validate RegionAdmin access
     */
    private function validateRegionAdminAccess($user, $resourceType, $request): array
    {
        Log::info('🔍 validateRegionAdminAccess - START', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'resource_type' => $resourceType,
        ]);

        $userRegion = $user->institution;

        Log::info('🏢 validateRegionAdminAccess - Institution check', [
            'user_id' => $user->id,
            'has_institution' => $userRegion !== null,
            'institution_id' => $userRegion?->id,
            'institution_name' => $userRegion?->name,
            'institution_level' => $userRegion?->level,
            'level_is_2' => $userRegion?->level === 2,
        ]);

        if (! $userRegion || $userRegion->level !== 2) {
            Log::warning('❌ validateRegionAdminAccess - Institution validation FAILED', [
                'user_id' => $user->id,
                'has_institution' => $userRegion !== null,
                'level' => $userRegion?->level ?? 'NULL',
                'expected_level' => 2,
            ]);

            return [
                'allowed' => false,
                'message' => 'RegionAdmin regional idarəyə təyin edilməlidir',
            ];
        }

        // Get all institutions under this region
        $allowedInstitutions = Institution::where(function ($query) use ($userRegion) {
            $query->where('id', $userRegion->id)
                ->orWhere('parent_id', $userRegion->id)
                ->orWhereHas('parent', function ($q) use ($userRegion) {
                    $q->where('parent_id', $userRegion->id);
                });
        })->pluck('id')->toArray();

        Log::info('🏫 validateRegionAdminAccess - Allowed institutions loaded', [
            'user_id' => $user->id,
            'region_id' => $userRegion->id,
            'allowed_count' => count($allowedInstitutions),
            'allowed_ids' => $allowedInstitutions,
        ]);

        // Check if requested resource is within regional scope
        $hasInstitutionId = $this->hasInstitutionIdInRequest($request);
        $requestedInstitutionId = $hasInstitutionId ? $this->getInstitutionIdFromRequest($request) : null;

        Log::info('🔍 validateRegionAdminAccess - Request institution check', [
            'user_id' => $user->id,
            'has_institution_id_in_request' => $hasInstitutionId,
            'requested_institution_id' => $requestedInstitutionId,
        ]);

        if ($hasInstitutionId) {
            if (! in_array($requestedInstitutionId, $allowedInstitutions)) {
                Log::warning('❌ validateRegionAdminAccess - Institution access DENIED', [
                    'user_id' => $user->id,
                    'requested_id' => $requestedInstitutionId,
                    'allowed_ids' => $allowedInstitutions,
                ]);

                return [
                    'allowed' => false,
                    'message' => 'Bu təşkilata giriş səlahiyyətiniz yoxdur',
                ];
            }
        }

        Log::info('✅ validateRegionAdminAccess - Access GRANTED', [
            'user_id' => $user->id,
            'region_id' => $userRegion->id,
            'allowed_institutions_count' => count($allowedInstitutions),
        ]);

        return [
            'allowed' => true,
            'scope' => 'regional',
            'allowed_institutions' => $allowedInstitutions,
            'region_id' => $userRegion->id,
        ];
    }

    /**
     * Validate RegionOperator access
     */
    private function validateRegionOperatorAccess($user, $resourceType, $request): array
    {
        $userDepartment = $user->department;
        $userInstitution = $user->institution;

        if (! $userDepartment || ! $userInstitution) {
            return [
                'allowed' => false,
                'message' => 'RegionOperator departament və təşkilata təyin edilməlidir',
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
                    'message' => 'Bu departamenta giriş səlahiyyətiniz yoxdur',
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'department',
            'allowed_institutions' => $allowedInstitutions,
            'allowed_departments' => $allowedDepartments,
            'department_id' => $userDepartment->id,
        ];
    }

    /**
     * Validate SektorAdmin access
     */
    private function validateSektorAdminAccess($user, $resourceType, $request): array
    {
        $userSector = $user->institution;

        if (! $userSector || $userSector->type !== 'sector_education_office') {
            return [
                'allowed' => false,
                'message' => 'SektorAdmin sektora təyin edilməlidir',
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
            if (! in_array($requestedInstitutionId, $allowedInstitutions)) {
                return [
                    'allowed' => false,
                    'message' => 'Bu təşkilata giriş səlahiyyətiniz yoxdur',
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'sector',
            'allowed_institutions' => $allowedInstitutions,
            'sector_id' => $userSector->id,
        ];
    }

    /**
     * Validate MəktəbAdmin access
     */
    private function validateMektebAdminAccess($user, $resourceType, $request): array
    {
        $userSchool = $user->institution;

        if (! $userSchool || ! in_array($userSchool->type, ['school', 'secondary_school', 'gymnasium', 'vocational'])) {
            return [
                'allowed' => false,
                'message' => 'MəktəbAdmin məktəbə təyin edilməlidir',
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
                    'message' => 'Bu məktəbə giriş səlahiyyətiniz yoxdur',
                ];
            }
        }

        return [
            'allowed' => true,
            'scope' => 'school',
            'allowed_institutions' => $allowedInstitutions,
            'school_id' => $userSchool->id,
        ];
    }

    /**
     * Validate Müəllim (Teacher) access
     */
    private function validateMuellimAccess($user, $resourceType, $request): array
    {
        $userSchool = $user->institution;
        $userDepartment = $user->department;

        if (! $userSchool) {
            return [
                'allowed' => false,
                'message' => 'Müəllim məktəbə təyin edilməlidir',
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
                'message' => 'Bu resursa giriş səlahiyyətiniz yoxdur',
            ];
        }

        return [
            'allowed' => true,
            'scope' => 'teacher',
            'allowed_institutions' => $allowedInstitutions,
            'allowed_departments' => $allowedDepartments,
            'school_id' => $userSchool->id,
        ];
    }

    /**
     * Check if request contains institution ID
     */
    private function hasInstitutionIdInRequest($request): bool
    {
        return ($request->has('institution_id') && $request->input('institution_id') !== null) ||
               $request->route('institution') ||
               $request->route('institutionId');
    }

    /**
     * Get institution ID from request
     */
    private function getInstitutionIdFromRequest($request): ?int
    {
        if ($request->has('institution_id') && $request->input('institution_id') !== null) {
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
