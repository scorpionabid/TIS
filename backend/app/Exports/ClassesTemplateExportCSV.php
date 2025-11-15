<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ClassesTemplateExportCSV implements FromArray, WithHeadings, WithColumnFormatting
{
    /**
     * CSV Template with simple headers (no instruction row)
     * UTF-8 encoded, comma-delimited format
     */
    public function headings(): array
    {
        return [
            'UTIS Kod',
            'Müəssisə Adı',
            'Sinif Səviyyəsi',
            'Sinif İndeksi',
            'Şagird Sayı Cəmi',
            'Qız Sayı',
            'Oğlan Sayı',
            'Sinif Müəllimi',
        ];
    }

    /**
     * Sample data row for reference
     */
    public function array(): array
    {
        return [
            // Example row 1
            [
                '12345',           // UTIS Kod
                'Nümunə Məktəb 1', // Müəssisə Adı
                9,                 // Sinif Səviyyəsi (0-12)
                'a',               // Sinif İndeksi (hərf/kod)
                25,                // Şagird Sayı Cəmi
                12,                // Qız Sayı
                13,                // Oğlan Sayı
                'Əli Vəliyev',     // Sinif Müəllimi
            ],
            // Example row 2
            [
                '12345',
                'Nümunə Məktəb 1',
                9,
                'b',
                24,
                13,
                11,
                'Fatimə Məmmədova',
            ],
            // Example row 3 - 0-cu sinif (bağça)
            [
                '12345',
                'Nümunə Məktəb 1',
                0,
                'a',
                20,
                10,
                10,
                'Günel İsmayılova',
            ],
        ];
    }

    /**
     * Column formatting to ensure UTIS code stays as text
     */
    public function columnFormats(): array
    {
        return [
            'A' => NumberFormat::FORMAT_TEXT, // UTIS Kod as text
        ];
    }
}
