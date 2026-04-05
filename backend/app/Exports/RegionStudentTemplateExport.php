<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class RegionStudentTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    public function headings(): array
    {
        return [
            'utis_code',      // UTİS Kodu (əsas identifikator)
            'first_name',     // Ad
            'last_name',      // Soyad
            'school_id',      // Məktəb ID (API-dən alınan rəqəm)
            'grade_level',    // Sinif səviyyəsi (1-12)
            'class_name',     // Sinif bölməsi (A, B, C ...)
            'gender',         // Cins (male/female)
            'birth_date',     // Doğum tarixi (YYYY-MM-DD)
            'parent_name',    // Valideyn adı
            'parent_phone',   // Valideyn telefon
        ];
    }

    public function array(): array
    {
        return [
            [
                'utis_code'   => '1234567890',
                'first_name'  => 'Əhməd',
                'last_name'   => 'Məmmədov',
                'school_id'   => 101,
                'grade_level' => 5,
                'class_name'  => 'A',
                'gender'      => 'male',
                'birth_date'  => '2014-05-15',
                'parent_name' => 'Kamran Məmmədov',
                'parent_phone'=> '+994501234567',
            ],
            [
                'utis_code'   => '9876543210',
                'first_name'  => 'Leyla',
                'last_name'   => 'Həsənova',
                'school_id'   => 101,
                'grade_level' => 4,
                'class_name'  => 'B',
                'gender'      => 'female',
                'birth_date'  => '2015-03-20',
                'parent_name' => 'Rəna Həsənova',
                'parent_phone'=> '+994557654321',
            ],
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        // Header row: bold + light blue background
        $sheet->getStyle('A1:J1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 11],
            'fill'      => [
                'fillType'   => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'DBEAFE'],
            ],
            'alignment' => ['horizontal' => 'center'],
        ]);

        // Add comment / note to header row describing each column
        $notes = [
            'A' => 'Məcburi. Şagirdin unikal UTİS kodu.',
            'B' => 'Məcburi. Şagirdin adı.',
            'C' => 'Məcburi. Şagirdin soyadı.',
            'D' => 'Məcburi. Məktəbin ID rəqəmi (filter-options API-sindən alın).',
            'E' => 'Məcburi. Sinif səviyyəsi (1-12 arasında rəqəm).',
            'F' => 'Məcburi. Sinif bölməsi (A, B, C, D ...).',
            'G' => 'İxtiyari. male / female.',
            'H' => 'İxtiyari. YYYY-MM-DD formatında.',
            'I' => 'İxtiyari.',
            'J' => 'İxtiyari. Nümunə: +994501234567.',
        ];

        foreach ($notes as $col => $note) {
            $sheet->getComment("{$col}1")->getText()->createTextRun($note);
        }

        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18, // utis_code
            'B' => 15, // first_name
            'C' => 15, // last_name
            'D' => 12, // school_id
            'E' => 12, // grade_level
            'F' => 12, // class_name
            'G' => 10, // gender
            'H' => 16, // birth_date
            'I' => 20, // parent_name
            'J' => 18, // parent_phone
        ];
    }
}
