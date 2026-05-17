<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:1', 'max:2000'],
            'recipient_ids' => ['nullable', 'array'],
            'recipient_ids.*' => ['required', 'integer', 'exists:users,id'],
            'target_institutions' => ['nullable', 'array'],
            'target_institutions.*' => ['required', 'integer', 'exists:institutions,id'],
            'target_roles' => ['nullable', 'array'],
            'target_roles.*' => ['required', 'string'],
            'parent_id' => ['nullable', 'integer', 'exists:messages,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Mesaj mətni tələb olunur.',
            'body.max' => 'Mesaj 2000 simvoldan çox ola bilməz.',
            'recipient_ids.required' => 'Ən azı bir alıcı seçilməlidir.',
            'recipient_ids.min' => 'Ən azı bir alıcı seçilməlidir.',
            'recipient_ids.max' => 'Eyni anda maksimum 50 alıcıya göndərə bilərsiniz.',
        ];
    }
}
