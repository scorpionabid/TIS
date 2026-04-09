<?php

namespace App\Http\Requests\RegionAdmin;

use Illuminate\Foundation\Http\FormRequest;

class BulkTeacherActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $permission = $this->route()->getActionMethod() === 'bulkDelete' ? 'teachers.delete' : 'teachers.update';

        return $this->user()->can($permission)
            || $this->user()->hasAnyRole(['superadmin', 'regionadmin']);
    }

    public function rules(): array
    {
        $rules = [
            'teacher_ids' => 'required|array|min:1',
            'teacher_ids.*' => 'exists:users,id',
        ];

        if ($this->has('is_active')) {
            $rules['is_active'] = 'required|boolean';
        }

        return $rules;
    }
}
