<?php

namespace App\Observers;

use App\Models\Permission;
use App\Models\PermissionAuditLog;

class PermissionObserver
{
    /**
     * Handle the Permission "updated" event.
     * Track changes to permission metadata and invalidate cache.
     */
    public function updated(Permission $permission): void
    {
        // Invalidate permission cache
        app(\App\Services\PermissionCacheService::class)->invalidatePermissionCache($permission);
        // Skip if no actual changes
        if (! $permission->isDirty()) {
            return;
        }

        // Track is_active changes (activated/deactivated)
        if ($permission->isDirty('is_active')) {
            $action = $permission->is_active ? 'activated' : 'deactivated';

            $this->logAudit([
                'permission_id' => $permission->id,
                'action' => $action,
                'old_values' => ['is_active' => $permission->getOriginal('is_active')],
                'new_values' => ['is_active' => $permission->is_active],
            ]);
        }

        // Track scope changes
        if ($permission->isDirty('scope')) {
            $this->logAudit([
                'permission_id' => $permission->id,
                'action' => 'scope_changed',
                'old_values' => ['scope' => $permission->getOriginal('scope')],
                'new_values' => ['scope' => $permission->scope],
            ]);
        }

        // Track other metadata changes (display_name, description, etc.)
        $trackedFields = ['display_name', 'description', 'category', 'resource', 'action'];
        $changedFields = array_filter($trackedFields, fn ($field) => $permission->isDirty($field));

        if (! empty($changedFields)) {
            $oldValues = [];
            $newValues = [];

            foreach ($changedFields as $field) {
                $oldValues[$field] = $permission->getOriginal($field);
                $newValues[$field] = $permission->{$field};
            }

            $this->logAudit([
                'permission_id' => $permission->id,
                'action' => 'updated',
                'old_values' => $oldValues,
                'new_values' => $newValues,
            ]);
        }
    }

    /**
     * Log audit entry with current user context.
     */
    private function logAudit(array $data): void
    {
        // Get current authenticated user
        $userId = auth()->id();

        // Get request context (IP, user agent)
        $ipAddress = request()->ip();
        $userAgent = request()->userAgent();

        PermissionAuditLog::create(array_merge($data, [
            'user_id' => $userId,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]));
    }
}
