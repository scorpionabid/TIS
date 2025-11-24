<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StaffTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    public function array(): array
    {
        return [
            [
                'Aysel',
                'Məmmədova',
                'Əli',
                'ayselmemmedova',
                'aysel.memmedova@edu.az',
                '',
                '+994501234567',
                '1985-05-15',
                'female',
                'AZE1234567',
                'schooladmin',
                '32 (6 nömrəli tam orta məktəb)',
                'İdarə',
                'Bakı şəhəri, Səbail rayonu',
                'Əli Məmmədov',
                '+994701234567',
                'ali.memmedov@example.com',
                '',
                'Təcrübəli administrator',
                'active',
            ],
            [
                'Rəşad',
                'Həsənov',
                'Məmməd',
                'resadhasanov',
                'resad.hasanov@edu.az',
                '',
                '+994551234567',
                '1978-11-22',
                'male',
                'AZE7654321',
                'sektoradmin',
                '26 (Balakən)',
                'Texniki',
                'Bakı şəhəri, Nəsimi rayonu',
                'Leyla Həsənova',
                '+994705555555',
                'leyla.hasanova@example.com',
                '',
                'Texniki sahədə ixtisaslaşmış',
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
            'department',
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
            'D' => 20, // username
            'E' => 25, // email
            'F' => 15, // password
            'G' => 15, // contact_phone
            'H' => 15, // birth_date
            'I' => 10, // gender
            'J' => 15, // national_id
            'K' => 15, // role_id
            'L' => 12, // institution_id
            'M' => 15, // department
            'N' => 30, // address
            'O' => 20, // emergency_contact_name
            'P' => 15, // emergency_contact_phone
            'Q' => 25, // emergency_contact_email
            'R' => 15, // utis_code
            'S' => 30, // notes
            'T' => 10, // status
        ];
    }
}
