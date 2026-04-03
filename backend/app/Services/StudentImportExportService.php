<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use Exception;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class StudentImportExportService extends BaseService
{
    /**
     * Generate import template for students (Azerbaijani headers, 7 columns)
     * Column order: Ad, Soyad, Şagird Nömrəsi, Doğum tarixi, Cins, Qeydiyyat tarixi, Sinif
     */
    public function generateImportTemplate($fileName): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Şagirdlər');

        // Azerbaijani headers
        $headers = [
            'Ad',               // A - first_name (məcburi)
            'Soyad',            // B - last_name (məcburi)
            'Şagird Nömrəsi',   // C - student_number (məcburi)
            'Doğum tarixi',     // D - date_of_birth (YYYY-MM-DD)
            'Cins',             // E - gender: kişi / qadın / digər
            'Qeydiyyat tarixi', // F - enrollment_date (YYYY-MM-DD)
            'Sinif',            // G - grade name, e.g. 5-A
        ];

        foreach ($headers as $index => $header) {
            $col = chr(65 + $index) . '1';
            $sheet->setCellValue($col, $header);
            $sheet->getStyle($col)->getFont()->setBold(true);
            $sheet->getStyle($col)->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setRGB('D9E1F2');
        }

        // Sample data rows
        $sampleData = [
            ['Əhməd',  'Məmmədov', '1234567', '2010-05-15', 'kişi',  '2024-09-15', '5-A'],
            ['Leyla',  'Həsənova', '7654321', '2011-03-20', 'qadın', '2024-09-15', '4-B'],
        ];

        foreach ($sampleData as $rowIndex => $rowData) {
            foreach ($rowData as $colIndex => $value) {
                $sheet->setCellValue(chr(65 + $colIndex) . ($rowIndex + 2), $value);
            }
        }

        // Add a notes row
        $notesRow = count($sampleData) + 3;
        $sheet->setCellValue('A' . $notesRow, '* Ad, Soyad və Şagird Nömrəsi məcburidir. Cins: kişi / qadın / digər. Tarix formatı: YYYY-MM-DD');
        $sheet->getStyle('A' . $notesRow)->getFont()->setItalic(true)->setSize(9);
        $sheet->mergeCells('A' . $notesRow . ':G' . $notesRow);

        // Column widths
        $widths = ['A' => 18, 'B' => 18, 'C' => 18, 'D' => 16, 'E' => 10, 'F' => 18, 'G' => 10];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Save to temporary file
        $filePath = storage_path('app/temp/' . $fileName);
        if (! file_exists(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Process import file and create students.
     * Template columns (A–G):
     *   A: Ad (first_name) — məcburi
     *   B: Soyad (last_name) — məcburi
     *   C: Şagird Nömrəsi (student_number) — məcburi
     *   D: Doğum tarixi (YYYY-MM-DD)
     *   E: Cins (kişi / qadın / digər)
     *   F: Qeydiyyat tarixi (YYYY-MM-DD)
     *   G: Sinif (grade name, e.g. 5-A)
     */
    public function processImportFile($file, $user): array
    {
        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $data = $sheet->toArray();

            // Remove header row
            array_shift($data);

            $results = [
                'success' => 0,
                'errors' => [],
                'created_students' => [],
            ];

            // Resolve institution from authenticated user
            $institution = Institution::find($user->institution_id);
            if (! $institution) {
                throw new Exception('İstifadəçi heç bir qurum ilə əlaqəli deyil');
            }

            $schoolStudentService = app(SchoolStudentService::class);

            // Gender mapping: Azerbaijani → English DB values
            $genderMap = [
                'kişi' => 'male',
                'qadin' => 'female',
                'qadın' => 'female',
                'digər' => 'other',
                'diger' => 'other',
                'male' => 'male',
                'female' => 'female',
                'other' => 'other',
            ];

            foreach ($data as $index => $row) {
                $rowNum = $index + 2;

                // Skip blank rows
                if (empty(trim($row[0] ?? '')) && empty(trim($row[1] ?? ''))) {
                    continue;
                }

                // Skip notes/instruction rows (start with *)
                if (str_starts_with(trim($row[0] ?? ''), '*')) {
                    continue;
                }

                // Validate required fields
                if (empty(trim($row[0] ?? '')) || empty(trim($row[1] ?? ''))) {
                    $results['errors'][] = "Sətir {$rowNum}: Ad və soyad tələb olunur";

                    continue;
                }
                if (empty(trim($row[2] ?? ''))) {
                    $results['errors'][] = "Sətir {$rowNum}: Şagird nömrəsi tələb olunur";

                    continue;
                }

                // Check student_number uniqueness
                $studentNumber = trim($row[2]);
                if (Student::where('student_number', $studentNumber)->exists()) {
                    $results['errors'][] = "Sətir {$rowNum}: Şagird nömrəsi artıq mövcuddur: {$studentNumber}";

                    continue;
                }

                // Resolve grade within institution
                // Template format: "5-A" → class_level=5, name="A"
                $gradeId = null;
                $gradeRaw = trim($row[6] ?? '');
                if ($gradeRaw) {
                    $query = Grade::where('institution_id', $institution->id);

                    if (preg_match('/^(\d+)-(.+)$/', $gradeRaw, $m)) {
                        // "5-A" format — split into level + section name
                        $query->where('class_level', (int) $m[1])->where('name', trim($m[2]));
                    } else {
                        // Plain name fallback (e.g. just "A")
                        $query->where('name', $gradeRaw);
                    }

                    $grade = $query->first();
                    if (! $grade) {
                        $results['errors'][] = "Sətir {$rowNum}: Bu qurumda '{$gradeRaw}' sinfi tapılmadı";

                        continue;
                    }
                    $gradeId = $grade->id;
                }

                $genderRaw = strtolower(trim($row[4] ?? ''));
                $gender = $genderMap[$genderRaw] ?? null;

                $studentData = [
                    'first_name' => trim($row[0]),
                    'last_name' => trim($row[1]),
                    'student_number' => $studentNumber,
                    'date_of_birth' => ! empty(trim($row[3] ?? '')) ? $this->parseDate(trim($row[3])) : null,
                    'gender' => $gender,
                    'enrollment_date' => ! empty(trim($row[5] ?? '')) ? $this->parseDate(trim($row[5])) : null,
                    'grade_id' => $gradeId,
                ];

                try {
                    $student = $schoolStudentService->createStudent($institution, $studentData);
                    $results['success']++;
                    $results['created_students'][] = [
                        'id' => $student->id,
                        'name' => $student->first_name . ' ' . $student->last_name,
                    ];
                } catch (Exception $e) {
                    $results['errors'][] = "Sətir {$rowNum}: " . $e->getMessage();
                }
            }

            return $results;
        } catch (Exception $e) {
            throw new Exception('Fayl oxunarkən xəta: ' . $e->getMessage());
        }
    }

    /**
     * Generate export file for students (uses Student model from students table)
     */
    public function generateExportFile($students, $fileName): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Azerbaijani headers matching Student model fields
        $headers = [
            'ID',
            'Ad',
            'Soyad',
            'Şagird Nömrəsi',
            'Doğum tarixi',
            'Cins',
            'Sinif',
            'Sinif Səviyyəsi',
            'Qurum',
            'Status',
            'Yaradılma tarixi',
        ];

        foreach ($headers as $index => $header) {
            $col = chr(65 + $index) . '1';
            $sheet->setCellValue($col, $header);
            $sheet->getStyle($col)->getFont()->setBold(true);
        }

        $genderMap = ['male' => 'Kişi', 'female' => 'Qadın', 'other' => 'Digər'];

        // Add data rows — Student model fields
        $dataRowCount = 0;
        foreach ($students as $student) {
            $row = $dataRowCount + 2;

            // grade->class_level is the actual grade number (1-12)
            $gradeLevel = $student->grade->class_level ?? ($student->grade_level ?: '');
            $gradeName = $student->grade->name ?? ($student->class_name ?? '');

            $sheet->setCellValueExplicit('A' . $row, $student->id, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC);
            $sheet->setCellValue('B' . $row, $student->first_name);
            $sheet->setCellValue('C' . $row, $student->last_name);
            $sheet->setCellValue('D' . $row, $student->student_number ?? '');
            $sheet->setCellValue('E' . $row, $student->birth_date ? $student->birth_date->format('d.m.Y') : '');
            $sheet->setCellValue('F' . $row, $genderMap[$student->gender] ?? ($student->gender ?? ''));
            $sheet->setCellValue('G' . $row, $gradeName);
            $sheet->setCellValue('H' . $row, $gradeLevel);
            $sheet->setCellValue('I' . $row, $student->institution->name ?? '');
            $sheet->setCellValue('J' . $row, $student->is_active ? 'Aktiv' : 'Qeyri-aktiv');
            $sheet->setCellValue('K' . $row, $student->created_at ? $student->created_at->format('d.m.Y') : '');

            $dataRowCount++;
        }

        // Set explicit sheet dimensions to prevent phantom empty rows/columns
        $lastRow = $dataRowCount + 1; // header + data rows
        $sheet->calculateColumnWidths();
        foreach (range('A', 'K') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Freeze header row
        $sheet->freezePane('A2');

        // Set print area to actual data only
        $sheet->getPageSetup()->setPrintArea('A1:K' . $lastRow);

        // Save to temporary file
        $filePath = storage_path('app/temp/' . $fileName);
        if (! file_exists(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Get export statistics
     */
    public function getExportStats($students): array
    {
        $total = $students->count();
        $active = $students->where('is_active', true)->count();
        $inactive = $total - $active;

        // Group by institution
        $byInstitution = $students->groupBy('institution.name')
            ->map(function ($group) {
                return $group->count();
            });

        // Group by grade
        $byGrade = $students->flatMap(function ($student) {
            return $student->studentEnrollments->where('is_active', true)
                ->map(function ($enrollment) {
                    return $enrollment->grade->name;
                });
        })->countBy();

        // Group by gender
        $byGender = $students->map(function ($student) {
            return $student->profile->gender ?? 'unknown';
        })->countBy();

        // Age distribution
        $ageGroups = $students->map(function ($student) {
            if (! $student->profile->birth_date) {
                return 'unknown';
            }
            $age = \Carbon\Carbon::parse($student->profile->birth_date)->age;
            if ($age < 10) {
                return '6-10';
            }
            if ($age < 15) {
                return '10-15';
            }
            if ($age < 18) {
                return '15-18';
            }

            return '18+';
        })->countBy();

        return [
            'total' => $total,
            'active' => $active,
            'inactive' => $inactive,
            'by_institution' => $byInstitution,
            'by_grade' => $byGrade,
            'by_gender' => $byGender,
            'by_age_group' => $ageGroups,
        ];
    }

    /**
     * Parse date from various formats
     */
    private function parseDate($dateString): ?string
    {
        if (empty($dateString)) {
            return null;
        }

        try {
            // Try common date formats
            $formats = ['Y-m-d', 'd.m.Y', 'd/m/Y', 'Y-m-d H:i:s'];

            foreach ($formats as $format) {
                $date = \DateTime::createFromFormat($format, $dateString);
                if ($date !== false) {
                    return $date->format('Y-m-d');
                }
            }

            // Try using Carbon for more flexible parsing
            $date = \Carbon\Carbon::parse($dateString);

            return $date->format('Y-m-d');
        } catch (Exception $e) {
            return null;
        }
    }
}
