<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Rules\DepartmentBelongsToInstitution;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
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
            'username' => 'sometimes|string|min:3|max:50|unique:users,username,' . $this->route('user')->id,
            'email' => 'sometimes|string|email|max:100|unique:users,email,' . $this->route('user')->id,
            'utis_code' => 'nullable|string|regex:/^\d{1,12}$/|unique:users,utis_code,' . $this->route('user')->id,
            'role_id' => 'sometimes|exists:roles,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'department_id' => [
                'nullable',
                'exists:departments,id',
                new DepartmentBelongsToInstitution($this->input('institution_id')),
            ],
            'departments' => 'nullable|array',
            'departments.*' => 'string',
            'is_active' => 'sometimes|boolean',
            'password' => 'nullable|string|min:8|confirmed',
            'password_confirmation' => 'nullable|string|min:8',

            // Profile data
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'patronymic' => 'nullable|string|max:100',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'national_id' => 'nullable|string|max:20',
            'contact_phone' => 'nullable|string|max:20',
            'emergency_contact' => 'nullable|string|max:20',
            'address' => 'nullable|array',

            // Unified Spatie Permissions
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
            $roleId = $this->input('role_id') ?? $this->route('user')->role_id;
            $role = Role::find($roleId);

            // RegionOperator must have at least one permission
            if ($role && $role->name === 'regionoperator') {
                $assignablePermissions = $this->input('assignable_permissions', []);

                // Only validate if permissions are being updated
                if ($this->has('assignable_permissions') && empty($assignablePermissions)) {
                    $validator->errors()->add(
                        'assignable_permissions',
                        'RegionOperator roluna malik istifadəçi üçün ən azı 1 səlahiyyət seçilməlidir.'
                    );
                }
            }
        });
    }
}
