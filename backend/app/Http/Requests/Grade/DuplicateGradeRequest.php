<?php

namespace App\Http\Requests\Grade;

use Illuminate\Foundation\Http\FormRequest;

class DuplicateGradeRequest extends FormRequest
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
            'name' => 'required|string|max:3',
            'class_level' => 'sometimes|integer|min:0|max:12',
            'copy_subjects' => 'sometimes|boolean',
            'academic_year_id' => 'sometimes|exists:academic_years,id',
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
            'copy_subjects' => 'fənləri kopyala',
            'academic_year_id' => 'təhsil ili',
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
            'class_level.integer' => 'Sinif səviyyəsi rəqəm olmalıdır',
            'class_level.min' => 'Sinif səviyyəsi minimum 0 ola bilər',
            'class_level.max' => 'Sinif səviyyəsi maksimum 12 ola bilər',
            'academic_year_id.exists' => 'Seçilən təhsil ili mövcud deyil',
        ];
    }
}
