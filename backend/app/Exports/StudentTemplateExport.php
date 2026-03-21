<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StudentTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    public function array(): array
    {
        // Return sample data
        return [
            [
                'first_name' => 'Əhməd',
                'last_name' => 'Məmmədov',
                'utis_code' => '1234567',
                'date_of_birth' => '2010-05-15',
                'gender' => 'male',
                'enrollment_date' => '2024-09-15',
                'grade_name' => '5-A',
            ],
            [
                'first_name' => 'Leyla',
                'last_name' => 'Həsənova',
                'utis_code' => '7654321',
                'date_of_birth' => '2011-03-20',
                'gender' => 'female',
                'enrollment_date' => '2024-09-15',
                'grade_name' => '4-B',
            ],
        ];
    }

    public function headings(): array
    {
        return [
            'first_name',      // Ad
            'last_name',       // Soyad
            'utis_code',       // UTİS Kod
            'date_of_birth',   // Doğum tarixi
            'gender',          // Cins (male/female)
            'enrollment_date', // Qeydiyyat tarixi
            'grade_name',      // Sinif adı
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 12]],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15, // first_name
            'B' => 15, // last_name
            'C' => 15, // utis_code
            'D' => 15, // date_of_birth
            'E' => 10, // gender
            'F' => 20, // enrollment_date
            'G' => 15, // grade_name
        ];
    }
}
