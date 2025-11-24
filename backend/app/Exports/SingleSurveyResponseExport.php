<?php

namespace App\Exports;

use App\Models\SurveyResponse;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SingleSurveyResponseExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles, WithTitle
{
    protected SurveyResponse $response;

    public function __construct(SurveyResponse $response)
    {
        $this->response = $response;
    }

    public function array(): array
    {
        $data = [];

        // Basic response information
        $data[] = [
            'Məlumat Tipi' => 'Əsas Məlumat',
            'Sahə' => 'Sorğu',
            'Dəyər' => $this->response->survey->title ?? 'Naməlum',
        ];

        if ($this->response->survey->description) {
            $data[] = [
                'Məlumat Tipi' => 'Əsas Məlumat',
                'Sahə' => 'Sorğu Təsviri',
                'Dəyər' => $this->response->survey->description,
            ];
        }

        $data[] = [
            'Məlumat Tipi' => 'Əsas Məlumat',
            'Sahə' => 'Cavabverən',
            'Dəyər' => $this->response->respondent->name ?? $this->response->respondent->username ?? 'Naməlum',
        ];

        if ($this->response->respondent->email) {
            $data[] = [
                'Məlumat Tipi' => 'Əsas Məlumat',
                'Sahə' => 'E-poçt',
                'Dəyər' => $this->response->respondent->email,
            ];
        }

        $data[] = [
            'Məlumat Tipi' => 'Əsas Məlumat',
            'Sahə' => 'Müəssisə',
            'Dəyər' => $this->response->institution->name ?? 'Naməlum',
        ];

        $data[] = [
            'Məlumat Tipi' => 'Əsas Məlumat',
            'Sahə' => 'Status',
            'Dəyər' => $this->getStatusText($this->response->status),
        ];

        $data[] = [
            'Məlumat Tipi' => 'Əsas Məlumat',
            'Sahə' => 'Tamamlanma Faizi',
            'Dəyər' => $this->response->progress_percentage . '%',
        ];

        $data[] = [
            'Məlumat Tipi' => 'Əsas Məlumat',
            'Sahə' => 'Göndərilmə Tarixi',
            'Dəyər' => $this->response->submitted_at ? Carbon::parse($this->response->submitted_at)->format('d.m.Y H:i') : 'Hələ göndərilməyib',
        ];

        // Empty row separator
        $data[] = ['', '', ''];

        // Question responses
        if ($this->response->survey->questions && count($this->response->survey->questions) > 0) {
            foreach ($this->response->survey->questions as $index => $question) {
                $questionNumber = $index + 1;
                $answer = $this->response->responses[$question->id] ?? null;

                $data[] = [
                    'Məlumat Tipi' => 'Sorğu Cavabı',
                    'Sahə' => "Sual {$questionNumber}: " . ($question->title ?? $question->text ?? $question->question ?? 'Başlıqsız sual'),
                    'Dəyər' => $this->formatAnswer($answer, $question),
                ];

                if ($question->description) {
                    $data[] = [
                        'Məlumat Tipi' => 'Sorğu Cavabı',
                        'Sahə' => '  └─ Açıqlama',
                        'Dəyər' => $question->description,
                    ];
                }
            }
        } else {
            $data[] = [
                'Məlumat Tipi' => 'Sorğu Cavabı',
                'Sahə' => 'Məlumat',
                'Dəyər' => 'Bu sorğuda sual tapılmadı',
            ];
        }

        return $data;
    }

    public function headings(): array
    {
        return [
            'Məlumat Tipi',
            'Sahə',
            'Dəyər',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Header row styling
            1 => [
                'font' => [
                    'bold' => true,
                    'size' => 12,
                    'color' => ['argb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => '0066CC'],
                ],
            ],
            // Basic info rows styling
            'A:A' => [
                'font' => [
                    'bold' => true,
                ],
            ],
            'B:B' => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => '333333'],
                ],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18,  // Məlumat Tipi
            'B' => 40,  // Sahə
            'C' => 60,  // Dəyər
        ];
    }

    public function title(): string
    {
        return 'Sorğu Cavabı #' . $this->response->id;
    }

    protected function getStatusText(string $status): string
    {
        switch ($status) {
            case 'draft': return 'Qaralama';
            case 'in_progress': return 'Davam edir';
            case 'submitted': return 'Göndərilmiş';
            case 'approved': return 'Təsdiqlənmiş';
            case 'rejected': return 'Rədd edilmiş';
            case 'completed': return 'Tamamlanmış';
            default: return $status;
        }
    }

    protected function formatAnswer($answer, $question = null): string
    {
        if ($answer === null || $answer === '') {
            return 'Cavab verilməyib';
        }

        if (is_array($answer)) {
            if ($question && $question->type === 'table_matrix') {
                $formatted = [];
                foreach ($answer as $rowIndex => $rowData) {
                    $rowLabel = isset($question->table_rows[$rowIndex])
                        ? $question->table_rows[$rowIndex]
                        : 'Sətir ' . ($rowIndex + 1);

                    if (is_array($rowData)) {
                        $formatted[] = $rowLabel . ': ' . implode(', ', $rowData);
                    } else {
                        $formatted[] = $rowLabel . ': ' . $rowData;
                    }
                }

                return implode(' | ', $formatted);
            }

            return implode(', ', $answer);
        }

        return (string) $answer;
    }
}
