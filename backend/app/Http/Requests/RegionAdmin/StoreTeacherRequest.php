<?php

namespace App\Http\Requests\RegionAdmin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('teachers.create') 
            || $this->user()->hasAnyRole(['superadmin', 'regionadmin']);
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|unique:users,email',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'institution_id' => 'required|exists:institutions,id',
            'position_type' => 'nullable|string|max:255',
            'employment_status' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
        ];
    }
}
