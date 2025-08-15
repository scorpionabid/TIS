<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use App\Models\Role;

class ValidRoleAssignment implements Rule
{
    /**
     * Determine if the validation rule passes.
     */
    public function passes($attribute, $value)
    {
        $user = auth()->user();
        $role = Role::find($value);
        
        if (!$role) {
            return false;
        }

        // Superadmin hər şeyi edə bilər
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Regionadmin yalnız özündən aşağı səviyyəli rollar yarada bilər
        if ($user->hasRole('regionadmin')) {
            return $role->level > 2; // 1=superadmin, 2=regionadmin, 3=regionoperator, ...
        }

        return false;
    }

    /**
     * Get the validation error message.
     */
    public function message()
    {
        return 'Bu rolü təyin etmək üçün yetkiniz yoxdur.';
    }
}
