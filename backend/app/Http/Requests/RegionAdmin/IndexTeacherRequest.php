<?php

namespace App\Http\Requests\RegionAdmin;

use Illuminate\Foundation\Http\FormRequest;

class IndexTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('teachers.read') 
            || $this->user()->hasAnyRole(['superadmin', 'regionadmin']);
    }

    public function rules(): array
    {
        return [
            'sector_ids' => 'nullable|array',
            'sector_ids.*' => 'exists:institutions,id',
            'school_ids' => 'nullable|array',
            'school_ids.*' => 'exists:institutions,id',
            'department_id' => 'nullable|exists:departments,id',
            'position_type' => 'nullable|string',
            'employment_status' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'search' => 'nullable|string|max:255',
            'sort_by' => 'nullable|string|in:name,email,created_at',
            'sort_order' => 'nullable|string|in:asc,desc',
            'per_page' => 'nullable|integer|min:10|max:100',
        ];
    }
}
