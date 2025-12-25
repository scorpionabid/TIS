<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Rules\DepartmentBelongsToInstitution;
use App\Rules\ValidRoleAssignment;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return array_merge([
            // ========================================
            // USERS TABLE FIELDS
            // ========================================
            'username' => 'required|string|min:3|max:50|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'utis_code' => 'nullable|string|regex:/^\d{1,12}$/|unique:users,utis_code',
            'password' => 'required|string|min:8',
            'first_name' => 'nullable|string|max:100',  // Saved to: users table
            'last_name' => 'nullable|string|max:100',   // Saved to: users table
            'role_id' => [
                'required',
                'exists:roles,id',
                new ValidRoleAssignment,
            ],
            'institution_id' => 'nullable|exists:institutions,id',
            'department_id' => [
                'nullable',
                'exists:departments,id',
                new DepartmentBelongsToInstitution($this->input('institution_id')),
            ],
            'departments' => 'nullable|array',
            'departments.*' => 'string',
            'is_active' => 'nullable|boolean',

            // ========================================
            // USER_PROFILES TABLE FIELDS
            // ========================================
            // Note: These are validated at root level but saved to user_profiles table
            // by UserCrudService (see app/Services/UserCrudService.php lines 140-144)
            'patronymic' => 'nullable|string|max:100',      // Saved to: user_profiles
            'birth_date' => 'nullable|date',                // Saved to: user_profiles
            'gender' => 'nullable|in:male,female,other',    // Saved to: user_profiles
            'national_id' => 'nullable|string|max:20',      // Saved to: user_profiles
            'contact_phone' => 'nullable|string|max:20',    // Saved to: user_profiles
            'emergency_contact' => 'nullable|string|max:20', // Saved to: user_profiles
            'address' => 'nullable|array',                  // Saved to: user_profiles

            // ========================================
            // UNIFIED SPATIE PERMISSIONS
            // ========================================
            // All roles now use unified Spatie permission system
            'assignable_permissions' => 'nullable|array',
            'assignable_permissions.*' => 'nullable|string|exists:permissions,name',
        ]);
    }

    /**
     * Configure the validator instance.
     * Validate that RegionOperator users have at least one permission assigned.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $role = Role::find($this->input('role_id'));

            // RegionOperator must have at least one permission
            if ($role && $role->name === 'regionoperator') {
                $assignablePermissions = $this->input('assignable_permissions', []);

                if (empty($assignablePermissions)) {
                    $validator->errors()->add(
                        'assignable_permissions',
                        'RegionOperator roluna malik istifadəçi üçün ən azı 1 səlahiyyət seçilməlidir.'
                    );
                }
            }
        });
    }
}
