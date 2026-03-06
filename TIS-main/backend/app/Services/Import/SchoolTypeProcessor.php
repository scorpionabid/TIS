<?php

namespace App\Services\Import;

class SchoolTypeProcessor extends BaseInstitutionTypeProcessor
{
    protected AdminTemplateExtensionService $adminExtension;

    public function __construct()
    {
        parent::__construct();
        $this->adminExtension = new AdminTemplateExtensionService;
    }

    /**
     * Get headers specific to school types with admin support
     */
    public function getHeaders(): array
    {
        $baseHeaders = array_merge($this->getBaseHeaders(), [
            'Şagird Sayı',
            'Müəllim Sayı',
            'Sinif Sayı',
            'Direktor Adı',
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
     * Get sample data for school types with admin data
     */
    public function getSampleData(): array
    {
        $institutionType = new \stdClass;
        $institutionType->key = 'secondary_school';

        $baseSampleData = [
            ['', 'Nümunə Orta Məktəb 1', 'NOM1', '4', '4', 'ZQ', 'NOM001', '450', '28', '18', 'Müdir Adı', '+994551234567', 'nom1@example.az', 'Zaqatala rayonu'],
            ['', 'Nümunə Lisey 2', 'NL2', '5', '4', 'BL', 'NL002', '380', '25', '16', 'Direktor Adı', '+994552345678', 'lisey2@example.az', 'Balakən rayonu'],
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
     * Process row data for school types
     */
    public function processRowData(array $row, int $rowNum): array
    {
        $baseData = $this->processBaseData($row, 'secondary_school', $rowNum);

        // Validate and clean numeric fields
        $studentCount = $this->validatePositiveInteger(trim($row[7] ?? ''), 'Şagird sayı');
        $teacherCount = $this->validatePositiveInteger(trim($row[8] ?? ''), 'Müəllim sayı');
        $classCount = $this->validatePositiveInteger(trim($row[9] ?? ''), 'Sinif sayı');

        $baseData['metadata'] = [
            'student_count' => $studentCount,
            'teacher_count' => $teacherCount,
            'class_count' => $classCount,
            'director_name' => ! empty(trim($row[10] ?? '')) ? trim($row[10]) : null,
        ];

        $baseData['contact_info'] = [
            'phone' => $this->validatePhone(trim($row[11] ?? '')),
            'email' => $this->validateEmail(trim($row[12] ?? '')),
        ];

        $baseData['location'] = [
            'address' => ! empty(trim($row[13] ?? '')) ? trim($row[13]) : null,
        ];

        // Set status (now at index 21 due to admin columns including password)
        $baseData['is_active'] = $this->parseStatus($row[21] ?? '');

        // Extract admin data if provided
        $adminColumnIndices = $this->adminExtension->getAdminColumnIndices((object) ['key' => 'secondary_school']);
        $baseData['admin_data'] = $this->adminExtension->extractAdminData($row, $adminColumnIndices['start_index']);

        return $baseData;
    }

    /**
     * Get the institution types this processor handles
     */
    public function getHandledTypes(): array
    {
        return [
            'secondary_school',
            'primary_school',
            'lyceum',
            'gymnasium',
        ];
    }
}
