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
                'first_name' => 'Məmməd',
                'last_name' => 'Məmmədov',
                'patronymic' => 'Əli',
                'username' => 'memmedmemmedov',
                'email' => 'memmed@example.com',
                'password' => '',
                'contact_phone' => '+994701234567',
                'birth_date' => '2010-05-15',
                'gender' => 'male',
                'national_id' => 'AZE1234567',
                'role_id' => 'şagird',
                'institution_id' => '32 (6 nömrəli tam orta məktəb)',
                'student_miq_score' => 85.50,
                'previous_school' => '№ 145 tam orta məktəb',
                'address' => 'Bakı şəhəri, Nəsimi rayonu',
                'emergency_contact_name' => 'Əli Məmmədov',
                'emergency_contact_phone' => '+994501234567',
                'emergency_contact_email' => 'ali@example.com',
            ],
            [
                'first_name' => 'Ayşə',
                'last_name' => 'İbrahimova',
                'patronymic' => 'Həsən',
                'username' => 'ayseibrahimova',
                'email' => '',
                'password' => '',
                'contact_phone' => '',
                'birth_date' => '2011-03-20',
                'gender' => 'female',
                'national_id' => 'AZE7654321',
                'role_id' => 'şagird',
                'institution_id' => '35 (8 nömrəli tam orta məktəb)',
                'student_miq_score' => 92.25,
                'previous_school' => '',
                'address' => 'Bakı şəhəri, Yasamal rayonu',
                'emergency_contact_name' => 'Zəhra İbrahimova',
                'emergency_contact_phone' => '+994555555555',
                'emergency_contact_email' => 'zehra@example.com',
            ],
        ];
    }

    public function headings(): array
    {
        return [
            'first_name',      // Ad
            'last_name',       // Soyad
            'patronymic',      // Ata adı
            'username',        // İstifadəçi adı
            'email',           // Email
            'password',        // Şifrə
            'contact_phone',   // Telefon
            'birth_date',      // Doğum tarixi
            'gender',          // Cins
            'national_id',     // Şəxsiyyət vəsiqəsi
            'role_id',         // Rol
            'institution_id',  // Qurum ID
            'student_miq_score',
            'previous_school',
            'address',         // Ünvan
            'emergency_contact_name',   // Təcili əlaqə (Ad)
            'emergency_contact_phone',  // Təcili əlaqə (Telefon)
            'emergency_contact_email',  // Təcili əlaqə (Email)
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
            'D' => 20, // username
            'E' => 25, // email
            'F' => 15, // password
            'G' => 15, // contact_phone
            'H' => 15, // birth_date
            'I' => 10, // gender
            'J' => 15, // national_id
            'K' => 10, // role_id
            'L' => 35, // institution_id
            'M' => 15, // student_miq_score
            'N' => 25, // previous_school
            'O' => 30, // address
            'P' => 20, // emergency_contact_name
            'Q' => 15, // emergency_contact_phone
            'R' => 25, // emergency_contact_email
        ];
    }
}
