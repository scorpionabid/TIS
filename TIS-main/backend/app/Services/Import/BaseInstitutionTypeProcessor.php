<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\InstitutionType;

abstract class BaseInstitutionTypeProcessor implements InstitutionTypeProcessorInterface
{
    protected InstitutionImportValidationService $validator;

    public function __construct()
    {
        $this->validator = new InstitutionImportValidationService;
    }

    /**
     * Get base headers common to all institution types
     */
    protected function getBaseHeaders(): array
    {
        return [
            'ID (avtomatik)',
            'Ad *',
            'Qısa Ad',
            'Valideyn ID *',
            'Səviyyə *',
            'Region Kodu',
            'Qurum Kodu',
        ];
    }

    /**
     * Process base institution data common to all types
     */
    protected function processBaseData(array $row, string $institutionTypeKey, int $rowNum): array
    {
        // Get appropriate default parent_id based on institution type level
        $institutionType = InstitutionType::where('key', $institutionTypeKey)->first();
        $defaultParentId = null;

        if ($institutionType && $institutionType->default_level == 4) {
            // For level 4 institutions (schools), try to find a default sector parent
            $defaultSector = Institution::where('level', 3)->first();
            $defaultParentId = $defaultSector ? $defaultSector->id : null;
        }

        // Parse parent_id - if 0 or empty, set to null
        $parentIdValue = trim($row[3] ?? '');
        $parentId = null;
        if (! empty($parentIdValue) && $parentIdValue !== '0') {
            $parentId = (int) $parentIdValue;
            // Validate parent exists
            if (! Institution::find($parentId)) {
                throw new \Exception("Valideyn ID {$parentId} mövcud deyil. Mövcud ID-ləri yoxlayın.");
            }
        } elseif ($defaultParentId) {
            $parentId = $defaultParentId;
        }

        // Parse level - ensure it's not 0
        $levelValue = trim($row[4] ?? '');
        $level = ! empty($levelValue) && $levelValue !== '0' ? (int) $levelValue :
                ($institutionType ? $institutionType->default_level : 1);
        if ($level <= 0) {
            $level = $institutionType ? $institutionType->default_level : 1;
        }

        // Validate required fields
        $name = ! empty(trim($row[1] ?? '')) ? trim($row[1]) : null;
        if (! $name) {
            throw new \Exception('Ad sahəsi məcburidir və boş buraxıla bilməz.');
        }

        return [
            'name' => $name,
            'short_name' => ! empty(trim($row[2] ?? '')) ? trim($row[2]) : null,
            'type' => $institutionTypeKey,
            'parent_id' => $parentId,
            'level' => $level,
            'region_code' => ! empty(trim($row[5] ?? '')) ? trim($row[5]) : null,
            'institution_code' => ! empty(trim($row[6] ?? '')) ? trim($row[6]) : null,
            'is_active' => true, // Default to active
        ];
    }

    /**
     * Validate positive integer values
     */
    protected function validatePositiveInteger(?string $value, string $fieldName): int
    {
        if (empty($value) || $value === '0') {
            return 0;
        }

        if (! is_numeric($value)) {
            throw new \Exception("{$fieldName} sahəsi rəqəm olmalıdır. Verilən dəyər: '{$value}'");
        }

        $intValue = (int) $value;
        if ($intValue < 0) {
            throw new \Exception("{$fieldName} sahəsi mənfi ola bilməz. Verilən dəyər: {$intValue}");
        }

        return $intValue;
    }

    /**
     * Validate phone number
     */
    protected function validatePhone(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        // Clean phone number - remove spaces, dashes, etc.
        $cleanPhone = preg_replace('/[^\d+]/', '', $phone);

        // Basic validation - should start with + or be at least 9 digits
        if (! preg_match('/^(\+994|0)?[1-9]\d{8,}$/', $cleanPhone)) {
            // Log warning but don't throw error - allow import to continue
            \Log::warning("Telefon nömrəsi format düzgün deyil: {$phone}");
        }

        return $phone; // Return original format
    }

    /**
     * Validate email address
     */
    protected function validateEmail(?string $email): ?string
    {
        if (empty($email)) {
            return null;
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            // Log warning but don't throw error - allow import to continue
            \Log::warning("Email format düzgün deyil: {$email}");
        }

        return $email;
    }

    /**
     * Parse status value
     */
    protected function parseStatus(?string $status): bool
    {
        $statusValue = trim($status ?? '');

        return empty($statusValue) || $statusValue === 'active';
    }

    /**
     * Check if this processor can handle the given institution type
     */
    public function canHandle(string $institutionTypeKey): bool
    {
        return in_array($institutionTypeKey, $this->getHandledTypes());
    }
}
