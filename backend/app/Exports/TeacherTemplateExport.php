<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeacherTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    /**
     * Return example rows for teacher roles
     */
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
                'müəllim', // Əsas vəzifə
                'Riyaziyyat şöbəsi',
                'Bakı şəhəri, Səbail rayonu',
                'Ali təhsil - Azərbaycan Dövlət Pedaqoji Universiteti, 2005',
                '15 il pedaqoji iş stajı',
                '1234567', // UTIS kodu (Məcburi)
            ],
            [
                'Rəşad',
                'Məmmədov',
                'resad.memmedov@edu.az',
                '+994551234567',
                '1980-12-05',
                'male',
                'muavin', // Direktor müavini kimi müəllim
                'Tarix şöbəsi',
                'Bakı şəhəri, Nəsimi rayonu',
                'Magistr - Bakı Dövlət Universiteti, 2002',
                '20 il pedaqoji iş stajı',
                '2345678', // UTIS kodu (Məcburi)
            ],
            [
                'Zaur',
                'Hüseynov',
                'zaur.huseynov@edu.az',
                '+994503332211',
                '1982-04-15',
                'male',
                'təşkilatçı', // Təşkilatçı rolunda müəllim
                'Təsviri incəsənət',
                'Bakı şəhəri, Yasamal rayonu',
                'Ali təhsil',
                '12 il staj',
                '7654321',
            ],
            [
                'Leyla',
                'Qasımova',
                'leyla.qasimova@edu.az',
                '+994557778899',
                '1990-11-20',
                'female',
                'psixoloq', // Məktəb psixoloqu
                'Psixoloji xidmət',
                'Bakı şəhəri, Xətai rayonu',
                'Magistr (Psixologiya)',
                '8 il staj',
                '3456789',
            ],
        ];
    }

    /**
     * Column headers (Technical keys for the importer)
     */
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
            'education',       // Təhsil məlumatı
            'experience',      // İş təcrübəsi
            'utis_code',       // UTİS kodu (7 simvol)
        ];
    }

    /**
     * Style the header row
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 12], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'E9F5FF']]],
        ];
    }

    /**
     * Set column widths
     */
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
