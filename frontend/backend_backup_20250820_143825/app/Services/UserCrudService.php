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
use Illuminate\Pagination\LengthAwarePaginator;
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
                // Soft delete - deactivate user
                $user->update([
                    'is_active' => false,
                    'locked_until' => now()->addYears(10),
                    'deleted_at' => now()
                ]);

                $user->tokens()->delete();

                $this->logActivity('user_soft_delete', "Deactivated user: {$username}", [
                    'entity_type' => 'User',
                    'entity_id' => $user->id,
                    'before_state' => $oldData,
                    'after_state' => $user->toArray()
                ]);

                SecurityEvent::logEvent([
                    'event_type' => 'user_deactivated',
                    'severity' => 'warning',
                    'user_id' => Auth::id(),
                    'target_user_id' => $user->id,
                    'description' => 'User account deactivated',
                    'event_data' => ['deactivated_username' => $username]
                ]);
            }

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
        $query->where(function ($q) use ($search) {
            $q->where('username', 'ILIKE', "%{$search}%")
              ->orWhere('email', 'ILIKE', "%{$search}%")
              ->orWhereHas('profile', function ($pq) use ($search) {
                  $pq->where('first_name', 'ILIKE', "%{$search}%")
                     ->orWhere('last_name', 'ILIKE', "%{$search}%");
              })
              ->orWhereHas('institution', function ($iq) use ($search) {
                  $iq->where('name', 'ILIKE', "%{$search}%");
              });
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
}