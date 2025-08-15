<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\TeachingLoad;
use App\Models\AcademicYear;
use App\Models\ClassAttendance;
use App\Models\Schedule;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class EndToEndWorkflowTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create all necessary permissions
        $this->createPermissions();
        
        // Create roles with permissions
        $this->createRoles();
        
        // Mock storage
        Storage::fake('local');
    }

    /** @test */
    public function complete_educational_workflow()
    {
        // 1. SETUP PHASE: Create educational hierarchy
        $this->createEducationalHierarchy();
        
        // 2. USER MANAGEMENT: Create users with roles
        $users = $this->createUsers();
        
        // 3. ACADEMIC SETUP: Create academic year, classes, subjects
        $academicData = $this->createAcademicData();
        
        // 4. TEACHING LOAD ASSIGNMENT: Assign teachers to classes
        $teachingLoads = $this->assignTeachingLoads($users, $academicData);
        
        // 5. SCHEDULE GENERATION: Create automatic schedule
        $schedule = $this->generateSchedule($users, $academicData, $teachingLoads);
        
        // 6. ATTENDANCE TRACKING: Record daily attendance
        $attendanceRecords = $this->recordAttendance($users, $academicData);
        
        // 7. DOCUMENT MANAGEMENT: Upload and share documents
        $documents = $this->manageDocuments($users);
        
        // 8. APPROVAL WORKFLOW: Admin approves attendance and schedules
        $this->performApprovalWorkflow($users, $attendanceRecords, $schedule);
        
        // 9. REPORTING: Generate statistics and reports
        $this->verifyReporting($academicData, $attendanceRecords);
        
        // 10. VERIFICATION: Ensure complete workflow integrity
        $this->verifyWorkflowIntegrity($users, $academicData, $teachingLoads, $schedule, $attendanceRecords, $documents);
    }

    private function createPermissions(): void
    {
        $permissions = [
            'institutions.read', 'institutions.create', 'institutions.update', 'institutions.delete',
            'users.read', 'users.create', 'users.update', 'users.delete',
            'schedules.read', 'schedules.create', 'schedules.update', 'schedules.delete', 'schedules.approve',
            'attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete', 'attendance.approve',
            'documents.read', 'documents.create', 'documents.update', 'documents.delete', 'documents.share'
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'sanctum']);
        }
    }

    private function createRoles(): void
    {
        $superadmin = Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $schooladmin = Role::create(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
        $teacher = Role::create(['name' => 'müəllim', 'guard_name' => 'sanctum']);

        // Give all permissions to superadmin
        $superadmin->givePermissionTo(Permission::all());
        
        // Give specific permissions to schooladmin
        $schooladmin->givePermissionTo([
            'institutions.read', 'users.read', 'users.create', 'users.update',
            'schedules.read', 'schedules.create', 'schedules.update', 'schedules.approve',
            'attendance.read', 'attendance.approve', 'documents.read', 'documents.create', 'documents.share'
        ]);
        
        // Give limited permissions to teacher
        $teacher->givePermissionTo([
            'schedules.read', 'attendance.read', 'attendance.create', 'attendance.update',
            'documents.read', 'documents.create'
        ]);
    }

    private function createEducationalHierarchy(): array
    {
        $ministry = Institution::create([
            'name' => 'Təhsil Nazirliyi',
            'name_en' => 'Ministry of Education',
            'type' => 'ministry',
            'level' => 1,
            'is_active' => true
        ]);

        $region = Institution::create([
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'name_en' => 'Baku City Education Department',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'region_code' => 'BK',
            'is_active' => true
        ]);

        $school = Institution::create([
            'name' => '№1 Orta Məktəb',
            'name_en' => 'Secondary School #1',
            'type' => 'school',
            'level' => 3,
            'parent_id' => $region->id,
            'capacity' => 500,
            'is_active' => true
        ]);

        return compact('ministry', 'region', 'school');
    }

    private function createUsers(): array
    {
        $school = Institution::where('type', 'school')->first();

        $superadmin = User::factory()->create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'username' => 'superadmin',
            'email' => 'superadmin@test.com',
            'institution_id' => $school->id,
            'is_active' => true
        ]);
        $superadmin->assignRole('superadmin');

        $admin = User::factory()->create([
            'first_name' => 'Məktəb',
            'last_name' => 'Admini',
            'username' => 'schooladmin',
            'email' => 'admin@school.com',
            'institution_id' => $school->id,
            'is_active' => true
        ]);
        $admin->assignRole('schooladmin');

        $teacher1 = User::factory()->create([
            'first_name' => 'Riyaziyyat',
            'last_name' => 'Müəllimi',
            'username' => 'math_teacher',
            'email' => 'math@school.com',
            'institution_id' => $school->id,
            'is_active' => true
        ]);
        $teacher1->assignRole('müəllim');

        $teacher2 = User::factory()->create([
            'first_name' => 'Fizika',
            'last_name' => 'Müəllimi',
            'username' => 'physics_teacher',
            'email' => 'physics@school.com',
            'institution_id' => $school->id,
            'is_active' => true
        ]);
        $teacher2->assignRole('müəllim');

        return compact('superadmin', 'admin', 'teacher1', 'teacher2');
    }

    private function createAcademicData(): array
    {
        $school = Institution::where('type', 'school')->first();

        $academicYear = AcademicYear::create([
            'name' => '2024-2025',
            'start_date' => now()->startOfYear()->addMonths(8),
            'end_date' => now()->startOfYear()->addMonths(17)->endOfMonth(),
            'is_active' => true
        ]);

        $class9A = Classes::create([
            'name' => '9A',
            'institution_id' => $school->id,
            'grade_level' => 9,
            'section' => 'A',
            'current_enrollment' => 25,
            'classroom_location' => '201'
        ]);

        $class10B = Classes::create([
            'name' => '10B',
            'institution_id' => $school->id,
            'grade_level' => 10,
            'section' => 'B',
            'current_enrollment' => 23,
            'classroom_location' => '301'
        ]);

        $mathSubject = Subject::create([
            'name' => 'Riyaziyyat',
            'short_name' => 'RIY',
            'code' => 'MATH',
            'default_weekly_hours' => 4
        ]);

        $physicsSubject = Subject::create([
            'name' => 'Fizika',
            'short_name' => 'FİZ',
            'code' => 'PHYS',
            'default_weekly_hours' => 3
        ]);

        return compact('academicYear', 'class9A', 'class10B', 'mathSubject', 'physicsSubject');
    }

    private function assignTeachingLoads(array $users, array $academicData): array
    {
        $loads = [];

        // Math teacher teaches 9A and 10B math
        $loads[] = TeachingLoad::create([
            'teacher_id' => $users['teacher1']->id,
            'class_id' => $academicData['class9A']->id,
            'subject_id' => $academicData['mathSubject']->id,
            'academic_year_id' => $academicData['academicYear']->id,
            'weekly_hours' => 4,
            'total_hours' => 144,
            'semester' => 'full',
            'status' => 'active'
        ]);

        $loads[] = TeachingLoad::create([
            'teacher_id' => $users['teacher1']->id,
            'class_id' => $academicData['class10B']->id,
            'subject_id' => $academicData['mathSubject']->id,
            'academic_year_id' => $academicData['academicYear']->id,
            'weekly_hours' => 4,
            'total_hours' => 144,
            'semester' => 'full',
            'status' => 'active'
        ]);

        // Physics teacher teaches 10B physics
        $loads[] = TeachingLoad::create([
            'teacher_id' => $users['teacher2']->id,
            'class_id' => $academicData['class10B']->id,
            'subject_id' => $academicData['physicsSubject']->id,
            'academic_year_id' => $academicData['academicYear']->id,
            'weekly_hours' => 3,
            'total_hours' => 108,
            'semester' => 'full',
            'status' => 'active'
        ]);

        return $loads;
    }

    private function generateSchedule(array $users, array $academicData, array $teachingLoads): Schedule
    {
        $this->actingAs($users['admin'], 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'name' => 'Həftəlik Cədvəl 2024-2025',
            'type' => 'weekly',
            'institution_id' => Institution::where('type', 'school')->first()->id,
            'academic_year_id' => $academicData['academicYear']->id,
            'effective_from' => now()->format('Y-m-d'),
            'effective_to' => now()->addMonths(6)->format('Y-m-d'),
            'schedule_data' => [
                'slots' => [
                    [
                        'class_id' => $academicData['class9A']->id,
                        'subject_id' => $academicData['mathSubject']->id,
                        'teacher_id' => $users['teacher1']->id,
                        'day_of_week' => 1,
                        'period_number' => 1,
                        'start_time' => '08:00',
                        'end_time' => '08:45',
                        'room_location' => '201'
                    ],
                    [
                        'class_id' => $academicData['class10B']->id,
                        'subject_id' => $academicData['physicsSubject']->id,
                        'teacher_id' => $users['teacher2']->id,
                        'day_of_week' => 1,
                        'period_number' => 2,
                        'start_time' => '08:50',
                        'end_time' => '09:35',
                        'room_location' => '301'
                    ]
                ]
            ],
            'notes' => 'Test schedule for workflow'
        ]);

        $response->assertStatus(201);
        
        return Schedule::latest()->first();
    }

    private function recordAttendance(array $users, array $academicData): array
    {
        $records = [];

        // Math teacher records attendance for 9A
        $this->actingAs($users['teacher1'], 'sanctum');

        $response = $this->postJson('/api/attendance', [
            'class_id' => $academicData['class9A']->id,
            'subject_id' => $academicData['mathSubject']->id,
            'attendance_date' => now()->format('Y-m-d'),
            'period_number' => 1,
            'start_time' => '08:00',
            'end_time' => '08:45',
            'total_students_registered' => 25,
            'students_present' => 23,
            'students_absent_excused' => 1,
            'students_absent_unexcused' => 1,
            'students_late' => 2,
            'lesson_status' => 'completed',
            'notes' => 'Good class participation'
        ]);

        $response->assertStatus(201);
        $records[] = ClassAttendance::latest()->first();

        // Physics teacher records attendance for 10B
        $this->actingAs($users['teacher2'], 'sanctum');

        $response = $this->postJson('/api/attendance', [
            'class_id' => $academicData['class10B']->id,
            'subject_id' => $academicData['physicsSubject']->id,
            'attendance_date' => now()->format('Y-m-d'),
            'period_number' => 2,
            'start_time' => '08:50',
            'end_time' => '09:35',
            'total_students_registered' => 23,
            'students_present' => 22,
            'students_absent_excused' => 0,
            'students_absent_unexcused' => 1,
            'students_late' => 1,
            'lesson_status' => 'completed',
            'notes' => 'Lab experiment completed successfully'
        ]);

        $response->assertStatus(201);
        $records[] = ClassAttendance::latest()->first();

        return $records;
    }

    private function manageDocuments(array $users): array
    {
        $documents = [];

        // Teacher uploads lesson plan
        $this->actingAs($users['teacher1'], 'sanctum');

        $file = UploadedFile::fake()->create('lesson_plan.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/documents-v2', [
            'file' => $file,
            'title' => 'Riyaziyyat Dərs Planı - 9A',
            'description' => '9A sinfi üçün həftəlik dərs planı',
            'category' => 'telimat',
            'access_level' => 'institution',
            'is_public' => false,
            'is_downloadable' => true,
            'is_viewable_online' => true
        ]);

        $response->assertStatus(201);
        $documents[] = Document::latest()->first();

        // Admin uploads official document
        $this->actingAs($users['admin'], 'sanctum');

        $file = UploadedFile::fake()->create('official_notice.pdf', 150, 'application/pdf');

        $response = $this->postJson('/api/documents-v2', [
            'file' => $file,
            'title' => 'Rəsmi Bildiriş',
            'description' => 'Bütün müəllimlər üçün rəsmi bildiriş',
            'category' => 'telimat',
            'access_level' => 'public',
            'is_public' => true,
            'is_downloadable' => true,
            'is_viewable_online' => true
        ]);

        $response->assertStatus(201);
        $documents[] = Document::latest()->first();

        return $documents;
    }

    private function performApprovalWorkflow(array $users, array $attendanceRecords, Schedule $schedule): void
    {
        $this->actingAs($users['admin'], 'sanctum');

        // Approve attendance records
        foreach ($attendanceRecords as $record) {
            $response = $this->postJson("/api/attendance/{$record->id}/approve", [
                'approval_status' => 'approved',
                'comments' => 'Attendance record reviewed and approved'
            ]);

            $response->assertStatus(200);
        }

        // Approve schedule
        $response = $this->postJson("/api/schedules/{$schedule->id}/approve", [
            'approval_status' => 'approved',
            'comments' => 'Schedule approved for implementation'
        ]);

        $response->assertStatus(200);
    }

    private function verifyReporting(array $academicData, array $attendanceRecords): void
    {
        // Get attendance statistics
        $response = $this->getJson('/api/attendance/statistics?' . http_build_query([
            'class_id' => $academicData['class9A']->id,
            'start_date' => now()->startOfMonth()->format('Y-m-d'),
            'end_date' => now()->endOfMonth()->format('Y-m-d')
        ]));

        $response->assertStatus(200);
        
        $stats = $response->json('data');
        $this->assertGreaterThan(0, $stats['total_lessons']);
        $this->assertArrayHasKey('avg_attendance_rate', $stats);
    }

    private function verifyWorkflowIntegrity(array $users, array $academicData, array $teachingLoads, Schedule $schedule, array $attendanceRecords, array $documents): void
    {
        // Verify users are created with correct roles
        $this->assertEquals('superadmin', $users['superadmin']->roles->first()->name);
        $this->assertEquals('schooladmin', $users['admin']->roles->first()->name);
        $this->assertEquals('müəllim', $users['teacher1']->roles->first()->name);

        // Verify academic structure
        $this->assertEquals('9A', $academicData['class9A']->name);
        $this->assertEquals('Riyaziyyat', $academicData['mathSubject']->name);
        $this->assertTrue($academicData['academicYear']->is_active);

        // Verify teaching loads are active
        foreach ($teachingLoads as $load) {
            $this->assertEquals('active', $load->status);
        }

        // Verify schedule is created and approved
        $schedule->refresh();
        $this->assertEquals('approved', $schedule->status);
        $this->assertNotNull($schedule->approved_by);

        // Verify attendance records are approved
        foreach ($attendanceRecords as $record) {
            $record->refresh();
            $this->assertEquals('approved', $record->approval_status);
            $this->assertNotNull($record->approved_by);
        }

        // Verify documents are uploaded and accessible
        foreach ($documents as $document) {
            $this->assertEquals('active', $document->status);
            $this->assertTrue(Storage::disk('local')->exists($document->file_path));
        }

        // Verify relationships and data integrity
        $this->assertDatabaseCount('institutions', 3); // ministry, region, school
        $this->assertDatabaseCount('users', 4); // superadmin, admin, 2 teachers
        $this->assertDatabaseCount('teaching_loads', 3);
        $this->assertDatabaseCount('schedules', 1);
        $this->assertDatabaseCount('class_attendance', 2);
        $this->assertDatabaseCount('documents', 2);
    }
}