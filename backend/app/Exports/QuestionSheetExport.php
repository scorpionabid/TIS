<?php

namespace App\Exports;

use App\Models\SurveyQuestion;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Export sheet for a single non-table_input question.
 * Structure:
 *   Row 1: Full question title (merged A1:C1)
 *   Row 2: Headings — Sektor | Müəssisə | Cavab
 *   Row 3+: One row per survey response
 */
class QuestionSheetExport implements FromCollection, WithColumnWidths, WithCustomStartCell, WithHeadings, WithStyles, WithTitle
{
    protected SurveyQuestion $question;

    protected Collection $responses;

    public function __construct(SurveyQuestion $question, Collection $responses)
    {
        $this->question = $question;
        $this->responses = $responses;
    }

    /**
     * Start data (headings + rows) from A2, leaving row 1 for the full title.
     */
    public function startCell(): string
    {
        return 'A2';
    }

    public function collection(): Collection
    {
        $rows = collect();
        $questionId = (string) $this->question->id;

        foreach ($this->responses as $response) {
            $sectorName = $this->getSectorName($response->institution);
            $institutionName = $response->institution?->name ?? 'N/A';
            $answer = $response->responses[$questionId] ?? null;

            $rows->push([$sectorName, $institutionName, $this->formatAnswer($answer)]);
        }

        return $rows;
    }

    public function headings(): array
    {
        return ['Sektor', 'Müəssisə', 'Cavab'];
    }

    public function styles(Worksheet $sheet)
    {
        // --- Row 1: Full question title (merged A1:C1) ---
        $sheet->mergeCells('A1:C1');
        $sheet->setCellValue('A1', strip_tags($this->question->title ?? ''));
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FF1E3A5F']],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFE8F0FE'],
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(24);

        // --- Freeze title + headings rows (scroll starts at row 3) ---
        $sheet->freezePane('A3');

        // --- AutoFilter on headings row ---
        $lastRow = $sheet->getHighestRow();
        $sheet->setAutoFilter("A2:C{$lastRow}");

        // Row 2 = headings (blue)
        return [
            2 => [
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF3B82F6'],
                ],
                'font' => ['color' => ['argb' => 'FFFFFFFF'], 'bold' => true, 'size' => 11],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 25, // Sektor
            'B' => 30, // Müəssisə
            'C' => 50, // Cavab
        ];
    }

    public function title(): string
    {
        $title = strip_tags($this->question->title ?? 'Sual ' . $this->question->id);
        $title = preg_replace('/[\\\\\/\?\*\[\]:]+/', '', $title);

        return strlen($title) > 31 ? mb_substr($title, 0, 28) . '...' : $title;
    }

    /**
     * Format the answer value based on question type.
     */
    private function formatAnswer(mixed $answer): string
    {
        if ($answer === null || $answer === '') {
            return '—';
        }

        if (is_array($answer)) {
            // table_matrix: "Sətir1: val1, val2 | Sətir2: val3, val4"
            if ($this->question->type === 'table_matrix') {
                $tableRows = $this->question->table_rows ?? [];
                $formatted = [];
                foreach ($answer as $rowIndex => $rowData) {
                    $label = $tableRows[$rowIndex] ?? ('Sətir ' . ($rowIndex + 1));
                    $formatted[] = $label . ': ' . (is_array($rowData) ? implode(', ', $rowData) : $rowData);
                }

                return implode(' | ', $formatted);
            }

            // multiple_choice / checkbox
            return implode(', ', array_map('strval', $answer));
        }

        return (string) $answer;
    }

    private function getSectorName($institution): string
    {
        if (! $institution) {
            return 'N/A';
        }
        if ($institution->level == 4) {
            return $institution->parent?->name ?? 'N/A';
        }
        if ($institution->level == 3) {
            return $institution->name;
        }

        return 'N/A';
    }
}
