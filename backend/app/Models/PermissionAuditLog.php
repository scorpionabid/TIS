<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PermissionAuditLog extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'permission_id',
        'target_user_id',
        'target_role_id',
        'action',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'reason',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the permission that was affected.
     */
    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class, 'permission_id');
    }

    /**
     * Get the target user (if permission was assigned/revoked to/from a user).
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Get the target role (if permission was assigned/revoked to/from a role).
     */
    public function targetRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'target_role_id');
    }

    /**
     * Scope to get logs for a specific permission.
     */
    public function scopeForPermission($query, int $permissionId)
    {
        return $query->where('permission_id', $permissionId);
    }

    /**
     * Scope to get logs by a specific user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get logs for a specific target user.
     */
    public function scopeForTargetUser($query, int $targetUserId)
    {
        return $query->where('target_user_id', $targetUserId);
    }

    /**
     * Scope to get logs for a specific action.
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get recent logs.
     */
    public function scopeRecent($query, int $limit = 50)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    /**
     * Get formatted action label.
     */
    public function getActionLabel(): string
    {
        return match ($this->action) {
            'assigned' => 'Təyin edildi',
            'revoked' => 'Ləğv edildi',
            'updated' => 'Yeniləndi',
            'activated' => 'Aktivləşdirildi',
            'deactivated' => 'Deaktivləşdirildi',
            'scope_changed' => 'Scope dəyişdirildi',
            default => $this->action,
        };
    }

    /**
     * Get human-readable description of the change.
     */
    public function getDescription(): string
    {
        $userName = $this->user->name ?? 'System';
        $permissionName = $this->permission->name ?? 'Unknown';

        return match ($this->action) {
            'assigned' => "{$userName} '{$permissionName}' səlahiyyətini " .
                         ($this->target_user_id ? $this->targetUser?->name : $this->targetRole?->name) .
                         "-a təyin etdi",
            'revoked' => "{$userName} '{$permissionName}' səlahiyyətini " .
                        ($this->target_user_id ? $this->targetUser?->name : $this->targetRole?->name) .
                        "-dan ləğv etdi",
            'updated' => "{$userName} '{$permissionName}' səlahiyyətini yenilədi",
            'activated' => "{$userName} '{$permissionName}' səlahiyyətini aktivləşdirdi",
            'deactivated' => "{$userName} '{$permissionName}' səlahiyyətini deaktivləşdirdi",
            'scope_changed' => "{$userName} '{$permissionName}' səlahiyyətinin scope-unu dəyişdirdi",
            default => "{$userName} '{$permissionName}' səlahiyyətində dəyişiklik etdi",
        };
    }

    /**
     * Get changes summary.
     */
    public function getChangesSummary(): ?array
    {
        if (!$this->old_values || !$this->new_values) {
            return null;
        }

        $changes = [];
        foreach ($this->new_values as $key => $newValue) {
            $oldValue = $this->old_values[$key] ?? null;
            if ($oldValue !== $newValue) {
                $changes[] = [
                    'field' => $key,
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }
}
