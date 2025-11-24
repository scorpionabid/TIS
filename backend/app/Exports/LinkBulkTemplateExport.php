<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LinkBulkTemplateExport implements FromArray, ShouldAutoSize, WithEvents, WithHeadings, WithStyles
{
    public function headings(): array
    {
        return [
            'link_title',
            'url',
            'description',
            'institution_unique_name',
            'link_type',
        ];
    }

    public function array(): array
    {
        return [
            [
                'Yeni Təhsil Platforması',
                'https://example.com/resource',
                'Platforma haqqında qısa təsvir',
                'Bakı şəhəri 132-134 nömrəli məktəb',
                'external',
            ],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $version = config('link_bulk.template_version');
                $required = implode(', ', config('link_bulk.required_columns', []));
                $sheet->setCellValue('G1', 'Template Version');
                $sheet->setCellValue('G2', $version);
                $sheet->setCellValue('G3', 'Required Columns');
                $sheet->setCellValue('G4', $required);
            },
        ];
    }
}
