<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Exception;

class UserCrudService
{
    /**
     * Get paginated users list with filtering
     */
    public function getPaginatedList(array $params): LengthAwarePaginator
    {
        $query = User::with(['roles', 'institution', 'profile']);
        
        // Apply filters
        $this->applyFilters($query, $params);
        
        // Apply search
        if (!empty($params['search'])) {
            $this->applySearch($query, $params['search']);
        }
        
        // Apply sorting
        $this->applySorting($query, $params);
        
        $users = $query->paginate($params['per_page'] ?? 15);
        
        // Log activity
        $this->logActivity('users_list', 'Accessed users list', [
            'filters' => array_intersect_key($params, array_flip(['search', 'role', 'institution_id', 'department', 'is_active'])),
            'pagination' => [
                'per_page' => $params['per_page'] ?? 15,
                'page' => $params['page'] ?? 1
            ]
        ]);
        
        return $users;
    }

    /**
     * Apply filtering, search, and sorting on an existing query builder instance.
     */
    public function applyQueryCustomizations(Builder $query, array $params): void
    {
        $this->applyFilters($query, $params);

        if (!empty($params['search'])) {
            $this->applySearch($query, $params['search']);
        }

        $this->applySorting($query, $params);
    }
    
    /**
     * Get user with all relations
     */
    public function getWithRelations(User $user): User
    {
        $user->load(['roles.permissions', 'institution', 'department', 'profile']);
        
        // Log activity
        $this->logActivity('user_view', "Viewed user: {$user->username}", [
            'entity_type' => 'User',
            'entity_id' => $user->id
        ]);
        
        return $user;
    }

    /**
     * Get paginated list of trashed (soft deleted) users
     */
    public function getTrashed(array $params): LengthAwarePaginator
    {
        $query = User::onlyTrashed()->with(['roles', 'institution', 'profile']);
        
        // Apply filters (similar to active users but for trashed)
        if (!empty($params['search'])) {
            $this->applySearch($query, $params['search']);
        }
        
        if (!empty($params['role'])) {
            $query->whereHas('roles', function ($q) use ($params) {
                $q->where('name', $params['role']);
            });
        }
        
        if (!empty($params['institution_id'])) {
            $query->where('institution_id', $params['institution_id']);
        }
        
        // Sort by deletion date (most recent first)
        $query->orderBy('deleted_at', 'desc');
        
        $perPage = $params['per_page'] ?? 15;
        return $query->paginate($perPage);
    }
    
    /**
     * Create new user with profile
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            // Create user
            $user = User::create([
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role_id' => $data['role_id'],
                'institution_id' => $data['institution_id'],
                'department_id' => $data['department_id'] ?? null,
                'departments' => $data['departments'] ?? [],
                'is_active' => $data['is_active'] ?? true,
                'password_changed_at' => now(),
            ]);

            // Assign role using Spatie
            $role = Role::find($data['role_id']);
            if ($role) {
                $user->assignRole($role->name);
                Log::info("Assigned role {$role->name} to user {$user->id}");
            }

            // Create profile if data provided
            $profileFields = ['first_name', 'last_name', 'patronymic', 'birth_date', 'gender', 'national_id', 'contact_phone', 'emergency_contact', 'address'];
            $profileData = array_intersect_key($data, array_flip($profileFields));
            
            if (!empty($profileData)) {
                UserProfile::create(array_merge(['user_id' => $user->id], $profileData));
            }

            $user->load(['role', 'institution', 'department', 'profile']);

            // Log activity
            $this->logActivity('user_create', "Created user: {$user->username} with role: " . ($role->name ?? 'none'), [
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'after_state' => $user->toArray()
            ]);
            
            // Log security event
            SecurityEvent::logEvent([
                'event_type' => 'user_created',
                'severity' => 'info',
                'user_id' => Auth::id(),
                'target_user_id' => $user->id,
                'description' => 'New user created by admin',
                'event_data' => [
                    'created_username' => $user->username,
                    'role' => $user->role?->name,
                    'institution_id' => $user->institution_id
                ]
            ]);

            return $user;
        });
    }
    
    /**
     * Update user with profile
     */
    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $oldData = $user->toArray();

            $updateData = array_intersect_key($data, array_flip([
                'username', 'email', 'role_id', 'institution_id', 'department_id',
                'departments', 'is_active'
            ]));

            // Handle password update
            if (!empty($data['password'])) {
                $updateData['password'] = Hash::make($data['password']);
                $updateData['password_changed_at'] = now();
            }

            $user->update($updateData);

