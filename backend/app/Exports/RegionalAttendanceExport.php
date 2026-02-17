<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class RegionalAttendanceExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    protected $data;
    protected $filters;

    public function __construct(array $data, array $filters)
    {
        $this->data = $data;
        $this->filters = $filters;
    }

    public function collection()
    {
        return collect($this->data['schools']);
    }

    public function headings(): array
    {
        return [
            'Məktəb ID',
            'Məktəb Adı',
            'Sektor',
            'Şagird Sayı',
            'Hesabat Günləri',
            'Orta Davamiyyət (%)',
            'Status'
        ];
    }

    public function map($school): array
    {
        $status = 'Normal';
        if ($school['reported_days'] === 0) {
            $status = 'Hesabat yoxdur';
        } elseif ($school['average_attendance_rate'] < 85) {
            $status = 'Aşağı davamiyyət';
        }

        return [
            $school['school_id'],
            $school['name'],
            $school['sector_name'] ?? $school['sector_id'],
            $school['total_students'],
            $school['reported_days'] . '/' . $school['expected_school_days'],
            $school['average_attendance_rate'] . '%',
            $status
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
