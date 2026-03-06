<?php

namespace App\Rules;

use App\Models\Department;
use Closure;
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
     * @param int|null $institutionId The institution ID to validate against
     */
    public function __construct(private ?int $institutionId) {}

    /**
     * Run the validation rule.
     *
     * Validates that the selected department belongs to the selected institution.
     * Departments can exist at any institution level (regional level 2, sector level 3, school level 4+).
     * Only RegionOperator role uses departments (always at level 2 regional institutions).
     *
     * @param \Closure(string): \Illuminate\Translation\PotentiallyTranslatedString $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // If department_id is NULL, always valid (departments are optional)
        if (! $value) {
            return;
        }

        // If no institution selected, cannot validate department
        if (! $this->institutionId) {
            $fail('Departament seçməzdən əvvəl müəssisə seçilməlidir.');

            return;
        }

        // Validate that the department belongs to the selected institution
        $exists = Department::where('id', $value)
            ->where('institution_id', $this->institutionId)
            ->exists();

        if (! $exists) {
            $fail('Seçilmiş departament bu müəssisəyə aid deyil.');
        }
    }
}
