<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ClassesTemplateExport implements FromCollection, WithHeadings, WithStyles, WithMapping, WithColumnWidths
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

        // Add 5 diverse example rows for first 3 institutions
        foreach ($this->institutions->take(3) as $index => $institution) {
            // Example 1: Standard Azerbaijani class
            $examples->push((object)[
                'utis_code' => $institution->utis_code ?? '',
                'institution_code' => $institution->institution_code ?? '',
                'institution_name' => $institution->name,
                'class_full_name' => '1A',
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
            $examples->push((object)[
                'utis_code' => $institution->utis_code ?? '',
                'institution_code' => $institution->institution_code ?? '',
                'institution_name' => $institution->name,
                'class_full_name' => '2B',
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
                $examples->push((object)[
                    'utis_code' => $institution->utis_code ?? '',
                    'institution_code' => $institution->institution_code ?? '',
                    'institution_name' => $institution->name,
                    'class_full_name' => '5A',
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
                $examples->push((object)[
                    'utis_code' => $institution->utis_code ?? '',
                    'institution_code' => $institution->institution_code ?? '',
                    'institution_name' => $institution->name,
                    'class_full_name' => '3C',
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
            $row->class_full_name,
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
            'Sinif Adı (məs: 5A, 7B)',
            'Şagird Sayı',
            'Oğlan Sayı',
            'Qız Sayı',
            'Tədris Dili',
            'Növbə',
            'Tədris Həftəsi',
            'Sinif Rəhbəri (tam ad)',
            'Sinfin Tipi',
            'Profil',
            'Təhsil Proqramı',
            'Tədris İli',
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
            'D' => 20,  // Sinif adı
            'E' => 13,  // Şagird Sayı
            'F' => 12,  // Oğlan Sayı
            'G' => 12,  // Qız Sayı
            'H' => 16,  // Tədris Dili
            'I' => 13,  // Növbə
            'J' => 16,  // Tədris Həftəsi
            'K' => 28,  // Sinif rəhbəri
            'L' => 20,  // Sinfin tipi
            'M' => 20,  // Profil
            'N' => 18,  // Təhsil proqramı
            'O' => 15,  // Tədris ili
        ];
    }

    /**
     * Apply styles to worksheet
     */
    public function styles(Worksheet $sheet)
    {
        try {
            // Header row styling
            $sheet->getStyle('A1:O1')->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => 11,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4472C4'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true,
                ],
            ]);

            // Set row height for header
            $sheet->getRowDimension(1)->setRowHeight(30);

            // Center align specific columns
            $sheet->getStyle('A2:A1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('B2:B1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('D2:D1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('E2:G1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('H2:J1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('O2:O1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Add border to all cells
            $sheet->getStyle('A1:O1000')->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'CCCCCC'],
                    ],
                ],
            ]);

            // Highlight localized columns
            $sheet->getStyle('H1:M1')->applyFromArray([
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2E75B6'], // Darker blue for emphasis
                ],
            ]);

            // Freeze header row
            $sheet->freezePane('A2');
        } catch (\Exception $e) {
            \Log::error('Excel styling error: ' . $e->getMessage());
        }

        return $sheet;
    }
}
