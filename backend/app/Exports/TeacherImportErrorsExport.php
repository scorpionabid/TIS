<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Teacher Import Errors Export
 * Exports invalid rows with detailed error information
 */
class TeacherImportErrorsExport implements WithMultipleSheets
{
    protected array $invalidRows;

    protected array $errors;

    protected array $summary;

    public function __construct(array $invalidRows, array $errors, array $summary)
    {
        $this->invalidRows = $invalidRows;
        $this->errors = $errors;
        $this->summary = $summary;
    }

    public function sheets(): array
    {
        return [
            new ErrorSummarySheet($this->summary, $this->errors),
            new InvalidRowsSheet($this->invalidRows),
            new DetailedErrorsSheet($this->errors),
        ];
    }
}

/**
 * Sheet 1: Error Summary
 */
class ErrorSummarySheet implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    protected array $summary;

    protected array $errors;

    public function __construct(array $summary, array $errors)
    {
        $this->summary = $summary;
        $this->errors = $errors;
    }

    public function array(): array
    {
        $data = [];

        // Summary statistics
        $data[] = ['XƏTA HESABATI - ÜMUMI MƏLUMAT'];
        $data[] = [];
        $data[] = ['Cəmi sətir:', $this->summary['total_rows']];
        $data[] = ['Düzgün sətir:', $this->summary['valid_rows'] . ' (' . $this->summary['valid_percentage'] . '%)'];
        $data[] = ['Xətalı sətir:', $this->summary['invalid_rows']];
        $data[] = ['Xəbərdarlıqlar:', $this->summary['warnings']];
        $data[] = ['Kritik xətalar:', $this->summary['critical_errors']];
        $data[] = [];

        // Top 10 errors
        $data[] = ['ƏN ÇOXRASTAN XƏTALAR (İLK 10)'];
        $data[] = [];
        $data[] = ['Sətir', 'Sahə', 'Xəta', 'Hazırkı dəyər'];

        $errorCount = 0;
        foreach ($this->errors as $error) {
            if ($errorCount >= 10) {
                break;
            }

            $data[] = [
                $error['row_number'],
                $error['field'],
                $error['message'],
                $error['value'] ?? '',
            ];

            $errorCount++;
        }

        $data[] = [];
        $data[] = ['ADDIMLAR:'];
        $data[] = ['1. "Invalid Rows" vərəqində xətalı sətirlərə baxın'];
        $data[] = ['2. "Detailed Errors" vərəqində hər xətanın detallı izahını oxuyun'];
        $data[] = ['3. Xətaları düzəldin'];
        $data[] = ['4. Faylı yenidən yükləyin'];

        return $data;
    }

    public function headings(): array
    {
        return [];
    }

    public function styles(Worksheet $sheet)
    {
        // Title styling
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFE74C3C']],
        ]);

        // Summary section headers
        $sheet->getStyle('A9')->applyFromArray([
            'font' => ['bold' => true, 'size' => 12],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFFEB3B']],
        ]);

        // Table header
        $sheet->getStyle('A11')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFE0E0E0']],
        ]);

        return [];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 30,
            'B' => 30,
            'C' => 50,
            'D' => 30,
        ];
    }
}

/**
 * Sheet 2: Invalid Rows (original data with error column)
 */
class InvalidRowsSheet implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    protected array $invalidRows;

    public function __construct(array $invalidRows)
    {
        $this->invalidRows = $invalidRows;
    }

    public function array(): array
    {
        $data = [];

        foreach ($this->invalidRows as $item) {
            $rowData = $item['data'];
            $errors = $item['errors'];

            // Concatenate error messages
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[] = "❌ {$error['field']}: {$error['message']}";
            }

            $data[] = [
                $item['row_number'],
                $rowData['institution_utis_code'] ?? '',
                $rowData['institution_code'] ?? '',
                $rowData['institution_id'] ?? '',
                $rowData['email'] ?? '',
                $rowData['username'] ?? '',
                $rowData['first_name'] ?? '',
                $rowData['last_name'] ?? '',
                $rowData['patronymic'] ?? '',
                $rowData['position_type'] ?? '',
                $rowData['workplace_type'] ?? '',
                $rowData['specialty'] ?? '',
                $rowData['main_subject'] ?? '',
                $rowData['assessment_type'] ?? '',
                $rowData['assessment_score'] ?? '',
                $rowData['password'] ?? '',
                implode("\n", $errorMessages), // ERROR column
            ];
        }

        return $data;
    }

    public function headings(): array
    {
        return [
            'Row #',
            'institution_utis_code',
            'institution_code',
            'institution_id',
            'email',
            'username',
            'first_name',
            'last_name',
            'patronymic',
            'position_type',
            'workplace_type',
            'specialty',
            'main_subject',
            'assessment_type',
            'assessment_score',
            'password',
            '🔴 ERRORS (düzəldin)',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Header row - red background
        $sheet->getStyle('A1:Q1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFE74C3C']],
        ]);

        // Error column - light red background for all rows
        $lastRow = count($this->invalidRows) + 1;
        $sheet->getStyle("Q2:Q{$lastRow}")->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFDE2E2']],
        ]);

        // Enable text wrapping for error column
        $sheet->getStyle("Q2:Q{$lastRow}")->getAlignment()->setWrapText(true);

        return [];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 8,  // Row #
            'B' => 18, // institution_utis_code
            'C' => 18, // institution_code
            'D' => 15, // institution_id
            'E' => 30, // email
            'F' => 20, // username
            'G' => 15, // first_name
            'H' => 15, // last_name
            'I' => 15, // patronymic
            'J' => 25, // position_type
            'K' => 18, // workplace_type
            'L' => 20, // specialty
            'M' => 20, // main_subject
            'N' => 20, // assessment_type
            'O' => 18, // assessment_score
            'P' => 15, // password
            'Q' => 60, // ERRORS
        ];
    }
}

/**
 * Sheet 3: Detailed Errors with Suggestions
 */
class DetailedErrorsSheet implements FromArray, WithColumnWidths, WithHeadings, WithStyles
{
    protected array $errors;

    public function __construct(array $errors)
    {
        $this->errors = $errors;
    }

    public function array(): array
    {
        $data = [];

        foreach ($this->errors as $error) {
            $data[] = [
                $error['row_number'],
                $error['severity'] === 'critical' ? '🔴 KRİTİK' : '🟡 XƏBƏRDARLIQ',
                $error['field'],
                $error['value'] ?? '(boş)',
                $error['message'],
                $error['suggestion'] ?? 'N/A',
            ];
        }

        return $data;
    }

    public function headings(): array
    {
        return [
            'Sətir',
            'Səviyyə',
            'Sahə',
            'Hazırkı Dəyər',
            'Xəta',
            'Tövsiyyə',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Header row
        $sheet->getStyle('A1:F1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF3498DB']],
        ]);

        // Color-code severity column
        $rowCount = count($this->errors);
        for ($row = 2; $row <= $rowCount + 1; $row++) {
            $severity = $sheet->getCell("B{$row}")->getValue();

            if (str_contains($severity, 'KRİTİK')) {
                $sheet->getStyle("B{$row}")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFFE2E2']],
                ]);
            } else {
                $sheet->getStyle("B{$row}")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFEF9E7']],
                ]);
            }
        }

        return [];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 8,  // Row number
            'B' => 15, // Severity
            'C' => 25, // Field
            'D' => 25, // Current value
            'E' => 40, // Error message
            'F' => 50, // Suggestion
        ];
    }
}
