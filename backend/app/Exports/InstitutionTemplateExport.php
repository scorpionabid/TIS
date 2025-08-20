<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InstitutionTemplateExport implements FromArray, WithHeadings, WithStyles, WithColumnWidths
{
    public function array(): array
    {
        return [
            [
                '2 nömrəli tam orta məktəb',
                'BSTI-M002',
                'secondary_school',
                'Bakı Şəhər Təhsil İdarəsi',
                'BA',
                'BSTI-M002',
                '+994 12 000-00-01',
                'bsti_m002@edu.gov.az',
                'Bakı',
                'Bakı şəhəri, Nəsimi rayonu, Azadlıq prospekti 123',
                600,
                35,
                2010,
                '2010-09-01',
                '12345678'
            ],
            [
                '15 nömrəli uşaq bağçası',
                'BSTI-KG015',
                'kindergarten',
                'Bakı Şəhər Təhsil İdarəsi',
                'BA',
                'BSTI-KG015',
                '+994 12 000-00-15',
                'bsti_kg015@edu.gov.az',
                'Bakı',
                'Bakı şəhəri, Yasamal rayonu, Həsən bəy Zərdabi küçəsi 45',
                120,
                15,
                2005,
                '2005-09-01',
                '' // UTIS avtomatik yaradılacaq
            ]
        ];
    }

    public function headings(): array
    {
        return [
            'name',
            'short_name',
            'type',
            'parent_name',
            'region_code',
            'institution_code',
            'phone',
            'email',
            'region',
            'address',
            'student_capacity',
            'staff_count',
            'founded_year',
            'established_date',
            'utis_code'
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
            'A' => 30, // name
            'B' => 15, // short_name
            'C' => 18, // type
            'D' => 25, // parent_name
            'E' => 12, // region_code
            'F' => 15, // institution_code
            'G' => 15, // phone
            'H' => 25, // email
            'I' => 15, // region
            'J' => 40, // address
            'K' => 15, // student_capacity
            'L' => 12, // staff_count
            'M' => 12, // founded_year
            'N' => 15, // established_date
            'O' => 12, // utis_code
        ];
    }
}