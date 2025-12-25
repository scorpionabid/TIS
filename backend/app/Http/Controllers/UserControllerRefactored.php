<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Traits\ResponseHelpers;
use App\Http\Traits\ValidationRules;
use App\Models\User;
use App\Services\UserCrudService;
use App\Services\UserPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

class UserControllerRefactored extends BaseController
{
    use ResponseHelpers, ValidationRules;

    protected UserCrudService $userService;

    protected UserPermissionService $permissionService;

    public function __construct(
        UserCrudService $userService,
        UserPermissionService $permissionService
    ) {
        $this->userService = $userService;
        $this->permissionService = $permissionService;
    }

    /**
     * Get users list with regional filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Simple validation
            $perPage = $request->get('per_page', 15);

            // For SuperAdmin, allow showing more users if not specified
            $userRole = $currentUser->roles->first()?->name;
            if ($userRole === 'superadmin' && ! $request->has('per_page')) {
                $perPage = 100;
            }

            $search = $request->get('search');

            // Build query with relations
            $query = User::with(['roles', 'institution', 'profile']);

            Log::info('🔍 UserController: Processing user list request', [
                'user' => $currentUser->username,
                'role' => $userRole,
                'institution_id' => $currentUser->institution_id,
            ]);

            $beforeCount = $query->count();

            // Apply regional filtering using service
            $this->permissionService->applyRegionalFiltering($query, $currentUser);

            $afterCount = $query->count();

            Log::info('📊 Regional filtering applied', [
                'before_count' => $beforeCount,
                'after_count' => $afterCount,
                'role' => $userRole,
            ]);

            $filters = [
                'per_page' => $perPage,
                'page' => $request->get('page', 1),
                'search' => $search,
            ];

            if ($request->filled('role') && $request->get('role') !== 'all') {
                $filters['role'] = $request->get('role');
            }

            if ($request->filled('status') && $request->get('status') !== 'all') {
                $filters['status'] = $request->get('status');
            }

            $institutionFilter = $request->get('institution_id', $request->get('institution'));
            if (! empty($institutionFilter) && $institutionFilter !== 'all') {
                $filters['institution_id'] = $institutionFilter;
            }

            if ($request->filled('sort_by')) {
                $filters['sort_by'] = $request->get('sort_by');
            }

            if ($request->filled('sort_direction')) {
                $filters['sort_direction'] = $request->get('sort_direction');
            }

            // Apply additional filtering, search, and sorting
            $this->userService->applyQueryCustomizations($query, $filters);

            $users = $query->paginate($perPage);

            // Format users data
            $data = $users->getCollection()->map(function ($user) {
                return $this->formatUserForList($user);
            });

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
                    'to' => $users->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçilər yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get specific user
     */
    public function show(Request $request, User $user): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Check access permission
            $permissionCheck = $this->permissionService->validateUserPermissions($currentUser, $user, 'view');
            if (! $permissionCheck['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $permissionCheck['errors'][0] ?? 'Bu istifadəçiyə giriş icazəniz yoxdur.',
                ], 403);
            }

            $user = $this->userService->getWithRelations($user);
            $formattedUser = $this->userService->formatDetailedForResponse($user);

            return $this->success($formattedUser, 'User retrieved successfully');
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi məlumatları yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Create new user
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Check if user can create users
            if (! $this->permissionService->canUserCreateUsers($currentUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçi yaratmaq icazəniz yoxdur.',
                ], 403);
            }

            $validatedData = $request->validated();

            $targetRoleName = $this->resolveTargetRoleName($validatedData, $request);
            $this->enforceRegionOperatorPermissionRules($request, $targetRoleName, true);

            // Validate institution and role permissions
            $availableInstitutions = collect($this->permissionService->getAvailableInstitutions($currentUser))
                ->pluck('id')->toArray();
            $availableRoles = collect($this->permissionService->getAvailableRoles($currentUser))
                ->pluck('id')->toArray();

            if (! in_array($validatedData['institution_id'], $availableInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən təşkilata istifadəçi yaratmaq icazəniz yoxdur.',
                ], 403);
            }

            if (! in_array($validatedData['role_id'], $availableRoles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən rolu təyin etmək icazəniz yoxdur.',
                ], 403);
            }

            $user = $this->userService->create($validatedData);
            $formattedUser = $this->userService->formatForResponse($user);

            $this->handleRegionOperatorPermissions($request, $user);

            return $this->created($formattedUser, 'User created successfully');
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi yaradılarkən xəta baş verdi.');
        }
    }

    /**
     * Update user
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            $currentUser = Auth::user();
            $currentRoleName = strtolower($user->roles->first()?->name ?? '');

            // Check modify permission
            $permissionCheck = $this->permissionService->validateUserPermissions($currentUser, $user, 'modify');
            if (! $permissionCheck['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $permissionCheck['errors'][0] ?? 'Bu istifadəçini dəyişdirmək icazəniz yoxdur.',
                ], 403);
            }

            $validatedData = $request->validated();

            $targetRoleName = $this->resolveTargetRoleName($validatedData, $request, $user);
            $roleChangedToRegionOperator = $currentRoleName !== 'regionoperator' && $targetRoleName === 'regionoperator';
            $this->enforceRegionOperatorPermissionRules($request, $targetRoleName, $roleChangedToRegionOperator);

            // If changing institution or role, validate permissions
            if (isset($validatedData['institution_id']) && $validatedData['institution_id'] !== $user->institution_id) {
                $availableInstitutions = collect($this->permissionService->getAvailableInstitutions($currentUser))
                    ->pluck('id')->toArray();

                if (! in_array($validatedData['institution_id'], $availableInstitutions)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilən təşkilata istifadəçi köçürmək icazəniz yoxdur.',
                    ], 403);
                }
            }

            if (isset($validatedData['role_id']) && $validatedData['role_id'] !== $user->role_id) {
                $availableRoles = collect($this->permissionService->getAvailableRoles($currentUser))
                    ->pluck('id')->toArray();

                if (! in_array($validatedData['role_id'], $availableRoles)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilən rolu təyin etmək icazəniz yoxdur.',
                    ], 403);
                }
            }

            $updatedUser = $this->userService->update($user, $validatedData);
            $formattedUser = $this->userService->formatForResponse($updatedUser);

            $this->handleRegionOperatorPermissions($request, $updatedUser);

            return $this->success($formattedUser, 'User updated successfully');
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi yenilənərkən xəta baş verdi.');
        }
    }

    /**
     * Delete user (soft delete by default)
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Check delete permission
            $permissionCheck = $this->permissionService->validateUserPermissions($currentUser, $user, 'delete');
            if (! $permissionCheck['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $permissionCheck['errors'][0] ?? 'Bu istifadəçini silmək icazəniz yoxdur.',
                ], 403);
            }

            $deleteType = $request->query('type', 'soft');
            $this->userService->delete($user, $deleteType);

            $message = $deleteType === 'hard'
                ? 'İstifadəçi həmişəlik silindi'
                : 'İstifadəçi deaktiv edildi';

            return $this->success(null, $message);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi silinərkən xəta baş verdi.');
        }
    }

    /**
     * Get trashed users (soft deleted)
     */
    public function trashed(Request $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Check if user can view deleted users (high privilege)
            if (! $currentUser->hasAnyRole(['superadmin', 'regionadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Silinmiş istifadəçiləri görmək icazəniz yoxdur.',
                ], 403);
            }

            $validated = $request->validate([
                'search' => 'nullable|string|max:255',
                'per_page' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1',
                'role' => 'nullable|string',
                'institution_id' => 'nullable|integer|exists:institutions,id',
            ]);

            $trashedUsers = $this->userService->getTrashed($validated);

            return $this->success($trashedUsers, 'Silinmiş istifadəçilər uğurla alındı');
        } catch (\Exception $e) {
            return $this->handleError($e, 'Silinmiş istifadəçilər yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Restore soft deleted user
     */
    public function restore(Request $request, $id): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Find trashed user
            $user = User::onlyTrashed()->findOrFail($id);

            // Check restore permission (high privilege)
            if (! $currentUser->hasAnyRole(['superadmin', 'regionadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçi bərpa etmək icazəniz yoxdur.',
                ], 403);
            }

            $this->userService->restore($user);

            return $this->success(null, 'İstifadəçi uğurla bərpa edildi');
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi bərpa edilərkən xəta baş verdi.');
        }
    }

    /**
     * Force delete user permanently
     */
    public function forceDelete(Request $request, $id): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Find trashed user
            $user = User::onlyTrashed()->findOrFail($id);

            // Only SuperAdmin can permanently delete users
            if (! $currentUser->hasRole('superadmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçini həmişəlik silmək icazəniz yoxdur.',
                ], 403);
            }

            $request->validate([
                'confirm' => 'required|boolean|accepted',
            ]);

            $this->userService->forceDelete($user);

            return $this->success(null, 'İstifadəçi həmişəlik silindi');
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi həmişəlik silinərkən xəta baş verdi.');
        }
    }

    /**
     * Get available institutions for user creation
     */
    public function getAvailableInstitutions(Request $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();
            $institutions = $this->permissionService->getAvailableInstitutions($currentUser);

            return response()->json([
                'success' => true,
                'data' => $institutions,
                'message' => 'Available institutions retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə verilən təşkilatlar yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get available roles for user creation
     */
    public function getAvailableRoles(Request $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();
            $roles = $this->permissionService->getAvailableRoles($currentUser);

            return response()->json([
                'success' => true,
                'data' => $roles,
                'message' => 'Available roles retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə verilən rollar yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Get user permission context
     */
    public function getPermissionContext(Request $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();
            $context = $this->permissionService->getPermissionContext($currentUser);

            return response()->json([
                'success' => true,
                'data' => $context,
                'message' => 'Permission context retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İcazə konteksti yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Debug method for role testing
     */
    public function debugRoles(Request $request): JsonResponse
    {
        try {
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
                        'raw_data' => $firstRole->toArray(),
                    ] : null,
                ];
            }

            return response()->json(['debug_result' => $result]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Debug məlumatları yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Format user for list display
     */
    private function formatUserForList($user): array
    {
        $role = $user->roles->first();

        return [
            'id' => $user->id,
            'username' => $this->cleanUtf8($user->username),
            'email' => $this->cleanUtf8($user->email),
            'role_id' => $role?->id,
            'role' => $role ? [
                'id' => $role->id,
                'name' => $this->cleanUtf8($role->name),
                'display_name' => $this->cleanUtf8($role->display_name),
                'level' => $role->level,
            ] : [
                'id' => null,
                'name' => null,
                'display_name' => null,
                'level' => null,
            ],
            'institution' => $user->institution ? [
                'id' => $user->institution->id,
                'name' => $this->cleanUtf8($user->institution->name),
                'type' => $this->cleanUtf8($user->institution->type),
            ] : null,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'first_name' => $this->cleanUtf8($user->profile?->first_name ?? null),
            'last_name' => $this->cleanUtf8($user->profile?->last_name ?? null),
        ];
    }

    /**
     * Clean UTF-8 encoding for safe JSON response
     */
    private function cleanUtf8($string): ?string
    {
        if ($string === null) {
            return null;
        }

        // Convert to UTF-8 and remove invalid characters
        $cleaned = mb_convert_encoding($string, 'UTF-8', 'UTF-8');

        // Remove non-printable characters except newlines/tabs
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $cleaned);

        // Ensure valid UTF-8
        if (! mb_check_encoding($cleaned, 'UTF-8')) {
            $cleaned = utf8_encode($cleaned);
        }

        return $cleaned;
    }

    /**
     * Get filter options for users list
     * Returns available roles, statuses, and institutions based on current user permissions
     */
    public function getFilterOptions(Request $request): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Get available roles based on user permissions
            $availableRoles = $this->permissionService->getAvailableRoles($currentUser);
            $roles = collect($availableRoles)->map(function ($role) {
                return [
                    'value' => $role['name'],
                    'label' => $role['display_name'] ?? $role['name'],
                ];
            })->values();

            // Get available institutions based on user permissions
            $availableInstitutions = $this->permissionService->getAvailableInstitutions($currentUser);
            $institutions = collect($availableInstitutions)->map(function ($institution) {
                return [
                    'id' => $institution['id'],
                    'name' => $institution['name'],
                    'level' => $institution['level'] ?? null,
                    'type' => $institution['type'] ?? null,
                ];
            })->values();

            // Get available departments based on user permissions
            // For SuperAdmin: all active departments
            // For RegionAdmin: departments in their regional institutions
            $userRole = $currentUser->roles->first()?->name;

            // Department mapping helper
            $mapDepartment = function ($dept) {
                return [
                    'id' => $dept->id,
                    'name' => $dept->name,
                    'department_type' => $dept->department_type,
                    'institution_id' => $dept->institution_id,
                    'institution' => $dept->institution ? [
                        'id' => $dept->institution->id,
                        'name' => $dept->institution->name,
                    ] : null,
                ];
            };

            if ($userRole === 'superadmin') {
                $departments = \App\Models\Department::where('is_active', true)
                    ->with('institution:id,name')
                    ->select('id', 'name', 'department_type', 'institution_id')
                    ->orderBy('name')
                    ->get()
                    ->map($mapDepartment);
            } elseif ($userRole === 'regionadmin') {
                // RegionAdmin: departments only in their regional institutions
                $userRegionId = $currentUser->institution_id;
                $regionalInstitutionIds = $this->permissionService->getRegionalInstitutions($userRegionId);

                $departments = \App\Models\Department::where('is_active', true)
                    ->whereIn('institution_id', $regionalInstitutionIds)
                    ->with('institution:id,name')
                    ->select('id', 'name', 'department_type', 'institution_id')
                    ->orderBy('name')
                    ->get()
                    ->map($mapDepartment);
            } else {
                // For other roles, departments will be fetched via specific endpoints
                $departments = collect([]);
            }

            // Static status options
            $statuses = [
                ['value' => 'active', 'label' => 'Aktiv'],
                ['value' => 'inactive', 'label' => 'Passiv'],
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'roles' => $roles,
                    'statuses' => $statuses,
                    'institutions' => $institutions,
                    'departments' => $departments,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'Filter seçimləri yüklənərkən xəta baş verdi.');
        }
    }

    /**
     * Search users for link/resource targeting
     * Used by RegionAdmin+ to search and select specific users for link sharing
     */
    public function search(Request $request, string $query = ''): JsonResponse
    {
        try {
            $currentUser = Auth::user();

            // Validate minimum search length
            if (strlen($query) < 2 && ! $request->has('institution_id') && ! $request->has('role')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Axtarış üçün ən azı 2 simvol daxil edin',
                ], 400);
            }

            // Start building query with relations
            $usersQuery = User::with(['roles', 'institution'])
                ->select('users.*');

            // Apply hierarchical filtering based on current user's permissions
            $this->permissionService->applyRegionalFiltering($usersQuery, $currentUser);

            // Search by name or email
            if (! empty($query)) {
                $usersQuery->where(function ($q) use ($query) {
                    $q->where('full_name', 'ILIKE', "%{$query}%")
                        ->orWhere('username', 'ILIKE', "%{$query}%")
                        ->orWhere('email', 'ILIKE', "%{$query}%");
                });
            }

            // Filter by institution
            if ($request->filled('institution_id')) {
                $institutionId = $request->get('institution_id');
                if ($institutionId !== 'all') {
                    $usersQuery->where('institution_id', $institutionId);
                }
            }

            // Filter by role
            if ($request->filled('role')) {
                $role = $request->get('role');
                if ($role !== 'all') {
                    $usersQuery->whereHas('roles', function ($q) use ($role) {
                        $q->where('name', $role);
                    });
                }
            }

            // Filter by status
            if ($request->filled('status')) {
                $status = $request->get('status');
                if ($status !== 'all') {
                    $usersQuery->where('status', $status);
                }
            }

            // Only active users by default (unless explicitly requesting all)
            if (! $request->has('include_inactive')) {
                $usersQuery->where('status', 'active');
            }

            // Limit results to prevent overwhelming the UI
            $perPage = min($request->get('per_page', 20), 100);
            $users = $usersQuery->orderBy('full_name', 'asc')
                ->paginate($perPage);

            // Format user data for selection UI
            $data = $users->getCollection()->map(function ($user) {
                $role = $user->roles->first();

                return [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'institution' => $user->institution ? [
                        'id' => $user->institution->id,
                        'name' => $user->institution->name,
                        'level' => $user->institution->level,
                    ] : null,
                    'role' => $role ? [
                        'name' => $role->name,
                        'display_name' => $role->display_name ?? $role->name,
                    ] : null,
                    'status' => $user->status,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem(),
                ],
                'message' => 'İstifadəçilər tapıldı',
            ]);
        } catch (\Exception $e) {
            return $this->handleError($e, 'İstifadəçi axtarışında xəta baş verdi.');
        }
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        Log::error('UserController error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : 'Server error',
        ], 500);
    }

    /**
     * Sync or delete RegionOperator permissions based on current payload/role.
     */
    private function handleRegionOperatorPermissions(Request $request, User $user): void
    {
        $payload = $request->all();
        $hasCrudPayload = $this->regionOperatorPermissionService->hasCrudPayload($payload);
        $isRegionOperator = $this->regionOperatorPermissionService->shouldHandle($user);

        if (! $isRegionOperator) {
            $this->regionOperatorPermissionService->deletePermissions($user);

            return;
        }

        if ($hasCrudPayload) {
            $permissions = $this->regionOperatorPermissionService->extractPermissions($payload);
            $this->regionOperatorPermissionService->syncPermissions($user, $permissions);
        }
    }

    private function resolveTargetRoleName(array $validatedData, Request $request, ?User $existingUser = null): ?string
    {
        if ($request->filled('role')) {
            $value = strtolower((string) $request->input('role'));
            if ($value !== '') {
                return $value;
            }
        }

        if (isset($validatedData['role_id'])) {
            $role = Role::find($validatedData['role_id']);
            if ($role && $role->name) {
                return strtolower($role->name);
            }
        }

        if ($existingUser) {
            $role = $existingUser->roles->first();
            if ($role && $role->name) {
                return strtolower($role->name);
            }
        }

        return null;
    }

    private function enforceRegionOperatorPermissionRules(Request $request, ?string $targetRoleName, bool $requirePayload = false): void
    {
        if (($targetRoleName ?? '') !== 'regionoperator') {
            return;
        }

        $this->regionOperatorPermissionService->assertValidPayload($request->all(), $requirePayload);
    }
}
