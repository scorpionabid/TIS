<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Collection;

class NonRespondingInstitutionsExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function __construct(
        private readonly array  $institutions,
        private readonly string $surveyTitle,
    ) {}

    public function collection(): Collection
    {
        return collect($this->institutions)->map(function (array $inst, int $i): array {
            return [
                $i + 1,
                $inst['name']        ?? '',
                $inst['parent_name'] ?? '',
                $inst['type']        ?? '',
                $inst['targeted_users']  ?? 0,
                $inst['responded_users'] ?? 0,
                isset($inst['response_rate'])
                    ? round($inst['response_rate'], 1) . '%'
                    : '0%',
                $inst['response_status'] === 'no_response' ? 'Heç cavab yoxdur' : 'Qismən cavab',
                $inst['last_activity'] ?? '-',
            ];
        });
    }

    public function headings(): array
    {
        return [
            '№',
            'Məktəb adı',
            'Sektor / Region',
            'Növ',
            'Hədəf istifadəçi',
            'Cavab sayı',
            'Cavab faizi',
            'Status',
            'Son aktivlik',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'size' => 11],
                'fill'      => ['fillType' => 'solid', 'startColor' => ['rgb' => 'DBEAFE']],
                'alignment' => ['horizontal' => 'center'],
            ],
        ];
    }

    public function title(): string
    {
        return 'Doldurmayan Məktəblər';
    }
}
