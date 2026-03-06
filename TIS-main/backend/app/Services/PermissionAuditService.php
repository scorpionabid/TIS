<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\PermissionAuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Permission Audit Service
 *
 * Provides manual API methods for logging permission changes.
 * Complements the automatic Observer-based logging.
 */
class PermissionAuditService
{
    /**
     * Log permission assigned to user.
     */
    public function logAssignment(
        Permission $permission,
        User $targetUser,
        ?User $performedBy = null,
        ?string $reason = null,
        ?string $notes = null
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'user_id' => $performedBy?->id ?? auth()->id(),
            'permission_id' => $permission->id,
            'target_user_id' => $targetUser->id,
            'action' => 'assigned',
            'old_values' => null,
            'new_values' => [
                'permission' => $permission->name,
                'target' => $targetUser->email,
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'reason' => $reason,
            'notes' => $notes,
        ]);
    }

    /**
     * Log permission assigned to role.
     */
    public function logRoleAssignment(
        Permission $permission,
        Role $targetRole,
        ?User $performedBy = null,
        ?string $reason = null,
        ?string $notes = null
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'user_id' => $performedBy?->id ?? auth()->id(),
            'permission_id' => $permission->id,
            'target_role_id' => $targetRole->id,
            'action' => 'assigned',
            'old_values' => null,
            'new_values' => [
                'permission' => $permission->name,
                'role' => $targetRole->name,
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'reason' => $reason,
            'notes' => $notes,
        ]);
    }

    /**
     * Log permission revoked from user.
     */
    public function logRevocation(
        Permission $permission,
        User $targetUser,
        ?User $performedBy = null,
        ?string $reason = null,
        ?string $notes = null
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'user_id' => $performedBy?->id ?? auth()->id(),
            'permission_id' => $permission->id,
            'target_user_id' => $targetUser->id,
            'action' => 'revoked',
            'old_values' => [
                'permission' => $permission->name,
                'target' => $targetUser->email,
            ],
            'new_values' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'reason' => $reason,
            'notes' => $notes,
        ]);
    }

    /**
     * Log permission revoked from role.
     */
    public function logRoleRevocation(
        Permission $permission,
        Role $targetRole,
        ?User $performedBy = null,
        ?string $reason = null,
        ?string $notes = null
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'user_id' => $performedBy?->id ?? auth()->id(),
            'permission_id' => $permission->id,
            'target_role_id' => $targetRole->id,
            'action' => 'revoked',
            'old_values' => [
                'permission' => $permission->name,
                'role' => $targetRole->name,
            ],
            'new_values' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'reason' => $reason,
            'notes' => $notes,
        ]);
    }

    /**
     * Get audit log for a permission.
     */
    public function getAuditLog(
        Permission $permission,
        ?string $action = null,
        int $limit = 50
    ) {
        $query = PermissionAuditLog::where('permission_id', $permission->id)
            ->with(['user', 'targetUser', 'targetRole'])
            ->orderBy('created_at', 'desc');

        if ($action) {
            $query->where('action', $action);
        }

        return $query->limit($limit)->get();
    }

    /**
     * Get permission usage statistics.
     */
    public function getPermissionStats(Permission $permission): array
    {
        $totalAssignments = PermissionAuditLog::where('permission_id', $permission->id)
            ->where('action', 'assigned')
            ->count();

        $totalRevocations = PermissionAuditLog::where('permission_id', $permission->id)
            ->where('action', 'revoked')
            ->count();

        $totalUpdates = PermissionAuditLog::where('permission_id', $permission->id)
            ->where('action', 'updated')
            ->count();

        $recentActivity = PermissionAuditLog::where('permission_id', $permission->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $mostActiveUsers = PermissionAuditLog::where('permission_id', $permission->id)
            ->select('user_id', DB::raw('count(*) as action_count'))
            ->groupBy('user_id')
            ->orderBy('action_count', 'desc')
            ->limit(5)
            ->with('user')
            ->get();

        return [
            'total_assignments' => $totalAssignments,
            'total_revocations' => $totalRevocations,
            'total_updates' => $totalUpdates,
            'recent_activity' => $recentActivity,
            'most_active_users' => $mostActiveUsers,
            'affected_roles_count' => $permission->getAffectedRolesCount(),
            'affected_users_count' => $permission->getAffectedUsersCount(),
        ];
    }

    /**
     * Get audit timeline for permission (grouped by date).
     */
    public function getAuditTimeline(
        Permission $permission,
        int $days = 30
    ): array {
        $startDate = now()->subDays($days)->startOfDay();

        $timeline = PermissionAuditLog::where('permission_id', $permission->id)
            ->where('created_at', '>=', $startDate)
            ->select(
                DB::raw('DATE(created_at) as date'),
                'action',
                DB::raw('count(*) as count')
            )
            ->groupBy('date', 'action')
            ->orderBy('date', 'asc')
            ->get()
            ->groupBy('date');

        $result = [];
        for ($i = 0; $i < $days; $i++) {
            $date = now()->subDays($days - $i - 1)->format('Y-m-d');
            $dayData = $timeline->get($date, collect());

            $result[] = [
                'date' => $date,
                'assignments' => $dayData->where('action', 'assigned')->sum('count'),
                'revocations' => $dayData->where('action', 'revoked')->sum('count'),
                'updates' => $dayData->where('action', 'updated')->sum('count'),
                'activations' => $dayData->where('action', 'activated')->sum('count'),
                'deactivations' => $dayData->where('action', 'deactivated')->sum('count'),
            ];
        }

        return $result;
    }

    /**
     * Get recent permission changes across system.
     */
    public function getRecentChanges(int $limit = 50)
    {
        return PermissionAuditLog::with(['user', 'permission', 'targetUser', 'targetRole'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get audit log for a specific user.
     */
    public function getUserAuditLog(User $user, int $limit = 50)
    {
        return PermissionAuditLog::where('target_user_id', $user->id)
            ->with(['user', 'permission'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get audit log for a specific role.
     */
    public function getRoleAuditLog(Role $role, int $limit = 50)
    {
        return PermissionAuditLog::where('target_role_id', $role->id)
            ->with(['user', 'permission'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get permissions that were never used.
     */
    public function getUnusedPermissions()
    {
        return Permission::whereDoesntHave('roles')
            ->whereDoesntHave('users')
            ->get();
    }

    /**
     * Get most frequently assigned permissions.
     */
    public function getMostAssignedPermissions(int $limit = 10)
    {
        return PermissionAuditLog::select('permission_id', DB::raw('count(*) as assignment_count'))
            ->where('action', 'assigned')
            ->groupBy('permission_id')
            ->orderBy('assignment_count', 'desc')
            ->limit($limit)
            ->with('permission')
            ->get();
    }
}
