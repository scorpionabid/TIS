<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\Role;
use App\Models\User;
use Exception;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class StudentImportExportService extends BaseService
{
    protected $studentManagementService;

    public function __construct(StudentManagementService $studentManagementService)
    {
        $this->studentManagementService = $studentManagementService;
    }

    /**
     * Generate import template for students
     */
    public function generateImportTemplate($fileName): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = [
            'Ad', 'Soyad', 'Ata adı', 'İstifadəçi adı', 'Email', 'Şifrə',
            'Telefon', 'Doğum tarixi', 'Cins', 'Şəxsiyyət vəsiqəsi', 'Qurum ID',
            'Sinif ID', 'Ünvan', 'Təcili əlaqə (Ad)', 'Təcili əlaqə (Telefon)',
            'Təcili əlaqə (Email)', 'Qeydlər', 'Status',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
            $sheet->getStyle(chr(65 + $index) . '1')->getFont()->setBold(true);
        }

        // Add sample data
        $sampleData = [
            [
                'Əhməd', 'Məmmədov', 'Əli', 'ahmed.memmedov', 'ahmed@student.edu.az', 'student123',
                '+994501234567', '2010-05-15', 'male', 'AZE1234567', '32',
                '15', 'Bakı şəhəri, Nəsimi rayonu', 'Fatimə Məmmədova', '+994701234567',
                'fatime@example.com', 'Yaxşı şagirddir', 'active',
            ],
            [
                'Leyla', 'Həsənova', 'Rəşad', 'leyla.hasanova', '', '',
                '', '2011-03-20', 'female', '', '32',
                '14', 'Bakı şəhəri, Yasamal rayonu', 'Gülnar Həsənova', '+994551234567',
                '', 'Dil fənlərində güclüdür', 'active',
            ],
        ];

        foreach ($sampleData as $rowIndex => $data) {
            foreach ($data as $colIndex => $value) {
                $sheet->setCellValue(chr(65 + $colIndex) . ($rowIndex + 2), $value);
            }
        }

        // Style the sheet
        foreach (range('A', 'R') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
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
     * Process import file and create students
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

            $studentRole = Role::where('name', 'şagird')->firstOrFail();

            foreach ($data as $index => $row) {
                try {
                    $rowNum = $index + 2; // Account for header row

                    // Skip empty rows
                    if (empty(trim($row[0])) && empty(trim($row[1]))) {
                        continue;
                    }

                    // Validate required fields
                    if (empty(trim($row[0])) || empty(trim($row[1]))) {
                        $results['errors'][] = "Sətir {$rowNum}: Ad və soyad sahələri tələb olunur";

                        continue;
                    }

                    // Prepare student data
                    $studentData = [
                        'first_name' => trim($row[0]),
                        'last_name' => trim($row[1]),
                        'patronymic' => trim($row[2]) ?: null,
                        'username' => trim($row[3]) ?: null,
                        'email' => trim($row[4]) ?: null,
                        'password' => trim($row[5]) ?: 'student123',
                        'contact_phone' => trim($row[6]) ?: null,
                        'birth_date' => ! empty(trim($row[7])) ? $this->parseDate(trim($row[7])) : null,
                        'gender' => in_array(trim($row[8]), ['male', 'female']) ? trim($row[8]) : null,
                        'national_id' => trim($row[9]) ?: null,
                        'institution_id' => ! empty(trim($row[10])) ? (int) trim($row[10]) : null,
                        'class_id' => ! empty(trim($row[11])) ? (int) trim($row[11]) : null,
                        'address' => trim($row[12]) ?: null,
                        'emergency_contact_name' => trim($row[13]) ?: null,
                        'emergency_contact_phone' => trim($row[14]) ?: null,
                        'emergency_contact_email' => trim($row[15]) ?: null,
                        'notes' => trim($row[16]) ?: null,
                        'is_active' => trim($row[17]) !== 'inactive',
                    ];

                    // Validate institution
                    if ($studentData['institution_id']) {
                        if (! Institution::where('id', $studentData['institution_id'])->exists()) {
                            $results['errors'][] = "Sətir {$rowNum}: Qurum tapılmadı: {$studentData['institution_id']}";

                            continue;
                        }

                        // Check if user can access this institution
                        $institution = Institution::find($studentData['institution_id']);
                        if (! $this->studentManagementService->canManageStudentsInInstitution($user, $institution->id)) {
                            $results['errors'][] = "Sətir {$rowNum}: Bu quruma şagird əlavə etmək icazəniz yoxdur";

                            continue;
                        }
                    } else {
                        // Use user's institution if not specified
                        $studentData['institution_id'] = $user->institution_id;
                    }

                    // Validate class/grade
                    if ($studentData['class_id']) {
                        $grade = Grade::where('id', $studentData['class_id'])
                            ->where('institution_id', $studentData['institution_id'])
                            ->first();
                        if (! $grade) {
                            $results['errors'][] = "Sətir {$rowNum}: Bu qurumda sinif tapılmadı: {$studentData['class_id']}";

                            continue;
                        }
                    }

                    // Validate username uniqueness if provided
                    if ($studentData['username']) {
                        if (User::where('username', $studentData['username'])->exists()) {
                            $results['errors'][] = "Sətir {$rowNum}: İstifadəçi adı artıq mövcuddur: {$studentData['username']}";

                            continue;
                        }
                    }

                    // Validate email uniqueness if provided
                    if ($studentData['email']) {
                        if (User::where('email', $studentData['email'])->exists()) {
                            $results['errors'][] = "Sətir {$rowNum}: Email artıq mövcuddur: {$studentData['email']}";

                            continue;
                        }
                    }

                    // Create student
                    $student = $this->studentManagementService->createStudent($studentData, $user);

                    $results['success']++;
                    $results['created_students'][] = [
                        'id' => $student->id,
                        'name' => $student->profile->first_name . ' ' . $student->profile->last_name,
                        'username' => $student->username,
                        'institution' => $student->institution->name ?? '',
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
     * Generate export file for students
     */
    public function generateExportFile($students, $fileName): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = [
            'ID', 'Ad', 'Soyad', 'Ata adı', 'İstifadəçi adı', 'Email',
            'Telefon', 'Doğum tarixi', 'Cins', 'Şəxsiyyət vəsiqəsi',
            'Qurum', 'Sinif', 'Qeydiyyat tarixi', 'Şagird nömrəsi',
            'Ünvan', 'Təcili əlaqə (Ad)', 'Təcili əlaqə (Telefon)',
            'Status', 'Son giriş', 'Yaradılma tarixi',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
            $sheet->getStyle(chr(65 + $index) . '1')->getFont()->setBold(true);
        }

        // Add data rows
        foreach ($students as $index => $student) {
            $row = $index + 2;
            $profile = $student->profile;
            $enrollment = $student->studentEnrollments->where('is_active', true)->first();

            $sheet->setCellValue('A' . $row, $student->id);
            $sheet->setCellValue('B' . $row, $profile->first_name ?? '');
            $sheet->setCellValue('C' . $row, $profile->last_name ?? '');
            $sheet->setCellValue('D' . $row, $profile->patronymic ?? '');
            $sheet->setCellValue('E' . $row, $student->username);
            $sheet->setCellValue('F' . $row, $student->email);
            $sheet->setCellValue('G' . $row, $profile->contact_phone ?? '');
            $sheet->setCellValue('H' . $row, $profile->birth_date ?? '');
            $sheet->setCellValue('I' . $row, $profile->gender ?? '');
            $sheet->setCellValue('J' . $row, $profile->national_id ?? '');
            $sheet->setCellValue('K' . $row, $student->institution->name ?? '');
            $sheet->setCellValue('L' . $row, $enrollment->grade->name ?? '');
            $sheet->setCellValue('M' . $row, $enrollment->enrollment_date ?? '');
            $sheet->setCellValue('N' . $row, $enrollment->student_number ?? '');
            $sheet->setCellValue('O' . $row, $profile->address ?? '');
            $sheet->setCellValue('P' . $row, $profile->emergency_contact_name ?? '');
            $sheet->setCellValue('Q' . $row, $profile->emergency_contact_phone ?? '');
            $sheet->setCellValue('R' . $row, $student->is_active ? 'Aktiv' : 'Qeyri-aktiv');
            $sheet->setCellValue('S' . $row, $student->last_login_at ?? '');
            $sheet->setCellValue('T' . $row, $student->created_at);
        }

        // Auto-size columns
        foreach (range('A', 'T') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
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
