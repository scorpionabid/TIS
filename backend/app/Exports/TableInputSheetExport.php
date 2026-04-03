<?php

namespace App\Exports;

use App\Models\SurveyQuestion;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Export sheet for a single table_input question.
 * Structure:
 *   Row 1: Full question title (merged across all columns)
 *   Row 2: Headings — Sektor | Müəssisə | Sətir № | col1 | col2 | ...
 *   Row 3+: One row per table_input data row per response
 */
class TableInputSheetExport implements FromCollection, WithColumnFormatting, WithColumnWidths, WithCustomStartCell, WithHeadings, WithStyles, WithTitle
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

                // Add column values with proper type casting
                foreach ($this->columns as $column) {
                    $value = $tableRow[$column['key']] ?? '';
                    $type = $column['type'] ?? 'text';

                    if ($value !== '' && $value !== null) {
                        if ($type === 'number' && is_numeric($value)) {
                            // PHP numeric → Excel numeric cell (enables SUM, AVERAGE etc.)
                            $value = str_contains((string) $value, '.') ? (float) $value : (int) $value;
                        } elseif ($type === 'date') {
                            try {
                                // PHP DateTime → Excel serial number (enables date filtering)
                                $value = ExcelDate::PHPToExcel(Carbon::parse($value));
                            } catch (\Exception $e) {
                                // Keep as string if parse fails
                            }
                        }
                    }

                    // Formula injection protection — only for remaining strings
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
        // --- Row 1: Full question title (merged across all columns) ---
        $lastCol = Coordinate::stringFromColumnIndex(3 + count($this->columns));
        $sheet->mergeCells("A1:{$lastCol}1");
        $sheet->setCellValue('A1', strip_tags($this->question->title ?? ''));
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FF065F46']],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFD1FAE5'], // Light green
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(24);

        // --- Freeze title + headings rows (scroll starts at row 3) ---
        $sheet->freezePane('A3');

        // --- AutoFilter on headings row ---
        $lastRow = $sheet->getHighestRow();
        $sheet->setAutoFilter("A2:{$lastCol}{$lastRow}");

        // Row 2 = headings (green)
        return [
            2 => [
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF10B981'],
                ],
                'font' => ['color' => ['argb' => 'FFFFFFFF'], 'bold' => true, 'size' => 11],
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

        // A=1, B=2, C=3 → ilk dinamik sütun D=4; Coordinate::stringFromColumnIndex limitsizdir
        foreach ($this->columns as $index => $column) {
            $colLetter = Coordinate::stringFromColumnIndex(4 + $index);
            $widths[$colLetter] = match ($column['type'] ?? 'text') {
                'number' => 15,
                'date' => 15,
                default => 25,
            };
        }

        return $widths;
    }

    public function columnFormats(): array
    {
        $formats = [];
        foreach ($this->columns as $index => $column) {
            $colLetter = Coordinate::stringFromColumnIndex(4 + $index);
            $formats[$colLetter] = match ($column['type'] ?? 'text') {
                'number' => NumberFormat::FORMAT_NUMBER_COMMA_SEPARATED1, // #,##0.00
                'date' => NumberFormat::FORMAT_DATE_DDMMYYYY,           // DD/MM/YYYY
                default => NumberFormat::FORMAT_GENERAL,
            };
        }

        return $formats;
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
