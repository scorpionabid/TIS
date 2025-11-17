<?php

namespace App\Rules;

use Closure;
use App\Models\Department;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates that a department belongs to the specified institution.
 *
 * This rule prevents data integrity issues by ensuring users cannot
 * be assigned to departments from different institutions.
 *
 * Usage:
 * 'department_id' => ['nullable', 'exists:departments,id', new DepartmentBelongsToInstitution($institutionId)]
 */
class DepartmentBelongsToInstitution implements ValidationRule
{
    /**
     * Create a new rule instance.
     *
     * @param  int|null  $institutionId  The institution ID to validate against
     */
    public function __construct(private ?int $institutionId)
    {
    }

    /**
     * Run the validation rule.
     *
     * @param  string  $attribute
     * @param  mixed  $value
     * @param  \Closure(string): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     * @return void
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Skip validation if either institution_id or department_id is null
        if (!$this->institutionId || !$value) {
            return;
        }

        // Check if the department belongs to the specified institution
        $exists = Department::where('id', $value)
            ->where('institution_id', $this->institutionId)
            ->exists();

        if (!$exists) {
            $fail('Seçilmiş departament bu təşkilata aid deyil.');
        }
    }
}
