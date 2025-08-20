<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use Carbon\Carbon;

class RegionAdminUserController extends Controller
{
    /**
     * Get user management statistics for RegionAdmin
     */
    public function getUserStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get all institutions in region
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();
        
        $institutionIds = $allRegionInstitutions->pluck('id');
        
        // User statistics by role
        $usersByRole = User::whereIn('institution_id', $institutionIds)
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('model_has_roles.model_type', User::class)
            ->groupBy('roles.name', 'roles.display_name')
            ->selectRaw('roles.name, roles.display_name, COUNT(*) as count')
            ->get()
            ->keyBy('name');
        
        // User statistics by institution level
        $usersByLevel = User::whereIn('institution_id', $institutionIds)
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->groupBy('institutions.level')
            ->selectRaw('institutions.level, COUNT(*) as count')
            ->get()
            ->mapWithKeys(function($item) {
                $levelNames = [
                    2 => 'Regional',
                    3 => 'Sector', 
                    4 => 'School'
                ];
                return [$levelNames[$item->level] ?? 'Unknown' => $item->count];
            });
        
        // Recent user activities
        $recentUsers = User::whereIn('institution_id', $institutionIds)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->with(['institution', 'roles'])
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->display_name ?? 'No Role',
                    'institution' => $user->institution?->name ?? 'No Institution',
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'last_login' => $user->last_login_at ? Carbon::parse($user->last_login_at)->diffForHumans() : 'Never'
                ];
            });
        
        return response()->json([
            'users_by_role' => $usersByRole,
            'users_by_level' => $usersByLevel,
            'recent_users' => $recentUsers,
            'total_users' => User::whereIn('institution_id', $institutionIds)->count(),
            'active_users' => User::whereIn('institution_id', $institutionIds)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count(),
            'new_users_this_month' => User::whereIn('institution_id', $institutionIds)
                ->where('created_at', '>=', Carbon::now()->startOfMonth())
                ->count()
        ]);
    }

    /**
     * Get detailed user list for the region
     */
    public function getUsersList(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get all institutions in region
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();
        
        $institutionIds = $allRegionInstitutions->pluck('id');
        
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');
        $roleFilter = $request->get('role');
        $institutionFilter = $request->get('institution');
        
        $query = User::whereIn('institution_id', $institutionIds)
            ->with(['institution', 'roles']);
        
        // Apply search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }
        
        // Apply role filter
        if ($roleFilter) {
            $query->whereHas('roles', function($q) use ($roleFilter) {
                $q->where('name', $roleFilter);
            });
        }
        
        // Apply institution filter
        if ($institutionFilter) {
            $query->where('institution_id', $institutionFilter);
        }
        
        $users = $query->paginate($perPage);
        
        $usersData = $users->getCollection()->map(function($user) {
            return [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->roles->first()?->display_name ?? 'No Role',
                'role_name' => $user->roles->first()?->name ?? null,
                'institution' => $user->institution?->name ?? 'No Institution',
                'institution_id' => $user->institution_id,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at ? Carbon::parse($user->last_login_at)->diffForHumans() : 'Never',
                'created_at' => $user->created_at->format('Y-m-d H:i:s')
            ];
        });
        
        return response()->json([
            'users' => $usersData,
            'pagination' => [
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
     * Get user activity analytics
     */
    public function getUserActivity(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get all institutions in region
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();
        
        $institutionIds = $allRegionInstitutions->pluck('id');
        
        // User activity over time (last 30 days)
        $dailyActivity = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            
            $activeCount = User::whereIn('institution_id', $institutionIds)
                ->whereBetween('last_login_at', [$dayStart, $dayEnd])
                ->count();
                
            $dailyActivity[] = [
                'date' => $date->format('Y-m-d'),
                'active_users' => $activeCount
            ];
        }
        
        // Users by institution breakdown
        $usersByInstitution = Institution::whereIn('id', $institutionIds)
            ->withCount('users')
            ->get()
            ->map(function($institution) {
                $activeUsers = User::where('institution_id', $institution->id)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
                    
                return [
                    'institution_name' => $institution->name,
                    'total_users' => $institution->users_count,
                    'active_users' => $activeUsers,
                    'activity_rate' => $institution->users_count > 0 ? 
                        round(($activeUsers / $institution->users_count) * 100, 1) : 0
                ];
            });
        
        return response()->json([
            'daily_activity' => $dailyActivity,
            'users_by_institution' => $usersByInstitution,
            'activity_summary' => [
                'total_logins_this_month' => User::whereIn('institution_id', $institutionIds)
                    ->where('last_login_at', '>=', Carbon::now()->startOfMonth())
                    ->count(),
                'new_users_this_week' => User::whereIn('institution_id', $institutionIds)
                    ->where('created_at', '>=', Carbon::now()->startOfWeek())
                    ->count(),
                'most_active_day' => collect($dailyActivity)->sortByDesc('active_users')->first()
            ]
        ]);
    }

    // USER MANAGEMENT CRUD OPERATIONS

    /**
     * Get users list for RegionAdmin with filters
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get all institutions in region
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        $query = User::whereIn('institution_id', $allowedInstitutionIds)
            ->with(['roles', 'institution', 'department']);
        
        // Apply filters
        if ($request->has('role')) {
            $query->whereHas('roles', function($q) use ($request) {
                $q->where('name', $request->role);
            });
        }
        
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        
        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        if ($request->has('status')) {
            $query->where('is_active', $request->status === 'active');
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('username', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('first_name', 'LIKE', "%{$search}%")
                  ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }
        
        $users = $query->orderBy('created_at', 'desc')->paginate(15);
        
        return response()->json([
            'users' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total()
            ]
        ]);
    }

    /**
     * Create a new user within RegionAdmin's scope
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get allowed institutions and departments
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'password' => 'required|string|min:8|confirmed',
            'role_name' => ['required', 'string', Rule::in(['regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'])],
            'institution_id' => ['required', 'integer', Rule::in($allowedInstitutionIds)],
            'department_id' => 'nullable|integer|exists:departments,id'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $validator->validated();
        
        // Validate department belongs to institution
        if (!empty($data['department_id'])) {
            $department = Department::where('id', $data['department_id'])
                ->where('institution_id', $data['institution_id'])
                ->first();
            if (!$department) {
                return response()->json([
                    'message' => 'Department must belong to the selected institution'
                ], 400);
            }
        }
        
        // Validate role permissions
        $allowedRoles = ['regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'];
        if (!in_array($data['role_name'], $allowedRoles)) {
            return response()->json([
                'message' => 'Invalid role for RegionAdmin'
            ], 400);
        }
        
        try {
            // Create user
            $newUser = User::create([
                'username' => $data['username'],
                'email' => $data['email'],
                'first_name' => $data['first_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'password' => Hash::make($data['password']),
                'institution_id' => $data['institution_id'],
                'department_id' => $data['department_id'] ?? null,
                'is_active' => true,
                'password_changed_at' => now(),
                'password_change_required' => false
            ]);
            
            // Assign role
            $role = Role::where('name', $data['role_name'])->where('guard_name', 'web')->first();
            if ($role) {
                $newUser->assignRole($role);
            }
            
            return response()->json([
                'message' => 'User created successfully',
                'user' => $newUser->load(['roles', 'institution', 'department'])
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show a specific user within RegionAdmin's scope
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get allowed institutions
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        $targetUser = User::whereIn('institution_id', $allowedInstitutionIds)
            ->with(['roles', 'institution', 'department'])
            ->find($id);
            
        if (!$targetUser) {
            return response()->json(['message' => 'User not found in your region'], 404);
        }
        
        return response()->json(['user' => $targetUser]);
    }

    /**
     * Update a user within RegionAdmin's scope
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get allowed institutions
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        $targetUser = User::whereIn('institution_id', $allowedInstitutionIds)->find($id);
        
        if (!$targetUser) {
            return response()->json(['message' => 'User not found in your region'], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'username' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users')->ignore($id)],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($id)],
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'password' => 'sometimes|string|min:8|confirmed',
            'role_name' => ['sometimes', 'required', 'string', Rule::in(['regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'])],
            'institution_id' => ['sometimes', 'required', 'integer', Rule::in($allowedInstitutionIds)],
            'department_id' => 'nullable|integer|exists:departments,id',
            'is_active' => 'sometimes|boolean'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $validator->validated();
        
        // Validate department belongs to institution
        if (isset($data['department_id']) && $data['department_id']) {
            $institutionId = $data['institution_id'] ?? $targetUser->institution_id;
            $department = Department::where('id', $data['department_id'])
                ->where('institution_id', $institutionId)
                ->first();
            if (!$department) {
                return response()->json([
                    'message' => 'Department must belong to the selected institution'
                ], 400);
            }
        }
        
        try {
            // Update password if provided
            if (isset($data['password'])) {
                $data['password'] = Hash::make($data['password']);
                $data['password_changed_at'] = now();
            }
            
            $targetUser->update($data);
            
            // Update role if provided
            if (isset($data['role_name'])) {
                $role = Role::where('name', $data['role_name'])->where('guard_name', 'web')->first();
                if ($role) {
                    $targetUser->syncRoles([$role]);
                }
            }
            
            return response()->json([
                'message' => 'User updated successfully',
                'user' => $targetUser->load(['roles', 'institution', 'department'])
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a user within RegionAdmin's scope
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get allowed institutions
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        $targetUser = User::whereIn('institution_id', $allowedInstitutionIds)->find($id);
        
        if (!$targetUser) {
            return response()->json(['message' => 'User not found in your region'], 404);
        }
        
        // Don't allow deletion of the current user
        if ($targetUser->id === $user->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }
        
        try {
            $targetUser->delete();
            
            return response()->json(['message' => 'User deleted successfully']);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available roles for RegionAdmin to assign
     */
    public function getAvailableRoles(Request $request): JsonResponse
    {
        $allowedRoles = Role::whereIn('name', ['regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'])
            ->select('id', 'name', 'display_name', 'description', 'level')
            ->orderBy('level')
            ->get();
            
        return response()->json(['roles' => $allowedRoles]);
    }

    /**
     * Get available institutions for RegionAdmin
     */
    public function getAvailableInstitutions(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        $institutions = Institution::whereIn('id', $allowedInstitutionIds)
            ->where('is_active', true)
            ->select('id', 'name', 'type', 'level')
            ->orderBy('level')
            ->orderBy('name')
            ->get();
            
        return response()->json(['institutions' => $institutions]);
    }

    /**
     * Get departments for a specific institution
     */
    public function getInstitutionDepartments(Request $request, $institutionId): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        $region = Institution::find($userRegionId);
        $allowedInstitutionIds = $region->getAllChildrenIds();
        
        if (!in_array($institutionId, $allowedInstitutionIds)) {
            return response()->json(['message' => 'Institution not in your region'], 404);
        }
        
        $departments = Department::where('institution_id', $institutionId)
            ->where('is_active', true)
            ->select('id', 'name', 'department_type')
            ->orderBy('name')
            ->get();
            
        return response()->json(['departments' => $departments]);
    }
}