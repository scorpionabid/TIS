<?php

namespace App\Services;

use App\Models\GradeBookCell;
use App\Models\GradeBookColumn;
use App\Models\GradeBookSession;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

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

        $spreadsheet = new Spreadsheet;
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
            $reader = new XlsxReader;
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
        if (! $session) {
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
                if (! $studentId) {
                    continue;
                }

                $processedRows++;

                // Validate student exists in this grade
                if (! in_array($studentId, $validStudentIds)) {
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
                    if (! is_numeric($scoreValue)) {
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
                            'recorded_by' => auth()->id(),
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

        $spreadsheet = new Spreadsheet;
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
                    $bgColor = match ($color) {
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
     * Bulk export all grade books for a specific grade (all subjects as separate sheets)
     */
    public function bulkExportByGrade(int $gradeId, ?int $academicYearId = null): Spreadsheet
    {
        $query = GradeBookSession::with([
            'columns' => fn ($q) => $q->where('is_archived', false)->orderBy('display_order'),
            'subject',
            'academicYear',
            'grade',
        ])->where('grade_id', $gradeId)->where('status', 'active');

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        $sessions = $query->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0); // Remove default sheet

        foreach ($sessions as $index => $session) {
            $sheet = $spreadsheet->createSheet($index);
            $sheetTitle = mb_substr($session->subject->name ?? "Fənn {$index}", 0, 31);
            $sheet->setTitle($sheetTitle);

            // Title row
            $sheet->mergeCells('A1:O1');
            $sheet->setCellValue('A1', "{$session->grade->name} - {$session->subject->name} - {$session->academicYear->name}");
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);
            $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

            // Headers
            $sheet->setCellValue('A3', '№');
            $sheet->setCellValue('B3', 'Şagird Nömrəsi');
            $sheet->setCellValue('C3', 'Soyad');
            $sheet->setCellValue('D3', 'Ad');
            $sheet->setCellValue('E3', 'Ata Adı');

            $colIndex = 6;
            $columnCoordinates = [];

            foreach ($session->columns as $column) {
                $coord = Coordinate::stringFromColumnIndex($colIndex);
                $sheet->setCellValue("{$coord}3", $this->formatColumnLabel($column));
                $columnCoordinates[$column->id] = $coord;

                if ($column->column_type === 'calculated') {
                    $sheet->getStyle("{$coord}3")->getFill()
                        ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('D9E1F2');
                    $sheet->getStyle("{$coord}3")->getFont()->setBold(true);
                }

                $colIndex++;
            }

            $lastColumn = Coordinate::stringFromColumnIndex($colIndex - 1);
            $sheet->getStyle("A3:{$lastColumn}3")->getFont()->setBold(true);
            $sheet->getStyle("A3:{$lastColumn}3")->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setRGB('4472C4');
            $sheet->getStyle("A3:{$lastColumn}3")->getFont()->getColor()->setRGB('FFFFFF');

            $students = \App\Models\Student::where('grade_id', $session->grade_id)
                ->where('is_active', true)
                ->orderBy('last_name')
                ->get();

            $row = 4;
            $counter = 1;

            // Preload all cells for this session to avoid N+1
            $columnIds = $session->columns->pluck('id')->toArray();
            $allCells = GradeBookCell::whereIn('grade_book_column_id', $columnIds)
                ->get()
                ->groupBy('student_id');

            foreach ($students as $student) {
                $sheet->setCellValue("A{$row}", $counter++);
                $sheet->setCellValue("B{$row}", $student->utis_code ?: $student->student_number);
                $sheet->setCellValue("C{$row}", $student->last_name);
                $sheet->setCellValue("D{$row}", $student->first_name);
                $sheet->setCellValue("E{$row}", $student->father_name);

                $studentCells = $allCells->get($student->id, collect())->keyBy('grade_book_column_id');

                foreach ($session->columns as $column) {
                    $cell = $studentCells->get($column->id);
                    $coord = $columnCoordinates[$column->id] ?? null;
                    if (! $coord) {
                        continue;
                    }
                    $value = $cell && $cell->score !== null ? $cell->score : '';
                    $sheet->setCellValue("{$coord}{$row}", $value);
                }

                $row++;
            }

            foreach (range('A', $lastColumn) as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }
        }

        if ($spreadsheet->getSheetCount() === 0) {
            $sheet = $spreadsheet->createSheet(0);
            $sheet->setTitle('Boş');
            $sheet->setCellValue('A1', 'Bu sinif üçün aktiv jurnal tapılmadı.');
        }

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
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

    /**
     * Export analysis summary as multi-sheet Excel
     */
    public function exportAnalysisSummary(array $overviewData, array $deepDiveData): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;

        // === Sheet 1: Overview ===
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Ümumi Baxış');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '3B82F6']],
        ];

        $sheet->setCellValue('A1', 'Nəticə Analizi - Ümumi Baxış');
        $sheet->mergeCells('A1:B1');
        $sheet->getStyle('A1')->applyFromArray($headerStyle);

        $row = 3;
        $metrics = [
            ['Şagird sayı', $overviewData['totalStudents']],
            ['Ümumi jurnallar', $overviewData['totalJournals']],
            ['Aktiv jurnallar', $overviewData['activeJournals']],
            ['Arxivlənmiş jurnallar', $overviewData['archivedJournals']],
            ['İmtahan sütunları', $overviewData['examCount']],
            ['Ortalama bal', $overviewData['averageScore']],
            ['Ən yüksək bal', $overviewData['highestScore']],
        ];
        foreach ($metrics as [$label, $value]) {
            $sheet->setCellValue("A{$row}", $label);
            $sheet->setCellValue("B{$row}", $value);
            $row++;
        }

        $row += 2;
        $sheet->setCellValue("A{$row}", 'Qiymət Paylanması');
        $sheet->getStyle("A{$row}")->applyFromArray($headerStyle);
        $row++;
        $sheet->setCellValue('A' . $row, 'Qiymət');
        $sheet->setCellValue('B' . $row, 'Şagird sayı');
        $sheet->setCellValue('C' . $row, 'Faiz');
        $row++;
        foreach ($overviewData['gradeDistribution'] as $dist) {
            $sheet->setCellValue("A{$row}", $dist['grade']);
            $sheet->setCellValue("B{$row}", $dist['count']);
            $sheet->setCellValue("C{$row}", $dist['percentage'] . '%');
            $row++;
        }

        $row += 2;
        $sheet->setCellValue("A{$row}", 'Fənn Üzrə Ortalamalar');
        $sheet->getStyle("A{$row}")->applyFromArray($headerStyle);
        $row++;
        $sheet->setCellValue('A' . $row, 'Fənn');
        $sheet->setCellValue('B' . $row, 'Ortalama bal');
        $row++;
        foreach ($overviewData['subjectAverages'] as $sub) {
            $sheet->setCellValue("A{$row}", $sub['subject']);
            $sheet->setCellValue("B{$row}", $sub['average']);
            $row++;
        }

        $sheet->getColumnDimension('A')->setWidth(35);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(15);

        // === Sheet 2: Risk Students ===
        $riskSheet = $spreadsheet->createSheet();
        $riskSheet->setTitle('Risk Şagirdlər');

        $riskSheet->setCellValue('A1', 'Risk Qrupundakı Şagirdlər (Ortalama < 50)');
        $riskSheet->mergeCells('A1:E1');
        $riskSheet->getStyle('A1')->applyFromArray($headerStyle);

        $riskSheet->setCellValue('A2', '#');
        $riskSheet->setCellValue('B2', 'Ad Soyad');
        $riskSheet->setCellValue('C2', 'Sinif');
        $riskSheet->setCellValue('D2', 'Ortalama');
        $riskSheet->setCellValue('E2', 'Zəif fənn sayı');
        $riskSheet->getStyle('A2:E2')->getFont()->setBold(true);

        $r = 3;
        foreach ($deepDiveData['riskStudents'] as $i => $student) {
            $riskSheet->setCellValue("A{$r}", $i + 1);
            $riskSheet->setCellValue("B{$r}", $student['name']);
            $riskSheet->setCellValue("C{$r}", $student['class']);
            $riskSheet->setCellValue("D{$r}", $student['average']);
            $riskSheet->setCellValue("E{$r}", $student['failedSubjects']);
            $r++;
        }

        foreach (['A' => 5, 'B' => 30, 'C' => 15, 'D' => 15, 'E' => 18] as $col => $width) {
            $riskSheet->getColumnDimension($col)->setWidth($width);
        }

        // === Sheet 3: Top Students ===
        $topSheet = $spreadsheet->createSheet();
        $topSheet->setTitle('Uğurlu Şagirdlər');

        $topSheet->setCellValue('A1', 'Ən Yüksək Nəticə Göstərənlər (Ortalama ≥ 85)');
        $topSheet->mergeCells('A1:E1');
        $topSheet->getStyle('A1')->applyFromArray($headerStyle);

        $topSheet->setCellValue('A2', '#');
        $topSheet->setCellValue('B2', 'Ad Soyad');
        $topSheet->setCellValue('C2', 'Sinif');
        $topSheet->setCellValue('D2', 'Ortalama');
        $topSheet->setCellValue('E2', 'Ən güclü fənn');
        $topSheet->getStyle('A2:E2')->getFont()->setBold(true);

        $r = 3;
        foreach ($deepDiveData['topStudents'] as $i => $student) {
            $topSheet->setCellValue("A{$r}", $i + 1);
            $topSheet->setCellValue("B{$r}", $student['name']);
            $topSheet->setCellValue("C{$r}", $student['class']);
            $topSheet->setCellValue("D{$r}", $student['average']);
            $topSheet->setCellValue("E{$r}", $student['bestSubject']);
            $r++;
        }

        foreach (['A' => 5, 'B' => 30, 'C' => 15, 'D' => 15, 'E' => 25] as $col => $width) {
            $topSheet->getColumnDimension($col)->setWidth($width);
        }

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * Export comprehensive analysis: 4 sheets
     */
    public function exportComprehensive(array $overviewData, array $classLevelData, array $completionData, array $deepDiveData): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;

        $hdrStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E40AF']],
        ];
        $subHdrStyle = [
            'font' => ['bold' => true],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
        ];

        // === Sheet 1: Ümumi Baxış ===
        $s1 = $spreadsheet->getActiveSheet();
        $s1->setTitle('Ümumi Baxış');
        $s1->setCellValue('A1', 'Ümumi Baxış — ' . now()->format('d.m.Y'));
        $s1->mergeCells('A1:C1');
        $s1->getStyle('A1')->applyFromArray($hdrStyle);

        $row = 3;
        foreach ([
            ['Cəmi şagird', $overviewData['totalStudents']],
            ['Cəmi jurnal', $overviewData['totalJournals']],
            ['Aktiv jurnal', $overviewData['activeJournals']],
            ['Arxiv jurnal', $overviewData['archivedJournals']],
            ['İmtahan sütunu', $overviewData['examCount']],
            ['Ortalama bal', $overviewData['averageScore']],
            ['Ən yüksək bal', $overviewData['highestScore']],
        ] as [$lbl, $val]) {
            $s1->setCellValue("A{$row}", $lbl);
            $s1->setCellValue("B{$row}", $val);
            $row++;
        }

        $row += 2;
        $s1->setCellValue("A{$row}", 'Fənn');
        $s1->setCellValue("B{$row}", 'Ortalama bal');
        $s1->getStyle("A{$row}:B{$row}")->applyFromArray($subHdrStyle);
        $row++;
        foreach ($overviewData['subjectAverages'] as $sub) {
            $s1->setCellValue("A{$row}", $sub['subject']);
            $s1->setCellValue("B{$row}", $sub['average']);
            $row++;
        }
        foreach (['A' => 35, 'B' => 18, 'C' => 15] as $c => $w) {
            $s1->getColumnDimension($c)->setWidth($w);
        }

        // === Sheet 2: Sinif Səviyyəsi × Fənn ===
        $s2 = $spreadsheet->createSheet();
        $s2->setTitle('Sinif Analizi');
        $headers = ['Sinif səv.', 'Fənn', 'Məktəb sayı', 'Jurnal', 'Şagird', 'Ort. bal', 'Min', 'Max', '30-dan az', '30-dan az %', 'Keçid %'];
        foreach ($headers as $i => $h) {
            $s2->setCellValueByColumnAndRow($i + 1, 1, $h);
        }
        $s2->getStyle('A1:K1')->applyFromArray($subHdrStyle);
        $r = 2;
        foreach ($classLevelData['rows'] as $row2) {
            $s2->setCellValue("A{$r}", $row2['class_level']);
            $s2->setCellValue("B{$r}", $row2['subject_name']);
            $s2->setCellValue("C{$r}", $row2['institution_count']);
            $s2->setCellValue("D{$r}", $row2['journal_count']);
            $s2->setCellValue("E{$r}", $row2['student_count']);
            $s2->setCellValue("F{$r}", $row2['avg_score']);
            $s2->setCellValue("G{$r}", $row2['min_score']);
            $s2->setCellValue("H{$r}", $row2['max_score']);
            $s2->setCellValue("I{$r}", $row2['below_30_count']);
            $s2->setCellValue("J{$r}", $row2['below_30_pct'] . '%');
            $s2->setCellValue("K{$r}", $row2['pass_rate'] . '%');
            $r++;
        }
        foreach (['A' => 12, 'B' => 28, 'C' => 13, 'D' => 10, 'E' => 10, 'F' => 12, 'G' => 8, 'H' => 8, 'I' => 14, 'J' => 14, 'K' => 12] as $c => $w) {
            $s2->getColumnDimension($c)->setWidth($w);
        }

        // === Sheet 3: Jurnal Dolduruluşu ===
        $s3 = $spreadsheet->createSheet();
        $s3->setTitle('Jurnal Dolduruluşu');
        $hd3 = ['Məktəb', 'Sektor', 'Cəmi jurnal', 'Aktiv', 'Dolu', 'Boş', 'Dolduruluş %', 'Son giriş'];
        foreach ($hd3 as $i => $h) {
            $s3->setCellValueByColumnAndRow($i + 1, 1, $h);
        }
        $s3->getStyle('A1:H1')->applyFromArray($subHdrStyle);
        $r = 2;
        foreach ($completionData['rows'] as $row3) {
            $s3->setCellValue("A{$r}", $row3['institution_name']);
            $s3->setCellValue("B{$r}", $row3['sector_name']);
            $s3->setCellValue("C{$r}", $row3['total_journals']);
            $s3->setCellValue("D{$r}", $row3['active_journals']);
            $s3->setCellValue("E{$r}", $row3['journals_with_data']);
            $s3->setCellValue("F{$r}", $row3['journals_empty']);
            $s3->setCellValue("G{$r}", $row3['fill_rate'] . '%');
            $s3->setCellValue("H{$r}", $row3['last_entry_date'] ?? '-');
            $r++;
        }
        // Summary row
        $r++;
        $s3->setCellValue("A{$r}", 'YEKUN');
        $s3->setCellValue("C{$r}", $completionData['summary']['total_institutions'] . ' məktəb');
        $s3->setCellValue("G{$r}", $completionData['summary']['avg_fill_rate'] . '% (ort.)');
        $s3->getStyle("A{$r}:H{$r}")->getFont()->setBold(true);
        foreach (['A' => 40, 'B' => 20, 'C' => 13, 'D' => 10, 'E' => 10, 'F' => 8, 'G' => 15, 'H' => 14] as $c => $w) {
            $s3->getColumnDimension($c)->setWidth($w);
        }

        // === Sheet 4: Risk Şagirdlər (avg < 50) ===
        $s4 = $spreadsheet->createSheet();
        $s4->setTitle('Risk Şagirdlər');
        $hd4 = ['#', 'Ad Soyad', 'Sinif', 'Ortalama bal', 'Zəif fənn sayı'];
        foreach ($hd4 as $i => $h) {
            $s4->setCellValueByColumnAndRow($i + 1, 1, $h);
        }
        $s4->getStyle('A1:E1')->applyFromArray($subHdrStyle);
        $r = 2;
        foreach ($deepDiveData['riskStudents'] as $i => $student) {
            $s4->setCellValue("A{$r}", $i + 1);
            $s4->setCellValue("B{$r}", $student['name']);
            $s4->setCellValue("C{$r}", $student['class']);
            $s4->setCellValue("D{$r}", $student['average']);
            $s4->setCellValue("E{$r}", $student['failedSubjects']);
            $r++;
        }
        foreach (['A' => 5, 'B' => 30, 'C' => 15, 'D' => 14, 'E' => 18] as $c => $w) {
            $s4->getColumnDimension($c)->setWidth($w);
        }

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }
}
