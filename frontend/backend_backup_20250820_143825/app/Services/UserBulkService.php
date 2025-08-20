<?php

namespace App\Services;

use App\Models\User;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Exception;

class UserBulkService
{
    /**
     * Bulk activate users
     */
    public function activate(array $userIds): array
    {
        return DB::transaction(function () use ($userIds) {
            $users = User::whereIn('id', $userIds)->get();
            $updatedCount = 0;

            foreach ($users as $user) {
                if (!$user->is_active) {
                    $user->update(['is_active' => true, 'locked_until' => null]);
                    $updatedCount++;

                    // Log security event
                    SecurityEvent::logEvent([
                        'event_type' => 'bulk_user_activated',
                        'severity' => 'info',
                        'user_id' => Auth::id(),
                        'target_user_id' => $user->id,
                        'description' => 'User activated via bulk operation',
                        'event_data' => [
                            'target_username' => $user->username,
                            'bulk_operation' => true
                        ]
                    ]);
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_user_activate', $updatedCount, count($userIds), [
                'user_ids' => $userIds
            ]);

            return [
                'updated_count' => $updatedCount,
                'total_requested' => count($userIds),
                'message' => "{$updatedCount} istifadəçi uğurla aktivləşdirildi"
            ];
        });
    }
    
    /**
     * Bulk deactivate users
     */
    public function deactivate(array $userIds): array
    {
        // Prevent deactivating current user
        if (in_array(Auth::id(), $userIds)) {
            throw new Exception('Öz hesabınızı deaktiv edə bilməzsiniz');
        }

        return DB::transaction(function () use ($userIds) {
            $users = User::whereIn('id', $userIds)->get();
            $updatedCount = 0;

            foreach ($users as $user) {
                if ($user->is_active) {
                    $user->update([
                        'is_active' => false,
                        'locked_until' => now()->addYears(10)
                    ]);
                    
                    // Revoke all tokens
                    $user->tokens()->delete();
                    
                    $updatedCount++;

                    // Log security event
                    SecurityEvent::logEvent([
                        'event_type' => 'bulk_user_deactivated',
                        'severity' => 'warning',
                        'user_id' => Auth::id(),
                        'target_user_id' => $user->id,
                        'description' => 'User deactivated via bulk operation',
                        'event_data' => [
                            'target_username' => $user->username,
                            'bulk_operation' => true
                        ]
                    ]);
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_user_deactivate', $updatedCount, count($userIds), [
                'user_ids' => $userIds
            ]);

            return [
                'updated_count' => $updatedCount,
                'total_requested' => count($userIds),
                'message' => "{$updatedCount} istifadəçi uğurla deaktiv edildi"
            ];
        });
    }
    
    /**
     * Bulk assign role to users
     */
    public function assignRole(array $userIds, int $roleId): array
    {
        return DB::transaction(function () use ($userIds, $roleId) {
            $users = User::whereIn('id', $userIds)->get();
            $updatedCount = 0;

            foreach ($users as $user) {
                if ($user->role_id !== $roleId) {
                    $oldRole = $user->role?->name;
                    $user->update(['role_id' => $roleId]);
                    $newRole = $user->fresh()->role?->name;
                    $updatedCount++;

                    // Log security event
                    SecurityEvent::logEvent([
                        'event_type' => 'bulk_role_assigned',
                        'severity' => 'info',
                        'user_id' => Auth::id(),
                        'target_user_id' => $user->id,
                        'description' => 'User role changed via bulk operation',
                        'event_data' => [
                            'target_username' => $user->username,
                            'old_role' => $oldRole,
                            'new_role' => $newRole,
                            'bulk_operation' => true
                        ]
                    ]);
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_role_assign', $updatedCount, count($userIds), [
                'user_ids' => $userIds,
                'role_id' => $roleId
            ]);

            return [
                'updated_count' => $updatedCount,
                'total_requested' => count($userIds),
                'message' => "{$updatedCount} istifadəçiyə rol təyin edildi"
            ];
        });
    }
    
