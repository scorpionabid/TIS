<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\InstitutionType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use App\Services\BaseService;

class InstitutionExcelTemplateService extends BaseService
{
    /**
     * Generate basic import template for institutions
     */
    public function generateBasicTemplate($institutions, string $fileName): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $headers = [
            'ID', 'Ad', 'Qısa Ad', 'Növ', 'Valideyn ID', 'Səviyyə', 
            'Region Kodu', 'Qurum Kodu', 'UTIS Kodu', 'Əlaqə Məlumatları', 
            'Ünvan', 'Qurulma Tarixi', 'Açıqlama', 'Status'
        ];

        $this->setTemplateHeaders($sheet, $headers);
        $this->addBasicSampleData($sheet);
        $this->styleBasicTemplate($sheet);

        return $this->saveTemplate($spreadsheet, $fileName);
    }

    /**
     * Generate type-specific template with instructions
     */
    public function generateTypeSpecificTemplate($institutionType, string $fileName): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('İmport Template');

        $instructionRow = $this->addInstructions($sheet, $institutionType);
        $headerRow = $this->addTypeSpecificHeaders($sheet, $institutionType, $instructionRow);
        $this->addTypeSpecificSampleData($sheet, $institutionType, $headerRow);
        $this->addDataValidation($sheet, $institutionType, $headerRow);
        $this->styleTypeSpecificTemplate($sheet, $institutionType);

        return $this->saveTemplate($spreadsheet, $fileName);
    }

    /**
     * Set template headers
     */
    private function setTemplateHeaders($sheet, array $headers): void
    {
        foreach ($headers as $index => $header) {
            $column = chr(65 + $index);
            $sheet->setCellValue($column . '1', $header);
            $sheet->getStyle($column . '1')->getFont()->setBold(true);
        }
    }

    /**
     * Add instructions section to template
     */
    private function addInstructions($sheet, $institutionType): int
    {
        $instructions = [
            strtoupper($institutionType->label_az) . " İDXAL TEMPLATE-i",
            "",
            "TƏLİMATLAR:",
            "1. * ilə işarələnmiş sahələr məcburidir",
            "2. ID sütunu boş buraxın - avtomatik yaradılacaq",
            "3. Valideyn ID = Üst təşkilat kodu (məsələn: 4=Balakən, 5=Zaqatala)",
            "4. Status boş buraxsanız avtomatik 'aktiv' olacaq",
            "5. Bu sətirlər və təlimatları silə bilərsiniz",
            "",
            "ADMIN YARADILMASI:",
            "• Admin Email doldurulduqda avtomatik admin istifadəçi yaradılır",
            "• Admin Parol boş buraxsanız güclü parol avtomatik yaradılır",
            "• Parol tələbləri: ən azı 8 simvol, böyük/kiçik hərf, rəqəm",
            "• Zəif parollar avtomatik güclü parollarla əvəz olunur",
            "• Admin sütunları tamamilə boş buraxıla bilər",
            "",
            "MÖVCUD ÜSDƏRƏ KODLARI:"
        ];
        
        $parentOrgs = $this->getParentOrganizations($institutionType);
        
        $row = 1;
        foreach ($instructions as $instruction) {
            $sheet->setCellValue('A' . $row, $instruction);
            $this->styleInstructionRow($sheet, $row, $instruction);
            $row++;
        }
        
        foreach ($parentOrgs as $org) {
            $sheet->setCellValue('A' . $row, "ID {$org->id}: {$org->name} (Səviyyə {$org->level})");
            $row++;
        }
        
        // Add password examples
        $sheet->setCellValue('A' . $row, "");
        $row++;
        $sheet->setCellValue('A' . $row, "GÜCLÜ PAROL NÜMUNƏLƏRİ:");
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;
        
        $passwordExamples = [
            "• Direktor123! (məktəb direktorları üçün)",
            "• Mudir456! (bağça müdirləri üçün)", 
            "• Region789! (regional idarələr üçün)",
            "• Sektor012! (sektor idarələri üçün)",
            "• Admin345! (ümumi admin istifadəçiləri üçün)"
        ];
        
        foreach ($passwordExamples as $example) {
            $sheet->setCellValue('A' . $row, $example);
            $row++;
        }
        
        $sheet->setCellValue('A' . $row, "");
        $row++;
        $sheet->setCellValue('A' . $row, "DATA BAŞLANĞICI (Bu sətirlər altına məlumatları yazın)");
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        
        return $row + 2; // Return row where headers should start
    }

    /**
     * Add type-specific headers
     */
    private function addTypeSpecificHeaders($sheet, $institutionType, int $startRow): int
    {
        $headers = $this->getTypeSpecificHeaders($institutionType);
        
        foreach ($headers as $index => $header) {
            $column = chr(65 + $index);
            $sheet->setCellValue($column . $startRow, $header);
            $headerStyle = $sheet->getStyle($column . $startRow);
            $headerStyle->getFont()->setBold(true);
            
            // Highlight required fields in red
            if (strpos($header, '*') !== false) {
                $headerStyle->getFont()->getColor()->setARGB('FFFF0000');
            }
        }

        return $startRow;
    }

    /**
     * Add type-specific sample data
     */
    private function addTypeSpecificSampleData($sheet, $institutionType, int $headerRow): void
    {
        $sampleData = $this->getTypeSpecificSampleData($institutionType);
        
        $dataStartRow = $headerRow + 1;
        foreach ($sampleData as $rowIndex => $data) {
            foreach ($data as $colIndex => $value) {
                $column = chr(65 + $colIndex);
                $sheet->setCellValue($column . ($dataStartRow + $rowIndex), $value);
            }
        }
    }

    /**
     * Add data validation for parent ID dropdown
     */
    private function addDataValidation($sheet, $institutionType, int $headerRow): void
    {
        if ($institutionType->default_level <= 1) {
            return; // No parent validation needed for top-level institutions
        }

        $parentOrgs = $this->getParentOrganizations($institutionType);
        $parentIds = $parentOrgs->where('level', '<', $institutionType->default_level)->pluck('id')->toArray();
        
        if (empty($parentIds)) {
            return;
        }

        $dataStartRow = $headerRow + 1;
        $validationRange = 'D' . $dataStartRow . ':D100'; // Column D is parent_id
        $validation = $sheet->getDataValidation($validationRange);
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setFormula1('"' . implode(',', $parentIds) . '"');
        $validation->setShowDropDown(true);
        $validation->setErrorTitle('Xəta');
        $validation->setError('Lütfən siyahıdan düzgün Valideyn ID seçin');
    }

    /**
     * Get parent organizations for validation and instructions
     */
    private function getParentOrganizations($institutionType)
    {
        return Institution::where('level', '<', $institutionType->default_level)
                         ->orderBy('level')
                         ->orderBy('name')
                         ->get(['id', 'name', 'level']);
    }

    /**
     * Get type-specific headers with required field indicators
     */
    private function getTypeSpecificHeaders($institutionType): array
    {
        $baseHeaders = [
            'ID (avtomatik)',
            'Ad *',
            'Qısa Ad',
            'Valideyn ID * (Sektor Kodu)' . ($institutionType->default_level == 4 ? ' - 4=Balakən, 5=Zaqatala' : ''),
            'Səviyyə * (' . $institutionType->default_level . ')',
            'Region Kodu',
            'Qurum Kodu'
        ];

        // Get admin headers
        $adminExtension = new AdminTemplateExtensionService();
        $adminHeaders = $adminExtension->getAdminHeaders();
        
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'lyceum':
            case 'gymnasium':
            case 'primary_school':
                $institutionSpecificHeaders = [
                    'Şagird Sayı',
                    'Müəllim Sayı', 
                    'Sinif Sayı',
                    'Direktor Adı',
                    'Telefon',
                    'Email',
                    'Ünvan'
                ];
                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)'
                ]);

            case 'kindergarten':
                $institutionSpecificHeaders = [
                    'Uşaq Sayı',
                    'Tərbiyəçi Sayı',
                    'Qrup Sayı', 
                    'Müdir Adı',
                    'Telefon',
                    'Email',
                    'Ünvan'
                ];
                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)'
                ]);

            case 'regional_education_department':
            case 'sector_education_office':
                $institutionSpecificHeaders = [
                    'Telefon *',
                    'Email',
                    'Ünvan *',
                    'Açıqlama'
                ];
                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)'
                ]);

            default:
                $institutionSpecificHeaders = [
                    'Telefon',
                    'Email', 
                    'Ünvan',
                    'Açıqlama'
                ];
                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)'
                ]);
        }
    }

    /**
     * Get type-specific sample data from real database examples
     */
    private function getTypeSpecificSampleData($institutionType): array
    {
        // Get admin sample data
        $adminExtension = new AdminTemplateExtensionService();
        $adminSampleData = $adminExtension->getAdminSampleData($institutionType);
        
        switch ($institutionType->key) {
            case 'secondary_school':
            case 'lyceum':
            case 'gymnasium':
                $baseSampleData = [
                    ['', 'Nümunə Orta Məktəb 1', 'NOM1', '4', '4', 'ZQ', 'NOM001', '450', '28', '18', 'Müdir Adı', '+994551234567', 'nom1@example.az', 'Zaqatala rayonu'],
                    ['', 'Nümunə Lisey 2', 'NL2', '5', '4', 'BL', 'NL002', '380', '25', '16', 'Direktor Adı', '+994552345678', 'lisey2@example.az', 'Balakən rayonu']
                ];
                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
                    array_merge($baseSampleData[1], $adminSampleData, ['active'])
                ];

            case 'kindergarten':
                $baseSampleData = [
                    ['', 'Nümunə Uşaq Bağçası 1', 'NUB1', '4', '4', 'ZQ', 'NUB001', '85', '12', '5', 'Müdir Adı', '+994553456789', 'bagca1@example.az', 'Zaqatala rayonu'],
                    ['', 'Nümunə Bağça 2', 'NB2', '5', '4', 'BL', 'NB002', '65', '9', '4', 'Rəis Adı', '+994554567890', 'bagca2@example.az', 'Balakən rayonu']
                ];
                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
                    array_merge($baseSampleData[1], $adminSampleData, ['active'])
                ];

            case 'sector_education_office':
                $baseSampleData = [
                    ['', 'Nümunə Sektor', 'NS', '2', '3', 'RTI', 'NS001', '+994555678901', 'sektor@example.az', 'Zaqatala şəhəri, Mərkəz', 'Təhsil sektoru']
                ];
                return [
                    array_merge($baseSampleData[0], $adminSampleData, [''])
                ];

            case 'regional_education_department':
                $baseSampleData = [
                    ['', 'Nümunə Regional İdarə', 'NRI', '1', '2', 'MN', 'NRI001', '+994556789012', 'region@example.az', 'Regional mərkəz', 'Regional təhsil idarəsi']
                ];
                return [
                    array_merge($baseSampleData[0], $adminSampleData, [''])
                ];

            default:
                $baseSampleData = [
                    ['', 'Nümunə Qurum', 'NQ', '', $institutionType->default_level, '', 'NQ001', '+994557890123', 'info@example.az', 'Ünvan', 'Açıqlama']
                ];
                return [
                    array_merge($baseSampleData[0], $adminSampleData, [''])
                ];
        }
    }

    /**
     * Add basic sample data for generic template
     */
    private function addBasicSampleData($sheet): void
    {
        $sampleData = [
            ['', 'Nümunə Məktəb', 'NM', 'secondary_school', '26', '4',
             'BA', 'NM001', '', 'phone:+994501234567;email:info@sample.edu.az',
             'Bakı şəhəri, Nəsimi rayonu', '2020-01-01', 'Nümunə məktəb', 'active']
        ];

        foreach ($sampleData as $rowIndex => $data) {
            foreach ($data as $colIndex => $value) {
                $sheet->setCellValue(chr(65 + $colIndex) . ($rowIndex + 2), $value);
            }
        }
    }

    /**
     * Style instruction rows
     */
    private function styleInstructionRow($sheet, int $row, string $instruction): void
    {
        $isBold = strpos($instruction, 'TEMPLATE') !== false || 
                  strpos($instruction, 'TƏLİMATLAR:') !== false || 
                  strpos($instruction, 'KODLARI:') !== false;
        
        if ($isBold) {
            $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        }
    }

    /**
     * Style basic template
     */
    private function styleBasicTemplate($sheet): void
    {
        $columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
        $widths = [8, 25, 15, 20, 12, 10, 12, 15, 15, 30, 25, 15, 25, 10];

        foreach ($columns as $index => $column) {
            $sheet->getColumnDimension($column)->setWidth($widths[$index]);
        }
    }

    /**
     * Style type-specific template  
     */
    private function styleTypeSpecificTemplate($sheet, $institutionType): void
    {
        $headers = $this->getTypeSpecificHeaders($institutionType);
        
        // Auto-size columns for better readability
        foreach (range('A', chr(64 + count($headers))) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
    }

    /**
     * Save template to temporary file
     */
    private function saveTemplate(Spreadsheet $spreadsheet, string $fileName): string
    {
        $filePath = storage_path('app/temp/' . $fileName);
        
        // Ensure temp directory exists
        if (!is_dir(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }
}