<?php

namespace App\Services\Import;

class AdministrativeTypeProcessor extends BaseInstitutionTypeProcessor
{
    protected AdminTemplateExtensionService $adminExtension;

    public function __construct()
    {
        parent::__construct();
        $this->adminExtension = new AdminTemplateExtensionService();
    }
    /**
     * Get headers specific to administrative institutions with admin support
     */
    public function getHeaders(): array
    {
        $baseHeaders = array_merge($this->getBaseHeaders(), [
            'Telefon *',
            'Email',
            'Ünvan *',
            'Açıqlama',
        ]);

        // Add admin headers
        $adminHeaders = $this->adminExtension->getAdminHeaders();
        $baseHeaders = array_merge($baseHeaders, $adminHeaders);
        
        // Add status at the end
        $baseHeaders[] = 'Status (boş buraxsanız avtomatik aktiv olacaq)';
        
        return $baseHeaders;
    }

    /**
     * Get sample data for administrative institutions with admin data
     */
    public function getSampleData(): array
    {
        $institutionType = new \stdClass();
        $institutionType->key = 'regional_education_department';
        
        $baseSampleData = [
            ['', 'Nümunə Regional İdarə', 'NRI', '1', '2', 'MN', 'NRI001', '+994556789012', 'region@example.az', 'Regional mərkəz', 'Regional təhsil idarəsi'],
            ['', 'Nümunə Sektor', 'NS', '2', '3', 'RTI', 'NS001', '+994555678901', 'sektor@example.az', 'Zaqatala şəhəri, Mərkəz', 'Təhsil sektoru']
        ];

        // Add admin sample data
        $adminSample = $this->adminExtension->getAdminSampleData($institutionType);
        
        $extendedSampleData = [];
        foreach ($baseSampleData as $index => $row) {
            $extendedRow = array_merge($row, $adminSample);
            $extendedRow[] = $index === 0 ? '' : 'active'; // Status
            $extendedSampleData[] = $extendedRow;
        }
        
        return $extendedSampleData;
    }

    /**
     * Process row data for administrative institutions
     */
    public function processRowData(array $row, int $rowNum): array
    {
        $institutionTypeKey = $this->determineTypeFromData($row);
        $baseData = $this->processBaseData($row, $institutionTypeKey, $rowNum);
        
        // Validate required fields for administrative types
        $phone = trim($row[7] ?? '');
        $address = trim($row[9] ?? '');
        
        if (empty($phone)) {
            throw new \Exception("Telefon sahəsi {$institutionTypeKey} üçün məcburidir");
        }
        
        if (empty($address)) {
            throw new \Exception("Ünvan sahəsi {$institutionTypeKey} üçün məcburidir");
        }
        
        $baseData['contact_info'] = [
            'phone' => $this->validatePhone($phone),
            'email' => $this->validateEmail(trim($row[8] ?? ''))
        ];
        
        $baseData['location'] = [
            'address' => $address
        ];
        
        $baseData['metadata'] = [
            'description' => !empty(trim($row[10] ?? '')) ? trim($row[10]) : null
        ];
        
        // Set status (now at index 18 due to admin columns including password)
        $baseData['is_active'] = $this->parseStatus($row[18] ?? '');
        
        // Extract admin data if provided
        $adminColumnIndices = $this->adminExtension->getAdminColumnIndices((object)['key' => $institutionTypeKey]);
        $baseData['admin_data'] = $this->adminExtension->extractAdminData($row, $adminColumnIndices['start_index']);
        
        return $baseData;
    }

    /**
     * Determine specific administrative type from data context
     */
    private function determineTypeFromData(array $row): string
    {
        $level = (int)trim($row[4] ?? 1);
        
        if ($level <= 2) {
            return 'regional_education_department';
        } else {
            return 'sector_education_office';
        }
    }

    /**
     * Get the institution types this processor handles
     */
    public function getHandledTypes(): array
    {
        return [
            'regional_education_department',
            'sector_education_office'
        ];
    }
}