    /**
     * Bulk assign institution to users
     */
    public function assignInstitution(array $userIds, int $institutionId): array
    {
        return DB::transaction(function () use ($userIds, $institutionId) {
            $users = User::whereIn('id', $userIds)->get();
            $updatedCount = 0;

            foreach ($users as $user) {
                if ($user->institution_id !== $institutionId) {
                    $user->update(['institution_id' => $institutionId]);
                    $updatedCount++;

                    // Log security event
                    SecurityEvent::logEvent([
                        'event_type' => 'bulk_institution_assigned',
                        'severity' => 'info',
                        'user_id' => Auth::id(),
                        'target_user_id' => $user->id,
                        'description' => 'User institution changed via bulk operation',
                        'event_data' => [
                            'target_username' => $user->username,
                            'new_institution_id' => $institutionId,
                            'bulk_operation' => true
                        ]
                    ]);
                }
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_institution_assign', $updatedCount, count($userIds), [
                'user_ids' => $userIds,
                'institution_id' => $institutionId
            ]);

            return [
                'updated_count' => $updatedCount,
                'total_requested' => count($userIds),
                'message' => "{$updatedCount} istifadəçiyə təşkilat təyin edildi"
            ];
        });
    }
    
    /**
     * Bulk delete users
     */
    public function delete(array $userIds, bool $requireConfirmation = true): array
    {
        // Prevent deleting current user
        if (in_array(Auth::id(), $userIds)) {
            throw new Exception('Öz hesabınızı silə bilməzsiniz');
        }

        // Prevent deleting SuperAdmins
        $superAdmins = User::whereIn('id', $userIds)
            ->whereHas('role', function ($q) {
                $q->where('name', 'superadmin');
            })->count();

        if ($superAdmins > 0) {
            throw new Exception('SuperAdmin hesablarını silə bilməzsiniz');
        }

        return DB::transaction(function () use ($userIds) {
            $users = User::whereIn('id', $userIds)->get();
            $deletedCount = 0;

            foreach ($users as $user) {
                // Log before deletion
                SecurityEvent::logEvent([
                    'event_type' => 'bulk_user_deleted',
                    'severity' => 'critical',
                    'user_id' => Auth::id(),
                    'target_user_id' => $user->id,
                    'description' => 'User permanently deleted via bulk operation',
                    'event_data' => [
                        'target_username' => $user->username,
                        'target_email' => $user->email,
                        'bulk_operation' => true
                    ]
                ]);

                // Delete profile if exists
                if ($user->profile) {
                    $user->profile->delete();
                }
                
                // Delete user tokens
                $user->tokens()->delete();
                
                // Delete user
                $user->delete();
                $deletedCount++;
            }

            // Log bulk activity
            $this->logBulkActivity('bulk_user_delete', $deletedCount, count($userIds), [
                'user_ids' => $userIds
            ]);

            return [
                'deleted_count' => $deletedCount,
                'total_requested' => count($userIds),
                'message' => "{$deletedCount} istifadəçi uğurla silindi"
            ];
        });
    }
    
    /**
     * Get bulk operation statistics
     */
    public function getStatistics(): array
    {
        return [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'inactive_users' => User::where('is_active', false)->count(),
            'by_role' => $this->getUserCountsByRole(),
            'by_institution' => $this->getUserCountsByInstitution(),
            'recent_activity' => $this->getRecentActivity()
        ];
    }
    
    /**
     * Validate bulk operation limits
     */
    public function validateBulkOperation(array $userIds, string $operation): void
    {
        $maxLimits = [
            'activate' => 100,
            'deactivate' => 100,
            'assign_role' => 100,
            'assign_institution' => 100,
            'delete' => 50  // Smaller limit for safety
        ];
        
        $limit = $maxLimits[$operation] ?? 50;
        
        if (count($userIds) > $limit) {
            throw new Exception("Bulk {$operation} operation limited to {$limit} users at once");
        }
        
        if (empty($userIds)) {
            throw new Exception('No users selected for bulk operation');
        }
        
        // Validate all user IDs exist
        $existingCount = User::whereIn('id', $userIds)->count();
        if ($existingCount !== count($userIds)) {
            throw new Exception('Some user IDs do not exist');
        }
    }
    
    /**
     * Get preview of bulk operation
     */
    public function getOperationPreview(array $userIds, string $operation, ?int $targetId = null): array
    {
        $users = User::whereIn('id', $userIds)
            ->with(['role', 'institution'])
            ->get(['id', 'username', 'email', 'is_active', 'role_id', 'institution_id']);
            
        $preview = [
            'total_users' => count($userIds),
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'current_status' => $user->is_active ? 'active' : 'inactive',
                    'current_role' => $user->role?->name,
                    'current_institution' => $user->institution?->name
                ];
            }),
            'operation' => $operation,
            'warnings' => []
        ];
        
        // Add operation-specific warnings
        switch ($operation) {
            case 'deactivate':
                if (in_array(Auth::id(), $userIds)) {
                    $preview['warnings'][] = 'Cannot deactivate your own account - will be skipped';
                }
                break;
                
            case 'delete':
                if (in_array(Auth::id(), $userIds)) {
                    $preview['warnings'][] = 'Cannot delete your own account - will be skipped';
                }
                
                $superAdminCount = $users->filter(function ($user) {
                    return $user->role?->name === 'superadmin';
                })->count();
                
                if ($superAdminCount > 0) {
                    $preview['warnings'][] = "Cannot delete {$superAdminCount} SuperAdmin account(s) - will be skipped";
                }
                break;
        }
        
        return $preview;
    }
    
    /**
     * Get user counts by role
     */
    protected function getUserCountsByRole(): array
    {
        return User::join('roles', 'users.role_id', '=', 'roles.id')
            ->selectRaw('roles.name as role, COUNT(*) as count')
            ->groupBy('roles.name')
            ->pluck('count', 'role')
            ->toArray();
    }
    
    /**
     * Get user counts by institution
     */
    protected function getUserCountsByInstitution(): array
    {
        return User::join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->selectRaw('institutions.name as institution, COUNT(*) as count')
            ->groupBy('institutions.name')
            ->orderBy('count', 'desc')
            ->take(10)
            ->pluck('count', 'institution')
            ->toArray();
    }
    
    /**
     * Get recent activity statistics
     */
    protected function getRecentActivity(): array
    {
        return [
            'today' => User::whereDate('created_at', today())->count(),
            'this_week' => User::where('created_at', '>=', now()->startOfWeek())->count(),
            'this_month' => User::where('created_at', '>=', now()->startOfMonth())->count()
        ];
    }
    
    /**
     * Log bulk activity
     */
    protected function logBulkActivity(string $activityType, int $updatedCount, int $totalRequested, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => "Bulk operation: {$activityType} - {$updatedCount}/{$totalRequested} users affected",
            'institution_id' => Auth::user()?->institution_id,
            'event_data' => [
                'updated_count' => $updatedCount,
                'total_requested' => $totalRequested,
                'success_rate' => round(($updatedCount / $totalRequested) * 100, 2) . '%'
            ]
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
}