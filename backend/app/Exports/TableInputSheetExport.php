<?php

namespace App\Exports;

use App\Models\SurveyQuestion;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Export sheet for a single table_input question
 * Creates a separate sheet with all responses to this question
 */
class TableInputSheetExport implements FromCollection, WithColumnWidths, WithHeadings, WithStyles, WithTitle
{
    protected SurveyQuestion $question;

    protected Collection $responses;

    protected array $columns;

    public function __construct(SurveyQuestion $question, Collection $responses)
    {
        $this->question = $question;
        $this->responses = $responses;
        $this->columns = $this->getColumns();
    }

    /**
     * Get column configuration from question metadata
     */
    private function getColumns(): array
    {
        $config = $this->question->metadata['table_input'] ?? [];
        $columns = $config['columns'] ?? [];

        // Fallback: if no columns in metadata, use table_headers
        if (empty($columns) && ! empty($this->question->table_headers)) {
            foreach ($this->question->table_headers as $index => $header) {
                $columns[] = [
                    'key' => 'col_' . ($index + 1),
                    'label' => is_string($header) ? $header : ($header['label'] ?? 'Sütun ' . ($index + 1)),
                    'type' => 'text',
                ];
            }
        }

        return $columns;
    }

    public function collection(): Collection
    {
        $rows = collect();

        foreach ($this->responses as $response) {
            $questionId = (string) $this->question->id;
            $tableData = $response->responses[$questionId] ?? [];

            if (! is_array($tableData) || empty($tableData)) {
                continue;
            }

            // Get institution and sector info
            $sectorName = $this->getSectorName($response->institution);
            $institutionName = $response->institution?->name ?? 'N/A';

            // Each row in table_input data becomes a row in Excel
            foreach ($tableData as $rowIndex => $tableRow) {
                if (! is_array($tableRow)) {
                    continue;
                }

                $excelRow = [
                    $sectorName,
                    $institutionName,
                    $rowIndex + 1, // Row number within this response
                ];

                // Add column values
                foreach ($this->columns as $column) {
                    $value = $tableRow[$column['key']] ?? '';
                    // Sanitize for Excel formula injection
                    if (is_string($value) && preg_match('/^[=+\-@]/', $value)) {
                        $value = "'" . $value;
                    }
                    $excelRow[] = $value;
                }

                $rows->push($excelRow);
            }
        }

        return $rows;
    }

    public function headings(): array
    {
        $headings = [
            'Sektor',
            'Müəssisə',
            'Sətir №',
        ];

        foreach ($this->columns as $column) {
            $headings[] = $column['label'] ?? $column['key'];
        }

        return $headings;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'size' => 11],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF10B981'], // Green for table_input sheets
                ],
                'font' => ['color' => ['argb' => 'FFFFFFFF'], 'bold' => true],
            ],
        ];
    }

    public function columnWidths(): array
    {
        $widths = [
            'A' => 25, // Sektor
            'B' => 30, // Müəssisə
            'C' => 10, // Sətir №
        ];

        $columnLetters = range('D', 'Z');
        foreach ($this->columns as $index => $column) {
            if ($index < count($columnLetters)) {
                $width = match ($column['type'] ?? 'text') {
                    'number' => 15,
                    'date' => 15,
                    default => 25,
                };
                $widths[$columnLetters[$index]] = $width;
            }
        }

        return $widths;
    }

    public function title(): string
    {
        // Sheet title - truncate to 31 chars (Excel limit)
        $title = $this->question->title ?? 'Cədvəl Sual ' . $this->question->id;
        $title = strip_tags($title);
        $title = preg_replace('/[\\\\\/\?\*\[\]:]+/', '', $title); // Remove invalid chars

        if (strlen($title) > 31) {
            $title = mb_substr($title, 0, 28) . '...';
        }

        return $title;
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
