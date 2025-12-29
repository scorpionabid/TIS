<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Services\BaseService;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class InstitutionExcelTemplateService extends BaseService
{
    /**
     * Generate enhanced template by institution type (new main method)
     */
    public function generateTemplateByType(string $institutionTypeKey): string
    {
        $institutionType = \App\Models\InstitutionType::where('key', $institutionTypeKey)->firstOrFail();
        $fileName = "muessise_idxal_sablonu_{$institutionTypeKey}_" . date('Y-m-d_H-i-s') . '.xlsx';

        return $this->generateTypeSpecificTemplate($institutionType, $fileName);
    }

    /**
     * Generate basic import template for institutions (legacy)
     */
    public function generateBasicTemplate($institutions, string $fileName): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        $headers = [
            'ID', 'Ad', 'Qısa Ad', 'Növ', 'Valideyn ID', 'Səviyyə',
            'Region Kodu', 'Qurum Kodu', 'UTIS Kodu', 'Əlaqə Məlumatları',
            'Ünvan', 'Qurulma Tarixi', 'Açıqlama', 'Status',
        ];

        $this->setTemplateHeaders($sheet, $headers);
        $this->addBasicSampleData($sheet);
        $this->styleBasicTemplate($sheet);

        return $this->saveTemplate($spreadsheet, $fileName);
    }

    /**
     * Generate type-specific template with enhanced features (colors, real data)
     */
    public function generateTypeSpecificTemplate($institutionType, string $fileName): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Müəssisə İdxal Şablonu');

        // Get institution level for processing
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        // Add enhanced headers with color coding
        $headers = $this->getEnhancedHeaders($institutionType, $institutionLevel);
        $this->setEnhancedHeaders($sheet, $headers);

        // Add enhanced sample data with real parent IDs
        $this->addEnhancedSampleData($sheet, $institutionType, $institutionLevel);

        // Add instructions sheet
        $this->addInstructionsSheet($spreadsheet, $institutionType);

        // Add parent institutions reference sheet
        $this->addParentInstitutionsSheet($spreadsheet, $institutionType);

        // Add color legend
        $this->addColorLegend($sheet);

        // Style the template
        $this->styleEnhancedTemplate($sheet);

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
            strtoupper($institutionType->label_az) . ' İDXAL TEMPLATE-i',
            '',
            'TƏLİMATLAR:',
            '1. * ilə işarələnmiş sahələr məcburidir',
            '2. ID sütunu boş buraxın - avtomatik yaradılacaq',
            '3. Valideyn ID = Üst təşkilat kodu (məsələn: 4=Balakən, 5=Zaqatala)',
            "4. Status boş buraxsanız avtomatik 'aktiv' olacaq",
            '5. Bu sətirlər və təlimatları silə bilərsiniz',
            '',
            'ADMIN YARADILMASI:',
            '• Admin Email doldurulduqda avtomatik admin istifadəçi yaradılır',
            '• Admin Parol boş buraxsanız güclü parol avtomatik yaradılır',
            '• Parol tələbləri: ən azı 8 simvol, böyük/kiçik hərf, rəqəm',
            '• Zəif parollar avtomatik güclü parollarla əvəz olunur',
            '• Admin sütunları tamamilə boş buraxıla bilər',
            '',
            'MÖVCUD ÜSDƏRƏ KODLARI:',
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
        $sheet->setCellValue('A' . $row, '');
        $row++;
        $sheet->setCellValue('A' . $row, 'GÜCLÜ PAROL NÜMUNƏLƏRİ:');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;

        $passwordExamples = [
            '• Direktor123! (məktəb direktorları üçün)',
            '• Mudir456! (bağça müdirləri üçün)',
            '• Region789! (regional idarələr üçün)',
            '• Sektor012! (sektor idarələri üçün)',
            '• Admin345! (ümumi admin istifadəçiləri üçün)',
        ];

        foreach ($passwordExamples as $example) {
            $sheet->setCellValue('A' . $row, $example);
            $row++;
        }

        $sheet->setCellValue('A' . $row, '');
        $row++;
        $sheet->setCellValue('A' . $row, 'DATA BAŞLANĞICI (Bu sətirlər altına məlumatları yazın)');
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
            'Qurum Kodu',
        ];

        // Get admin headers
        $adminExtension = new AdminTemplateExtensionService;
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
                    'Ünvan',
                ];

                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)',
                ]);

            case 'kindergarten':
                $institutionSpecificHeaders = [
                    'Uşaq Sayı',
                    'Tərbiyəçi Sayı',
                    'Qrup Sayı',
                    'Müdir Adı',
                    'Telefon',
                    'Email',
                    'Ünvan',
                ];

                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)',
                ]);

            case 'regional_education_department':
            case 'sector_education_office':
                $institutionSpecificHeaders = [
                    'Telefon *',
                    'Email',
                    'Ünvan *',
                    'Açıqlama',
                ];

                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)',
                ]);

            default:
                $institutionSpecificHeaders = [
                    'Telefon',
                    'Email',
                    'Ünvan',
                    'Açıqlama',
                ];

                return array_merge($baseHeaders, $institutionSpecificHeaders, $adminHeaders, [
                    'Status (boş buraxsanız avtomatik aktiv olacaq)',
                ]);
        }
    }

    /**
     * Get type-specific sample data from real database examples
     */
    private function getTypeSpecificSampleData($institutionType): array
    {
        // Get admin sample data
        $adminExtension = new AdminTemplateExtensionService;
        $adminSampleData = $adminExtension->getAdminSampleData($institutionType);

        switch ($institutionType->key) {
            case 'secondary_school':
            case 'lyceum':
            case 'gymnasium':
                $baseSampleData = [
                    ['', 'Nümunə Orta Məktəb 1', 'NOM1', '4', '4', 'ZQ', 'NOM001', '450', '28', '18', 'Müdir Adı', '+994551234567', 'nom1@example.az', 'Zaqatala rayonu'],
                    ['', 'Nümunə Lisey 2', 'NL2', '5', '4', 'BL', 'NL002', '380', '25', '16', 'Direktor Adı', '+994552345678', 'lisey2@example.az', 'Balakən rayonu'],
                ];

                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
                    array_merge($baseSampleData[1], $adminSampleData, ['active']),
                ];

            case 'kindergarten':
                $baseSampleData = [
                    ['', 'Nümunə Uşaq Bağçası 1', 'NUB1', '4', '4', 'ZQ', 'NUB001', '85', '12', '5', 'Müdir Adı', '+994553456789', 'bagca1@example.az', 'Zaqatala rayonu'],
                    ['', 'Nümunə Bağça 2', 'NB2', '5', '4', 'BL', 'NB002', '65', '9', '4', 'Rəis Adı', '+994554567890', 'bagca2@example.az', 'Balakən rayonu'],
                ];

                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
                    array_merge($baseSampleData[1], $adminSampleData, ['active']),
                ];

            case 'sector_education_office':
                $baseSampleData = [
                    ['', 'Nümunə Sektor', 'NS', '2', '3', 'RTI', 'NS001', '+994555678901', 'sektor@example.az', 'Zaqatala şəhəri, Mərkəz', 'Təhsil sektoru'],
                ];

                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
                ];

            case 'regional_education_department':
                $baseSampleData = [
                    ['', 'Nümunə Regional İdarə', 'NRI', '1', '2', 'MN', 'NRI001', '+994556789012', 'region@example.az', 'Regional mərkəz', 'Regional təhsil idarəsi'],
                ];

                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
                ];

            default:
                $baseSampleData = [
                    ['', 'Nümunə Qurum', 'NQ', '', $institutionType->default_level, '', 'NQ001', '+994557890123', 'info@example.az', 'Ünvan', 'Açıqlama'],
                ];

                return [
                    array_merge($baseSampleData[0], $adminSampleData, ['']),
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
                'Bakı şəhəri, Nəsimi rayonu', '2020-01-01', 'Nümunə məktəb', 'active'],
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
     * Get enhanced headers with database field mapping
     */
    private function getEnhancedHeaders($institutionType, int $institutionLevel): array
    {
        $headers = [
            'A1' => 'Ad (name)*',
            'B1' => 'Qısa Ad (short_name)',
            'C1' => 'Müəssisə Kodu (institution_code)',
            'D1' => 'UTIS Kod (utis_code)',
            'E1' => 'Region Kodu (region_code)',
            'F1' => 'Əlaqə Məlumatları (contact_info)',
            'G1' => 'Yer Məlumatları (location)',
            'H1' => 'Təsis Tarixi (established_date)',
            'I1' => 'Status (is_active): aktiv/qeyri-aktiv',
        ];

        // Add parent_id if level >= 2
        if ($institutionLevel >= 2) {
            $headers['J1'] = 'Üst Müəssisə ID (parent_id)';
        }

        // Add school-specific fields
        if (in_array($institutionType->key, ['secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb'])) {
            $headers['K1'] = 'Sinif Sayı';
            $headers['L1'] = 'Şagird Sayı';
            $headers['M1'] = 'Müəllim Sayı';
        }

        // Add SchoolAdmin fields for level 4
        if ($institutionLevel == 4) {
            $headers['N1'] = 'SchoolAdmin İstifadəçi Adı*';
            $headers['O1'] = 'SchoolAdmin Email*';
            $headers['P1'] = 'SchoolAdmin Şifrə*';
            $headers['Q1'] = 'SchoolAdmin Ad';
            $headers['R1'] = 'SchoolAdmin Soyad';
            $headers['S1'] = 'SchoolAdmin Telefon';
            $headers['T1'] = 'SchoolAdmin Department';
        }

        return $headers;
    }

    /**
     * Set enhanced headers with mandatory field styling
     */
    private function setEnhancedHeaders($sheet, array $headers): void
    {
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
            $sheet->getStyle($cell)->getFont()->setBold(true);

            // Check if field is mandatory (contains *)
            if (strpos($value, '*') !== false) {
                // Mandatory fields: Red background
                $sheet->getStyle($cell)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFFFE6E6'); // Light red
                $sheet->getStyle($cell)->getFont()->getColor()->setARGB('FFCC0000'); // Dark red text
            } else {
                // Optional fields: Light purple background
                $sheet->getStyle($cell)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFE6E6FA'); // Light purple
            }
        }
    }

    /**
     * Add enhanced sample data with real parent IDs
     */
    private function addEnhancedSampleData($sheet, $institutionType, int $institutionLevel): void
    {
        $sampleRow = 2;
        $sampleData = [
            'A' . $sampleRow => 'Nümunə ' . $institutionType->name,
            'B' . $sampleRow => 'Qısa ad',
            'C' . $sampleRow => 'INST001',
            'D' . $sampleRow => '123456789012',
            'E' . $sampleRow => 'BAK',
            'F' . $sampleRow => '{"phone":"+994123456789","email":"contact@example.com"}',
            'G' . $sampleRow => '{"address":"Bakı şəhəri, Nəsimi rayonu","coordinates":"40.4093,49.8671"}',
            'H' . $sampleRow => '2000-01-01',
            'I' . $sampleRow => 'aktiv',
        ];

        if ($institutionLevel >= 2) {
            // Use real parent institution ID based on level
            if ($institutionLevel == 4) {
                // For schools (level 4), use a real sector ID (level 3)
                $sampleParentId = \App\Models\Institution::where('level', 3)->first()?->id ?? '73';
                $sampleData['J' . $sampleRow] = $sampleParentId . ' // Sektor ID (örnek: Zaqatala)';
            } elseif ($institutionLevel == 3) {
                // For sectors (level 3), use a real regional department ID (level 2)
                $sampleParentId = \App\Models\Institution::where('level', 2)->first()?->id ?? '71';
                $sampleData['J' . $sampleRow] = $sampleParentId . ' // Regional İdarə ID';
            } else {
                // For level 2, use ministry ID (level 1)
                $sampleParentId = \App\Models\Institution::where('level', 1)->first()?->id ?? '70';
                $sampleData['J' . $sampleRow] = $sampleParentId . ' // Nazirlik ID';
            }
        }

        if (in_array($institutionType->key, ['secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb'])) {
            $sampleData['K' . $sampleRow] = '11';
            $sampleData['L' . $sampleRow] = '300';
            $sampleData['M' . $sampleRow] = '25';
        }

        // Add SchoolAdmin sample data for level 4
        if ($institutionLevel == 4) {
            $sampleData['N' . $sampleRow] = 'schooladmin001';
            $sampleData['O' . $sampleRow] = 'admin@school001.edu.az';
            $sampleData['P' . $sampleRow] = 'SecurePassword123';
            $sampleData['Q' . $sampleRow] = 'Məktəb';
            $sampleData['R' . $sampleRow] = 'Administratoru';
            $sampleData['S' . $sampleRow] = '+994501234567';
            $sampleData['T' . $sampleRow] = 'İdarəetmə';
        }

        foreach ($sampleData as $cell => $value) {
            $sheet->setCellValue($cell, $value);
            $sheet->getStyle($cell)->getFont()->setItalic(true);
            $sheet->getStyle($cell)->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFFFFFFF');
        }
    }

    /**
     * Add instructions sheet
     */
    private function addInstructionsSheet($spreadsheet, $institutionType): void
    {
        $instructionSheet = $spreadsheet->createSheet();
        $instructionSheet->setTitle('Təlimatlar');

        $institutionLevel = $institutionType->level ?? $institutionType->default_level;
        $instructions = [
            'A1' => 'İDXAL ŞABLONUnda İSTİFADƏ TƏLİMATLARI',
            'A3' => '1. * işarəsi olan sahələr mütləqdir',
            'A4' => '2. Tarix formatı: YYYY-MM-DD (məsələn: 2000-01-01)',
            'A5' => '3. Status: "aktiv" və ya "qeyri-aktiv"',
        ];

        // Add parent_id specific instructions if needed
        if ($institutionLevel > 1) {
            $instructions['A6'] = '4. ÜST MÜƏSSİSƏ ID (J sütunu) - ÇOX VACİB!';
            $instructions['A7'] = '   📋 "Üst Müəssisələr" sheet-indən ID kopyalayın';
            $instructions['A8'] = '   📝 Həmçinin müəssisə adını da yaza bilərsiniz';
            $instructions['A9'] = '   ✅ Sistem həm ID həm də ad qəbul edir';
            $instructions['A11'] = '5. contact_info: JSON format {"phone":"+994...","email":"..."}';
            $instructions['A12'] = '6. location: JSON format {"address":"...","coordinates":"..."}';
            $instructions['A13'] = '7. region_code: 3 hərfli kod (BAK, GNC, ŞKI və s.)';
            $instructions['A14'] = '8. utis_code: 8-12 rəqəmli kod (maksimum 12)';
        } else {
            $instructions['A6'] = '4. contact_info: JSON format {"phone":"+994...","email":"..."}';
            $instructions['A7'] = '5. location: JSON format {"address":"...","coordinates":"..."}';
            $instructions['A8'] = '6. region_code: 3 hərfli kod (BAK, GNC, ŞKI və s.)';
            $instructions['A9'] = '7. utis_code: 8-12 rəqəmli kod (maksimum 12)';
        }

        // Add SchoolAdmin instructions for level 4
        if ($institutionLevel == 4) {
            $startRow = $institutionLevel > 1 ? 16 : 11;
            $instructions['A' . $startRow] = ($startRow - 6) . '. SchoolAdmin sahələri (məktəblər üçün):';
            $instructions['A' . ($startRow + 1)] = '   - İstifadəçi adı unikal olmalıdır';
            $instructions['A' . ($startRow + 2)] = '   - Email unikal olmalıdır və düzgün formatda';
            $instructions['A' . ($startRow + 3)] = '   - Şifrə minimum 8 simvol olmalıdır';
            $instructions['A' . ($startRow + 5)] = ($startRow - 5) . '. Nümunə məlumatları silib, öz məlumatlarınızı daxil edin';
            $instructions['A' . ($startRow + 6)] = ($startRow - 4) . '. Fayl ölçüsü maksimum 10MB ola bilər';
        } else {
            $startRow = $institutionLevel > 1 ? 16 : 11;
            $instructions['A' . $startRow] = ($startRow - 6) . '. Nümunə məlumatları silib, öz məlumatlarınızı daxil edin';
            $instructions['A' . ($startRow + 1)] = ($startRow - 5) . '. Fayl ölçüsü maksimum 10MB ola bilər';
        }

        foreach ($instructions as $cell => $text) {
            $instructionSheet->setCellValue($cell, $text);
            if ($cell === 'A1') {
                $instructionSheet->getStyle($cell)->getFont()->setBold(true)->setSize(14);
            }
        }

        // Auto-size columns
        foreach (range('A', 'T') as $column) {
            $instructionSheet->getColumnDimension($column)->setAutoSize(true);
        }
    }

    /**
     * Add color legend
     */
    private function addColorLegend($sheet): void
    {
        $legendRow = 5;
        $sheet->setCellValue('A' . $legendRow, 'RƏNG LEGENDİ:');
        $sheet->getStyle('A' . $legendRow)->getFont()->setBold(true);

        $sheet->setCellValue('A' . ($legendRow + 1), 'Qırmızı rəng = Məcburi sahələr (*)');
        $sheet->getStyle('A' . ($legendRow + 1))->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFFFE6E6');
        $sheet->getStyle('A' . ($legendRow + 1))->getFont()->getColor()->setARGB('FFCC0000');

        $sheet->setCellValue('A' . ($legendRow + 2), 'Bənövşəyi rəng = İsteğe bağlı sahələr');
        $sheet->getStyle('A' . ($legendRow + 2))->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE6E6FA');
    }

    /**
     * Style enhanced template
     */
    private function styleEnhancedTemplate($sheet): void
    {
        // Auto-size columns (extended to T for SchoolAdmin fields)
        foreach (range('A', 'T') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
    }

    /**
     * Add parent institutions reference sheet
     */
    private function addParentInstitutionsSheet(Spreadsheet $spreadsheet, $institutionType): void
    {
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        // Only add parent sheet if this institution type needs parent ID
        if ($institutionLevel <= 1) {
            return; // No parent needed for top-level institutions
        }

        // Create new sheet
        $parentSheet = $spreadsheet->createSheet();
        $parentSheet->setTitle('Üst Müəssisələr');

        // Add header
        $parentSheet->setCellValue('A1', 'ÜST MÜƏSSİSƏLƏR SİYAHISI');
        $parentSheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $parentSheet->setCellValue('A2', 'Bu siyahıdan ID-ni götürərək J sütununa yazın');
        $parentSheet->getStyle('A2')->getFont()->setItalic(true);

        // Add column headers
        $parentSheet->setCellValue('A4', 'ID *');
        $parentSheet->setCellValue('B4', 'Müəssisə Adı');
        $parentSheet->setCellValue('C4', 'Qısa Ad');
        $parentSheet->setCellValue('D4', 'Səviyyə');
        $parentSheet->setCellValue('E4', 'Region');

        // Style headers
        $headerRange = 'A4:E4';
        $parentSheet->getStyle($headerRange)->getFont()->setBold(true);
        $parentSheet->getStyle($headerRange)->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE6E6FA'); // Light purple

        // Get potential parent institutions
        $parentInstitutions = $this->getPotentialParentInstitutions($institutionLevel);

        // Add institution data
        $row = 5;
        foreach ($parentInstitutions as $institution) {
            $parentSheet->setCellValue('A' . $row, $institution->id);
            $parentSheet->setCellValue('B' . $row, $institution->name);
            $parentSheet->setCellValue('C' . $row, $institution->short_name ?? '');
            $parentSheet->setCellValue('D' . $row, 'Level ' . $institution->level);
            $parentSheet->setCellValue('E' . $row, $institution->region_code ?? 'N/A');

            // Highlight ID column (important for copy-paste)
            $parentSheet->getStyle('A' . $row)->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFFFE6E6'); // Light red
            $parentSheet->getStyle('A' . $row)->getFont()->setBold(true);

            $row++;
        }

        // Auto-size columns
        foreach (['A', 'B', 'C', 'D', 'E'] as $column) {
            $parentSheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Add instruction at bottom
        $instructionRow = $row + 2;
        $parentSheet->setCellValue('A' . $instructionRow, 'TƏLİMAT:');
        $parentSheet->getStyle('A' . $instructionRow)->getFont()->setBold(true);

        $parentSheet->setCellValue('A' . ($instructionRow + 1), '1. 🔍 AXTARIŞ: Ctrl+F vasitəsilə lazımi müəssisəni tapın');
        $parentSheet->setCellValue('A' . ($instructionRow + 2), '2. 📋 KOPYALAMA: ID sütunundan (A) ID-ni kopyalayın');
        $parentSheet->setCellValue('A' . ($instructionRow + 3), '3. 📝 YAPIŞDIRMA: Əsas sheet-də J sütununa yapışdırın');
        $parentSheet->setCellValue('A' . ($instructionRow + 4), '4. ✏️ ALTERNATIV: Müəssisə adını da yaza bilərsiniz');
        $parentSheet->setCellValue('A' . ($instructionRow + 6), 'MƏSƏLƏN:');
        $parentSheet->setCellValue('A' . ($instructionRow + 7), '• Bakı şəhər təhsil şöbəsi axtarırsınız → "Bakı" yazıb axtarın');
        $parentSheet->setCellValue('A' . ($instructionRow + 8), '• Zaqatala rayon təhsil şöbəsi → "Zaqatala" yazıb axtarın');
        $parentSheet->setCellValue('A' . ($instructionRow + 9), '• Nizami rayonu təhsil şöbəsi → "Nizami" yazıb axtarın');
    }

    /**
     * Get potential parent institutions based on level
     */
    private function getPotentialParentInstitutions(int $currentLevel): \Illuminate\Database\Eloquent\Collection
    {
        // Get institutions that can be parents (lower level numbers)
        $institutions = \App\Models\Institution::where('level', '<', $currentLevel)
            ->where('is_active', true)
            ->orderBy('level')
            ->orderBy('region_code')
            ->orderBy('name')
            ->get(['id', 'name', 'level', 'region_code', 'short_name']);

        // If too many institutions, prioritize by level and region
        if ($institutions->count() > 100) {
            // Group by level and region to show representative examples
            $grouped = $institutions->groupBy(['level', 'region_code']);
            $prioritized = collect();

            foreach ($grouped as $level => $regions) {
                foreach ($regions as $regionCode => $regionInstitutions) {
                    // Take first 2 from each region per level
                    $prioritized = $prioritized->merge($regionInstitutions->take(2));
                }
            }

            return $prioritized->take(80); // Reasonable limit
        }

        return $institutions;
    }

    /**
     * Save template to temporary file
     */
    private function saveTemplate(Spreadsheet $spreadsheet, string $fileName): string
    {
        $filePath = storage_path('app/temp/' . $fileName);

        // Ensure temp directory exists
        if (! is_dir(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        // Clean up
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $filePath;
    }
}
