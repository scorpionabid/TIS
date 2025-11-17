<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Services\RegionOperatorPermissionService;
use App\Rules\DepartmentBelongsToInstitution;
use App\Models\Role;

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
                new DepartmentBelongsToInstitution($this->input('institution_id'))
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
            'address' => 'nullable|array'
        ], $this->regionOperatorPermissionRules());
    }

    protected function regionOperatorPermissionRules(): array
    {
        $rules = [
            'region_operator_permissions' => 'nullable|array',
        ];

        foreach (RegionOperatorPermissionService::CRUD_FIELDS as $field) {
            $rules["region_operator_permissions.$field"] = 'sometimes|boolean';
            $rules[$field] = 'sometimes|boolean';
        }

        foreach (array_keys(RegionOperatorPermissionService::LEGACY_FIELD_MAP) as $legacyField) {
            $rules[$legacyField] = 'sometimes|boolean';
        }

        return $rules;
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Check if the role being assigned is RegionOperator
            $roleId = $this->input('role_id') ?? $this->route('user')->role_id;
            $role = Role::find($roleId);

            if ($role && $role->name === 'regionoperator') {
                // Verify at least one permission is selected
                $hasPermissions = collect(RegionOperatorPermissionService::CRUD_FIELDS)
                    ->some(function($field) {
                        // Check both nested and flat structures
                        return $this->input($field) === true ||
                               $this->input("region_operator_permissions.$field") === true;
                    });

                if (!$hasPermissions) {
                    $validator->errors()->add(
                        'region_operator_permissions',
                        'RegionOperator roluna malik istifadəçi üçün ən azı 1 səlahiyyət seçilməlidir.'
                    );
                }
            }
        });
    }
}
