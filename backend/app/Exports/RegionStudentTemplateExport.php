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
            'utis_code',            // UTİS Kodu (Şagirdin əsas identifikatoru)
            'first_name',           // Ad
            'last_name',            // Soyad
            'school_utis_code',     // Məktəbin UTİS kodu
            'school_name',          // Məktəbin adı (ixtiyari, vizual kömək üçün)
            'grade_level',          // Sinif səviyyəsi (1-12)
            'class_name',           // Sinif bölməsi (A, B, C ...)
            'gender',               // Cins (male/female)
            'birth_date',           // Doğum tarixi (YYYY-MM-DD)
            'parent_name',          // Valideyn adı
            'parent_phone',         // Valideyn telefon
        ];
    }

    public function array(): array
    {
        return [
            [
                'utis_code'        => '1234567890',
                'first_name'       => 'Əhməd',
                'last_name'        => 'Məmmədov',
                'school_utis_code' => '1000001',
                'school_name'      => 'Bakı ş. 1 saylı məktəb',
                'grade_level'      => 5,
                'class_name'       => 'A',
                'gender'           => 'male',
                'birth_date'       => '2014-05-15',
                'parent_name'      => 'Kamran Məmmədov',
                'parent_phone'     => '+994501234567',
            ],
            [
                'utis_code'        => '9876543210',
                'first_name'       => 'Leyla',
                'last_name'        => 'Həsənova',
                'school_utis_code' => '1000001',
                'school_name'      => 'Bakı ş. 1 saylı məktəb',
                'grade_level'      => 4,
                'class_name'       => 'B',
                'gender'           => 'female',
                'birth_date'       => '2015-03-20',
                'parent_name'      => 'Rəna Həsənova',
                'parent_phone'     => '+994557654321',
            ],
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        // Header row: bold + light blue background
        $sheet->getStyle('A1:K1')->applyFromArray([
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
            'D' => 'Məcburi. Məktəbin 7 rəqəmli unikal UTİS kodu.',
            'E' => 'İxtiyari. Məktəbin adı (məlumat üçün).',
            'F' => 'Məcburi. Sinif səviyyəsi (1-12 arasında rəqəm).',
            'G' => 'Məcburi. Sinif bölməsi (A, B, C, D ...).',
            'H' => 'İxtiyari. male / female.',
            'I' => 'İxtiyari. YYYY-MM-DD formatında.',
            'J' => 'İxtiyari.',
            'K' => 'İxtiyari. Nümunə: +994501234567.',
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
            'D' => 18, // school_utis_code
            'E' => 25, // school_name
            'F' => 12, // grade_level
            'G' => 12, // class_name
            'H' => 10, // gender
            'I' => 16, // birth_date
            'J' => 20, // parent_name
            'K' => 18, // parent_phone
        ];
    }
}
