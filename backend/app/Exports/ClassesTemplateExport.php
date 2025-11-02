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

        // Add 3 example rows for first 3 institutions
        foreach ($this->institutions->take(3) as $index => $institution) {
            // Example 1: Class A
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
                'grade_category' => 'ümumi',
                'education_program' => 'umumi',
                'academic_year' => date('Y') . '-' . (date('Y') + 1),
            ]);

            // Example 2: Class B
            $examples->push((object)[
                'utis_code' => $institution->utis_code ?? '',
                'institution_code' => $institution->institution_code ?? '',
                'institution_name' => $institution->name,
                'class_level' => 1,
                'class_name' => 'B',
                'student_count' => 24,
                'male_count' => 12,
                'female_count' => 12,
                'specialty' => 'Ümumi',
                'grade_category' => 'ümumi',
                'education_program' => 'umumi',
                'academic_year' => date('Y') . '-' . (date('Y') + 1),
            ]);

            // Only add 2 examples for first institution
            if ($index === 0) {
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
                    'grade_category' => 'ixtisaslaşdırılmış',
                    'education_program' => 'umumi',
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
            $row->grade_category,
            $row->education_program,
            $row->academic_year,
        ];
    }

    /**
     * Column headings
     */
    public function headings(): array
    {
        return [
            'UTIS Kod',
            'Müəssisə Kodu',
            'Müəssisə Adı',
            'Sinif Səviyyəsi (1-12)',
            'Sinif Adı (A,B,C...)',
            'Şagird Sayı',
            'Oğlan Sayı',
            'Qız Sayı',
            'İxtisas',
            'Kateqoriya',
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
            'A' => 12, // UTIS Kod
            'B' => 15, // Müəssisə Kodu
            'C' => 30, // Müəssisə Adı
            'D' => 20, // Sinif Səviyyəsi
            'E' => 18, // Sinif Adı
            'F' => 12, // Şagird Sayı
            'G' => 12, // Oğlan Sayı
            'H' => 12, // Qız Sayı
            'I' => 20, // İxtisas
            'J' => 20, // Kateqoriya
            'K' => 18, // Təhsil Proqramı
            'L' => 15, // Tədris İli
        ];
    }

    /**
     * Apply styles to worksheet
     */
    public function styles(Worksheet $sheet)
    {
        try {
            // Header row styling
            $sheet->getStyle('A1:L1')->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => 12,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4472C4'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);

            // Set row height for header
            $sheet->getRowDimension(1)->setRowHeight(25);

            // Center align specific columns
            $sheet->getStyle('A2:A1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('B2:B1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('D2:D1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('E2:E1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('F2:H1000')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Add border to all cells
            $sheet->getStyle('A1:L1000')->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'CCCCCC'],
                    ],
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
