<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\BaseController;
use App\Models\Department;
use App\Models\Institution;
use App\Models\User;
use App\Services\RegionAdmin\RegionAdminPermissionService;
use App\Services\RegionAdmin\RegionAdminUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class RegionAdminUserController extends BaseController
{
    public function __construct(
        private readonly RegionAdminUserService $regionAdminUserService,
        private readonly RegionAdminPermissionService $regionAdminPermissionService
    ) {}

    /**
     * Get user management statistics for RegionAdmin
     */
    public function getUserStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;

        $institutionIds = $this->regionAdminUserService->getRegionInstitutionIds($userRegionId);
        $usersByRole = $this->regionAdminUserService->getUsersByRole($institutionIds);
        $usersByLevel = $this->regionAdminUserService->getUsersByLevel($institutionIds);
        $recentUsers = $this->regionAdminUserService->getRecentUsers($institutionIds);
        $comprehensiveStats = $this->regionAdminUserService->getComprehensiveStats($institutionIds);

        return response()->json([
            'users_by_role' => $usersByRole,
            'users_by_level' => $usersByLevel,
            'recent_users' => $recentUsers,
            'total_users' => $comprehensiveStats['total_users'],
            'active_users' => $comprehensiveStats['active_users'],
            'new_users_this_month' => $comprehensiveStats['new_users_this_month'],
        ]);
    }

    /**
     * Get detailed user list for the region
     */
    public function getUsersList(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;

        $institutionIds = $this->regionAdminUserService->getRegionInstitutionIds($userRegionId);
        $usersResponse = $this->regionAdminUserService->getUsersList($request, $institutionIds);

        return response()->json($usersResponse);
    }

    /**
     * Get user activity analytics
     */
    public function getUserActivity(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;

        $institutionIds = $this->regionAdminUserService->getRegionInstitutionIds($userRegionId);
        $dailyActivity = $this->regionAdminUserService->getUserActivityAnalytics($institutionIds);
        $usersByInstitution = $this->regionAdminUserService->getUsersByInstitution($institutionIds);
        $activitySummary = $this->regionAdminUserService->getActivitySummary($institutionIds, $dailyActivity);

        return response()->json([
            'daily_activity' => $dailyActivity,
            'users_by_institution' => $usersByInstitution,
            'activity_summary' => $activitySummary,
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
            ->with(['roles', 'institution', 'department', 'profile']);

        // Apply filters
        if ($request->has('role')) {
            $query->whereHas('roles', function ($q) use ($request) {
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
            $query->where(function ($q) use ($search) {
                $q->where('username', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%")
                    ->orWhere('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(15);

        $users->getCollection()->transform(function ($user) {
            $user->setAttribute(
                'assignable_permissions',
                $this->regionAdminPermissionService->getDirectPermissions($user)
            );

            return $user;
        });

        return response()->json([
            'users' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
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

        $validator = Validator::make($request->all(), array_merge([
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'password' => 'required|string|min:8|confirmed',
            'role_name' => ['required', 'string', Rule::in(['regionoperator', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim'])],
            'institution_id' => ['required', 'integer', Rule::in($allowedInstitutionIds)],
            'department_id' => 'nullable|integer|exists:departments,id',
            // RegionOperator permissions (optional)
            'can_manage_surveys' => 'sometimes|boolean',
            'can_manage_tasks' => 'sometimes|boolean',
            'can_manage_documents' => 'sometimes|boolean',
            'can_manage_folders' => 'sometimes|boolean',
            'can_manage_links' => 'sometimes|boolean',
        ], $this->regionOperatorPermissionValidationRules()));

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // CRITICAL: Role-specific institution level validation
        // This validation must happen AFTER basic validation passes
        $roleName = $request->input('role_name');
        $institutionId = $request->input('institution_id');
        $institution = Institution::find($institutionId);

        if ($institution) {
            switch ($roleName) {
                case 'sektoradmin':
                    // SektorAdmin must be assigned to sector (level 3)
                    if ($institution->level !== 3) {
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => [
                                'institution_id' => ['SektorAdmin yalnız sektor səviyyəli (level 3) müəssisəyə təyin edilə bilər.'],
                            ],
                        ], 422);
                    }
                    // SektorAdmin MUST NOT have department_id
                    if ($request->input('department_id')) {
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => [
                                'department_id' => ['SektorAdmin roluna department təyin edilə bilməz. Departamentlər yalnız məktəblərdədir.'],
                            ],
                        ], 422);
                    }
                    break;

                case 'schooladmin':
                case 'məktəbadmin':
                    // SchoolAdmin must be assigned to school (level 4+)
                    if ($institution->level < 4) {
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => [
                                'institution_id' => ['SchoolAdmin yalnız məktəb səviyyəli (level 4+) müəssisəyə təyin edilə bilər.'],
                            ],
                        ], 422);
                    }
                    // SchoolAdmin MUST NOT have department_id
                    if ($request->input('department_id')) {
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => [
                                'department_id' => ['SchoolAdmin roluna department təyin edilə bilməz. Departamentlər yalnız RegionOperator üçündür.'],
                            ],
                        ], 422);
                    }
                    break;

                case 'regionoperator':
                    // RegionOperator can ONLY be assigned to:
                    // - Level 2 (Sektor) - departments exist only at sector level
                    // Reality check: departments are only in level 2 institutions

                    // 🔍 DEBUG: Log institution details
                    Log::info('🔍 RegionOperator validation', [
                        'institution_id' => $institution->id,
                        'institution_name' => $institution->name,
                        'institution_level' => $institution->level,
                        'validation_condition' => '$institution->level != 2',
                        'will_fail' => ($institution->level != 2),
                    ]);

                    if ($institution->level != 2) {
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => [
                                'institution_id' => ['RegionOperator yalnız sektor səviyyəli (level 2) müəssisəyə təyin edilə bilər, çünki departamentlər yalnız bu səviyyədə mövcuddur.'],
                            ],
                        ], 422);
                    }
                    // RegionOperator MUST have department_id
                    if (! $request->input('department_id')) {
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => [
                                'department_id' => ['RegionOperator roluna malik istifadəçi üçün departament seçilməlidir.'],
                            ],
                        ], 422);
                    }
                    break;
            }
        }

        $data = $validator->validated();
        $assignablePermissions = [];
        if ($data['role_name'] !== 'regionoperator') {
            $requestedPermissions = $this->regionAdminPermissionService->extractRequestedPermissions($request);
            if (empty($requestedPermissions)) {
                $requestedPermissions = $this->regionAdminPermissionService->getDefaultPermissionsForRole($data['role_name']);
            }
            $assignablePermissions = $this->regionAdminPermissionService->validateForRole(
                $requestedPermissions,
                $data['role_name'],
                $user
            );
        }

        // Validate department belongs to institution
        if (! empty($data['department_id'])) {
            $department = Department::where('id', $data['department_id'])
                ->where('institution_id', $data['institution_id'])
                ->first();
            if (! $department) {
                return response()->json([
                    'message' => 'Department must belong to the selected institution',
                ], 400);
            }
        }

        // Validate role permissions
        $allowedRoles = ['regionoperator', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim'];
        if (! in_array($data['role_name'], $allowedRoles)) {
            return response()->json([
                'message' => 'Invalid role for RegionAdmin',
            ], 400);
        }

        try {
            $this->enforceRegionOperatorPermissionRules($request, $data['role_name'], true);

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
                'password_change_required' => false,
            ]);

            // Assign role
            $role = Role::where('name', $data['role_name'])->where('guard_name', 'sanctum')->first();
            if ($role) {
                $newUser->assignRole($role);
            }

            // Sync modern permissions for all roles (including RegionOperator)
            if ($data['role_name'] === 'regionoperator') {
                // For RegionOperator, extract modern permissions from assignable_permissions
                $modernPermissions = $request->input('assignable_permissions', []);
                if (! empty($modernPermissions)) {
                    $this->regionAdminPermissionService->syncDirectPermissions($newUser, $modernPermissions);
                    Log::info('🔍 [RegionAdminUserController] RegionOperator modern permissions synced (CREATE)', [
                        'user_id' => $newUser->id,
                        'permissions' => $modernPermissions,
                        'count' => count($modernPermissions),
                    ]);
                }
                $assignablePermissions = $modernPermissions;
            } else {
                $this->regionAdminPermissionService->syncDirectPermissions($newUser, $assignablePermissions);
            }

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => $newUser->load(['roles', 'institution', 'department'])
                    ->setAttribute('assignable_permissions', $assignablePermissions),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create user',
                'error' => $e->getMessage(),
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
            ->with(['roles', 'institution', 'department', 'profile'])
            ->find($id);

        if (! $targetUser) {
            return response()->json(['message' => 'User not found in your region'], 404);
        }

        $userData = $targetUser->toArray();
        $userData['profile'] = $targetUser->profile;

        // Add role_name for frontend role identification
        $userData['role_name'] = $targetUser->roles->first()?->name ?? null;

        // NEW: Detailed permission breakdown (direct vs role-based)
        $userData['permissions'] = $this->regionAdminPermissionService->getUserPermissionsDetailed($targetUser);

        // For RegionOperator, return only DIRECT permissions (not role-based)
        // Because role-based permissions are shown via role selection, we only need user-specific direct assignments
        if ($targetUser->hasRole('regionoperator')) {
            // Get direct permissions from Spatie (not via roles)
            $directPermissions = $targetUser->getDirectPermissions()->pluck('name')->toArray();

            // 🔍 DEBUG: Log what we're getting
            \Log::info('🔍 [RegionAdminUserController] RegionOperator permissions data', [
                'user_id' => $targetUser->id,
                'direct_permissions_count' => count($directPermissions),
                'direct_permissions' => $directPermissions,
            ]);

            $userData['assignable_permissions'] = $directPermissions;
        } else {
            // For other roles, prefer returning only DIRECT permissions for editable array.
            // Keep back-compat fields so older frontends continue to function until rollout completes.
            $direct = $userData['permissions']['direct'] ?? [];
            $viaRoles = $userData['permissions']['via_roles'] ?? [];
            $all = $userData['permissions']['all'] ?? array_values(array_unique(array_merge($direct, $viaRoles)));

            // Editable list should contain only direct permissions.
            $userData['assignable_permissions'] = $direct;

            // Provide inherited permissions separately for the UI to render read-only badges.
            $userData['inherited_permissions'] = $viaRoles;

            // Temporary back-compat field containing the previous behaviour (direct + inherited)
            $userData['assignable_permissions_all'] = $all;

            // 🔍 DEBUG: Log what we're returning for non-RegionOperator roles
            \Log::info('🔍 [RegionAdminUserController] show() - Other role permissions data', [
                'user_id' => $targetUser->id,
                'role_name' => $userData['role_name'],
                'direct_count' => count($direct),
                'direct_permissions' => $direct,
                'via_roles_count' => count($viaRoles),
                'via_roles_permissions' => $viaRoles,
                'all_count' => count($all),
            ]);
        }

        // Ensure primary fields exist at top level for backward compatibility
        if (empty($userData['first_name']) && $targetUser->profile?->first_name) {
            $userData['first_name'] = $targetUser->profile->first_name;
        }

        if (empty($userData['last_name']) && $targetUser->profile?->last_name) {
            $userData['last_name'] = $targetUser->profile->last_name;
        }

        if (empty($userData['patronymic']) && $targetUser->profile?->patronymic) {
            $userData['patronymic'] = $targetUser->profile->patronymic;
        }

        if ((empty($userData['first_name']) || empty($userData['last_name'])) && ! empty($targetUser->name)) {
            $parts = preg_split('/\s+/', trim($targetUser->name));
            if (! empty($parts)) {
                $userData['first_name'] = $userData['first_name'] ?? array_shift($parts);
                $userData['last_name'] = $userData['last_name'] ?? implode(' ', $parts);
            }
        }

        if (empty($userData['last_name']) && ! empty($targetUser->username)) {
            $userData['last_name'] = $targetUser->username;
        }

        // 🔍 DEBUG: Log final response data
        \Log::info('🔍 [RegionAdminUserController] Final response data', [
            'user_id' => $targetUser->id,
            'role_name' => $userData['role_name'] ?? 'NONE',
            'has_permissions_key' => array_key_exists('permissions', $userData),
            'has_assignable_permissions_key' => array_key_exists('assignable_permissions', $userData),
            'has_region_operator_permissions_key' => array_key_exists('region_operator_permissions', $userData),
            'assignable_permissions_count' => isset($userData['assignable_permissions']) ? count($userData['assignable_permissions']) : 'NULL',
            'assignable_permissions_sample' => isset($userData['assignable_permissions']) ? array_slice($userData['assignable_permissions'], 0, 5) : 'NULL',
            'permissions_direct_count' => isset($userData['permissions']['direct']) ? count($userData['permissions']['direct']) : 'NULL',
            'permissions_via_roles_count' => isset($userData['permissions']['via_roles']) ? count($userData['permissions']['via_roles']) : 'NULL',
        ]);

        // 🔍 FINAL DEBUG: Log exact JSON that will be sent to frontend
        \Log::info('🔍 [RegionAdminUserController] FINAL JSON RESPONSE', [
            'user_id' => $targetUser->id,
            'response_structure' => [
                'success' => true,
                'has_data_key' => true,
                'data_keys' => array_keys($userData),
                'data_permissions_exists' => array_key_exists('permissions', $userData),
                'data_permissions_structure' => isset($userData['permissions']) ? array_keys($userData['permissions']) : 'NULL',
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => $userData,
        ]);
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

        if (! $targetUser) {
            return response()->json(['message' => 'User not found in your region'], 404);
        }

        $validator = Validator::make($request->all(), array_merge([
            'username' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users')->ignore($id)],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($id)],
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'password' => 'sometimes|string|min:8|confirmed',
            'role_name' => ['sometimes', 'required', 'string', Rule::in(['regionoperator', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim'])],
            'institution_id' => ['sometimes', 'required', 'integer', Rule::in($allowedInstitutionIds)],
            'department_id' => [
                'sometimes',
                Rule::requiredIf(function () use ($request, $targetUser) {
                    $incomingRole = $request->input('role_name');
                    $currentRole = $incomingRole ?? $targetUser->roles->first()?->name;

                    return $currentRole === 'regionoperator';
                }),
                'nullable',
                'integer',
                'exists:departments,id',
            ],
            'is_active' => 'sometimes|boolean',
            // RegionOperator permissions (optional)
            'can_manage_surveys' => 'sometimes|boolean',
            'can_manage_tasks' => 'sometimes|boolean',
            'can_manage_documents' => 'sometimes|boolean',
            'can_manage_folders' => 'sometimes|boolean',
            'can_manage_links' => 'sometimes|boolean',
        ], $this->regionOperatorPermissionValidationRules()));

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $targetRoleName = $data['role_name'] ?? $targetUser->roles->first()?->name;
        $departmentId = $data['department_id'] ?? $targetUser->department_id;

        // 🔧 FIX: Extract permissions for ALL roles (including RegionOperator)
        $requestedPermissions = $this->regionAdminPermissionService->extractRequestedPermissions($request);
        if (empty($requestedPermissions)) {
            $requestedPermissions = $this->regionAdminPermissionService->getDefaultPermissionsForRole($targetRoleName);
        }
        $assignablePermissions = $this->regionAdminPermissionService->validateForRole(
            $requestedPermissions,
            $targetRoleName,
            $user
        );

        if ($targetRoleName === 'regionoperator' && empty($departmentId)) {
            return response()->json([
                'message' => 'RegionOperator üçün departament seçilməlidir',
            ], 422);
        }

        // Validate department belongs to institution
        if (! empty($departmentId)) {
            $institutionId = $data['institution_id'] ?? $targetUser->institution_id;
            $department = Department::where('id', $departmentId)
                ->where('institution_id', $institutionId)
                ->first();
            if (! $department) {
                return response()->json([
                    'message' => 'Department must belong to the selected institution',
                ], 400);
            }
        }

        try {
            $this->enforceRegionOperatorPermissionRules(
                $request,
                $targetRoleName,
                ($oldRoleName ?? null) !== 'regionoperator' && $targetRoleName === 'regionoperator'
            );

            // Update password if provided
            if (isset($data['password'])) {
                $data['password'] = Hash::make($data['password']);
                $data['password_changed_at'] = now();
            }

            $targetUser->update($data);

            // Get old role before updating
            $oldRoleName = $targetUser->roles->first()?->name;

            // Update role if provided
            if (isset($data['role_name'])) {
                $role = Role::where('name', $data['role_name'])->where('guard_name', 'sanctum')->first();
                if ($role) {
                    $targetUser->syncRoles([$role]);
                }
            }

            Log::info('🔍 [RegionAdminUserController] UPDATE - Before syncDirectPermissions', [
                'user_id' => $targetUser->id,
                'old_role' => $oldRoleName,
                'new_role' => $targetRoleName,
                'is_regionoperator' => $targetRoleName === 'regionoperator',
                'request_keys' => array_keys($request->all()),
                'has_region_operator_permissions' => isset($request->all()['region_operator_permissions']),
                'region_operator_permissions' => $request->all()['region_operator_permissions'] ?? 'NOT SET',
                'assignable_permissions' => $assignablePermissions,
                'assignable_count' => count($assignablePermissions),
            ]);

            // Sync modern permissions (Spatie ONLY - no legacy system)
            $this->regionAdminPermissionService->syncDirectPermissions($targetUser, $assignablePermissions);

            // 🔍 VERIFY: Read back the permissions to confirm they were saved
            $targetUser->refresh();
            $savedDirectPermissions = $targetUser->getDirectPermissions()->pluck('name')->toArray();
            Log::info('✅ [RegionAdminUserController] UPDATE - After syncDirectPermissions VERIFICATION', [
                'user_id' => $targetUser->id,
                'saved_direct_permissions_count' => count($savedDirectPermissions),
                'saved_direct_permissions' => $savedDirectPermissions,
                'matches_input' => array_diff($savedDirectPermissions, $assignablePermissions) === array_diff($assignablePermissions, $savedDirectPermissions),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $targetUser->load(['roles', 'institution', 'department'])
                    ->setAttribute('assignable_permissions', $savedDirectPermissions),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update user',
                'error' => $e->getMessage(),
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

        if (! $targetUser) {
            return response()->json(['message' => 'User not found in your region'], 404);
        }

        // Don't allow deletion of the current user
        if ($targetUser->id === $user->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }

        try {
            \DB::beginTransaction();

            // Delete related records first to avoid foreign key constraints

            // Delete user profile
            if ($targetUser->profile) {
                $targetUser->profile->delete();
            }

            // Delete user devices and sessions
            \DB::table('session_activities')->where('user_id', $targetUser->id)->delete();
            \DB::table('user_sessions')->where('user_id', $targetUser->id)->delete();
            \DB::table('user_devices')->where('user_id', $targetUser->id)->delete();

            // Delete security related records
            \DB::table('security_alerts')->where('user_id', $targetUser->id)->delete();
            \DB::table('security_alerts')->where('assigned_to', $targetUser->id)->update(['assigned_to' => null]);
            \DB::table('account_lockouts')->where('user_id', $targetUser->id)->delete();
            \DB::table('security_events')->where('user_id', $targetUser->id)->delete();
            \DB::table('security_events')->where('target_user_id', $targetUser->id)->delete();
            \DB::table('security_events')->where('resolved_by', $targetUser->id)->update(['resolved_by' => null]);

            // Delete activity and audit logs
            \DB::table('activity_logs')->where('user_id', $targetUser->id)->delete();
            \DB::table('audit_logs')->where('user_id', $targetUser->id)->delete();

            // Delete user storage quota
            \DB::table('user_storage_quotas')->where('user_id', $targetUser->id)->delete();

            // Delete uploads and documents
            \DB::table('uploads')->where('user_id', $targetUser->id)->delete();
            \DB::table('document_shares')->where('shared_by', $targetUser->id)->delete();
            \DB::table('document_downloads')->where('user_id', $targetUser->id)->update(['user_id' => null]);

            // Delete survey related records
            \DB::table('survey_responses')->where('respondent_id', $targetUser->id)->delete();
            \DB::table('survey_responses')->where('approved_by', $targetUser->id)->update(['approved_by' => null]);
            \DB::table('survey_versions')->where('created_by', $targetUser->id)->delete();
            \DB::table('survey_audit_logs')->where('user_id', $targetUser->id)->update(['user_id' => null]);
            \DB::table('surveys')->where('creator_id', $targetUser->id)->delete();
            \DB::table('surveys')->where('school_approved_by', $targetUser->id)->update(['school_approved_by' => null]);
            \DB::table('surveys')->where('sector_approved_by', $targetUser->id)->update(['sector_approved_by' => null]);
            \DB::table('surveys')->where('region_approved_by', $targetUser->id)->update(['region_approved_by' => null]);

            // Delete task related records
            \DB::table('task_comments')->where('user_id', $targetUser->id)->delete();
            \DB::table('tasks')->where('assigned_to', $targetUser->id)->update(['assigned_to' => null]);
            \DB::table('tasks')->where('created_by', $targetUser->id)->update(['created_by' => null]);

            // Delete school staff and teaching records
            \DB::table('school_staff')->where('user_id', $targetUser->id)->delete();
            \DB::table('teacher_subjects')->where('teacher_id', $targetUser->id)->delete();
            \DB::table('teacher_availability')->where('teacher_id', $targetUser->id)->delete();
            \DB::table('teacher_availability')->where('created_by', $targetUser->id)->delete();
            \DB::table('teacher_availability')->where('approved_by', $targetUser->id)->update(['approved_by' => null]);

            // Delete schedule related records
            \DB::table('schedule_sessions')->where('teacher_id', $targetUser->id)->update(['teacher_id' => null]);
            \DB::table('schedule_sessions')->where('substitute_teacher_id', $targetUser->id)->update(['substitute_teacher_id' => null]);
            \DB::table('schedules')->where('created_by', $targetUser->id)->delete();
            \DB::table('schedules')->where('reviewed_by', $targetUser->id)->update(['reviewed_by' => null]);
            \DB::table('schedules')->where('approved_by', $targetUser->id)->update(['approved_by' => null]);

            // Delete academic calendar records
            \DB::table('academic_calendars')->where('created_by', $targetUser->id)->delete();
            \DB::table('academic_calendars')->where('approved_by', $targetUser->id)->update(['approved_by' => null]);

            // Delete other records
            \DB::table('grades')->where('homeroom_teacher_id', $targetUser->id)->update(['homeroom_teacher_id' => null]);
            \DB::table('reports')->where('created_by', $targetUser->id)->delete();
            \DB::table('indicator_values')->where('approved_by', $targetUser->id)->update(['approved_by' => null]);
            \DB::table('statistics')->where('verified_by', $targetUser->id)->update(['verified_by' => null]);

            // Detach roles and permissions
            \DB::table('model_has_roles')->where('model_id', $targetUser->id)->where('model_type', 'App\\Models\\User')->delete();
            \DB::table('model_has_permissions')->where('model_id', $targetUser->id)->where('model_type', 'App\\Models\\User')->delete();
            \DB::table('role_user')->where('user_id', $targetUser->id)->delete();

            // Delete user tokens
            \DB::table('personal_access_tokens')->where('tokenable_id', $targetUser->id)->where('tokenable_type', 'App\\Models\\User')->delete();

            // Finally delete the user
            $targetUser->delete();

            \DB::commit();

            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Exception $e) {
            \DB::rollback();

            return response()->json([
                'message' => 'Failed to delete user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available roles for RegionAdmin to assign
     */
    public function getAvailableRoles(Request $request): JsonResponse
    {
        $allowedRoles = Role::whereIn('name', ['regionoperator', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim'])
            ->select('id', 'name', 'display_name', 'description', 'level')
            ->orderBy('level')
            ->get();

        return response()->json(['roles' => $allowedRoles]);
    }

    /**
     * Permission metadata for RegionAdmin assignment panel
     */
    public function getPermissionMetadata(Request $request): JsonResponse
    {
        $metadata = $this->regionAdminPermissionService->getMetadataFor($request->user());
        \Log::info('RegionAdmin permission metadata response', [
            'admin_id' => $request->user()->id,
            'modules' => count($metadata['modules'] ?? []),
            'templates' => count($metadata['templates'] ?? []),
        ]);

        // Attach feature flags so frontend can toggle preview UI during rollout
        $features = [
            'permission_preview' => config('feature_flags.permission_preview', true),
        ];

        return response()->json([
            'success' => true,
            'data' => $metadata,
            'features' => $features,
        ]);
    }

    /**
     * Dry-run permission validation endpoint. Accepts optional user_id (null for new users)
     * and a list of proposed assignable_permissions.
     */
    public function validatePermissions(Request $request): JsonResponse
    {
        $admin = $request->user();

        $payload = $request->all();
        $userId = $payload['user_id'] ?? null;
        $roleName = $payload['role_name'] ?? null;
        $proposed = $this->regionAdminPermissionService->extractRequestedPermissions($request);

        $targetUser = null;
        if ($userId) {
            $targetUser = User::find($userId);
            if (! $targetUser) {
                return response()->json(['success' => false, 'message' => 'Target user not found'], 404);
            }
        }

        $result = $this->regionAdminPermissionService->dryRunValidate($targetUser, $proposed, $roleName, $admin);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
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

        if (! in_array($institutionId, $allowedInstitutionIds)) {
            return response()->json(['message' => 'Institution not in your region'], 404);
        }

        $departments = Department::where('institution_id', $institutionId)
            ->where('is_active', true)
            ->select('id', 'name', 'department_type')
            ->orderBy('name')
            ->get();

        return response()->json(['departments' => $departments]);
    }

    private function enforceRegionOperatorPermissionRules(Request $request, ?string $targetRoleName, bool $requirePayload = false): void
    {
        // 🔧 LEGACY METHOD - Now a no-op stub
        // RegionOperatorPermission system removed - now using Spatie permissions
        // This method kept for backward compatibility but does nothing
        if (strtolower($targetRoleName ?? '') !== 'regionoperator') {
            return;
        }

        \Log::info('RegionAdminUserController enforceRegionOperatorPermissionRules (LEGACY STUB)', [
            'target_role' => $targetRoleName,
            'require_payload' => $requirePayload,
            'user_id' => auth()->id(),
            'note' => 'Legacy method - no validation performed, using Spatie instead',
        ]);
    }

    private function regionOperatorPermissionValidationRules(): array
    {
        // ✅ UNIFIED SPATIE PERMISSION VALIDATION
        // All roles now use the same Spatie permission system
        return [
            'assignable_permissions' => 'nullable|array',
            'assignable_permissions.*' => 'string|exists:permissions,name',
        ];
    }

    // 🔧 LEGACY METHOD - Completely removed
    // syncRegionOperatorPermissions() deleted - RegionOperatorPermission system dropped
    // Now using Spatie's syncDirectPermissions() via RegionAdminPermissionService

    private function syncRegionOperatorPermissions(array $payload, User $targetUser, ?string $oldRole = null, ?string $newRole = null): void
    {
        // 🔧 LEGACY STUB - This method is no longer used
        // RegionOperatorPermission system has been completely removed
        // All permission management now uses Spatie Laravel Permission
        // See RegionAdminPermissionService::syncDirectPermissions() instead

        Log::info('🔧 [syncRegionOperatorPermissions] LEGACY STUB CALLED', [
            'user_id' => $targetUser->id,
            'old_role' => $oldRole,
            'new_role' => $newRole,
            'note' => 'This is a legacy stub - no action taken. Use Spatie permissions instead.',
        ]);

        // No-op: All permission syncing now handled by RegionAdminPermissionService
    }
}
