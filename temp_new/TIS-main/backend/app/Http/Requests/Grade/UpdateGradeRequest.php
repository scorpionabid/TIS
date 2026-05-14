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
            'extra_hours' => 'sometimes|nullable|numeric|min:0|max:100',
            'individual_hours' => 'sometimes|nullable|numeric|min:0|max:100',
            'home_hours' => 'sometimes|nullable|numeric|min:0|max:100',
            'special_hours' => 'sometimes|nullable|numeric|min:0|max:100',
            'curriculum_hours' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_foreign_lang_1' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_foreign_lang_2' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_physical_ed' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_informatics' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_technology' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_state_lang' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_steam' => 'sometimes|nullable|numeric|min:0|max:100',
            'split_digital_skills' => 'sometimes|nullable|numeric|min:0|max:100',
            'club_hours' => 'sometimes|nullable|numeric|min:0|max:100',
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
            'extra_hours' => 'dərsdənkənar məşğələ saatı',
            'individual_hours' => 'fərdi təhsil saatı',
            'home_hours' => 'evdə təhsil saatı',
            'special_hours' => 'xüsusi təhsil saatı',
            'curriculum_hours' => 'tədris planı saatı',
            'split_foreign_lang_1' => 'əsas xarici dil bölünmə saatı',
            'split_foreign_lang_2' => 'ikinci xarici dil bölünmə saatı',
            'split_physical_ed' => 'fiziki tərbiyə bölünmə saatı',
            'split_informatics' => 'informatika bölünmə saatı',
            'split_technology' => 'texnologiya bölünmə saatı',
            'split_state_lang' => 'dövlət dili bölünmə saatı',
            'split_steam' => 'steam bölünmə saatı',
            'split_digital_skills' => 'rəqəmsal bacarıqlar bölünmə saatı',
            'club_hours' => 'dərnək məşğələsi saatı',
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
