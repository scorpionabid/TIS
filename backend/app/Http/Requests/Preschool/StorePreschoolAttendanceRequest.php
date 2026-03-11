<?php

declare(strict_types=1);

namespace App\Http\Requests\Preschool;

use Illuminate\Foundation\Http\FormRequest;

class StorePreschoolAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'attendance_date'        => ['required', 'date', 'before_or_equal:today'],
            'groups'                 => ['required', 'array', 'min:1'],
            'groups.*.group_id'      => ['required', 'integer', 'exists:grades,id'],
            'groups.*.present_count' => ['required', 'integer', 'min:0'],
            'groups.*.notes'         => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'attendance_date.required'       => 'Tarix tələb olunur.',
            'attendance_date.before_or_equal' => 'Tarix bu gündən gec ola bilməz.',
            'groups.required'                => 'Ən azı bir qrup məlumatı tələb olunur.',
            'groups.*.present_count.min'     => 'İştirak sayı mənfi ola bilməz.',
        ];
    }
}
