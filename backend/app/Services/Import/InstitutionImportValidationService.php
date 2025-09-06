<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\InstitutionType;
use App\Services\BaseService;
use Illuminate\Support\Facades\Log;

class InstitutionImportValidationService extends BaseService
{
    /**
     * Validation result structure
     */
    public function createValidationResult(bool $isValid = true, array $errors = [], array $warnings = []): array
    {
        return [
            'valid' => $isValid,
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }

    /**
     * Validate complete row data for institution import
     */
    public function validateRowData(array $row, InstitutionType $institutionType, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        try {
            // Validate required fields first
            $requiredFieldErrors = $this->validateRequiredFields($row, $institutionType, $rowNum);
            $errors = array_merge($errors, $requiredFieldErrors);
            
            // If required fields fail, don't continue with other validations
            if (!empty($requiredFieldErrors)) {
                return $this->createValidationResult(false, $errors, $warnings);
            }
            
            // Validate specific field types
            $fieldValidations = [
                'name' => $this->validateInstitutionName($row[1] ?? '', $rowNum),
                'parent_id' => $this->validateParentId($row[3] ?? '', $institutionType, $rowNum),
                'level' => $this->validateLevel($row[4] ?? '', $institutionType, $rowNum),
                'codes' => $this->validateInstitutionCodes($row, $rowNum),
            ];
            
            foreach ($fieldValidations as $field => $result) {
                if (!$result['valid']) {
                    $errors = array_merge($errors, $result['errors']);
                }
                $warnings = array_merge($warnings, $result['warnings']);
            }
            
            // Type-specific validations
            $typeSpecificResult = $this->validateTypeSpecificFields($row, $institutionType, $rowNum);
            $errors = array_merge($errors, $typeSpecificResult['errors']);
            $warnings = array_merge($warnings, $typeSpecificResult['warnings']);
            
            return $this->createValidationResult(empty($errors), $errors, $warnings);
            
        } catch (\Exception $e) {
            $errors[] = "Sətir {$rowNum}: Validation xətası - " . $e->getMessage();
            return $this->createValidationResult(false, $errors, $warnings);
        }
    }

    /**
     * Validate required fields based on institution type
     */
    public function validateRequiredFields(array $row, InstitutionType $institutionType, int $rowNum): array
    {
        $errors = [];
        
        // Name is always required
        if (empty(trim($row[1] ?? ''))) {
            $errors[] = "Sətir {$rowNum}: Ad sahəsi məcburidir";
        }
        
        // Parent ID required for non-root institutions
        if ($institutionType->default_level > 1 && empty(trim($row[3] ?? ''))) {
            $errors[] = "Sətir {$rowNum}: Valideyn ID sahəsi bu tip qurum üçün məcburidir";
        }
        
        // Type-specific required field validation
        switch ($institutionType->key) {
            case 'regional_education_department':
            case 'sector_education_office':
                // Phone and address are required for administrative offices
                if (empty(trim($row[7] ?? ''))) { // Phone column
                    $errors[] = "Sətir {$rowNum}: Telefon sahəsi {$institutionType->label_az} üçün məcburidir";
                }
                if (empty(trim($row[9] ?? ''))) { // Address column  
                    $errors[] = "Sətir {$rowNum}: Ünvan sahəsi {$institutionType->label_az} üçün məcburidir";
                }
                break;
        }
        
        return $errors;
    }

    /**
     * Validate institution name
     */
    public function validateInstitutionName(string $name, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        $cleanName = trim($name);
        
        if (empty($cleanName)) {
            $errors[] = "Sətir {$rowNum}: Ad sahəsi boş ola bilməz";
            return $this->createValidationResult(false, $errors, $warnings);
        }
        
        if (strlen($cleanName) < 3) {
            $errors[] = "Sətir {$rowNum}: Ad ən azı 3 hərf olmalıdır";
        }
        
        if (strlen($cleanName) > 255) {
            $errors[] = "Sətir {$rowNum}: Ad 255 hərf'dən çox ola bilməz";
        }
        
        // Check for duplicate names
        if (Institution::where('name', $cleanName)->exists()) {
            $warnings[] = "Sətir {$rowNum}: Bu adda qurum artıq mövcuddur: '{$cleanName}'";
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Validate parent ID
     */
    public function validateParentId(?string $parentId, InstitutionType $institutionType, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        $cleanParentId = trim($parentId ?? '');
        
        // Allow empty parent ID for root level institutions
        if (empty($cleanParentId) || $cleanParentId === '0') {
            if ($institutionType->default_level > 1) {
                $errors[] = "Sətir {$rowNum}: Valideyn ID tələb olunur (Səviyyə {$institutionType->default_level} qurumları üçün)";
            }
            return $this->createValidationResult(empty($errors), $errors, $warnings);
        }
        
        // Validate numeric format
        if (!is_numeric($cleanParentId)) {
            $errors[] = "Sətir {$rowNum}: Valideyn ID rəqəm olmalıdır";
            return $this->createValidationResult(false, $errors, $warnings);
        }
        
        $parentIdInt = (int)$cleanParentId;
        
        // Check if parent exists
        $parent = Institution::find($parentIdInt);
        if (!$parent) {
            $errors[] = "Sətir {$rowNum}: Valideyn qurum tapılmadı (ID: {$parentIdInt})";
            return $this->createValidationResult(false, $errors, $warnings);
        }
        
        // Validate hierarchy level
        if ($parent->level >= $institutionType->default_level) {
            $errors[] = "Sətir {$rowNum}: Valideyn qurumun səviyyəsi {$parent->level} >= {$institutionType->default_level} (cari qurum səviyyəsi)";
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Validate institution level
     */
    public function validateLevel(?string $level, InstitutionType $institutionType, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        $cleanLevel = trim($level ?? '');
        
        // Use default level if empty
        if (empty($cleanLevel)) {
            return $this->createValidationResult(true, $errors, $warnings);
        }
        
        if (!is_numeric($cleanLevel)) {
            $errors[] = "Sətir {$rowNum}: Səviyyə rəqəm olmalıdır";
            return $this->createValidationResult(false, $errors, $warnings);
        }
        
        $levelInt = (int)$cleanLevel;
        
        if ($levelInt < 1 || $levelInt > 4) {
            $errors[] = "Sətir {$rowNum}: Səviyyə 1-4 arasında olmalıdır";
        }
        
        if ($levelInt !== $institutionType->default_level) {
            $warnings[] = "Sətir {$rowNum}: Səviyyə {$levelInt} verilən qurum növü üçün standart səviyyə {$institutionType->default_level} deyil";
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Validate institution codes (region, institution, UTIS)
     */
    public function validateInstitutionCodes(array $row, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        $regionCode = trim($row[5] ?? '');
        $institutionCode = trim($row[6] ?? '');
        $utisCode = trim($row[7] ?? ''); // Note: UTIS might be in different column based on type
        
        // Validate region code format
        if (!empty($regionCode)) {
            if (!preg_match('/^[A-Z]{2,10}$/', $regionCode)) {
                $warnings[] = "Sətir {$rowNum}: Region kodu formatı düzgün deyil (2-10 böyük hərf gözlənilir): '{$regionCode}'";
            }
        }
        
        // Validate institution code format
        if (!empty($institutionCode)) {
            if (strlen($institutionCode) > 50) {
                $errors[] = "Sətir {$rowNum}: Qurum kodu 50 hərf'dən çox ola bilməz";
            }
            
            // Check for duplicate institution codes
            if (Institution::where('institution_code', $institutionCode)->exists()) {
                $warnings[] = "Sətir {$rowNum}: Bu qurum kodu artıq mövcuddur: '{$institutionCode}'";
            }
        }
        
        // Validate UTIS code format
        if (!empty($utisCode)) {
            if (strlen($utisCode) > 50) {
                $errors[] = "Sətir {$rowNum}: UTIS kodu 50 hərf'dən çox ola bilməz";
            }
            
            // Check for duplicate UTIS codes
            if (Institution::where('utis_code', $utisCode)->exists()) {
                $errors[] = "Sətir {$rowNum}: Bu UTIS kodu artıq mövcuddur: '{$utisCode}'";
            }
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Validate positive integer values
     */
    public function validatePositiveInteger(?string $value, string $fieldName, int $rowNum, bool $required = false): array
    {
        $errors = [];
        $warnings = [];
        
        $cleanValue = trim($value ?? '');
        
        if (empty($cleanValue) || $cleanValue === '0') {
            if ($required) {
                $errors[] = "Sətir {$rowNum}: {$fieldName} sahəsi məcburidir";
            }
            return $this->createValidationResult(!$required, $errors, $warnings);
        }
        
        if (!is_numeric($cleanValue)) {
            $errors[] = "Sətir {$rowNum}: {$fieldName} sahəsi rəqəm olmalıdır. Verilən: '{$cleanValue}'";
            return $this->createValidationResult(false, $errors, $warnings);
        }
        
        $intValue = (int)$cleanValue;
        if ($intValue < 0) {
            $errors[] = "Sətir {$rowNum}: {$fieldName} sahəsi mənfi ola bilməz. Verilən: {$intValue}";
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Validate phone number format
     */
    public function validatePhone(?string $phone, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        $cleanPhone = trim($phone ?? '');
        
        if (empty($cleanPhone)) {
            return $this->createValidationResult(true, $errors, $warnings);
        }
        
        // Clean phone number - remove spaces, dashes, etc.
        $numericPhone = preg_replace('/[^\d+]/', '', $cleanPhone);
        
        // Basic validation - should be valid Azerbaijan number format
        if (!preg_match('/^(\+994|0)?[1-9]\d{8,}$/', $numericPhone)) {
            $warnings[] = "Sətir {$rowNum}: Telefon nömrəsi formatı standart deyil: '{$cleanPhone}' (Azərbaycan formatı: +994XXXXXXXXX)";
        }
        
        return $this->createValidationResult(true, $errors, $warnings); // Don't fail on phone format
    }

    /**
     * Validate email address format
     */
    public function validateEmail(?string $email, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        $cleanEmail = trim($email ?? '');
        
        if (empty($cleanEmail)) {
            return $this->createValidationResult(true, $errors, $warnings);
        }
        
        if (!filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
            $warnings[] = "Sətir {$rowNum}: Email format düzgün deyil: '{$cleanEmail}'";
        }
        
        if (strlen($cleanEmail) > 255) {
            $errors[] = "Sətir {$rowNum}: Email 255 hərf'dən çox ola bilməz";
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Validate type-specific fields
     */
    private function validateTypeSpecificFields(array $row, InstitutionType $institutionType, int $rowNum): array
    {
        $errors = [];
        $warnings = [];
        
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'primary_school':
            case 'lyceum':
            case 'gymnasium':
                // Validate school-specific numeric fields
                $validations = [
                    $this->validatePositiveInteger($row[7] ?? '', 'Şagird sayı', $rowNum),
                    $this->validatePositiveInteger($row[8] ?? '', 'Müəllim sayı', $rowNum),
                    $this->validatePositiveInteger($row[9] ?? '', 'Sinif sayı', $rowNum),
                    $this->validatePhone($row[11] ?? '', $rowNum),
                    $this->validateEmail($row[12] ?? '', $rowNum)
                ];
                break;
                
            case 'kindergarten':
                // Validate kindergarten-specific numeric fields
                $validations = [
                    $this->validatePositiveInteger($row[7] ?? '', 'Uşaq sayı', $rowNum),
                    $this->validatePositiveInteger($row[8] ?? '', 'Tərbiyəçi sayı', $rowNum),
                    $this->validatePositiveInteger($row[9] ?? '', 'Qrup sayı', $rowNum),
                    $this->validatePhone($row[11] ?? '', $rowNum),
                    $this->validateEmail($row[12] ?? '', $rowNum)
                ];
                break;
                
            case 'regional_education_department':
            case 'sector_education_office':
                // Validate administrative office fields
                $validations = [
                    $this->validatePhone($row[7] ?? '', $rowNum), // Required for these types
                    $this->validateEmail($row[8] ?? '', $rowNum)
                ];
                
                // Check required address field
                if (empty(trim($row[9] ?? ''))) {
                    $errors[] = "Sətir {$rowNum}: Ünvan sahəsi {$institutionType->label_az} üçün məcburidir";
                }
                break;
                
            default:
                // Generic validation for other types
                $validations = [
                    $this->validatePhone($row[7] ?? '', $rowNum),
                    $this->validateEmail($row[8] ?? '', $rowNum)
                ];
                break;
        }
        
        // Collect all validation results
        if (isset($validations)) {
            foreach ($validations as $validation) {
                $errors = array_merge($errors, $validation['errors']);
                $warnings = array_merge($warnings, $validation['warnings']);
            }
        }
        
        return $this->createValidationResult(empty($errors), $errors, $warnings);
    }

    /**
     * Batch validate multiple rows
     */
    public function validateBatch(array $rows, InstitutionType $institutionType): array
    {
        $results = [
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'total_errors' => 0,
            'total_warnings' => 0,
            'row_results' => []
        ];
        
        foreach ($rows as $rowData) {
            $rowNum = $rowData['excel_row_number'];
            $validation = $this->validateRowData($rowData['data'], $institutionType, $rowNum);
            
            $results['row_results'][$rowNum] = $validation;
            
            if ($validation['valid']) {
                $results['valid_rows']++;
            } else {
                $results['invalid_rows']++;
            }
            
            $results['total_errors'] += count($validation['errors']);
            $results['total_warnings'] += count($validation['warnings']);
        }
        
        return $results;
    }
}