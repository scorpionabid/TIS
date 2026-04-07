<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeacherTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    public function array(): array
    {
        return [
            [
                'Nərmin',
                'Əliyeva',
                'nermin.aliyeva@edu.az',
                '+994701234567',
                '1985-08-12',
                'female',
                'müəllim',
                'Riyaziyyat şöbəsi',
                'Bakı şəhəri, Səbail rayonu',
                'Ali təhsil - Azərbaycan Dövlət Pedaqoji Universiteti, 2005',
                '15 il pedaqoji iş stajı',
                '', // UTIS avtomatik yaradılacaq
            ],
            [
                'Rəşad',
                'Məmmədov',
                'resad.memmedov@edu.az',
                '+994551234567',
                '1980-12-05',
                'male',
                'muavin',
                'Tarix şöbəsi',
                'Bakı şəhəri, Nəsimi rayonu',
                'Magistr - Bakı Dövlət Universiteti, 2002',
                '20 il pedaqoji iş stajı',
                '', // UTIS avtomatik yaradılacaq
            ],
        ];
    }

    public function headings(): array
    {
        return [
            'first_name',      // Ad (məcburi)
            'last_name',       // Soyad (məcburi)
            'email',           // Email (məcburi, unikal)
            'phone',           // Telefon
            'date_of_birth',   // Doğum tarixi (YYYY-MM-DD)
            'gender',          // Cins (male/female)
            'position',        // Vəzifə (müəllim/muavin/təşkilatçı/psixoloq/tesarrufat)
            'department_name', // Şöbə adı
            'address',         // Ünvan
            'education',       // Təhsil
            'experience',      // Təcrübə
            'utis_code',       // UTİS kodu (7 simvol, boş buraxıla bilər)
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
            'C' => 30, // email
            'D' => 18, // phone
            'E' => 18, // date_of_birth
            'F' => 10, // gender
            'G' => 20, // position
            'H' => 20, // department_name
            'I' => 30, // address
            'J' => 35, // education
            'K' => 25, // experience
            'L' => 15, // utis_code
        ];
    }
}
