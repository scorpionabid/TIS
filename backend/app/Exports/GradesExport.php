<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Collection;

class GradesExport implements FromCollection, WithColumnWidths, WithHeadings, WithStyles
{
    public function __construct(private Collection $data) {}

    public function collection(): Collection
    {
        return $this->data;
    }

    public function headings(): array
    {
        return [
            'Sinif',
            'Sinif Səviyyəsi',
            'Şagirdlər',
            'Oğlan',
            'Qız',
            'Növbə',
            'Təhsil Proqramı',
            'Profil',
            'Dərs yükü (saat)',
            'Dərsdənkənar (saat)',
            'Dərnək (saat)',
            'Sinif Rəhbəri',
            'Təhsil İli',
            'Məktəb',
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
            'A' => 14, // Sinif
            'B' => 16, // Sinif Səviyyəsi
            'C' => 12, // Şagirdlər
            'D' => 10, // Oğlan
            'E' => 10, // Qız
            'F' => 14, // Növbə
            'G' => 20, // Təhsil Proqramı
            'H' => 16, // Profil
            'I' => 18, // Dərs yükü
            'J' => 20, // Dərsdənkənar
            'K' => 16, // Dərnək
            'L' => 28, // Sinif Rəhbəri
            'M' => 14, // Təhsil İli
            'N' => 32, // Məktəb
        ];
    }
}
