<?php

declare(strict_types=1);

namespace App\Http\Requests\Preschool;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePreschoolGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'student_count' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'male_student_count' => ['nullable', 'integer', 'min:0'],
            'female_student_count' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
