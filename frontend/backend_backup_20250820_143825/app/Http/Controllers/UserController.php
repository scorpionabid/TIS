<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\UserCrudService;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    public function __construct(
        protected UserCrudService $userService
    ) {}

    /**
     * Debug method for role testing
     */
    public function debugRoles(Request $request): JsonResponse
    {
        $users = User::with('roles')->take(3)->get();
        $result = [];
        
        foreach ($users as $user) {
            $firstRole = $user->roles->first();
            $result[] = [
                'user' => $user->email,
                'role_exists' => $firstRole ? 'yes' : 'no',
                'role' => $firstRole ? [
                    'id' => $firstRole->id,
                    'name' => $firstRole->name,
                    'display_name' => $firstRole->display_name,
                    'level' => $firstRole->level,
                    'raw_data' => $firstRole->toArray()
                ] : null
            ];
        }
        
        return response()->json(['debug_result' => $result]);
    }
    
    /**
     * BYPASS SERVICE - Direct implementation for role fix with regional filtering
     */
    public function index(Request $request): JsonResponse
    {
        // Simple validation
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');
        
        // Build query
        $query = User::with(['roles', 'institution', 'profile']);
        
        // Apply regional filtering based on user role
        $currentUser = $request->user();
        $this->applyRegionalFiltering($query, $currentUser);
        
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('username', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }
        
        $users = $query->paginate($perPage);
        
        // Simple transformation
        $data = [];
        foreach ($users as $user) {
            $role = $user->roles->first();
            $data[] = [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $role ? [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name,
                    'level' => $role->level
                ] : [
                    'id' => null,
                    'name' => null,
                    'display_name' => null,
                    'level' => null
                ],
                'institution' => $user->institution ? [
                    'id' => $user->institution->id,
                    'name' => $user->institution->name,
                    'type' => $user->institution->type
                ] : null,
                'is_active' => $user->is_active,
                'last_login_at' => $user->last_login_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'first_name' => $user->profile?->first_name ?? null,
                'last_name' => $user->profile?->last_name ?? null
            ];
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Users retrieved successfully',
            'data' => $data,
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem()
            ]
        ]);
    }

    /**
     * Get specific user
     */
    public function show(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $user = $this->userService->getWithRelations($user);
            $formattedUser = $this->userService->formatDetailedForResponse($user);
            
            return $this->success($formattedUser, 'User retrieved successfully');
        }, 'user.show');
    }

    /**
     * Create new user
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $user = $this->userService->create($request->validated());
            $formattedUser = $this->userService->formatForResponse($user);
            
            return $this->created($formattedUser, 'User created successfully');
        }, 'user.store');
    }

    /**
     * Update user
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $updatedUser = $this->userService->update($user, $request->validated());
            $formattedUser = $this->userService->formatForResponse($updatedUser);
            
            return $this->success($formattedUser, 'User updated successfully');
        }, 'user.update');
    }

    /**
     * Delete user (soft delete by default)
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $deleteType = $request->query('type', 'soft');
            $this->userService->delete($user, $deleteType);
            
            $message = $deleteType === 'hard' 
                ? 'User permanently deleted successfully'
                : 'User deactivated successfully';
            
            return $this->success(null, $message);
        }, 'user.destroy');
    }

    /**
     * Apply regional filtering based on current user's role and institution
     */
    private function applyRegionalFiltering($query, $currentUser): void
    {
        // Get user's role name from Spatie roles
        $userRole = $currentUser->roles->first()?->name;
        
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
                // MəktəbAdmin can only see users in their school
                $query->where('institution_id', $currentUser->institution_id);
                break;
                
            case 'müəllim':
                // Teachers can only see themselves and other teachers in same school
                $query->where('institution_id', $currentUser->institution_id)
                      ->whereHas('roles', function($q) {
                          $q->whereIn('name', ['müəllim', 'məktəbadmin']);
                      });
                break;
                
            default:
                // Unknown role - restrict to only their own record
                $query->where('id', $currentUser->id);
                break;
        }
    }

    /**
     * Apply RegionAdmin filtering - can see users in their region and all sub-institutions
     */
    private function applyRegionAdminFiltering($query, $currentUser): void
    {
        $userRegionId = $currentUser->institution_id;
        
        // Get all institutions under this region (sectors and schools)
        $regionInstitutions = \App\Models\Institution::where(function($q) use ($userRegionId) {
            $q->where('id', $userRegionId) // The region itself
              ->orWhere('parent_id', $userRegionId); // Sectors in this region
        })->pluck('id');

        // Get schools under sectors
        $schoolInstitutions = \App\Models\Institution::whereIn('parent_id', $regionInstitutions)
                                                    ->pluck('id');

        // Combine all institution IDs
        $allInstitutionIds = $regionInstitutions->merge($schoolInstitutions);

        // Filter users to only show those in these institutions
        $query->whereIn('institution_id', $allInstitutionIds);
    }

    /**
     * Apply SektorAdmin filtering - can see users in their sector and schools
     */
    private function applySektorAdminFiltering($query, $currentUser): void
    {
        $userSektorId = $currentUser->institution_id;
        
        // Get all schools under this sector
        $sektorSchools = \App\Models\Institution::where('parent_id', $userSektorId)->pluck('id');
        
        // Include the sector itself
        $allInstitutionIds = $sektorSchools->push($userSektorId);

        // Filter users to only show those in these institutions
        $query->whereIn('institution_id', $allInstitutionIds);
    }

    /**
     * Get available institutions for user creation based on current user's permissions
     */
    public function getAvailableInstitutions(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $userRole = $currentUser->roles->first()?->name;
        
        $query = \App\Models\Institution::select(['id', 'name', 'type', 'level', 'parent_id'])
            ->where('is_active', true);
        
        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can assign users to any institution
                break;
                
            case 'regionadmin':
                // RegionAdmin can assign users only to institutions in their region
                $userRegionId = $currentUser->institution_id;
                $regionInstitutions = \App\Models\Institution::where(function($q) use ($userRegionId) {
                    $q->where('id', $userRegionId)
                      ->orWhere('parent_id', $userRegionId);
                })->pluck('id');
                
                $schoolInstitutions = \App\Models\Institution::whereIn('parent_id', $regionInstitutions)->pluck('id');
                $allInstitutionIds = $regionInstitutions->merge($schoolInstitutions);
                
                $query->whereIn('id', $allInstitutionIds);
                break;
                
            case 'sektoradmin':
                // SektorAdmin can assign users only to their sector and schools under it
                $userSektorId = $currentUser->institution_id;
                $sektorSchools = \App\Models\Institution::where('parent_id', $userSektorId)->pluck('id');
                $allInstitutionIds = $sektorSchools->push($userSektorId);
                
                $query->whereIn('id', $allInstitutionIds);
                break;
                
            case 'məktəbadmin':
                // MəktəbAdmin can only assign users to their own school
                $query->where('id', $currentUser->institution_id);
                break;
                
            default:
                // Other roles cannot create users - return empty
                $query->where('id', -1); // Force empty result
                break;
        }
        
        $institutions = $query->orderBy('level')
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
                             });
        
        return response()->json([
            'success' => true,
            'data' => $institutions,
            'message' => 'Available institutions retrieved successfully'
        ]);
    }

    /**
     * Get available roles for user creation based on current user's permissions
     */
    public function getAvailableRoles(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $userRole = $currentUser->roles->first()?->name;
        
        $query = \App\Models\Role::select(['id', 'name', 'display_name', 'level'])
            ->where('is_active', true);
        
        switch ($userRole) {
            case 'superadmin':
                // SuperAdmin can assign any role
                break;
                
            case 'regionadmin':
                // RegionAdmin can assign roles: regionoperator, sektoradmin, məktəbadmin, müəllim
                $query->whereIn('name', ['regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim']);
                break;
                
            case 'sektoradmin':
                // SektorAdmin can assign roles: məktəbadmin, müəllim
                $query->whereIn('name', ['məktəbadmin', 'müəllim']);
                break;
                
            case 'məktəbadmin':
                // MəktəbAdmin can assign role: müəllim
                $query->whereIn('name', ['müəllim']);
                break;
                
            default:
                // Other roles cannot create users
                $query->where('id', -1); // Force empty result
                break;
        }
        
        $roles = $query->orderBy('level')
                      ->get()
                      ->map(function($role) {
                          return [
                              'id' => $role->id,
                              'name' => $role->name,
                              'display_name' => $role->display_name,
                              'level' => $role->level
                          ];
                      });
        
        return response()->json([
            'success' => true,
            'data' => $roles,
            'message' => 'Available roles retrieved successfully'
        ]);
    }
}