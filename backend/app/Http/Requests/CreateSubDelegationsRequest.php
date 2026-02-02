<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateSubDelegationsRequest extends FormRequest
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
            'delegations' => 'required|array|min:1|max:10',
            'delegations.*.user_id' => 'required|integer|exists:users,id',
            'delegations.*.institution_id' => 'nullable|integer|exists:institutions,id',
            'delegations.*.deadline' => 'nullable|date|after:today',
            'delegations.*.notes' => 'nullable|string|max:1000',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'delegations.required' => 'Ən azı bir nəfər seçilməlidir',
            'delegations.min' => 'Ən azı bir nəfər seçilməlidir',
            'delegations.max' => 'Bir dəfəyə ən çox 10 nəfərə yönləndirə bilərsiniz',
            'delegations.*.user_id.required' => 'İstifadəçi seçilməlidir',
            'delegations.*.user_id.exists' => 'Seçilmiş istifadəçi mövcud deyil',
            'delegations.*.institution_id.exists' => 'Seçilmiş qurum mövcud deyil',
            'delegations.*.deadline.after' => 'Deadline gələcək tarix olmalıdır',
            'delegations.*.notes.max' => 'Qeydlər 1000 simvoldan çox ola bilməz',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Check for duplicate users
            $userIds = collect($this->delegations)->pluck('user_id');
            if ($userIds->count() !== $userIds->unique()->count()) {
                $validator->errors()->add('delegations', 'Eyni istifadəçiyə birdəfəlik yönləndirmə edilə bilməz');
            }

            // Check if users are already delegated to this task
            if ($this->route('task')) {
                $task = $this->route('task');
                $existingDelegations = $task->subDelegations()
                    ->whereIn('delegated_to_user_id', $userIds)
                    ->whereNotIn('status', ['cancelled'])
                    ->pluck('delegated_to_user_id');

                if ($existingDelegations->isNotEmpty()) {
                    $validator->errors()->add('delegations', 'Bəzi istifadəçilər artıq bu tapşırığa yönləndirilib');
                }
            }
        });
    }
}
