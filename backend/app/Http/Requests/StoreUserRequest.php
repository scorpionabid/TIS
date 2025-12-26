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
     * Role-specific validation rules for user creation.
     *
     * IMPORTANT: Department structure:
     * - RegionOperator: Assigned to departments (level 4+ institutions)
     * - SektorAdmin: Assigned to sectors (level 3), NO departments
     * - SchoolAdmin: Assigned to schools (level 4+), NO departments
     * - RegionAdmin: Assigned to regions (level 2), NO departments
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $role = Role::find($this->input('role_id'));

            if (!$role) {
                return;
            }

            // 1. RegionOperator must have at least one permission
            if ($role->name === 'regionoperator') {
                $assignablePermissions = $this->input('assignable_permissions', []);

                if (empty($assignablePermissions)) {
                    $validator->errors()->add(
                        'assignable_permissions',
                        'RegionOperator roluna malik istifadəçi üçün ən azı 1 səlahiyyət seçilməlidir.'
                    );
                }
            }

            // 2. Role-specific institution level validation
            $institutionId = $this->input('institution_id');

            if (!$institutionId) {
                // Institution is required for these roles
                if (in_array($role->name, ['regionadmin', 'sektoradmin', 'schooladmin', 'regionoperator'])) {
                    $validator->errors()->add(
                        'institution_id',
                        ucfirst($role->display_name) . ' üçün müəssisə seçilməlidir.'
                    );
                }
                return;
            }

            $institution = \App\Models\Institution::find($institutionId);

            if (!$institution) {
                $validator->errors()->add('institution_id', 'Seçilmiş müəssisə tapılmadı.');
                return;
            }

            // 3. Validate institution level based on role
            switch ($role->name) {
                case 'regionadmin':
                    // RegionAdmin must be assigned to region (level 2)
                    if ($institution->level !== 2) {
                        $validator->errors()->add(
                            'institution_id',
                            'RegionAdmin yalnız region səviyyəli (level 2) müəssisəyə təyin edilə bilər.'
                        );
                    }
                    // RegionAdmin MUST NOT have department_id
                    if ($this->input('department_id')) {
                        $validator->errors()->add(
                            'department_id',
                            'RegionAdmin roluna department təyin edilə bilməz. Departamentlər yalnız məktəblərdədir.'
                        );
                    }
                    break;

                case 'sektoradmin':
                    // SektorAdmin must be assigned to sector (level 3)
                    if ($institution->level !== 3) {
                        $validator->errors()->add(
                            'institution_id',
                            'SektorAdmin yalnız sektor səviyyəli (level 3) müəssisəyə təyin edilə bilər.'
                        );
                    }
                    // SektorAdmin MUST NOT have department_id
                    if ($this->input('department_id')) {
                        $validator->errors()->add(
                            'department_id',
                            'SektorAdmin roluna department təyin edilə bilməz. Departamentlər yalnız məktəblərdədir.'
                        );
                    }
                    break;

                case 'schooladmin':
                    // SchoolAdmin must be assigned to school (level 4+)
                    if ($institution->level < 4) {
                        $validator->errors()->add(
                            'institution_id',
                            'SchoolAdmin yalnız məktəb səviyyəli (level 4+) müəssisəyə təyin edilə bilər.'
                        );
                    }
                    // SchoolAdmin MUST NOT have department_id
                    if ($this->input('department_id')) {
                        $validator->errors()->add(
                            'department_id',
                            'SchoolAdmin roluna department təyin edilə bilməz. Departamentlər yalnız RegionOperator üçündür.'
                        );
                    }
                    break;

                case 'regionoperator':
                    // RegionOperator can be assigned to level 4+ institutions (schools)
                    // because departments exist only in schools
                    if ($institution->level < 4) {
                        $validator->errors()->add(
                            'institution_id',
                            'RegionOperator yalnız məktəb səviyyəli (level 4+) müəssisəyə təyin edilə bilər, çünki departamentlər yalnız məktəblərdə mövcuddur.'
                        );
                    }
                    break;
            }
        });
    }
}
