<?php

namespace App\Http\Requests;

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
        return [
            'username' => 'sometimes|string|min:3|max:50|unique:users,username,' . $this->route('user')->id,
            'email' => 'sometimes|string|email|max:100|unique:users,email,' . $this->route('user')->id,
            'role_id' => 'sometimes|exists:roles,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'department_id' => 'nullable|exists:departments,id',
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
        ];
    }
}
