<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Collection;

class TeachersExport implements FromCollection, WithColumnWidths, WithHeadings, WithStyles
{
    public function __construct(private Collection $data) {}

    public function collection(): Collection
    {
        return $this->data;
    }

    public function headings(): array
    {
        return [
            'ID',
            'Ad',
            'Soyad',
            'Email',
            'Rol',
            'Vəzifə',
            'İş Statusu',
            'Telefon',
            'İxtisas',
            'Təcrübə (il)',
            'MİQ Balı',
            'Sertifikasiya Balı',
            'İşə Qəbul Tarixi',
            'Müqavilə Başlama',
            'Müqavilə Bitmə',
            'Status',
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
            'A' => 8,  // ID
            'B' => 15, // Ad
            'C' => 15, // Soyad
            'D' => 30, // Email
            'E' => 15, // Rol
            'F' => 15, // Vəzifə
            'G' => 15, // İş Statusu
            'H' => 18, // Telefon
            'I' => 20, // İxtisas
            'J' => 14, // Təcrübə
            'K' => 12, // MİQ Balı
            'L' => 18, // Sertifikasiya Balı
            'M' => 20, // İşə Qəbul Tarixi
            'N' => 20, // Müqavilə Başlama
            'O' => 20, // Müqavilə Bitmə
            'P' => 10, // Status
        ];
    }
}
