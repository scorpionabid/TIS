<?php

namespace Tests\Feature\ImportExport;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\Role;
use App\Models\User;
use App\Services\StudentImportExportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Models\Role as SpatieRole;
use Tests\TestCase;

class StudentImportExportTest extends TestCase
{
    use RefreshDatabase;

    private array $headers = [
        'Ad',
        'Soyad',
        'Ata adı',
        'İstifadəçi adı',
        'Email',
        'Şifrə',
        'Telefon',
        'Doğum tarixi',
        'Cins',
        'Şəxsiyyət vəsiqəsi',
        'Qurum ID',
        'Sinif ID',
        'Ünvan',
        'Təcili əlaqə (Ad)',
        'Təcili əlaqə (Telefon)',
        'Təcili əlaqə (Email)',
        'Qeydlər',
        'Status',
    ];

    public function test_student_import_processes_rows_and_reports_errors(): void
    {
        [$institution, $grade, $superAdmin] = $this->prepareImportContext();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray($this->headers, null, 'A1');

        $sheet->fromArray([
            [
                'Nigar',
                'Əliyeva',
                'Kamran',
                'nigar.aliyeva',
                'nigar@example.com',
                'securePass123',
                '+994501112233',
                '2011-04-10',
                'female',
                'AZE9876543',
                (string) $institution->id,
                (string) $grade->id,
                'Bakı, Yasamal',
                'Gülər Əliyeva',
                '+994551112233',
                'guler@example.com',
                'İngilis dili üzrə güclü',
                'active',
            ],
            [
                'Kamran',
                'Məmmədov',
                '',
                'kamran.memmedov',
                'kamran@example.com',
                'student123',
                '',
                '2012-09-21',
                'male',
                '',
                '999999', // Non-existing institution to trigger validation error
                (string) $grade->id,
                '',
                '',
                '',
                '',
                '',
                'active',
            ],
        ], null, 'A2');

        $tempPath = tempnam(sys_get_temp_dir(), 'student-import-') . '.xlsx';
        (new Xlsx($spreadsheet))->save($tempPath);

        $uploadedFile = new UploadedFile(
            $tempPath,
            'students.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $service = app(StudentImportExportService::class);
        $results = $service->processImportFile($uploadedFile, $superAdmin);

        unlink($tempPath);

        $this->assertSame(1, $results['success']);
        $this->assertCount(1, $results['created_students']);
        $this->assertTrue(
            collect($results['errors'])->contains(
                fn (string $error) => str_contains($error, 'Qurum tapılmadı')
            )
        );

        $this->assertDatabaseHas('users', [
            'username' => 'nigar.aliyeva',
            'institution_id' => $institution->id,
        ]);

        $createdStudent = User::where('username', 'nigar.aliyeva')->first();
        $this->assertNotNull($createdStudent);
        $this->assertSame('Nigar', $createdStudent->profile->first_name);
        $this->assertSame($institution->id, $createdStudent->institution_id);
    }

    public function test_generate_import_template_creates_expected_headers(): void
    {
        $service = app(StudentImportExportService::class);

        $filePath = $service->generateImportTemplate('students_template_test.xlsx');

        $this->assertFileExists($filePath);

        $loadedSpreadsheet = IOFactory::load($filePath);
        $loadedSheet = $loadedSpreadsheet->getActiveSheet();
        $loadedHeaders = $loadedSheet->rangeToArray('A1:R1')[0];

        $this->assertSame($this->headers, $loadedHeaders);

        unlink($filePath);
    }

    private function prepareImportContext(): array
    {
        $institution = Institution::factory()->school()->create(['level' => 4]);
        $today = now();

        $academicYear = AcademicYear::factory()->create([
            'name' => $today->format('Y') . '-' . $today->copy()->addYear()->format('Y'),
            'start_date' => $today->copy()->subMonths(2),
            'end_date' => $today->copy()->addMonths(10),
            'is_active' => true,
        ]);

        $grade = Grade::create([
            'name' => '5A',
            'class_level' => 5,
            'academic_year_id' => $academicYear->id,
            'institution_id' => $institution->id,
            'room_id' => null,
            'homeroom_teacher_id' => null,
            'student_count' => 0,
            'specialty' => null,
            'metadata' => [],
            'is_active' => true,
        ]);

        Role::firstOrCreate(
            ['name' => 'şagird'],
            [
                'display_name' => 'Şagird',
                'description' => 'Təhsil alan istifadəçilər',
                'guard_name' => 'web',
                'level' => 1,
                'department_access' => [],
                'max_institutions' => 1,
                'is_active' => true,
            ]
        );

        SpatieRole::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        $superAdmin = User::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);

        $superAdmin->assignRole('superadmin');

        return [$institution, $grade, $superAdmin];
    }
}