            // Update or create profile
            $profileFields = ['first_name', 'last_name', 'patronymic', 'birth_date', 'gender', 'national_id', 'contact_phone', 'emergency_contact', 'address'];
            $profileData = array_filter(array_intersect_key($data, array_flip($profileFields)), fn($value) => $value !== null);
            
            if (!empty($profileData)) {
                if ($user->profile) {
                    $user->profile->update($profileData);
                } else {
                    UserProfile::create(array_merge(['user_id' => $user->id], $profileData));
                }
            }

            $user->load(['role', 'institution', 'department', 'profile']);

            // Log activity
            $this->logActivity('user_update', "Updated user: {$user->username}", [
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'before_state' => $oldData,
                'after_state' => $user->toArray()
            ]);

            // Log role change if applicable
            if (isset($data['role_id']) && $oldData['role_id'] !== $user->role_id) {
                SecurityEvent::logEvent([
                    'event_type' => 'role_change',
                    'severity' => 'warning',
                    'user_id' => Auth::id(),
                    'target_user_id' => $user->id,
                    'description' => 'User role changed',
                    'event_data' => [
                        'username' => $user->username,
                        'old_role_id' => $oldData['role_id'],
                        'new_role_id' => $user->role_id
                    ]
                ]);
            }

            return $user;
        });
    }
    
    /**
     * Delete user (soft or hard delete)
     */
    public function delete(User $user, string $type = 'soft'): bool
    {
        if ($user->id === Auth::id()) {
            throw new Exception('Cannot delete your own account');
        }

        return DB::transaction(function () use ($user, $type) {
            $oldData = $user->toArray();
            $username = $user->username;

            if ($type === 'hard') {
                // Hard delete - permanently remove user
                $user->tokens()->delete();
                
                if ($user->profile) {
                    $user->profile->delete();
                }
                
                $user->delete();
                
                $this->logActivity('user_hard_delete', "Permanently deleted user: {$username}", [
                    'entity_type' => 'User',
                    'entity_id' => $user->id,
                    'before_state' => $oldData
                ]);

                SecurityEvent::logEvent([
                    'event_type' => 'user_hard_deleted',
                    'severity' => 'high',
                    'user_id' => Auth::id(),
                    'target_user_id' => $user->id,
                    'description' => 'User account permanently deleted',
                    'event_data' => ['deleted_username' => $username]
                ]);
            } else {
                // Soft delete - use Laravel's soft delete functionality
                $user->tokens()->delete();
                $user->delete(); // This will set deleted_at timestamp
                
                // Also set is_active to false for additional business logic
                $user->withTrashed()->where('id', $user->id)->update(['is_active' => false]);

                $this->logActivity('user_soft_delete', "Soft deleted user: {$username}", [
                    'entity_type' => 'User',
                    'entity_id' => $user->id,
                    'before_state' => $oldData,
                    'after_state' => $user->withTrashed()->find($user->id)->toArray()
                ]);

                SecurityEvent::logEvent([
                    'event_type' => 'user_soft_deleted',
                    'severity' => 'warning',
                    'user_id' => Auth::id(),
                    'target_user_id' => $user->id,
                    'description' => 'User account soft deleted',
                    'event_data' => ['deleted_username' => $username]
                ]);
            }

            return true;
        });
    }

    /**
     * Restore soft deleted user
     */
    public function restore(User $user): bool
    {
        if (!$user->trashed()) {
            throw new Exception('User is not deleted and cannot be restored');
        }

        return DB::transaction(function () use ($user) {
            $username = $user->username;
            $oldData = $user->toArray();

            // Restore the user (removes deleted_at timestamp)
            $user->restore();
            
            // Optionally reactivate the user
            $user->update([
                'is_active' => true,
                'locked_until' => null
            ]);

            $user->load(['role', 'institution', 'department', 'profile']);

            $this->logActivity('user_restore', "Restored user: {$username}", [
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'before_state' => $oldData,
                'after_state' => $user->toArray()
            ]);

            SecurityEvent::logEvent([
                'event_type' => 'user_restored',
                'severity' => 'info',
                'user_id' => Auth::id(),
                'target_user_id' => $user->id,
                'description' => 'User account restored from soft delete',
                'event_data' => ['restored_username' => $username]
            ]);

            return true;
        });
    }

    /**
     * Force delete user permanently
     */
    public function forceDelete(User $user): bool
    {
        if (!$user->trashed()) {
            throw new Exception('User must be soft deleted first before permanent deletion');
        }

        return DB::transaction(function () use ($user) {
            $username = $user->username;
            $oldData = $user->toArray();

            // Remove associated data
            $user->tokens()->delete();
            
            if ($user->profile) {
                $user->profile->forceDelete();
            }

            // Permanently delete the user
            $user->forceDelete();

            $this->logActivity('user_force_delete', "Permanently deleted user: {$username}", [
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'before_state' => $oldData
            ]);

            SecurityEvent::logEvent([
                'event_type' => 'user_force_deleted',
                'severity' => 'critical',
                'user_id' => Auth::id(),
                'target_user_id' => $user->id,
                'description' => 'User account permanently deleted',
                'event_data' => ['deleted_username' => $username]
            ]);

            return true;
        });
    }
    
    /**
     * Apply filters to query
     */
    protected function applyFilters($query, array $params): void
    {
        if (!empty($params['role'])) {
            $query->whereHas('roles', function ($q) use ($params) {
                $q->where('name', $params['role']);
            });
        }

        if (isset($params['status'])) {
            if ($params['status'] === 'active') {
                $query->where('is_active', true);
            } elseif ($params['status'] === 'inactive') {
                $query->where('is_active', false);
            }
        }
        
        if (isset($params['is_active'])) {
            $query->where('is_active', $params['is_active']);
        }

        if (!empty($params['institution']) || !empty($params['institution_id'])) {
            $institutionId = $params['institution'] ?? $params['institution_id'];
            $query->where('institution_id', $institutionId);
        }

        if (!empty($params['department'])) {
            $query->whereJsonContains('departments', $params['department']);
        }

        // Date range filters
        if (!empty($params['created_from'])) {
            $query->whereDate('created_at', '>=', $params['created_from']);
        }
        if (!empty($params['created_to'])) {
            $query->whereDate('created_at', '<=', $params['created_to']);
        }
        if (!empty($params['last_login_from'])) {
            $query->whereDate('last_login_at', '>=', $params['last_login_from']);
        }
        if (!empty($params['last_login_to'])) {
            $query->whereDate('last_login_at', '<=', $params['last_login_to']);
        }
    }
    
    /**
     * Apply search to query
     */
    protected function applySearch($query, string $search): void
    {
        $driver = $query->getConnection()->getDriverName();
        $searchPattern = "%{$search}%";

        $query->where(function ($q) use ($driver, $search, $searchPattern) {
            if ($driver === 'sqlite') {
                $like = '%' . Str::lower($search) . '%';

                $q->whereRaw('LOWER(username) LIKE ?', [$like])
                  ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                  ->orWhereHas('profile', function ($pq) use ($like) {
                      $pq->whereRaw('LOWER(first_name) LIKE ?', [$like])
                         ->orWhereRaw('LOWER(last_name) LIKE ?', [$like]);
                  })
                  ->orWhereHas('institution', function ($iq) use ($like) {
                      $iq->whereRaw('LOWER(name) LIKE ?', [$like]);
                  });
            } else {
                $q->where('username', 'ILIKE', $searchPattern)
                  ->orWhere('email', 'ILIKE', $searchPattern)
                  ->orWhereHas('profile', function ($pq) use ($searchPattern) {
                      $pq->where('first_name', 'ILIKE', $searchPattern)
                         ->orWhere('last_name', 'ILIKE', $searchPattern);
                  })
                  ->orWhereHas('institution', function ($iq) use ($searchPattern) {
                      $iq->where('name', 'ILIKE', $searchPattern);
                  });
            }
        });
    }
    
    /**
     * Apply sorting to query
     */
    protected function applySorting($query, array $params): void
    {
        $sortBy = $params['sort_by'] ?? $params['sort'] ?? 'username';
        $sortDirection = $params['sort_direction'] ?? $params['order'] ?? 'asc';
        
        $allowedSorts = ['username', 'email', 'created_at', 'last_login_at'];
        
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDirection);
        } else {
            $query->orderBy('username', 'asc');
        }
    }
    
    /**
     * Format user for API response
     */
    public function formatForResponse(User $user): array
    {
        // Ensure roles are loaded
        if (!$user->relationLoaded('roles')) {
            $user->load('roles');
        }
        
        // Get first role from Spatie roles relationship
        $firstRole = $user->roles->first();
        
        $roleData = null;
        if ($firstRole) {
            $roleData = [
                'id' => $firstRole->id,
                'name' => $firstRole->name,
                'display_name' => $firstRole->display_name,
                'level' => $firstRole->level
            ];
        } else {
            // Fallback to old role relationship if Spatie roles not found
            $roleData = [
                'id' => $user->role?->id,
                'name' => $user->role?->name,
                'display_name' => $user->role?->display_name,
                'level' => $user->role?->level
            ];
        }
        
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $roleData,
            'institution' => [
                'id' => $user->institution?->id,
                'name' => $user->institution?->name,
                'type' => $user->institution?->type
            ],
            'department' => [
                'id' => $user->department?->id,
                'name' => $user->department?->name,
                'department_type' => $user->department?->department_type
            ],
            'departments' => $user->departments,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'profile' => $user->profile ? [
                'first_name' => $user->profile->first_name,
                'last_name' => $user->profile->last_name,
                'full_name' => $user->profile->full_name,
                'contact_phone' => $user->profile->contact_phone
            ] : null
        ];
    }
    
    /**
     * Format detailed user for API response
     */
    public function formatDetailedForResponse(User $user): array
    {
        // Get first role from Spatie roles relationship
        $firstRole = $user->roles->first();
        
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'role_id' => $firstRole?->id,
            'institution_id' => $user->institution?->id,
            'department_id' => $user->department?->id,
            'departments' => $user->departments ?? [],
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'password_changed_at' => $user->password_changed_at,
            'failed_login_attempts' => $user->failed_login_attempts,
            'locked_until' => $user->locked_until,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'first_name' => $user->profile?->first_name,
            'last_name' => $user->profile?->last_name,
            'patronymic' => $user->profile?->patronymic,
            'birth_date' => $user->profile?->birth_date,
            'gender' => $user->profile?->gender,
            'contact_phone' => $user->profile?->contact_phone,
            'role' => [
                'id' => $firstRole?->id,
                'name' => $firstRole?->name,
                'display_name' => $firstRole?->display_name,
                'level' => $firstRole?->level,
                'department_access' => $firstRole?->department_access
            ],
            'institution' => [
                'id' => $user->institution?->id,
                'name' => $user->institution?->name,
                'type' => $user->institution?->type,
                'level' => $user->institution?->level
            ],
            'department' => [
                'id' => $user->department?->id,
                'name' => $user->department?->name,
                'department_type' => $user->department?->department_type
            ],
            'profile' => $user->profile,
            'permissions' => $user->role?->permissions->pluck('name') ?? []
        ];
    }
    
    /**
     * Log activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }

    // ========================================
    // HELPER METHODS (consolidated from UserService)
    // ========================================

    /**
     * Create user with profile
     */
    public function createUserWithProfile(array $userData, array $profileData = []): User
    {
        return DB::transaction(function () use ($userData, $profileData) {
            $user = $this->create([
                'username' => $userData['username'],
                'email' => $userData['email'],
                'password' => Hash::make($userData['password']),
                'role_id' => $userData['role_id'],
                'institution_id' => $userData['institution_id'],
                'department_id' => $userData['department_id'] ?? null,
                'is_active' => $userData['is_active'] ?? true,
            ]);

            if (!empty($profileData)) {
                UserProfile::create(array_merge($profileData, ['user_id' => $user->id]));
            }

            return $user->fresh(['roles', 'institution', 'profile', 'department']);
        });
    }

    /**
     * Reset user password
     */
    public function resetUserPassword(int $userId, string $newPassword): User
    {
        return DB::transaction(function () use ($userId, $newPassword) {
            $user = User::findOrFail($userId);
            $user->update([
                'password' => Hash::make($newPassword),
                'password_changed_at' => now(),
                'failed_login_attempts' => 0,
                'locked_until' => null
            ]);

            return $user->fresh(['roles', 'institution', 'profile']);
        });
    }

    /**
     * Toggle user status
     */
    public function toggleUserStatus(int $userId, bool $isActive): User
    {
        if (!$isActive && $userId === Auth::id()) {
            throw new Exception('Cannot deactivate your own account');
        }

        $user = User::findOrFail($userId);
        $user->update(['is_active' => $isActive]);

        return $user->fresh(['roles', 'institution', 'profile']);
    }

    /**
     * Get users by role
     */
    public function getUsersByRole(string $roleName): \Illuminate\Database\Eloquent\Collection
    {
        return User::whereHas('roles', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        })->with(['roles', 'institution', 'profile', 'department'])->get();
    }

    /**
     * Get users by institution
     */
    public function getUsersByInstitution(int $institutionId): \Illuminate\Database\Eloquent\Collection
    {
        return User::where('institution_id', $institutionId)
            ->with(['roles', 'institution', 'profile', 'department'])->get();
    }

    /**
     * Find user by username
     */
    public function findByUsername(string $username): ?User
    {
        return User::where('username', $username)
            ->with(['roles', 'institution', 'profile', 'department'])->first();
    }

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)
            ->with(['roles', 'institution', 'profile', 'department'])->first();
    }
}
