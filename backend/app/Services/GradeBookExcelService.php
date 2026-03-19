<?php

namespace App\Services;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class GradeBookExcelService
{
    protected GradeCalculationService $calculationService;

    public function __construct(GradeCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * Generate Excel template for grade book
     */
    public function generateTemplate(int $sessionId): Spreadsheet
    {
        $session = GradeBookSession::with([
            'grade.studentEnrollments.student',
            'columns' => fn ($q) => $q->where('column_type', 'input')->orderBy('display_order'),
            'subject',
        ])->findOrFail($sessionId);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set metadata
        $spreadsheet->getProperties()
            ->setCreator('TIS System')
            ->setTitle("{$session->grade->name} - {$session->subject->name}")
            ->setSubject('Sinif Jurnalı');

        // Headers
        $sheet->setCellValue('A1', 'Şagird ID');
        $sheet->setCellValue('B1', 'Şagird Nömrəsi');
        $sheet->setCellValue('C1', 'Soyad');
        $sheet->setCellValue('D1', 'Ad');
        $sheet->setCellValue('E1', 'Ata Adı');

        // Column headers for each assessment
        $colIndex = 6; // Start from column F
        $columnMap = [];

        foreach ($session->columns as $column) {
            $cellCoordinate = Coordinate::stringFromColumnIndex($colIndex);
            $sheet->setCellValue("{$cellCoordinate}1", $column->column_label);
            $sheet->setCellValue("{$cellCoordinate}2", $column->id); // Hidden column ID

            // Add metadata as comment
            $sheet->getComment("{$cellCoordinate}1")
                ->getText()
                ->createTextRun("Tarix: {$column->assessment_date}\nMaksimum bal: {$column->max_score}");

            $columnMap[$colIndex] = $column->id;
            $colIndex++;
        }

        // Style header row
        $lastColumn = Coordinate::stringFromColumnIndex($colIndex - 1);
        $sheet->getStyle("A1:{$lastColumn}1")
            ->getFont()
            ->setBold(true);

        $sheet->getStyle("A1:{$lastColumn}1")
            ->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()
            ->setRGB('4472C4');

        $sheet->getStyle("A1:{$lastColumn}1")
            ->getFont()
            ->getColor()
            ->setRGB('FFFFFF');

        // Add student data
        $row = 3;
        $students = \App\Models\Student::where('grade_id', $session->grade_id)
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get();

        foreach ($students as $student) {
            $sheet->setCellValue("A{$row}", $student->id);
            $sheet->setCellValue("B{$row}", $student->utis_code ?: $student->student_number);
            $sheet->setCellValue("C{$row}", $student->last_name);
            $sheet->setCellValue("D{$row}", $student->first_name);
            $sheet->setCellValue("E{$row}", $student->father_name);

            // Pre-fill existing scores
            foreach ($columnMap as $colIndex => $columnId) {
                $cell = GradeBookCell::where('grade_book_column_id', $columnId)
                    ->where('student_id', $student->id)
                    ->first();

                if ($cell && $cell->score !== null) {
                    $cellCoordinate = Coordinate::stringFromColumnIndex($colIndex);
                    $sheet->setCellValue("{$cellCoordinate}{$row}", $cell->score);
                }
            }

            $row++;
        }

        // Auto-size columns
        foreach (range('A', $lastColumn) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Hide column A (Student ID)
        $sheet->getColumnDimension('A')->setVisible(false);
        // Hide row 2 (Column IDs)
        $sheet->getRowDimension(2)->setVisible(false);

        // Add instructions sheet
        $this->addInstructionsSheet($spreadsheet);

        return $spreadsheet;
    }

    /**
     * Import scores from Excel file with detailed validation
     */
    public function importScores(string $filePath, int $sessionId): array
    {
        $results = [
            'imported' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
            'warnings' => [],
            'students_processed' => [],
            'validation_summary' => [
                'total_rows' => 0,
                'valid_rows' => 0,
                'invalid_rows' => 0,
            ],
        ];

        try {
            $reader = new XlsxReader();
            $spreadsheet = $reader->load($filePath);
            $sheet = $spreadsheet->getActiveSheet();
        } catch (\Exception $e) {
            $results['errors'][] = [
                'type' => 'file_error',
                'message' => 'Excel faylı oxunarkən xəta: ' . $e->getMessage(),
            ];
            return $results;
        }

        // Get session info for validation
        $session = GradeBookSession::with(['grade.studentEnrollments'])->find($sessionId);
        if (!$session) {
            $results['errors'][] = [
                'type' => 'session_error',
                'message' => 'Jurnal tapılmadı (ID: ' . $sessionId . ')',
            ];
            return $results;
        }

        // Get valid student IDs for this grade
        $validStudentIds = $session->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id')
            ->toArray();

        // Read column mapping from row 2
        $columnMap = [];
        $columnMaxScores = [];
        $highestColumn = $sheet->getHighestColumn();
        $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);

        for ($col = 6; $col <= $highestColumnIndex; $col++) {
            $columnId = $sheet->getCellByColumnAndRow($col, 2)->getValue();
            if ($columnId) {
                $columnId = (int) $columnId;
                $column = GradeBookColumn::find($columnId);
                if ($column) {
                    $columnMap[$col] = $columnId;
                    $columnMaxScores[$col] = $column->max_score;
                } else {
                    $results['warnings'][] = [
                        'type' => 'column_not_found',
                        'column_index' => $col,
                        'message' => "Sütun tapılmadı (ID: {$columnId})",
                    ];
                }
            }
        }

        if (empty($columnMap)) {
            $results['errors'][] = [
                'type' => 'no_columns',
                'message' => 'Cədvəldə bal sütunları tapılmadı. Zəhmət olmasa şablonu yenidən yükləyin.',
            ];
            return $results;
        }

        // Process data rows (starting from row 3)
        $highestRow = $sheet->getHighestRow();
        $results['validation_summary']['total_rows'] = $highestRow - 2;

        $studentIds = [];
        $processedRows = 0;

        DB::transaction(function () use ($sheet, $highestRow, $columnMap, $columnMaxScores, $sessionId, $validStudentIds, &$results, &$studentIds, &$processedRows) {
            for ($row = 3; $row <= $highestRow; $row++) {
                $studentId = $sheet->getCell("A{$row}")->getValue();

                // Skip empty rows
                if (!$studentId) {
                    continue;
                }

                $processedRows++;

                // Validate student exists in this grade
                if (!in_array($studentId, $validStudentIds)) {
                    $results['errors'][] = [
                        'type' => 'invalid_student',
                        'row' => $row,
                        'student_id' => $studentId,
                        'message' => "Sətir {$row}: Şagird bu sinifdə tapılmadı (ID: {$studentId})",
                    ];
                    $results['validation_summary']['invalid_rows']++;
                    continue;
                }

                $studentIds[] = $studentId;
                $hasValidData = false;

                foreach ($columnMap as $col => $columnId) {
                    $cellCoordinate = Coordinate::stringFromColumnIndex($col);
                    $scoreValue = $sheet->getCell("{$cellCoordinate}{$row}")->getValue();

                    // Skip empty cells
                    if ($scoreValue === null || $scoreValue === '') {
                        continue;
                    }

                    // Validate score is numeric
                    if (!is_numeric($scoreValue)) {
                        $results['errors'][] = [
                            'type' => 'invalid_score_type',
                            'row' => $row,
                            'column' => $cellCoordinate,
                            'value' => $scoreValue,
                            'message' => "Sətir {$row}, sütun {$cellCoordinate}: Bal rəqəm olmalıdır ({$scoreValue})",
                        ];
                        continue;
                    }

                    $score = floatval($scoreValue);
                    $maxScore = $columnMaxScores[$col] ?? 100;

                    // Validate score range
                    if ($score < 0 || $score > $maxScore) {
                        $results['errors'][] = [
                            'type' => 'score_out_of_range',
                            'row' => $row,
                            'column' => $cellCoordinate,
                            'value' => $score,
                            'max_score' => $maxScore,
                            'message' => "Sətir {$row}, sütun {$cellCoordinate}: Bal aralıqdan xaricdə ({$score}, max: {$maxScore})",
                        ];
                        continue;
                    }

                    // Check for suspicious changes (changes > 30 points)
                    $existingCell = GradeBookCell::where('grade_book_column_id', $columnId)
                        ->where('student_id', $studentId)
                        ->first();

                    if ($existingCell && $existingCell->score !== null) {
                        $scoreDiff = abs($score - $existingCell->score);
                        if ($scoreDiff > 30) {
                            $results['warnings'][] = [
                                'type' => 'large_score_change',
                                'row' => $row,
                                'column' => $cellCoordinate,
                                'student_id' => $studentId,
                                'old_score' => $existingCell->score,
                                'new_score' => $score,
                                'difference' => $scoreDiff,
                                'message' => "Sətir {$row}: Böyük bal dəyişikliyi ({$existingCell->score} → {$score}, fərq: {$scoreDiff})",
                            ];
                        }
                    }

                    // Update or create cell
                    $cell = GradeBookCell::updateOrCreate(
                        [
                            'grade_book_column_id' => $columnId,
                            'student_id' => $studentId,
                        ],
                        [
                            'score' => $score,
                            'percentage' => ($score / $maxScore) * 100,
                            'grade_mark' => $this->calculationService->convertScoreToGrade($score),
                            'is_present' => true,
                            'recorded_by' => auth()->id() ?? 1,
                            'recorded_at' => now(),
                        ]
                    );

                    if ($cell->wasRecentlyCreated) {
                        $results['imported']++;
                    } else {
                        $results['updated']++;
                    }

                    $hasValidData = true;
                }

                if ($hasValidData) {
                    $results['validation_summary']['valid_rows']++;
                } else {
                    $results['skipped']++;
                }
            }

            // Recalculate for all affected students
            $uniqueStudentIds = array_unique($studentIds);
            foreach ($uniqueStudentIds as $studentId) {
                $this->calculationService->updateCalculatedColumns($studentId, $sessionId);
            }

            $results['students_processed'] = $uniqueStudentIds;
        });

        // Add summary message
        if ($results['imported'] === 0 && $results['updated'] === 0) {
            $results['errors'][] = [
                'type' => 'no_data',
                'message' => 'Heç bir bal import edilmədi. Zəhmət olmasa məlumatları yoxlayın.',
            ];
        }

        return $results;
    }

    /**
     * Export grade book with calculated columns
     */
    public function exportGradeBook(int $sessionId): Spreadsheet
    {
        $session = GradeBookSession::with([
            'grade.studentEnrollments.student',
            'columns' => fn ($q) => $q->orderBy('display_order'),
            'subject',
            'academicYear',
        ])->findOrFail($sessionId);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Metadata
        $spreadsheet->getProperties()
            ->setCreator('TIS System')
            ->setTitle("{$session->grade->name} - {$session->subject->name}")
            ->setSubject('Sinif Jurnalı - Export');

        // Main title
        $sheet->mergeCells('A1:O1');
        $sheet->setCellValue('A1', "{$session->grade->name} - {$session->subject->name} - {$session->academicYear->name}");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

        // Headers row 3
        $sheet->setCellValue('A3', '№');
        $sheet->setCellValue('B3', 'Şagird Nömrəsi');
        $sheet->setCellValue('C3', 'Soyad');
        $sheet->setCellValue('D3', 'Ad');
        $sheet->setCellValue('E3', 'Ata Adı');

        // All columns
        $colIndex = 6;
        $columnCoordinates = [];

        foreach ($session->columns as $column) {
            $coord = Coordinate::stringFromColumnIndex($colIndex);
            $sheet->setCellValue("{$coord}3", $this->formatColumnLabel($column));
            $columnCoordinates[$column->id] = $coord;

            // Color calculated columns
            if ($column->column_type === 'calculated') {
                $sheet->getStyle("{$coord}3")
                    ->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()
                    ->setRGB('D9E1F2');
                $sheet->getStyle("{$coord}3")
                    ->getFont()
                    ->setBold(true);
            }

            $colIndex++;
        }

        // Style headers
        $lastColumn = Coordinate::stringFromColumnIndex($colIndex - 1);
        $sheet->getStyle("A3:{$lastColumn}3")
            ->getFont()
            ->setBold(true);

        $sheet->getStyle("A3:{$lastColumn}3")
            ->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()
            ->setRGB('4472C4');

        $sheet->getStyle("A3:{$lastColumn}3")
            ->getFont()
            ->getColor()
            ->setRGB('FFFFFF');

        // Add student data
        $row = 4;
        $counter = 1;

        $students = \App\Models\Student::where('grade_id', $session->grade_id)
            ->where('is_active', true)
            ->orderBy('last_name')
            ->get();

        foreach ($students as $student) {
            $sheet->setCellValue("A{$row}", $counter++);
            $sheet->setCellValue("B{$row}", $student->utis_code ?: $student->student_number);
            $sheet->setCellValue("C{$row}", $student->last_name);
            $sheet->setCellValue("D{$row}", $student->first_name);
            $sheet->setCellValue("E{$row}", $student->father_name);

            // Fill scores
            foreach ($session->columns as $column) {
                $cell = GradeBookCell::where('grade_book_column_id', $column->id)
                    ->where('student_id', $student->id)
                    ->first();

                $coord = $columnCoordinates[$column->id];
                $value = $cell && $cell->score !== null ? $cell->score : '';

                $sheet->setCellValue("{$coord}{$row}", $value);

                // Color code based on score
                if ($cell && $cell->score !== null) {
                    $color = $this->calculationService->getScoreColor($cell->score);
                    $bgColor = match($color) {
                        'green' => 'C6EFCE',
                        'yellow' => 'FFEB9C',
                        'orange' => 'FFC7CE',
                        'red' => 'FFC7CE',
                        default => null,
                    };

                    if ($bgColor) {
                        $sheet->getStyle("{$coord}{$row}")
                            ->getFill()
                            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                            ->getStartColor()
                            ->setRGB($bgColor);
                    }
                }
            }

            $row++;
        }

        // Auto-size columns
        foreach (range('A', $lastColumn) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Add summary sheet
        $this->addSummarySheet($spreadsheet, $session);

        return $spreadsheet;
    }

    /**
     * Add instructions sheet to template
     */
    private function addInstructionsSheet(Spreadsheet $spreadsheet): void
    {
        $spreadsheet->createSheet();
        $sheet = $spreadsheet->getSheet(1);
        $sheet->setTitle('Təlimatlar');

        $instructions = [
            ['SİNİF JURNALI - İMPORT TƏLİMATI'],
            [''],
            ['1. Cədvəl strukturu:'],
            ['   - A sütunu: Şagird ID (gizli, dəyişməyin)'],
            ['   - B sütunu: Şagird nömrəsi'],
            ['   - C, D, E sütunları: Şagirdin Soyadı, Adı, Ata adı'],
            ['   - F və sonrakı sütunlar: İmtahan balları'],
            [''],
            ['2. Bal daxil etmə qaydaları:'],
            ['   - Hər hüceyrəyə 0-100 arası bal yazın'],
            ['   - Boş buraxılan hüceyrələr nəzərə alınmaz'],
            ['   - Ondalık ədədər qəbul edilir (məsələn: 85.5)'],
            [''],
            ['3. İmport prosesi:'],
            ['   - Faylı Saxla (Save)'],
            ['   - Sistemə yükləyin'],
            ['   - Yalnız .xlsx formatı dəstəklənir'],
            [''],
            ['4. Avtomatik hesablamalar:'],
            ['   - I Yarımil Bal (KSQ və BSQ əsasən)'],
            ['   - II Yarımil Bal'],
            ['   - İllik Bal (I + II Yarımil / 2)'],
            ['   - Qiymətlər (2, 3, 4, 5)'],
            [''],
            ['5. Qiymət çevrilmə cədvəli:'],
            ['   - 0-30 bal: Qiymət 2'],
            ['   - 30-60 bal: Qiymət 3'],
            ['   - 60-80 bal: Qiymət 4'],
            ['   - 80-100 bal: Qiymət 5'],
        ];

        foreach ($instructions as $index => $line) {
            $sheet->setCellValue('A' . ($index + 1), $line[0] ?? '');
        }

        $sheet->getColumnDimension('A')->setWidth(60);
    }

    /**
     * Add summary sheet with statistics
     */
    private function addSummarySheet(Spreadsheet $spreadsheet, GradeBookSession $session): void
    {
        $spreadsheet->createSheet();
        $sheet = $spreadsheet->getSheet(1);
        $sheet->setTitle('Statistika');

        $sheet->setCellValue('A1', 'ÜMUMİ STATİSTİKA');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $students = $session->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->count();

        $columns = $session->columns()->where('column_type', 'input')->count();

        $sheet->setCellValue('A3', 'Ümumi şagird sayı:');
        $sheet->setCellValue('B3', $students);

        $sheet->setCellValue('A4', 'İmtahan sayı:');
        $sheet->setCellValue('B4', $columns);

        // Grade distribution
        $sheet->setCellValue('A6', 'QİYMƏT PAYLANMASI');
        $sheet->getStyle('A6')->getFont()->setBold(true);

        $gradeDistribution = $this->getGradeDistribution($session);

        $row = 7;
        foreach ($gradeDistribution as $grade => $count) {
            $sheet->setCellValue("A{$row}", "Qiymət {$grade}:");
            $sheet->setCellValue("B{$row}", $count);
            $row++;
        }

        $sheet->getColumnDimension('A')->setAutoSize(true);
        $sheet->getColumnDimension('B')->setAutoSize(true);
    }

    /**
     * Get grade distribution for session
     */
    protected function getGradeDistribution(GradeBookSession $session): array
    {
        $distribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0];

        $students = $session->grade->studentEnrollments()
            ->where('enrollment_status', 'active')
            ->pluck('student_id');

        foreach ($students as $studentId) {
            $annualScore = GradeBookCell::whereHas('column', function ($q) use ($session) {
                $q->where('grade_book_session_id', $session->id)
                    ->where('column_label', 'ILLIK_BAL');
            })
                ->where('student_id', $studentId)
                ->value('score');

            if ($annualScore !== null) {
                $grade = $this->calculationService->convertScoreToGrade($annualScore);
                $distribution[$grade]++;
            }
        }

        return $distribution;
    }

    /**
     * Format column label for display
     */
    private function formatColumnLabel(GradeBookColumn $column): string
    {
        $labels = [
            'I_YARIMIL_BAL' => 'I Y.Bal',
            'I_YARIMIL_QIYMET' => 'I Y.Qiym',
            'II_YARIMIL_BAL' => 'II Y.Bal',
            'II_YARIMIL_QIYMET' => 'II Y.Qiym',
            'ILLIK_BAL' => 'İllik Bal',
            'ILLIK_QIYMET' => 'İllik Qiym',
        ];

        return $labels[$column->column_label] ?? $column->column_label;
    }
}
