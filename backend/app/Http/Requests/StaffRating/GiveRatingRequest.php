<?php

namespace App\Http\Requests\StaffRating;

use Illuminate\Foundation\Http\FormRequest;

class GiveRatingRequest extends FormRequest
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
            'staff_user_id' => 'required|exists:users,id',
            'category' => 'required|in:leadership,teamwork,communication,initiative,overall',
            'score' => 'required|numeric|min:0|max:5',
            'period' => 'required|string|regex:/^\d{4}-(0[1-9]|1[0-2])$|^\d{4}-Q[1-4]$|^\d{4}$/',
            'notes' => 'nullable|string|max:1000',
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
            'staff_user_id.required' => 'İstifadəçi seçilməlidir',
            'staff_user_id.exists' => 'Seçilmiş istifadəçi mövcud deyil',
            'category.required' => 'Kateqoriya seçilməlidir',
            'category.in' => 'Yanlış kateqoriya',
            'score.required' => 'Qiymət daxil edilməlidir',
            'score.numeric' => 'Qiymət rəqəm olmalıdır',
            'score.min' => 'Qiymət minimum 0 olmalıdır',
            'score.max' => 'Qiymət maksimum 5 olmalıdır',
            'period.required' => 'Period seçilməlidir',
            'period.regex' => 'Yanlış period formatı. Düzgün: 2024-12, 2024-Q4, 2024',
            'notes.max' => 'Qeyd maksimum 1000 simvol ola bilər',
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
