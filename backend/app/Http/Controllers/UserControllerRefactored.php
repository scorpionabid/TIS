<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\UserCrudService;
use App\Services\UserPermissionService;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserControllerRefactored extends BaseController
{
    use ValidationRules, ResponseHelpers;

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
            if ($userRole === 'superadmin' && !$request->has('per_page')) {
                $perPage = 100;
            }
            
            $search = $request->get('search');
            
            // Build query with relations
            $query = User::with(['roles', 'institution', 'profile']);
            
            Log::info('🔍 UserController: Processing user list request', [
                'user' => $currentUser->username,
                'role' => $userRole,
                'institution_id' => $currentUser->institution_id
            ]);
            
            $beforeCount = $query->count();
            
            // Apply regional filtering using service
            $this->permissionService->applyRegionalFiltering($query, $currentUser);
            
            $afterCount = $query->count();
            
            Log::info('📊 Regional filtering applied', [
                'before_count' => $beforeCount,
                'after_count' => $afterCount,
                'role' => $userRole
            ]);
            
            // Apply search if provided
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('username', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%")
                      ->orWhereHas('profile', function($profileQuery) use ($search) {
                          $profileQuery->where('first_name', 'LIKE', "%{$search}%")
                                      ->orWhere('last_name', 'LIKE', "%{$search}%");
                      });
                });
            }
            
            $users = $query->paginate($perPage);
            
            // Format users data
            $data = $users->getCollection()->map(function($user) {
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
                    'to' => $users->lastItem()
                ]
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
            if (!$permissionCheck['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $permissionCheck['errors'][0] ?? 'Bu istifadəçiyə giriş icazəniz yoxdur.'
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
            if (!$this->permissionService->canUserCreateUsers($currentUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçi yaratmaq icazəniz yoxdur.'
                ], 403);
            }
            
            $validatedData = $request->validated();
            
            // Validate institution and role permissions
            $availableInstitutions = collect($this->permissionService->getAvailableInstitutions($currentUser))
                ->pluck('id')->toArray();
            $availableRoles = collect($this->permissionService->getAvailableRoles($currentUser))
                ->pluck('id')->toArray();
            
            if (!in_array($validatedData['institution_id'], $availableInstitutions)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən təşkilata istifadəçi yaratmaq icazəniz yoxdur.'
                ], 403);
            }
            
            if (!in_array($validatedData['role_id'], $availableRoles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilən rolu təyin etmək icazəniz yoxdur.'
                ], 403);
            }
            
            $user = $this->userService->create($validatedData);
            $formattedUser = $this->userService->formatForResponse($user);
            
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
            
            // Check modify permission
            $permissionCheck = $this->permissionService->validateUserPermissions($currentUser, $user, 'modify');
            if (!$permissionCheck['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $permissionCheck['errors'][0] ?? 'Bu istifadəçini dəyişdirmək icazəniz yoxdur.'
                ], 403);
            }
            
            $validatedData = $request->validated();
            
            // If changing institution or role, validate permissions
            if (isset($validatedData['institution_id']) && $validatedData['institution_id'] !== $user->institution_id) {
                $availableInstitutions = collect($this->permissionService->getAvailableInstitutions($currentUser))
                    ->pluck('id')->toArray();
                    
                if (!in_array($validatedData['institution_id'], $availableInstitutions)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilən təşkilata istifadəçi köçürmək icazəniz yoxdur.'
                    ], 403);
                }
            }
            
            if (isset($validatedData['role_id']) && $validatedData['role_id'] !== $user->role_id) {
                $availableRoles = collect($this->permissionService->getAvailableRoles($currentUser))
                    ->pluck('id')->toArray();
                    
                if (!in_array($validatedData['role_id'], $availableRoles)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Seçilən rolu təyin etmək icazəniz yoxdur.'
                    ], 403);
                }
            }
            
            $updatedUser = $this->userService->update($user, $validatedData);
            $formattedUser = $this->userService->formatForResponse($updatedUser);
            
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
            if (!$permissionCheck['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $permissionCheck['errors'][0] ?? 'Bu istifadəçini silmək icazəniz yoxdur.'
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
            if (!$currentUser->hasAnyRole(['superadmin', 'regionadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Silinmiş istifadəçiləri görmək icazəniz yoxdur.'
                ], 403);
            }
            
            $validated = $request->validate([
                'search' => 'nullable|string|max:255',
                'per_page' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1',
                'role' => 'nullable|string',
                'institution_id' => 'nullable|integer|exists:institutions,id'
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
            if (!$currentUser->hasAnyRole(['superadmin', 'regionadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçi bərpa etmək icazəniz yoxdur.'
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
            if (!$currentUser->hasRole('superadmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'İstifadəçini həmişəlik silmək icazəniz yoxdur.'
                ], 403);
            }
            
            $request->validate([
                'confirm' => 'required|boolean|accepted'
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
                'message' => 'Available institutions retrieved successfully'
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
                'message' => 'Available roles retrieved successfully'
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
                'message' => 'Permission context retrieved successfully'
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
                        'raw_data' => $firstRole->toArray()
                    ] : null
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
            'role' => $role ? [
                'id' => $role->id,
                'name' => $this->cleanUtf8($role->name),
                'display_name' => $this->cleanUtf8($role->display_name),
                'level' => $role->level
            ] : [
                'id' => null,
                'name' => null,
                'display_name' => null,
                'level' => null
            ],
            'institution' => $user->institution ? [
                'id' => $user->institution->id,
                'name' => $this->cleanUtf8($user->institution->name),
                'type' => $this->cleanUtf8($user->institution->type)
            ] : null,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'first_name' => $this->cleanUtf8($user->profile?->first_name ?? null),
            'last_name' => $this->cleanUtf8($user->profile?->last_name ?? null)
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
        if (!mb_check_encoding($cleaned, 'UTF-8')) {
            $cleaned = utf8_encode($cleaned);
        }
        
        return $cleaned;
    }

    /**
     * Handle errors consistently
     */
    private function handleError(\Exception $e, string $defaultMessage): JsonResponse
    {
        Log::error('UserController error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => $defaultMessage,
            'error' => config('app.debug') ? $e->getMessage() : 'Server error',
        ], 500);
    }
}