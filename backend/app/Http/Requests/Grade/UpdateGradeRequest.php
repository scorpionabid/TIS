<?php

namespace App\Http\Requests\Grade;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGradeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization handled by middleware and policy
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:3',
            'class_level' => 'sometimes|integer|min:0|max:12',
            'room_id' => 'sometimes|nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'sometimes|nullable|exists:users,id',
            'specialty' => 'sometimes|nullable|string|max:100',
            'student_count' => 'sometimes|nullable|integer|min:0|max:500',
            'male_student_count' => 'sometimes|nullable|integer|min:0|max:500',
            'female_student_count' => 'sometimes|nullable|integer|min:0|max:500',
            'education_program' => 'sometimes|nullable|string|max:50',
            'is_active' => 'sometimes|boolean',
            'metadata' => 'sometimes|nullable|array',
            'class_type' => 'sometimes|nullable|string|max:120',
            'class_profile' => 'sometimes|nullable|string|max:120',
            'teaching_shift' => 'sometimes|nullable|string|max:50',
            'tag_ids' => 'sometimes|nullable|array',
            'tag_ids.*' => 'exists:grade_tags,id',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'name' => 'sinif adı',
            'class_level' => 'sinif səviyyəsi',
            'room_id' => 'otaq',
            'homeroom_teacher_id' => 'sinif rəhbəri',
            'specialty' => 'ixtisas',
            'student_count' => 'tələbə sayı',
            'male_student_count' => 'oğlan tələbə sayı',
            'female_student_count' => 'qız tələbə sayı',
            'education_program' => 'təhsil proqramı',
            'is_active' => 'status',
            'class_type' => 'sinif tipi',
            'class_profile' => 'sinif profili',
            'teaching_shift' => 'növbə',
            'tag_ids' => 'etiketlər',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.max' => 'Sinif adı maksimum 3 simvol ola bilər',
            'class_level.min' => 'Sinif səviyyəsi minimum 0 ola bilər',
            'class_level.max' => 'Sinif səviyyəsi maksimum 12 ola bilər',
            'room_id.exists' => 'Seçilən otaq mövcud deyil',
            'homeroom_teacher_id.exists' => 'Seçilən müəllim mövcud deyil',
            'student_count.integer' => 'Tələbə sayı rəqəm olmalıdır',
            'student_count.min' => 'Tələbə sayı minimum 0 ola bilər',
            'student_count.max' => 'Tələbə sayı maksimum 500 ola bilər',
            'is_active.boolean' => 'Status düzgün formatda deyil',
            'tag_ids.*.exists' => 'Seçilən etiket mövcud deyil',
        ];
    }
}
