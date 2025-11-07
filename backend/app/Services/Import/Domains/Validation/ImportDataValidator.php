<?php

namespace App\Services\Import\Domains\Validation;

use App\Models\InstitutionType;
use Illuminate\Support\Facades\Validator;

/**
 * Import Data Validator Service
 *
 * Validates import data using Laravel validation rules.
 * Provides user-friendly Azerbaijani error messages.
 */
class ImportDataValidator
{
    /**
     * Validation errors array
     *
     * @var array
     */
    protected array $validationErrors = [];

    /**
     * Validate import data
     *
     * Populates $validationErrors array with any validation failures.
     *
     * @param array $data
     * @param InstitutionType $institutionType
     * @return void
     */
    public function validateImportData(array $data, InstitutionType $institutionType): void
    {
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        foreach ($data as $index => $rowData) {
            $rowErrors = [];

            // Basic validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'short_name' => 'nullable|string|max:100',
                'institution_code' => 'nullable|string|max:50',
                'utis_code' => 'nullable|string|max:50',
                'region_code' => 'nullable|string|max:10',
                'contact_info' => 'nullable|json',
                'location' => 'nullable|json',
                'established_date' => 'nullable|date',
                'is_active' => 'required|boolean',
            ];

            // Add parent_id validation for levels 2+
            if ($institutionLevel >= 2) {
                $rules['parent_id'] = 'required|integer|exists:institutions,id';
            }

            // Custom validation messages
            $messages = [
                'name.required' => 'Müəssisə adı mütləqdir',
                'parent_id.required' => 'Üst müəssisə ID-si mütləqdir (J sütunu). "Üst Müəssisələr" sheet-indən ID kopyalayın və ya müəssisə adını yazın.',
                'parent_id.integer' => 'Üst müəssisə ID-si rəqəm olmalıdır və ya müəssisə adını yazın',
                'parent_id.exists' => 'Daxil edilən üst müəssisə tapılmadı. "Üst Müəssisələr" sheet-indən mövcud ID götürün və ya dəqiq ad yazın.',
                'is_active.required' => 'Status sahəsi mütləqdir (aktiv və ya qeyri-aktiv)',
                'schooladmin.username.required' => 'SchoolAdmin istifadəçi adı mütləqdir (N sütunu)',
                'schooladmin.email.required' => 'SchoolAdmin email mütləqdir (O sütunu)',
                'schooladmin.email.email' => 'SchoolAdmin email formatı düzgün deyil',
                'schooladmin.email.unique' => 'Bu email artıq istifadə olunur',
                'schooladmin.username.unique' => 'Bu istifadəçi adı artıq istifadə olunur',
                'schooladmin.password.required' => 'SchoolAdmin şifrəsi mütləqdir (P sütunu)',
                'schooladmin.password.min' => 'SchoolAdmin şifrəsi minimum 8 simvol olmalıdır',
            ];

            // Add SchoolAdmin validation for level 4
            if ($institutionLevel == 4) {
                $rules['schooladmin.username'] = 'required|string|max:255|unique:users,username';
                $rules['schooladmin.email'] = 'required|email|max:255|unique:users,email';
                $rules['schooladmin.password'] = 'required|string|min:8';
                $rules['schooladmin.first_name'] = 'nullable|string|max:255';
                $rules['schooladmin.last_name'] = 'nullable|string|max:255';
                $rules['schooladmin.phone'] = 'nullable|string|max:20';
                $rules['schooladmin.department'] = 'nullable|string|max:255';
            }

            $validator = Validator::make($rowData, $rules, $messages);

            if ($validator->fails()) {
                $rowErrors = $validator->errors()->toArray();
                $this->validationErrors["Sətir {$rowData['row']}"] = $rowErrors;
            }
        }
    }

    /**
     * Get validation errors
     *
     * @return array
     */
    public function getValidationErrors(): array
    {
        return $this->validationErrors;
    }

    /**
     * Check if there are validation errors
     *
     * @return bool
     */
    public function hasValidationErrors(): bool
    {
        return !empty($this->validationErrors);
    }

    /**
     * Reset validation errors
     *
     * @return void
     */
    public function resetValidationErrors(): void
    {
        $this->validationErrors = [];
    }
}
