<?php

namespace App\DTOs;

use App\Models\User;

/**
 * UserPermissionsDTO
 *
 * Data Transfer Object for detailed user permission breakdown.
 * Separates direct permissions from role-based permissions for better UI control.
 */
class UserPermissionsDTO
{
    /**
     * @param array $direct       Direct assigned permissions (editable)
     * @param array $viaRoles     Permissions inherited from roles (readonly)
     * @param array $all          Combined list of all permissions
     * @param array $roleMetadata Metadata about user's roles
     */
    public function __construct(
        public array $direct,
        public array $viaRoles,
        public array $all,
        public array $roleMetadata
    ) {}

    /**
     * Create DTO from User model
     */
    public static function fromUser(User $user): self
    {
        // Get direct permissions (assigned directly to user, not via roles)
        $direct = $user->getDirectPermissions()
            ->pluck('name')
            ->values()
            ->all();

        // Get permissions via roles (readonly in UI)
        $viaRoles = $user->getPermissionsViaRoles()
            ->pluck('name')
            ->values()
            ->all();

        // Get all permissions (direct + via roles)
        $all = $user->getAllPermissions()
            ->pluck('name')
            ->values()
            ->all();

        // Get role metadata
        $roleMetadata = $user->roles->map(fn ($role) => [
            'id' => $role->id,
            'name' => $role->name,
            'display_name' => $role->display_name,
            'level' => $role->level,
            'permission_count' => $role->permissions->count(),
        ])->all();

        return new self($direct, $viaRoles, $all, $roleMetadata);
    }

    /**
     * Convert DTO to array for JSON response
     */
    public function toArray(): array
    {
        return [
            'direct' => $this->direct,
            'via_roles' => $this->viaRoles,
            'all' => $this->all,
            'role_metadata' => $this->roleMetadata,
        ];
    }
}
