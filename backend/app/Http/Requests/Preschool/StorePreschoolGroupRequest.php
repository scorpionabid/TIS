<?php

declare(strict_types=1);

namespace App\Http\Requests\Preschool;

use Illuminate\Foundation\Http\FormRequest;

class StorePreschoolGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                 => ['required', 'string', 'max:100'],
            'student_count'        => ['required', 'integer', 'min:1', 'max:500'],
            'male_student_count'   => ['nullable', 'integer', 'min:0'],
            'female_student_count' => ['nullable', 'integer', 'min:0'],
            'description'          => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'          => 'Qrup adı tələb olunur.',
            'student_count.required' => 'Uşaq sayı tələb olunur.',
            'student_count.min'      => 'Uşaq sayı ən azı 1 olmalıdır.',
        ];
    }
}
