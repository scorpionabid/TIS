<?php

namespace App\Exports;

use App\Models\ReportTable;
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
 * Hesabat cədvəli cavablarını Excel-ə export edir.
 *
 * Struktur:
 *   1-ci sətir:  Cədvəl başlığı (bütün sütunlar birləşdirilir)
 *   2-ci sətir:  Başlıqlar — Sektor | Müəssisə | Sətir № | col1 | col2 | ...
 *   3+ sətir:    Hər cavabın hər data sətiri üçün bir sətir
 */
class ReportTableExport implements FromCollection, WithColumnFormatting, WithColumnWidths, WithCustomStartCell, WithHeadings, WithStyles, WithTitle
{
    protected array $columns;

    public function __construct(
        protected ReportTable $table,
        protected Collection $responses,
        protected bool $filterByStatus = true,
    ) {
        $this->columns = $table->columns ?? [];
    }

    /**
     * Məlumatlar (başlıq + sətir) 2-ci sətirdən başlayır;
     * 1-ci sətir cədvəl adı üçün saxlanılır.
     */
    public function startCell(): string
    {
        return 'A2';
    }

    public function collection(): Collection
    {
        $rows = collect();

        foreach ($this->responses as $response) {
            $tableData = $response->rows ?? [];

            if (! is_array($tableData) || empty($tableData)) {
                continue;
            }

            $sectorName = $this->getSectorName($response->institution);
            $institutionName = $response->institution?->name ?? 'N/A';

            foreach ($tableData as $rowIndex => $tableRow) {
                if (! is_array($tableRow)) {
                    continue;
                }

                // Status filteri: admin export üçün yalnız submitted/approved;
                // məktəbin öz export-unda bütün sətirləri göstər (draft daxil).
                if ($this->filterByStatus) {
                    $rowStatus = $response->getRowStatus($rowIndex)['status'] ?? null;
                    if (! in_array($rowStatus, ['approved', 'submitted'], true)) {
                        continue;
                    }
                }

                $excelRow = [
                    $sectorName,
                    $institutionName,
                    $rowIndex + 1, // Sətir nömrəsi
                ];

                foreach ($this->columns as $column) {
                    $value = $tableRow[$column['key']] ?? '';
                    $type = $column['type'] ?? 'text';

                    // "Yoxdur" N/A dəyəri
                    if ($value === 'yoxdur') {
                        $excelRow[] = 'Yoxdur';
                        continue;
                    }

                    if ($value !== '' && $value !== null) {
                        if ($type === 'number' && is_numeric($value)) {
                            $numVal = str_contains((string) $value, '.') ? (float) $value : (int) $value;
                            if ($numVal === 0 && ($column['export_zero_as_blank'] ?? false)) {
                                $value = '';
                            } else {
                                $value = $numVal;
                            }
                        } elseif ($type === 'date') {
                            try {
                                $value = ExcelDate::PHPToExcel(Carbon::parse($value));
                            } catch (\Exception) {
                                // Xəta olarsa string kimi saxla
                            }
                        }
                    }

                    // Formula injection qorunması
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
        $headings = ['Sektor', 'Müəssisə', 'Sətir №'];

        foreach ($this->columns as $column) {
            $headings[] = $column['label'] ?? $column['key'];
        }

        return $headings;
    }

    public function styles(Worksheet $sheet): array
    {
        // 1-ci sətir: Cədvəl başlığı (birləşdirilmiş)
        $lastCol = Coordinate::stringFromColumnIndex(3 + count($this->columns));
        $sheet->mergeCells("A1:{$lastCol}1");
        $sheet->setCellValue('A1', $this->table->title);
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF065F46']],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFD1FAE5'],
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        // 3-cü sətirdən scroll (başlıq + column headings donur)
        $sheet->freezePane('A3');

        // AutoFilter başlıq sətirinin bütün sütunlarına
        $lastRow = $sheet->getHighestRow();
        $sheet->setAutoFilter("A2:{$lastCol}{$lastRow}");

        // 2-ci sətir (başlıqlar) tərzi
        return [
            2 => [
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF10B981'],
                ],
                'font' => [
                    'color' => ['argb' => 'FFFFFFFF'],
                    'bold' => true,
                    'size' => 11,
                ],
            ],
        ];
    }

    public function columnWidths(): array
    {
        $widths = [
            'A' => 25, // Sektor
            'B' => 32, // Müəssisə
            'C' => 10, // Sətir №
        ];

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
                'number' => NumberFormat::FORMAT_NUMBER_COMMA_SEPARATED1,
                'date' => NumberFormat::FORMAT_DATE_DDMMYYYY,
                default => NumberFormat::FORMAT_GENERAL,
            };
        }

        return $formats;
    }

    public function title(): string
    {
        $title = strip_tags($this->table->title ?? 'Hesabat Cədvəli');
        $title = preg_replace('/[\\\\\/\?\*\[\]:]+/', '', $title);

        return mb_strlen($title) > 31 ? mb_substr($title, 0, 28) . '...' : $title;
    }

    private function getSectorName($institution): string
    {
        if (! $institution) {
            return 'N/A';
        }

        // Level 4 = məktəb → onun parent-i sektor
        if ($institution->level == 4) {
            return $institution->parent?->name ?? 'N/A';
        }

        // Level 3 = sektor → özü
        if ($institution->level == 3) {
            return $institution->name;
        }

        return 'N/A';
    }
}
