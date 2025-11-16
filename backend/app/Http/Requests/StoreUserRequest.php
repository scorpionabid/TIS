<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Rules\ValidRoleAssignment;
use App\Services\RegionOperatorPermissionService;

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
            'username' => 'required|string|min:3|max:50|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'utis_code' => 'nullable|string|regex:/^\d{1,12}$/|unique:users,utis_code',
            'password' => 'required|string|min:8',
            'role_id' => [
            'required',
            'exists:roles,id',
            new ValidRoleAssignment
        ],
            'institution_id' => 'nullable|exists:institutions,id',
            'department_id' => 'nullable|exists:departments,id',
            'departments' => 'nullable|array',
            'departments.*' => 'string',
            'is_active' => 'nullable|boolean',
            
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

    /**
     * Validation rules for CRUD-based RegionOperator permissions.
     */
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
}
