<?php

namespace App\Http\Requests\RegionAdmin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('teachers.update') 
            || $this->user()->hasAnyRole(['superadmin', 'regionadmin']);
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'institution_id' => 'sometimes|exists:institutions,id',
            'position_type' => 'nullable|string|max:255',
            'employment_status' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
