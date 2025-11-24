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
                'Hüseyn',
                'nerminaliyeva',
                'nermin.aliyeva@edu.az',
                '',
                '+994701234567',
                '1985-08-12',
                'female',
                'AZE1234567',
                'müəllim',
                '32 (6 nömrəli tam orta məktəb)',
                'Riyaziyyat müəllimi',
                '1,3,5', // Subject IDs (Riyaziyyat, Fizika, Kimya)
                15,
                95.50,
                88.75,
                '2023-05-15',
                'bachelor',
                'Azərbaycan Dövlət Pedaqoji Universiteti',
                2005,
                3.65,
                'Bakı şəhəri, Səbail rayonu',
                'Əli Həsənov',
                '+994501234567',
                'ali.hasanov@example.com',
                '', // UTIS avtomatik yaradılacaq
                'Riyaziyyat və informatika sahəsində ixtisaslaşmış müəllim',
                'active',
            ],
            [
                'Rəşad',
                'Məmmədov',
                'Əli',
                'resadmemmedov',
                'resad.memmedov@edu.az',
                '',
                '+994551234567',
                '1980-12-05',
                'male',
                'AZE7654321',
                'müəllim',
                '34 (7 nömrəli tam orta məktəb)',
                'Tarix müəllimi',
                '7,8', // Subject IDs (Tarix, Coğrafiya)
                20,
                98.25,
                92.00,
                '2024-01-10',
                'master',
                'Bakı Dövlət Universiteti',
                2002,
                3.85,
                'Bakı şəhəri, Nəsimi rayonu',
                'Leyla Məmmədova',
                '+994705555555',
                'leyla.memmedova@example.com',
                '', // UTIS avtomatik yaradılacaq
                'Tarix və coğrafiya sahəsində təcrübəli müəllim',
                'active',
            ],
        ];
    }

    public function headings(): array
    {
        return [
            'first_name',
            'last_name',
            'patronymic',
            'username',
            'email',
            'password',
            'contact_phone',
            'birth_date',
            'gender',
            'national_id',
            'role_id',
            'institution_id (ID və ya "ID (Ad)" formatında)',
            'specialty',
            'subjects', // Comma separated subject IDs
            'experience_years',
            'miq_score',
            'certification_score',
            'last_certification_date',
            'degree_level',
            'graduation_university',
            'graduation_year',
            'university_gpa',
            'address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_email',
            'utis_code',
            'notes',
            'status',
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
            'C' => 15, // patronymic
            'D' => 25, // email
            'E' => 15, // contact_phone
            'F' => 15, // birth_date
            'G' => 10, // gender
            'H' => 15, // national_id
            'I' => 20, // specialty
            'J' => 15, // subjects
            'K' => 12, // experience_years
            'L' => 12, // miq_score
            'M' => 15, // certification_score
            'N' => 18, // last_certification_date
            'O' => 15, // degree_level
            'P' => 25, // graduation_university
            'Q' => 15, // graduation_year
            'R' => 12, // university_gpa
            'S' => 30, // address
            'T' => 20, // emergency_contact_name
            'U' => 15, // emergency_contact_phone
            'V' => 25, // emergency_contact_email
            'W' => 12, // utis_code
            'X' => 30, // notes
            'Y' => 10, // status
        ];
    }
}
