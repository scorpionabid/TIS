<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StaffTemplateExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    /**
     * Return example rows for different roles
     */
    public function array(): array
    {
        return [
            [
                'Aysel',
                'Məmmədova',
                'Əli',
                'aysel.admin',
                'aysel.admin@edu.az',
                '',
                '+994501234567',
                '1985-05-15',
                'female',
                'AZE1234567',
                'schooladmin', // Məktəb Admini
                '32',
                'İdarə',
                'Bakı şəhəri, Səbail rayonu',
                'Əli Məmmədov',
                '+994701234567',
                'ali.memmedov@example.com',
                '1000001', // UTIS
                'Məktəb üzrə baş administrator',
                'active',
            ],
            [
                'Rəşad',
                'Həsənov',
                'Məmməd',
                'resad.muavin',
                'resad.muavin@edu.az',
                '',
                '+994551234567',
                '1978-11-22',
                'male',
                'AZE7654321',
                'muavin', // Müavin
                '32',
                'Tədris işləri',
                'Bakı şəhəri, Nəsimi rayonu',
                'Leyla Həsənova',
                '+994705555555',
                'leyla.hasanova@example.com',
                '1000002', // UTIS
                'Tədris işləri üzrə direktor müavini',
                'active',
            ],
            [
                'Tural',
                'Məmmədov',
                'Kamil',
                'tural.operator',
                'tural.operator@edu.az',
                '',
                '+994502223344',
                '1990-04-12',
                'male',
                'AZE1112223',
                'regionoperator', // Region Operatoru
                '32',
                'İnformasiya',
                'Sumqayıt şəhəri',
                'Kamil Məmmədov',
                '+994501112233',
                '',
                '1000003', // UTIS
                'Region üzrə sistem operatoru',
                'active',
            ],
            [
                'Vüsal',
                'Əliyev',
                'Həsən',
                'vusal.sektor',
                'vusal.sektor@edu.az',
                '',
                '+994553334455',
                '1982-08-20',
                'male',
                'AZE3334445',
                'sektoradmin', // Sektor Admini
                '32',
                'Sektor',
                'Gəncə şəhəri',
                'Həsən Əliyev',
                '+994552223344',
                '',
                '1000004', // UTIS
                'Təhsil sektoru üzrə inzibatçı',
                'active',
            ],
            [
                'Leyla',
                'Qasımova',
                'Oqtay',
                'leyla.preschool',
                'leyla.preschool@edu.az',
                '',
                '+994504445566',
                '1987-12-05',
                'female',
                'AZE4445556',
                'preschooladmin', // Məktəbəqədər Admin
                '32',
                'Məktəbəqədər',
                'Lənkəran şəhəri',
                'Oqtay Qasımov',
                '+994503334455',
                '',
                '1000005', // UTIS
                'Məktəbəqədər müəssisə rəhbəri',
                'active',
            ],
            [
                'Nigar',
                'Vəliyeva',
                'Anar',
                'nigar.muellim',
                'nigar.muellim@edu.az',
                '',
                '+994509998877',
                '1988-02-10',
                'female',
                'AA1122334',
                'müəllim', // Müəllim (Həmçinin 'teacher' yazıla bilər)
                '32',
                'Tədris',
                'Bakı şəhəri',
                'Anar Vəliyev',
                '+994514443322',
                '',
                '1000006', // UTIS
                'Fənn müəllimi',
                'active',
            ],
            [
                'Həsən',
                'Quliyev',
                'Musa',
                'hasan.teskilatci',
                'hasan.teskilatci@edu.az',
                '',
                '+994552221100',
                '1984-03-25',
                'male',
                'AA9988776',
                'təşkilatçı', // Təşkilatçı
                '32',
                'Tərbiyə',
                'Şəki şəhəri',
                'Musa Quliyev',
                '+994701112233',
                '',
                '1000007', // UTIS
                'Məktəbdən kənar tərbiyə işləri üzrə təşkilatçı',
                'active',
            ],
            [
                'Samir',
                'Əliyev',
                'Zaur',
                'samir.tesarrufat',
                'samir.tesarrufat@edu.az',
                '',
                '+994503332211',
                '1980-09-05',
                'male',
                'AA5544332',
                'tesarrufat', // Təsərrüfat müdiri
                '32',
                'Təsərrüfat',
                'Bakı şəhəri',
                'Zaur Əliyev',
                '+994556667788',
                '',
                '1000008', // UTIS
                'Təsərrüfat işləri üzrə müdir',
                'active',
            ],
            [
                'Gülnar',
                'Hüseynova',
                'Elçin',
                'gulnar.psixoloq',
                'gulnar.psixoloq@edu.az',
                '',
                '+994556781234',
                '1991-07-18',
                'female',
                'AA3312456',
                'psixoloq', // Məktəb psixoloqu
                '32',
                'Psixoloji xidmət',
                'Bakı şəhəri, Binəqədi rayonu',
                'Elçin Hüseynov',
                '+994509876543',
                '',
                '1000009', // UTIS
                'Şagird psixoloji dəstək mütəxəssisi',
                'active',
            ],
        ];
    }

    /**
     * Column headers (Technical keys for the importer)
     */
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

    /**
     * Style the header row
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 12], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }

    /**
     * Set column widths for better readability
     */
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
            'L' => 15, // institution_id
            'M' => 20, // department
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
