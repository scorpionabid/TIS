<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SummaryReportExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles, WithTitle
{
    protected $reportData;

    public function __construct(array $reportData)
    {
        $this->reportData = $reportData;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return collect($this->reportData['rows']);
    }

    /**
     * Define the headings for the Excel file
     */
    public function headings(): array
    {
        $baseHeadings = [
            'Məktəb',
            'Region',
            'Sinif',
            'Fənn',
            'Şagird Sayı',
            'İştirakçı Sayı',
            'İştirak %',
        ];

        // Add result field headings
        $fieldHeadings = collect($this->reportData['fields'])->map(function ($field) {
            return $field['label'];
        })->toArray();

        return array_merge($baseHeadings, $fieldHeadings, ['Tarix']);
    }

    /**
     * Map each row data
     */
    public function map($row): array
    {
        $studentCount = $row['student_count'] ?? 0;
        $participantCount = $row['participant_count'] ?? 0;
        $participationRate = $studentCount > 0
            ? round(($participantCount / $studentCount) * 100, 1)
            : 0;

        $baseData = [
            $row['institution_name'] ?? '-',
            $row['region_name'] ?? '-',
            $row['class_label'] ?? '-',
            $row['subject'] ?? '-',
            $studentCount,
            $participantCount,
            $participationRate . '%',
        ];

        // Add result field values
        $fieldValues = collect($this->reportData['fields'])->map(function ($field) use ($row) {
            return $row['metadata'][$field['key']] ?? '-';
        })->toArray();

        $recordedAt = ! empty($row['recorded_at'])
            ? \Carbon\Carbon::parse($row['recorded_at'])->format('d.m.Y H:i')
            : '-';

        return array_merge($baseData, $fieldValues, [$recordedAt]);
    }

    /**
     * Apply styles to the worksheet
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 12],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E2E8F0'],
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }

    /**
     * Sheet title
     */
    public function title(): string
    {
        return 'Hesabat';
    }
}
