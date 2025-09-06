<?php

namespace App\Services\Import;

class KindergartenTypeProcessor extends BaseInstitutionTypeProcessor
{
    protected AdminTemplateExtensionService $adminExtension;

    public function __construct()
    {
        parent::__construct();
        $this->adminExtension = new AdminTemplateExtensionService();
    }
    /**
     * Get headers specific to kindergarten with admin support
     */
    public function getHeaders(): array
    {
        $baseHeaders = array_merge($this->getBaseHeaders(), [
            'Uşaq Sayı',
            'Tərbiyəçi Sayı',
            'Qrup Sayı',
            'Müdir Adı',
            'Telefon',
            'Email',
            'Ünvan',
        ]);

        // Add admin headers
        $adminHeaders = $this->adminExtension->getAdminHeaders();
        $baseHeaders = array_merge($baseHeaders, $adminHeaders);
        
        // Add status at the end
        $baseHeaders[] = 'Status (boş buraxsanız avtomatik aktiv olacaq)';
        
        return $baseHeaders;
    }

    /**
     * Get sample data for kindergarten with admin data
     */
    public function getSampleData(): array
    {
        $institutionType = new \stdClass();
        $institutionType->key = 'kindergarten';
        
        $baseSampleData = [
            ['', 'Nümunə Uşaq Bağçası 1', 'NUB1', '4', '4', 'ZQ', 'NUB001', '85', '12', '5', 'Müdir Adı', '+994553456789', 'bagca1@example.az', 'Zaqatala rayonu'],
            ['', 'Nümunə Bağça 2', 'NB2', '5', '4', 'BL', 'NB002', '65', '9', '4', 'Rəis Adı', '+994554567890', 'bagca2@example.az', 'Balakən rayonu']
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
     * Process row data for kindergarten
     */
    public function processRowData(array $row, int $rowNum): array
    {
        $baseData = $this->processBaseData($row, 'kindergarten', $rowNum);
        
        // Validate and clean numeric fields for kindergarten
        $childrenCount = $this->validatePositiveInteger(trim($row[7] ?? ''), 'Uşaq sayı');
        $educatorCount = $this->validatePositiveInteger(trim($row[8] ?? ''), 'Tərbiyəçi sayı');
        $groupCount = $this->validatePositiveInteger(trim($row[9] ?? ''), 'Qrup sayı');
        
        $baseData['metadata'] = [
            'children_count' => $childrenCount,
            'educator_count' => $educatorCount,
            'group_count' => $groupCount,
            'director_name' => !empty(trim($row[10] ?? '')) ? trim($row[10]) : null
        ];
        
        $baseData['contact_info'] = [
            'phone' => $this->validatePhone(trim($row[11] ?? '')),
            'email' => $this->validateEmail(trim($row[12] ?? ''))
        ];
        
        $baseData['location'] = [
            'address' => !empty(trim($row[13] ?? '')) ? trim($row[13]) : null
        ];
        
        // Set status (now at index 21 due to admin columns including password)
        $baseData['is_active'] = $this->parseStatus($row[21] ?? '');
        
        // Extract admin data if provided
        $adminColumnIndices = $this->adminExtension->getAdminColumnIndices((object)['key' => 'kindergarten']);
        $baseData['admin_data'] = $this->adminExtension->extractAdminData($row, $adminColumnIndices['start_index']);
        
        return $baseData;
    }

    /**
     * Get the institution types this processor handles
     */
    public function getHandledTypes(): array
    {
        return ['kindergarten'];
    }
}