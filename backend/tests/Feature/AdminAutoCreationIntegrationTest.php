<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\InstitutionType;
use App\Models\Role;
use App\Models\User;
use App\Services\Import\InstitutionImportOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AdminAutoCreationIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected InstitutionImportOrchestrator $orchestrator;
    protected InstitutionType $schoolType;
    protected InstitutionType $kindergartenType;
    protected InstitutionType $administrativeType;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test data
        $this->setupTestRoles();
        $this->setupInstitutionTypes();
        
        $this->orchestrator = new InstitutionImportOrchestrator();
        Storage::fake('local');
    }

    public function test_school_admin_creation_with_full_data()
    {
        // Create Excel file with school data including admin info
        $file = $this->createSchoolExcelFile([
            ['', 'Test Məktəb 1', 'TM1', '4', '4', 'ZQ', 'TM001', '450', '28', '18', 'Müdir Adı', '+994551234567', 'test@school.az', 'Test ünvan', 'admin@test.az', 'schooladmin', 'Admin', 'Soyad', '+994501234567', 'Test admin qeydləri', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->schoolType,
            ['create_admin_always' => true]
        );

        // Assert institution created
        $this->assertTrue($result['success'] > 0);
        $this->assertCount(1, $result['created_institutions']);
        
        // Assert admin created
        $this->assertEquals(1, $result['admin_statistics']['admins_created']);
        $this->assertEquals(0, $result['admin_statistics']['admins_skipped']);
        $this->assertEquals(0, $result['admin_statistics']['admin_errors']);

        // Verify admin user exists
        $admin = User::where('email', 'admin@test.az')->first();
        $this->assertNotNull($admin);
        $this->assertEquals('schooladmin', $admin->username);
        $this->assertTrue($admin->hasRole('school_admin'));
        
        // Verify admin is linked to institution
        $institution = Institution::where('name', 'Test Məktəb 1')->first();
        $this->assertEquals($institution->id, $admin->institution_id);
        
        // Verify admin preferences stored correctly
        $preferences = $admin->preferences;
        $this->assertEquals('Admin', $preferences['first_name']);
        $this->assertEquals('Soyad', $preferences['last_name']);
        $this->assertEquals('+994501234567', $preferences['phone']);
        $this->assertTrue($preferences['auto_generated']);
        $this->assertTrue($preferences['created_via_import']);
    }

    public function test_kindergarten_admin_creation()
    {
        $file = $this->createKindergartenExcelFile([
            ['', 'Test Bağça', 'TB', '4', '4', 'ZQ', 'TB001', '85', '12', '5', 'Müdir', '+994553456789', 'bagca@test.az', 'Bağça ünvan', 'bagca.admin@test.az', 'bagcaadmin', 'Bağça', 'Admin', '+994502345678', '', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->kindergartenType,
            ['create_admin_always' => true]
        );

        // Verify kindergarten admin created with correct role
        $admin = User::where('email', 'bagca.admin@test.az')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasRole('school_admin')); // Kindergartens use school_admin role
        $this->assertEquals(1, $result['admin_statistics']['admins_created']);
    }

    public function test_administrative_type_admin_creation()
    {
        $file = $this->createAdministrativeExcelFile([
            ['', 'Test Regional İdarə', 'TRI', '1', '2', 'MN', 'TRI001', '+994556789012', 'region@test.az', 'Regional mərkəz', 'Regional idarə', 'region.admin@test.az', 'regionadmin', 'Region', 'Admin', '+994503456789', 'Regional admin', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->administrativeType,
            ['create_admin_always' => true]
        );

        // Verify administrative admin created with correct role
        $admin = User::where('email', 'region.admin@test.az')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasRole('region_admin'));
        $this->assertEquals(1, $result['admin_statistics']['admins_created']);
    }

    public function test_admin_creation_with_duplicate_email()
    {
        // Create existing admin
        User::factory()->create([
            'email' => 'existing@test.az',
            'username' => 'existing'
        ]);

        $file = $this->createSchoolExcelFile([
            ['', 'Test Məktəb', 'TM', '4', '4', 'ZQ', 'TM001', '450', '28', '18', 'Müdir', '+994551234567', 'test@school.az', 'Test ünvan', 'existing@test.az', 'newadmin', 'New', 'Admin', '+994501234567', '', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->schoolType,
            ['create_admin_always' => true]
        );

        // Institution should be created, admin should be skipped
        $this->assertEquals(1, $result['success']);
        $this->assertEquals(0, $result['admin_statistics']['admins_created']);
        $this->assertEquals(1, $result['admin_statistics']['admins_skipped']);
        
        // Should not create duplicate
        $this->assertEquals(1, User::where('email', 'existing@test.az')->count());
    }

    public function test_admin_creation_without_admin_data()
    {
        $file = $this->createSchoolExcelFile([
            ['', 'Test Məktəb', 'TM', '4', '4', 'ZQ', 'TM001', '450', '28', '18', 'Müdir', '+994551234567', 'test@school.az', 'Test ünvan', '', '', '', '', '', '', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->schoolType,
            ['create_admin_always' => false]
        );

        // Institution created, no admin created
        $this->assertEquals(1, $result['success']);
        $this->assertEquals(0, $result['admin_statistics']['admins_created']);
        $this->assertEquals(1, $result['admin_statistics']['admins_skipped']);
    }

    public function test_admin_creation_failure_does_not_block_institution()
    {
        $file = $this->createSchoolExcelFile([
            ['', 'Test Məktəb', 'TM', '4', '4', 'ZQ', 'TM001', '450', '28', '18', 'Müdir', '+994551234567', 'test@school.az', 'Test ünvan', 'invalid-email', 'admin', 'Admin', 'User', '+994501234567', '', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->schoolType,
            ['create_admin_always' => true]
        );

        // Institution should still be created
        $this->assertEquals(1, $result['success']);
        $this->assertEquals(0, $result['admin_statistics']['admins_created']);
        $this->assertEquals(1, $result['admin_statistics']['admin_errors']);
        
        // Verify institution exists
        $this->assertNotNull(Institution::where('name', 'Test Məktəb')->first());
        
        // Verify admin was not created
        $this->assertNull(User::where('email', 'invalid-email')->first());
    }

    public function test_batch_import_with_mixed_admin_data()
    {
        $file = $this->createSchoolExcelFile([
            ['', 'Məktəb 1', 'M1', '4', '4', 'ZQ', 'M001', '450', '28', '18', 'Müdir 1', '+994551234567', 'm1@test.az', 'Ünvan 1', 'admin1@test.az', 'admin1', 'Admin', 'Bir', '+994501111111', '', 'active'],
            ['', 'Məktəb 2', 'M2', '4', '4', 'ZQ', 'M002', '380', '25', '16', 'Müdir 2', '+994552345678', 'm2@test.az', 'Ünvan 2', '', '', '', '', '', '', 'active'],
            ['', 'Məktəb 3', 'M3', '4', '4', 'ZQ', 'M003', '320', '22', '14', 'Müdir 3', '+994553456789', 'm3@test.az', 'Ünvan 3', 'admin3@test.az', 'admin3', 'Admin', 'Üç', '+994503333333', '', 'active']
        ]);

        $result = $this->orchestrator->processImport(
            $file,
            $this->schoolType,
            ['create_admin_always' => false]
        );

        // All institutions created
        $this->assertEquals(3, $result['success']);
        
        // Only 2 admins created (rows 1 and 3)
        $this->assertEquals(2, $result['admin_statistics']['admins_created']);
        $this->assertEquals(1, $result['admin_statistics']['admins_skipped']);
        
        // Verify specific admins
        $this->assertNotNull(User::where('email', 'admin1@test.az')->first());
        $this->assertNotNull(User::where('email', 'admin3@test.az')->first());
        $this->assertNull(User::where('username', 'admin2')->first());
    }

    private function setupTestRoles()
    {
        Role::create(['name' => 'school_admin', 'guard_name' => 'web', 'display_name' => 'Məktəb Administratoru']);
        Role::create(['name' => 'region_admin', 'guard_name' => 'web', 'display_name' => 'Region Administratoru']);
        Role::create(['name' => 'sector_admin', 'guard_name' => 'web', 'display_name' => 'Sektor Administratoru']);
    }

    private function setupInstitutionTypes()
    {
        $this->schoolType = InstitutionType::create([
            'key' => 'secondary_school',
            'name' => 'Orta məktəb',
            'description' => 'Test məktəb',
            'is_active' => true,
            'metadata' => []
        ]);

        $this->kindergartenType = InstitutionType::create([
            'key' => 'kindergarten',
            'name' => 'Uşaq bağçası',
            'description' => 'Test bağça',
            'is_active' => true,
            'metadata' => []
        ]);

        $this->administrativeType = InstitutionType::create([
            'key' => 'regional_education_department',
            'name' => 'Regional İdarə',
            'description' => 'Test idarə',
            'is_active' => true,
            'metadata' => []
        ]);
    }

    private function createSchoolExcelFile(array $data): UploadedFile
    {
        return $this->createExcelFile($data, [
            'Sıra', 'Ad *', 'Qısa Ad', 'Valideyn ID', 'Səviyyə', 'Region Kodu', 'Müəssisə Kodu',
            'Şagird Sayı', 'Müəllim Sayı', 'Sinif Sayı', 'Direktor Adı', 'Telefon', 'Email', 'Ünvan',
            'Admin Email *', 'Admin Username', 'Admin Ad', 'Admin Soyad', 'Admin Telefon', 'Admin Qeydlər',
            'Status (boş buraxsanız avtomatik aktiv olacaq)'
        ]);
    }

    private function createKindergartenExcelFile(array $data): UploadedFile
    {
        return $this->createExcelFile($data, [
            'Sıra', 'Ad *', 'Qısa Ad', 'Valideyn ID', 'Səviyyə', 'Region Kodu', 'Müəssisə Kodu',
            'Uşaq Sayı', 'Tərbiyəçi Sayı', 'Qrup Sayı', 'Müdir Adı', 'Telefon', 'Email', 'Ünvan',
            'Admin Email *', 'Admin Username', 'Admin Ad', 'Admin Soyad', 'Admin Telefon', 'Admin Qeydlər',
            'Status (boş buraxsanız avtomatik aktiv olacaq)'
        ]);
    }

    private function createAdministrativeExcelFile(array $data): UploadedFile
    {
        return $this->createExcelFile($data, [
            'Sıra', 'Ad *', 'Qısa Ad', 'Valideyn ID', 'Səviyyə', 'Region Kodu', 'Müəssisə Kodu',
            'Telefon *', 'Email', 'Ünvan *', 'Açıqlama',
            'Admin Email *', 'Admin Username', 'Admin Ad', 'Admin Soyad', 'Admin Telefon', 'Admin Qeydlər',
            'Status (boş buraxsanız avtomatik aktiv olacaq)'
        ]);
    }

    private function createExcelFile(array $data, array $headers): UploadedFile
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        foreach ($headers as $index => $header) {
            $sheet->setCellValue(chr(65 + $index) . '1', $header);
        }

        // Set data
        foreach ($data as $rowIndex => $row) {
            foreach ($row as $colIndex => $value) {
                $sheet->setCellValue(chr(65 + $colIndex) . ($rowIndex + 2), $value);
            }
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'test_import_') . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempFile);

        return new UploadedFile($tempFile, 'test_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }
}