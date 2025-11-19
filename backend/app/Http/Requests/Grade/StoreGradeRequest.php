<?php

namespace App\Http\Requests\Grade;

use Illuminate\Foundation\Http\FormRequest;

class StoreGradeRequest extends FormRequest
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
            'name' => 'required|string|max:3',
            'class_level' => 'required|integer|min:0|max:12',
            'academic_year_id' => 'required|exists:academic_years,id',
            'institution_id' => 'required|exists:institutions,id',
            'room_id' => 'nullable|exists:rooms,id',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'specialty' => 'nullable|string|max:100',
            'student_count' => 'nullable|integer|min:0|max:500',
            'male_student_count' => 'nullable|integer|min:0|max:500',
            'female_student_count' => 'nullable|integer|min:0|max:500',
            'education_program' => 'nullable|string|max:50',
            'metadata' => 'nullable|array',
            'class_type' => 'nullable|string|max:120',
            'class_profile' => 'nullable|string|max:120',
            'teaching_shift' => 'nullable|string|max:50',
            'tag_ids' => 'nullable|array',
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
            'academic_year_id' => 'təhsil ili',
            'institution_id' => 'təşkilat',
            'room_id' => 'otaq',
            'homeroom_teacher_id' => 'sinif rəhbəri',
            'specialty' => 'ixtisas',
            'student_count' => 'tələbə sayı',
            'male_student_count' => 'oğlan tələbə sayı',
            'female_student_count' => 'qız tələbə sayı',
            'education_program' => 'təhsil proqramı',
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
            'name.required' => 'Sinif adı mütləqdir',
            'name.max' => 'Sinif adı maksimum 3 simvol ola bilər',
            'class_level.required' => 'Sinif səviyyəsi mütləqdir',
            'class_level.min' => 'Sinif səviyyəsi minimum 0 ola bilər',
            'class_level.max' => 'Sinif səviyyəsi maksimum 12 ola bilər',
            'academic_year_id.required' => 'Təhsil ili mütləqdir',
            'academic_year_id.exists' => 'Seçilən təhsil ili mövcud deyil',
            'institution_id.required' => 'Təşkilat mütləqdir',
            'institution_id.exists' => 'Seçilən təşkilat mövcud deyil',
            'room_id.exists' => 'Seçilən otaq mövcud deyil',
            'homeroom_teacher_id.exists' => 'Seçilən müəllim mövcud deyil',
            'student_count.integer' => 'Tələbə sayı rəqəm olmalıdır',
            'student_count.min' => 'Tələbə sayı minimum 0 ola bilər',
            'student_count.max' => 'Tələbə sayı maksimum 500 ola bilər',
            'tag_ids.*.exists' => 'Seçilən etiket mövcud deyil',
        ];
    }
}
