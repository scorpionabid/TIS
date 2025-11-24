<?php

namespace App\Services\Import\Domains\FileOperations;

use App\Models\InstitutionType;
use App\Services\Import\Domains\Parsing\DataTypeParser;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Excel Data Parser Service
 *
 * Parses Excel rows into structured PHP arrays based on institution type.
 * Handles dynamic column mapping for different institution levels.
 */
class ExcelDataParser
{
    public function __construct(
        protected DataTypeParser $dataTypeParser
    ) {}

    /**
     * Parse Excel data into structured array
     */
    public function parseExcelData(Spreadsheet $spreadsheet, InstitutionType $institutionType): array
    {
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();
        $data = [];

        Log::info('Parsing Excel sheet', [
            'sheet_name' => $sheet->getTitle(),
            'highest_row' => $highestRow,
            'institution_type' => $institutionType->key,
        ]);

        // Get institution level
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        // Skip header row and start from row 2
        for ($row = 2; $row <= $highestRow; $row++) {
            // Check if row has any data
            $hasData = false;
            for ($col = 'A'; $col <= 'T'; $col++) {
                if (! empty(trim($sheet->getCell($col . $row)->getCalculatedValue()))) {
                    $hasData = true;
                    break;
                }
            }

            if (! $hasData) {
                continue; // Skip empty rows
            }

            $rowData = [
                'row' => $row,
                'name' => trim($sheet->getCell('A' . $row)->getCalculatedValue()),
                'short_name' => trim($sheet->getCell('B' . $row)->getCalculatedValue()),
                'institution_code' => trim($sheet->getCell('C' . $row)->getCalculatedValue()),
                'utis_code' => trim($sheet->getCell('D' . $row)->getCalculatedValue()),
                'region_code' => trim($sheet->getCell('E' . $row)->getCalculatedValue()),
                'contact_info' => trim($sheet->getCell('F' . $row)->getCalculatedValue()),
                'location' => trim($sheet->getCell('G' . $row)->getCalculatedValue()),
                'established_date' => $this->dataTypeParser->parseDate($sheet->getCell('H' . $row)),
                'is_active' => $this->dataTypeParser->parseActiveStatus($sheet->getCell('I' . $row)->getCalculatedValue()),
            ];

            // Add parent_id for levels 2+
            if ($institutionLevel >= 2) {
                $parentIdRaw = trim($sheet->getCell('J' . $row)->getCalculatedValue());
                $rowData['parent_id'] = $this->dataTypeParser->parseParentId($parentIdRaw);
            }

            // Add school-specific fields
            if (in_array($institutionType->key, ['secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb'])) {
                $rowData['class_count'] = (int) $sheet->getCell('K' . $row)->getCalculatedValue();
                $rowData['student_count'] = (int) $sheet->getCell('L' . $row)->getCalculatedValue();
                $rowData['teacher_count'] = (int) $sheet->getCell('M' . $row)->getCalculatedValue();
            }

            // Add SchoolAdmin data for level 4 institutions
            if ($institutionLevel == 4) {
                $rowData['schooladmin'] = [
                    'username' => trim($sheet->getCell('N' . $row)->getCalculatedValue()),
                    'email' => trim($sheet->getCell('O' . $row)->getCalculatedValue()),
                    'password' => trim($sheet->getCell('P' . $row)->getCalculatedValue()),
                    'first_name' => trim($sheet->getCell('Q' . $row)->getCalculatedValue()),
                    'last_name' => trim($sheet->getCell('R' . $row)->getCalculatedValue()),
                    'phone' => trim($sheet->getCell('S' . $row)->getCalculatedValue()),
                    'department' => trim($sheet->getCell('T' . $row)->getCalculatedValue()),
                ];
            }

            $data[] = $rowData;
        }

        return $data;
    }
}
