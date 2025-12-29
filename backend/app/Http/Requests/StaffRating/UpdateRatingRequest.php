<?php

namespace App\Http\Requests\StaffRating;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRatingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'score' => 'sometimes|numeric|min:0|max:5',
            'notes' => 'nullable|string|max:1000',
            'reason' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'score.numeric' => 'Qiymət rəqəm olmalıdır',
            'score.min' => 'Qiymət minimum 0 olmalıdır',
            'score.max' => 'Qiymət maksimum 5 olmalıdır',
            'notes.max' => 'Qeyd maksimum 1000 simvol ola bilər',
            'reason.max' => 'Səbəb maksimum 500 simvol ola bilər',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Round score to 2 decimal places
        if ($this->has('score')) {
            $this->merge([
                'score' => round($this->score, 2),
            ]);
        }
    }
}
