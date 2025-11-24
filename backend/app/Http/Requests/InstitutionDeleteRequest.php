<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class InstitutionDeleteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled in the controller
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'type' => [
                'required',
                'string',
                'in:soft,hard',
            ],
            'confirmation' => [
                'required',
                'boolean',
                'accepted',
            ],
            'reason' => [
                'nullable',
                'string',
                'max:500',
            ],
            'force' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Silmə növü məcburidir.',
            'type.in' => 'Silmə növü "soft" və ya "hard" olmalıdır.',
            'confirmation.required' => 'Əməliyyatı təsdiq etməlisiniz.',
            'confirmation.accepted' => 'Əməliyyatı təsdiq etməlisiniz.',
            'reason.max' => 'Səbəb 500 simvoldan çox ola bilməz.',
            'force.boolean' => 'Məcburi silmə parametri düzgün deyil.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'type' => 'silmə növü',
            'confirmation' => 'təsdiq',
            'reason' => 'səbəb',
            'force' => 'məcburi silmə',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Doğrulama xətası',
                'errors' => $validator->errors()->all(),
                'details' => $validator->errors(),
            ], 422)
        );
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // Additional custom validation
            $this->validateDeleteType($validator);
            $this->validateForceParameter($validator);
        });
    }

    /**
     * Validate delete type specific rules
     */
    protected function validateDeleteType(Validator $validator): void
    {
        $deleteType = $this->input('type');
        $force = $this->boolean('force', false);

        // Hard delete requires explicit confirmation
        if ($deleteType === 'hard' && ! $force) {
            $reason = $this->input('reason');
            if (empty($reason)) {
                $validator->errors()->add(
                    'reason',
                    'Həmişəlik silmə üçün səbəb göstərilməlidir.'
                );
            }
        }
    }

    /**
     * Validate force parameter usage
     */
    protected function validateForceParameter(Validator $validator): void
    {
        $force = $this->boolean('force', false);
        $deleteType = $this->input('type');

        // Force can only be used with hard delete
        if ($force && $deleteType !== 'hard') {
            $validator->errors()->add(
                'force',
                'Məcburi silmə yalnız həmişəlik silmə ilə istifadə edilə bilər.'
            );
        }
    }

    /**
     * Get validated and sanitized data
     */
    public function getValidatedData(): array
    {
        $validated = $this->validated();

        return [
            'type' => $validated['type'],
            'confirmation' => $validated['confirmation'],
            'reason' => $validated['reason'] ?? null,
            'force' => $validated['force'] ?? false,
            'requested_at' => now(),
            'user_agent' => $this->userAgent(),
            'ip_address' => $this->ip(),
        ];
    }
}
