<?php

namespace App\Exports;

use App\Models\Survey;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * SurveyFlatResponsesExport
 *
 * Flat matrix format: one row per submitted response, one column per question.
 * Column headers use full question titles (not truncated).
 * Only submitted responses are included.
 */
class SurveyFlatResponsesExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    private Survey $survey;

    private array $questions;

    public function __construct(Survey $survey)
    {
        $this->survey = $survey->load(['questions' => function ($q) {
            $q->where('is_active', true)->orderBy('order_index');
        }]);

        $this->questions = $this->survey->questions->toArray();
    }

    public function title(): string
    {
        return mb_substr($this->survey->title, 0, 31);
    }

    public function headings(): array
    {
        $headers = [
            'Müəssisə',
            'Cavab verən',
            'Göndərmə tarixi',
        ];

        foreach ($this->questions as $question) {
            $headers[] = $question['title'] ?? '';
        }

        return $headers;
    }

    public function collection(): Collection
    {
        $responses = $this->survey->responses()
            ->whereIn('status', ['submitted', 'approved'])
            ->with(['institution', 'respondent.profile'])
            ->orderBy('submitted_at')
            ->get();

        return $responses->map(function ($response) {
            $row = [
                $response->institution?->name ?? '',
                $response->respondent?->full_name ?? $response->respondent?->username ?? '',
                $response->submitted_at
                    ? \Carbon\Carbon::parse($response->submitted_at)->format('d.m.Y H:i')
                    : '',
            ];

            $answers = $response->responses ?? [];

            foreach ($this->questions as $question) {
                $questionId = (string) ($question['id'] ?? '');
                $answer = $answers[$questionId] ?? null;
                $row[] = $this->formatAnswer($answer, $question['type'] ?? 'text');
            }

            return $row;
        });
    }

    private function formatAnswer(mixed $answer, string $type): string
    {
        if ($answer === null || $answer === '') {
            return '';
        }

        if (is_array($answer)) {
            return implode(', ', array_map('strval', $answer));
        }

        return (string) $answer;
    }

    public function styles(Worksheet $sheet): array
    {
        $lastCol = $this->columnIndexToLetter(count($this->questions) + 3);
        $lastRow = $sheet->getHighestRow();

        // Header row styling
        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);

        // Row height for header
        $sheet->getRowDimension(1)->setRowHeight(40);

        // Data rows - alternate row colors
        for ($i = 2; $i <= $lastRow; $i++) {
            if ($i % 2 === 0) {
                $sheet->getStyle("A{$i}:{$lastCol}{$i}")->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F0F9FF'],
                    ],
                ]);
            }
        }

        // Freeze header row
        $sheet->freezePane('A2');

        // Auto-filter
        $sheet->setAutoFilter("A1:{$lastCol}1");

        // Borders
        if ($lastRow > 1) {
            $sheet->getStyle("A1:{$lastCol}{$lastRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);
        }

        return [];
    }

    private function columnIndexToLetter(int $index): string
    {
        $letter = '';
        while ($index > 0) {
            $remainder = ($index - 1) % 26;
            $letter = chr(65 + $remainder) . $letter;
            $index = intdiv($index - 1, 26);
        }

        return $letter;
    }
}
