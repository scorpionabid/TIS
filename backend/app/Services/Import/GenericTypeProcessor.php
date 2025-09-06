<?php

namespace App\Services\Import;

class GenericTypeProcessor extends BaseInstitutionTypeProcessor
{
    /**
     * Get headers for generic institution types
     */
    public function getHeaders(): array
    {
        return array_merge($this->getBaseHeaders(), [
            'Telefon',
            'Email',
            'Ünvan',
            'Açıqlama',
            'Status (boş buraxsanız avtomatik aktiv olacaq)'
        ]);
    }

    /**
     * Get sample data for generic institution types
     */
    public function getSampleData(): array
    {
        return [
            ['', 'Nümunə Qurum', 'NQ', '', '1', '', 'NQ001', '+994557890123', 'info@example.az', 'Ünvan', 'Açıqlama', '']
        ];
    }

    /**
     * Process row data for generic institution types
     */
    public function processRowData(array $row, int $rowNum): array
    {
        // This processor requires the institution type to be explicitly set
        // It will be determined by the calling orchestrator
        $baseData = $this->processBaseData($row, 'generic', $rowNum);
        
        $baseData['contact_info'] = [
            'phone' => $this->validatePhone(trim($row[7] ?? '')),
            'email' => $this->validateEmail(trim($row[8] ?? ''))
        ];
        
        $baseData['location'] = [
            'address' => !empty(trim($row[9] ?? '')) ? trim($row[9]) : null
        ];
        
        $baseData['metadata'] = [
            'description' => !empty(trim($row[10] ?? '')) ? trim($row[10]) : null
        ];
        
        // Set status
        $baseData['is_active'] = $this->parseStatus($row[11] ?? '');
        
        return $baseData;
    }

    /**
     * Process data with explicit type
     */
    public function processRowDataWithType(array $row, string $institutionTypeKey, int $rowNum): array
    {
        $baseData = $this->processBaseData($row, $institutionTypeKey, $rowNum);
        
        $baseData['contact_info'] = [
            'phone' => $this->validatePhone(trim($row[7] ?? '')),
            'email' => $this->validateEmail(trim($row[8] ?? ''))
        ];
        
        $baseData['location'] = [
            'address' => !empty(trim($row[9] ?? '')) ? trim($row[9]) : null
        ];
        
        $baseData['metadata'] = [
            'description' => !empty(trim($row[10] ?? '')) ? trim($row[10]) : null
        ];
        
        // Set status
        $baseData['is_active'] = $this->parseStatus($row[11] ?? '');
        
        return $baseData;
    }

    /**
     * Get the institution types this processor handles
     * Generic processor can handle any unspecified type
     */
    public function getHandledTypes(): array
    {
        return [
            'vocational_school',
            'special_education_school',
            'art_school',
            'sports_school',
            'other'
        ];
    }

    /**
     * Check if this processor can handle the given institution type
     * Generic processor accepts any type not handled by specific processors
     */
    public function canHandle(string $institutionTypeKey): bool
    {
        // This is a fallback processor, so we'll determine this in the factory
        return true; // Will be overridden by the processor factory logic
    }
}