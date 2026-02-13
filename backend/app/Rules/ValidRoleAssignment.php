<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use Spatie\Permission\Models\Role;

class ValidRoleAssignment implements Rule
{
    /**
     * Explicit role hierarchy: role name => assignable role names.
     * Must stay in sync with UserPermissionService::ASSIGNABLE_ROLES.
     */
    private const ASSIGNABLE_ROLES = [
        'regionadmin' => [
            'regionoperator', 'sektoradmin',
            'schooladmin', 'məktəbadmin',
            'muavin', 'ubr', 'tesarrufat', 'psixoloq',
            'müəllim', 'teacher',
        ],
        'sektoradmin' => [
            'schooladmin', 'məktəbadmin',
            'muavin', 'ubr', 'tesarrufat', 'psixoloq',
            'müəllim', 'teacher',
        ],
        'schooladmin' => [
            'muavin', 'ubr', 'tesarrufat', 'psixoloq',
            'müəllim', 'teacher',
        ],
        'məktəbadmin' => [
            'muavin', 'ubr', 'tesarrufat', 'psixoloq',
            'müəllim', 'teacher',
        ],
    ];

    /**
     * Determine if the validation rule passes.
     */
    public function passes($attribute, $value)
    {
        $user = auth()->user();

        // Find the target role using Spatie model (guard_name filtered)
        $targetRole = Role::where('guard_name', 'sanctum')->find($value);

        if (! $targetRole) {
            return false;
        }

        // Superadmin can assign any role
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Resolve current user's role name
        $currentRoleName = $user->roles->first()?->name;
        if (! $currentRoleName && $user->role_id) {
            $currentRoleName = $user->role?->name;
        }

        if (! $currentRoleName) {
            return false;
        }

        // Check against explicit hierarchy map
        $assignable = self::ASSIGNABLE_ROLES[$currentRoleName] ?? [];

        return in_array($targetRole->name, $assignable, true);
    }

    /**
     * Get the validation error message.
     */
    public function message()
    {
        return 'Bu rolü təyin etmək üçün yetkiniz yoxdur.';
    }
}
