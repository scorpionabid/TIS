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
                'class_level' => 1,
                'class_name' => 'A',
                'student_count' => 25,
                'male_count' => 13,
                'female_count' => 12,
                'specialty' => 'Ümumi',
                'education_program' => 'umumi',
                'grade_type' => 'ümumi',
                'teaching_language' => 'azərbaycan',
                'teaching_week' => '6_günlük',
                'academic_year' => date('Y') . '-' . (date('Y') + 1),
            ]);

            // Example 2: Russian language class
            $examples->push((object)[
                'utis_code' => $institution->utis_code ?? '',
                'institution_code' => $institution->institution_code ?? '',
                'institution_name' => $institution->name,
                'class_level' => 2,
                'class_name' => 'B',
                'student_count' => 24,
                'male_count' => 12,
                'female_count' => 12,
                'specialty' => 'Ümumi',
                'education_program' => 'umumi',
                'grade_type' => 'ümumi',
                'teaching_language' => 'rus',
                'teaching_week' => '6_günlük',
                'academic_year' => date('Y') . '-' . (date('Y') + 1),
            ]);

            // Only add specialized examples for first institution
            if ($index === 0) {
                // Example 3: Specialized math class with 5-day week
                $examples->push((object)[
                    'utis_code' => $institution->utis_code ?? '',
                    'institution_code' => $institution->institution_code ?? '',
                    'institution_name' => $institution->name,
                    'class_level' => 5,
                    'class_name' => 'A',
                    'student_count' => 30,
                    'male_count' => 15,
                    'female_count' => 15,
                    'specialty' => 'Riyaziyyat',
                    'education_program' => 'umumi',
                    'grade_type' => 'ixtisaslaşdırılmış',
                    'teaching_language' => 'azərbaycan',
                    'teaching_week' => '5_günlük',
                    'academic_year' => date('Y') . '-' . (date('Y') + 1),
                ]);

                // Example 4: Special education class
                $examples->push((object)[
                    'utis_code' => $institution->utis_code ?? '',
                    'institution_code' => $institution->institution_code ?? '',
                    'institution_name' => $institution->name,
                    'class_level' => 3,
                    'class_name' => 'C',
                    'student_count' => 12,
                    'male_count' => 7,
                    'female_count' => 5,
                    'specialty' => 'Xüsusi ehtiyac',
                    'education_program' => 'xususi',
                    'grade_type' => 'xüsusi',
                    'teaching_language' => 'azərbaycan',
                    'teaching_week' => '5_günlük',
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
            $row->class_name,
            $row->student_count,
            $row->male_count,
            $row->female_count,
            $row->specialty,
            $row->education_program,
            $row->grade_type,
            $row->teaching_language,
            $row->teaching_week,
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
            'Sinif Hərfi (A,B,C,Ç...)',
            'Şagird Sayı',
            'Oğlan Sayı',
            'Qız Sayı',
            'İxtisas',
            'Təhsil Proqramı',
            'Sinif Növü',
            'Tədris Dili',
            'Tədris Həftəsi',
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
            'D' => 22,  // Sinif Səviyyəsi
            'E' => 22,  // Sinif Hərfi
            'F' => 13,  // Şagird Sayı
            'G' => 12,  // Oğlan Sayı
            'H' => 12,  // Qız Sayı
            'I' => 18,  // İxtisas
            'J' => 18,  // Təhsil Proqramı
            'K' => 18,  // Sinif Növü
            'L' => 16,  // Tədris Dili
            'M' => 16,  // Tədris Həftəsi
            'N' => 15,  // Tədris İli
        ];
    }

    /**
     * Apply styles to worksheet
     */
    public function styles(Worksheet $sheet)
    {
        try {
            // Header row styling
            $sheet->getStyle('A1:N1')->applyFromArray([
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
            $sheet->getStyle('E2:E1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('F2:H1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('J2:M1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Add border to all cells
            $sheet->getStyle('A1:N1000')->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'CCCCCC'],
                    ],
                ],
            ]);

            // Highlight new required columns in light blue
            $sheet->getStyle('J1:M1')->applyFromArray([
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
