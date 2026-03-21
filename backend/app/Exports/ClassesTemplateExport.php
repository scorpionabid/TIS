<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ClassesTemplateExport implements FromCollection, WithColumnWidths, WithEvents, WithHeadings, WithMapping, WithStyles
{
    protected $institutions;

    public function __construct($institutions)
    {
        $this->institutions = $institutions;
    }

    /**
     * Generate example data for template
     */
    public function collection()
    {
        $examples = collect();

        // If no institutions provided, use generic placeholder data
        if (empty($this->institutions) || $this->institutions->isEmpty()) {
            $this->institutions = collect([(object) [
                'utis_code'        => '1234567',
                'institution_code' => 'MMK001',
                'name'             => 'Nümunə Məktəb',
            ]]);
        }

        // Add 5 diverse example rows for first 3 institutions
        foreach ($this->institutions->take(3) as $index => $institution) {
            // Example 1: Standard Azerbaijani class
            $examples->push((object) [
                'utis_code' => $institution->utis_code ?? '',
                'institution_code' => $institution->institution_code ?? '',
                'institution_name' => $institution->name,
                'class_level' => 1,
                'class_index' => 'A',
                'student_count' => 25,
                'male_count' => 13,
                'female_count' => 12,
                'teaching_language' => 'azərbaycan',
                'teaching_shift' => '1 növbə',
                'teaching_week' => '5_günlük',
                'homeroom_teacher' => 'Nümunə Müəllim',
                'class_type' => 'Orta məktəb sinfi',
                'class_profile' => 'Ümumi',
                'education_program' => 'umumi',
                'academic_year' => date('Y') . '-' . (date('Y') + 1),
            ]);

            // Example 2: Russian language class
            $examples->push((object) [
                'utis_code' => $institution->utis_code ?? '',
                'institution_code' => $institution->institution_code ?? '',
                'institution_name' => $institution->name,
                'class_level' => 2,
                'class_index' => 'B',
                'student_count' => 24,
                'male_count' => 12,
                'female_count' => 12,
                'teaching_language' => 'rus',
                'teaching_shift' => '1 növbə',
                'teaching_week' => '5_günlük',
                'homeroom_teacher' => 'Rus Bölməsi Nümunə',
                'class_type' => 'Orta məktəb sinfi',
                'class_profile' => 'Rus bölməsi',
                'education_program' => 'umumi',
                'academic_year' => date('Y') . '-' . (date('Y') + 1),
            ]);

            // Only add specialized examples for first institution
            if ($index === 0) {
                // Example 3: Specialized math class with 5-day week
                $examples->push((object) [
                    'utis_code' => $institution->utis_code ?? '',
                    'institution_code' => $institution->institution_code ?? '',
                    'institution_name' => $institution->name,
                    'class_level' => 5,
                    'class_index' => 'A',
                    'student_count' => 30,
                    'male_count' => 15,
                    'female_count' => 15,
                    'teaching_language' => 'azərbaycan',
                    'teaching_shift' => '2 növbə',
                    'teaching_week' => '5_günlük',
                    'homeroom_teacher' => 'Riyaziyyat müəllimi',
                    'class_type' => 'İxtisas sinfi',
                    'class_profile' => 'Riyaziyyat',
                    'education_program' => 'umumi',
                    'academic_year' => date('Y') . '-' . (date('Y') + 1),
                ]);

                // Example 4: Special education class
                $examples->push((object) [
                    'utis_code' => $institution->utis_code ?? '',
                    'institution_code' => $institution->institution_code ?? '',
                    'institution_name' => $institution->name,
                    'class_level' => 3,
                    'class_index' => 'C',
                    'student_count' => 12,
                    'male_count' => 7,
                    'female_count' => 5,
                    'teaching_language' => 'azərbaycan',
                    'teaching_shift' => '1 növbə',
                    'teaching_week' => '4_günlük',
                    'homeroom_teacher' => 'Xüsusi təhsil müəllimi',
                    'class_type' => 'Xüsusi sinif',
                    'class_profile' => 'İnklüziv',
                    'education_program' => 'xususi',
                    'academic_year' => date('Y') . '-' . (date('Y') + 1),
                ]);
            }
        }

        return $examples;
    }

    /**
     * Map data to array format for Excel
     */
    public function map($row): array
    {
        return [
            $row->utis_code,
            $row->institution_code,
            $row->institution_name,
            $row->class_level,
            $row->class_index,
            $row->student_count,
            $row->male_count,
            $row->female_count,
            $row->teaching_language,
            $row->teaching_shift,
            $row->teaching_week,
            $row->homeroom_teacher,
            $row->class_type,
            $row->class_profile,
            $row->education_program,
            $row->academic_year,
        ];
    }

    /**
     * Column headings with detailed instructions
     */
    public function headings(): array
    {
        return [
            'UTIS Kod',
            'Müəssisə Kodu',
            'Müəssisə Adı',
            'Sinif Səviyyəsi (1-12)',
            'Sinif İndeksi (məs: A, r2, 11)',
            'Şagirdlər',
            'Oğlan',
            'Qız',
            'Tədris Dili',
            'Növbə',
            'Tədris Həftəsi',
            'Sinif Rəhbəri (tam ad)',
            'Sinfin Tipi',
            'Profil',
            'Təhsil Proqramı',
            'Təhsil İli',
        ];
    }

    /**
     * Column widths
     */
    public function columnWidths(): array
    {
        return [
            'A' => 12,  // UTIS Kod
            'B' => 15,  // Müəssisə Kodu
            'C' => 35,  // Müəssisə Adı
            'D' => 18,  // Sinif səviyyəsi
            'E' => 20,  // Sinif index-i
            'F' => 13,  // Şagird Sayı
            'G' => 12,  // Oğlan Sayı
            'H' => 12,  // Qız Sayı
            'I' => 16,  // Tədris Dili
            'J' => 13,  // Növbə
            'K' => 16,  // Tədris Həftəsi
            'L' => 28,  // Sinif rəhbəri
            'M' => 20,  // Sinfin tipi
            'N' => 20,  // Profil
            'O' => 18,  // Təhsil proqramı
            'P' => 15,  // Tədris ili
        ];
    }

    /**
     * Apply styles to worksheet
     */
    public function styles(Worksheet $sheet)
    {
        try {
            // Required columns (UTIS or Institution Code, Class Level, Class Name)
            $requiredColumns = ['A1', 'B1', 'D1', 'E1']; // UTIS, Code, Level, Index

            // Apply RED styling to required columns
            foreach ($requiredColumns as $col) {
                $sheet->getStyle($col)->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 11,
                        'color' => ['rgb' => 'FFFFFF'],
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'DC3545'], // Bootstrap danger red
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);
            }

            // Apply BLUE styling to recommended columns
            $recommendedColumns = ['F1', 'G1', 'H1', 'I1', 'J1', 'K1']; // Student counts, language, shift, week
            foreach ($recommendedColumns as $col) {
                $sheet->getStyle($col)->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 11,
                        'color' => ['rgb' => 'FFFFFF'],
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '0D6EFD'], // Bootstrap primary blue
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);
            }

            // Apply GRAY styling to optional columns
            $optionalColumns = ['C1', 'L1', 'M1', 'N1', 'O1', 'P1']; // Institution name, teacher, type, profile, program, year
            foreach ($optionalColumns as $col) {
                $sheet->getStyle($col)->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 11,
                        'color' => ['rgb' => '495057'],
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'E9ECEF'], // Bootstrap light gray
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);
            }

            // Set row height for header
            $sheet->getRowDimension(1)->setRowHeight(40);

            // Center align specific columns
            $sheet->getStyle('A2:A1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('B2:B1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('D2:H1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('I2:K1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('O2:P1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Add border to all cells
            $sheet->getStyle('A1:P1000')->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'DEE2E6'],
                    ],
                ],
            ]);

            // Freeze header row
            $sheet->freezePane('A2');

            // Add instruction row at the top (row 0 - will push everything down)
            $sheet->insertNewRowBefore(1, 1);
            $sheet->mergeCells('A1:P1');
            $sheet->setCellValue('A1', '📋 İMPORT QAYDASI: 🔴 Qırmızı sütunlar MƏCBUR | 🔵 Mavi sütunlar TÖVSİYƏ EDİLİR | ⚪ Boz sütunlar İXTİYARİ | Nümunə sətirləri silib, öz məlumatlarınızı daxil edin');
            $sheet->getStyle('A1')->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => 12,
                    'color' => ['rgb' => '000000'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'FFF3CD'], // Warning yellow
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getRowDimension(1)->setRowHeight(30);
        } catch (\Exception $e) {
            \Log::error('Excel styling error: ' . $e->getMessage());
        }

        return $sheet;
    }

    /**
     * Register events for data validation dropdowns
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                try {
                    // Add data validation for Class Level (D column, rows 3-1000)
                    $classLevelValidation = $sheet->getCell('D3')->getDataValidation();
                    $classLevelValidation->setType(DataValidation::TYPE_LIST);
                    $classLevelValidation->setErrorStyle(DataValidation::STYLE_STOP);
                    $classLevelValidation->setAllowBlank(false);
                    $classLevelValidation->setShowInputMessage(true);
                    $classLevelValidation->setShowErrorMessage(true);
                    $classLevelValidation->setShowDropDown(true);
                    $classLevelValidation->setErrorTitle('Yanlış dəyər');
                    $classLevelValidation->setError('0-12 arası rəqəm seçin');
                    $classLevelValidation->setPromptTitle('Sinif səviyyəsi');
                    $classLevelValidation->setPrompt('0-12 arası rəqəm daxil edin (0=Anasinfi, 1-12=Sinif)');
                    $classLevelValidation->setFormula1('"0,1,2,3,4,5,6,7,8,9,10,11,12"');

                    // Apply to all rows
                    for ($row = 3; $row <= 1000; $row++) {
                        $sheet->getCell('D' . $row)->setDataValidation(clone $classLevelValidation);
                    }

                    // Add data validation for Teaching Language (I column)
                    $languageValidation = $sheet->getCell('I3')->getDataValidation();
                    $languageValidation->setType(DataValidation::TYPE_LIST);
                    $languageValidation->setErrorStyle(DataValidation::STYLE_STOP);
                    $languageValidation->setAllowBlank(false);
                    $languageValidation->setShowInputMessage(true);
                    $languageValidation->setShowErrorMessage(true);
                    $languageValidation->setShowDropDown(true);
                    $languageValidation->setErrorTitle('Yanlış dəyər');
                    $languageValidation->setError('Siyahıdan seçin: azərbaycan, rus, gürcü, ingilis');
                    $languageValidation->setPromptTitle('Tədris dili');
                    $languageValidation->setPrompt('Tədris dilini seçin');
                    $languageValidation->setFormula1('"azərbaycan,rus,gürcü,ingilis"');

                    for ($row = 3; $row <= 1000; $row++) {
                        $sheet->getCell('I' . $row)->setDataValidation(clone $languageValidation);
                    }

                    // Add data validation for Teaching Shift (J column)
                    $shiftValidation = $sheet->getCell('J3')->getDataValidation();
                    $shiftValidation->setType(DataValidation::TYPE_LIST);
                    $shiftValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                    $shiftValidation->setAllowBlank(true);
                    $shiftValidation->setShowInputMessage(true);
                    $shiftValidation->setShowDropDown(true);
                    $shiftValidation->setPromptTitle('Növbə');
                    $shiftValidation->setPrompt('Tədris növbəsini seçin');
                    $shiftValidation->setFormula1('"1 növbə,2 növbə,3 növbə,fərdi"');

                    for ($row = 3; $row <= 1000; $row++) {
                        $sheet->getCell('J' . $row)->setDataValidation(clone $shiftValidation);
                    }

                    // Add data validation for Teaching Week (K column)
                    $weekValidation = $sheet->getCell('K3')->getDataValidation();
                    $weekValidation->setType(DataValidation::TYPE_LIST);
                    $weekValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                    $weekValidation->setAllowBlank(true);
                    $weekValidation->setShowInputMessage(true);
                    $weekValidation->setShowDropDown(true);
                    $weekValidation->setPromptTitle('Tədris həftəsi');
                    $weekValidation->setPrompt('Tədris həftəsini seçin');
                    $weekValidation->setFormula1('"4_günlük,5_günlük,6_günlük"');

                    for ($row = 3; $row <= 1000; $row++) {
                        $sheet->getCell('K' . $row)->setDataValidation(clone $weekValidation);
                    }

                    // Add data validation for Education Program (O column)
                    $programValidation = $sheet->getCell('O3')->getDataValidation();
                    $programValidation->setType(DataValidation::TYPE_LIST);
                    $programValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                    $programValidation->setAllowBlank(true);
                    $programValidation->setShowInputMessage(true);
                    $programValidation->setShowDropDown(true);
                    $programValidation->setPromptTitle('Təhsil proqramı');
                    $programValidation->setPrompt('Təhsil proqramını seçin');
                    $programValidation->setFormula1('"umumi,xususi,ferdi_mekteb,ferdi_ev"');

                    for ($row = 3; $row <= 1000; $row++) {
                        $sheet->getCell('O' . $row)->setDataValidation(clone $programValidation);
                    }

                    // Add comments/notes to header cells
                    $sheet->getComment('A2')->getText()->createTextRun('🔴 MƏCBUR: 9 rəqəmli UTIS kod (məsələn: 533821512). UTIS kod və ya Müəssisə kodundan ən az biri mütləqdir!');
                    $sheet->getComment('B2')->getText()->createTextRun('🔴 MƏCBUR (UTIS yoxdursa): Müəssisə kodu (məsələn: MKT-001)');
                    $sheet->getComment('C2')->getText()->createTextRun('⚪ İXTİYARİ: Müəssisənin adı (avtomatik doldurular)');
                    $sheet->getComment('D2')->getText()->createTextRun('🔴 MƏCBUR: 0-12 arası rəqəm (0=Anasinfi, 1-12=Sinif səviyyəsi). Dropdown-dan seçin!');
                    $sheet->getComment('E2')->getText()->createTextRun('🔴 MƏCBUR: Sinif hərfi və ya kodu (məsələn: A, B, r2, 11). Maksimum 3 simvol.');
                    $sheet->getComment('F2')->getText()->createTextRun('🔵 TÖVSİYƏ: Ümumi şagird sayı. Boşdursa Oğlan+Qız hesablanacaq.');
                    $sheet->getComment('G2')->getText()->createTextRun('🔵 TÖVSİYƏ: Oğlan şagird sayı');
                    $sheet->getComment('H2')->getText()->createTextRun('🔵 TÖVSİYƏ: Qız şagird sayı');
                    $sheet->getComment('I2')->getText()->createTextRun('🔵 TÖVSİYƏ: Tədris dili. Dropdown-dan seçin: azərbaycan, rus, gürcü, ingilis');
                    $sheet->getComment('J2')->getText()->createTextRun('🔵 TÖVSİYƏ: Tədris növbəsi. Dropdown-dan seçin: 1 növbə, 2 növbə, 3 növbə, fərdi');
                    $sheet->getComment('K2')->getText()->createTextRun('🔵 TÖVSİYƏ: Tədris həftəsi. Dropdown-dan seçin: 4_günlük, 5_günlük, 6_günlük');
                    $sheet->getComment('L2')->getText()->createTextRun('⚪ İXTİYARİ: Sinif rəhbərinin TAM ADI (sistemdəki müəllim ilə eyni olmalı!)');
                    $sheet->getComment('M2')->getText()->createTextRun('⚪ İXTİYARİ: Sinfin tipi (məsələn: Orta məktəb sinfi, İxtisas sinfi)');
                    $sheet->getComment('N2')->getText()->createTextRun('⚪ İXTİYARİ: Sinif profili (məsələn: Ümumi, Riyaziyyat, İnklüziv)');
                    $sheet->getComment('O2')->getText()->createTextRun('⚪ İXTİYARİ: Təhsil proqramı. Dropdown-dan seçin: umumi, xususi, ferdi_mekteb, ferdi_ev');
                    $sheet->getComment('P2')->getText()->createTextRun('⚪ İXTİYARİ: Tədris ili (məsələn: 2024-2025). Boş qalarsa cari il istifadə olunacaq');
                } catch (\Exception $e) {
                    \Log::error('Excel validation error: ' . $e->getMessage());
                }
            },
        ];
    }
}
