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
     * IMPORTANT: Departments only exist at institution level 4+ (schools).
     * Sectors (level 3), Regions (level 2) DO NOT have departments.
     * Only RegionOperator role uses departments.
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

        // Get institution to check level
        $institution = \App\Models\Institution::find($this->institutionId);

        if (! $institution) {
            $fail('Seçilmiş müəssisə tapılmadı.');

            return;
        }

        // CRITICAL: Sectors (level 3) and Regions (level 2) don't have departments
        // Only schools (level 4+) have departments
        if ($institution->level < 4) {
            $fail('Departamentlər yalnız məktəb səviyyəli müəssisələrdə mövcuddur. Sektor və region müəssisələrində departament yoxdur.');

            return;
        }

        // Schools (level 4+) must have valid department that belongs to the institution
        $exists = Department::where('id', $value)
            ->where('institution_id', $this->institutionId)
            ->exists();

        if (! $exists) {
            $fail('Seçilmiş departament bu müəssisəyə aid deyil.');
        }
    }
}
