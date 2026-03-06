<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubDelegationStatusRequest extends FormRequest
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
            'status' => 'required|in:pending,accepted,in_progress,completed,cancelled',
            'progress' => 'nullable|integer|min:0|max:100',
            'completion_notes' => 'nullable|string|max:2000',
            'completion_data' => 'nullable|array',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'status.required' => 'Status daxil edilməlidir',
            'status.in' => 'Düzgün status seçilməyib',
            'progress.integer' => 'Progress rəqəm olmalıdır',
            'progress.min' => 'Progress 0-dan az ola bilməz',
            'progress.max' => 'Progress 100-dən çox ola bilməz',
            'completion_notes.max' => 'Tamamlama qeydləri 2000 simvoldan çox ola bilməz',
            'completion_data.array' => 'Tamamlama məlumatları array formatında olmalıdır',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $status = $this->status;
            $progress = $this->progress;

            // Status-specific validations
            match($status) {
                'completed' => $this->validateCompletedStatus($validator),
                'in_progress' => $this->validateInProgressStatus($validator),
                default => null
            };
        });
    }

    /**
     * Validate completed status
     */
    private function validateCompletedStatus($validator)
    {
        if ($this->progress !== null && $this->progress < 100) {
            $validator->errors()->add('progress', 'Tamamlanmış tapşırığın progress-i 100 olmalıdır');
        }
    }

    /**
     * Validate in_progress status
     */
    private function validateInProgressStatus($validator)
    {
        if ($this->progress !== null && $this->progress <= 0) {
            $validator->errors()->add('progress', 'İcradakı tapşırığın progress-i 0-dan çox olmalıdır');
        }
    }
}
