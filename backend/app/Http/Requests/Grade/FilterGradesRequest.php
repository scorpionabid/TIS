<?php

namespace App\Http\Requests\Grade;

use Illuminate\Foundation\Http\FormRequest;

class FilterGradesRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'institution_id' => 'sometimes|exists:institutions,id',
            'class_level' => 'sometimes|integer|min:1|max:12',
            'academic_year_id' => 'sometimes|exists:academic_years,id',
            'room_id' => 'sometimes|exists:rooms,id',
            'homeroom_teacher_id' => 'sometimes|exists:users,id',
            'specialty' => 'sometimes|string|max:100',
            'is_active' => 'sometimes|boolean',
            'has_room' => 'sometimes|boolean',
            'has_teacher' => 'sometimes|boolean',
            'search' => 'sometimes|string|max:255',
            'sort_by' => 'sometimes|string|in:name,class_level,student_count,created_at,updated_at',
            'sort_order' => 'sometimes|string|in:asc,desc',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'page' => 'sometimes|integer|min:1',
            'with_students' => 'sometimes|boolean',
            'with_subjects' => 'sometimes|boolean',
            'class_type' => 'sometimes|string|max:120',
            'teaching_shift' => 'sometimes|string|max:50',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'institution_id' => 'təşkilat',
            'class_level' => 'sinif səviyyəsi',
            'academic_year_id' => 'təhsil ili',
            'room_id' => 'otaq',
            'homeroom_teacher_id' => 'sinif rəhbəri',
            'specialty' => 'ixtisas',
            'is_active' => 'status',
            'search' => 'axtarış',
            'sort_by' => 'sıralama sahəsi',
            'sort_order' => 'sıralama istiqaməti',
            'per_page' => 'səhifə başına',
            'class_type' => 'sinif tipi',
            'teaching_shift' => 'növbə',
        ];
    }
}
