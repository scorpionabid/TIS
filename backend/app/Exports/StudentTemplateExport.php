<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StudentTemplateExport implements FromArray, WithHeadings, WithStyles, WithColumnWidths
{
    public function array(): array
    {
        // Return sample data
        return [
            [
                'Məmməd',
                'Məmmədov',
                'Əli',
                'memmedmemmedov',
                'memmed@example.com',
                '',
                '+994701234567',
                '2010-05-15',
                'male',
                'AZE1234567',
                'şagird',
                '32',
                85.50,
                '№ 145 tam orta məktəb',
                'Bakı şəhəri, Nəsimi rayonu',
                'Əli Məmmədov',
                '+994501234567',
                'ali@example.com',
                '', // UTIS kodu avtomatik yaradılacaq
                'Riyaziyyatda yaxşı nəticələr',
                'active'
            ],
            [
                'Ayşə',
                'İbrahimova',
                'Həsən',
                'ayseibrahimova',
                '', // İxtiyari email
                '',
                '',
                '2011-03-20',
                'female',
                'AZE7654321',
                'şagird',
                '32',
                92.25,
                '', // İxtiyari əvvəlki məktəb
                'Bakı şəhəri, Yasamal rayonu',
                'Zəhra İbrahimova', // İxtiyari valideyn adı
                '+994555555555', // İxtiyari telefon
                'zehra@example.com', // İxtiyari valideyn emaili
                '', // UTIS kodu avtomatik yaradılacaq
                'Dil fənlərində çox bacarıqlıdır',
                'active'
            ]
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
            'institution_id',
            'student_miq_score',
            'previous_school',
            'address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_email',
            'utis_code',
            'notes',
            'status'
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
            'I' => 15, // student_miq_score
            'J' => 25, // previous_school
            'K' => 30, // address
            'L' => 20, // emergency_contact_name
            'M' => 15, // emergency_contact_phone
            'N' => 25, // emergency_contact_email
            'O' => 12, // utis_code
            'P' => 30, // notes
            'Q' => 10, // status
        ];
    }
}