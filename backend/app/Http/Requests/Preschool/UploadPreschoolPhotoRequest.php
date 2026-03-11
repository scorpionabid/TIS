<?php

declare(strict_types=1);

namespace App\Http\Requests\Preschool;

use Illuminate\Foundation\Http\FormRequest;

class UploadPreschoolPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'files'   => ['required', 'array', 'min:1', 'max:10'],
            'files.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'files.required' => 'Ən azı bir şəkil yükləməlisiniz.',
            'files.max'      => 'Eyni anda ən çox 10 şəkil yükləyə bilərsiniz.',
            'files.*.mimes'  => 'Yalnız JPG, PNG, WEBP formatları qəbul edilir.',
            'files.*.max'    => 'Hər şəkil ən çox 10MB ola bilər.',
        ];
    }
}
