<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\ClassAttendance;
use App\Models\Classes;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class ClassAttendanceControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $teacher;
    protected $admin;
    protected $institution;
    protected $class;
    protected $subject;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create permissions
        Permission::create(['name' => 'attendance.read', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'attendance.create', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'attendance.update', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'attendance.delete', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'attendance.approve', 'guard_name' => 'sanctum']);
        
        // Create roles
        $teacherRole = Role::create(['name' => 'müəllim', 'guard_name' => 'sanctum']);
        $adminRole = Role::create(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
        
        $teacherRole->givePermissionTo(['attendance.read', 'attendance.create', 'attendance.update']);
        $adminRole->givePermissionTo(['attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete', 'attendance.approve']);
        
        // Create test data
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school',
            'is_active' => true
        ]);
        
        $this->teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true
        ]);
        $this->teacher->assignRole('müəllim');
        
        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true
        ]);
        $this->admin->assignRole('schooladmin');
        
        $this->class = Classes::factory()->create([
            'institution_id' => $this->institution->id,
            'name' => '9A',
            'grade_level' => 9,
            'section' => 'A',
            'current_enrollment' => 25
        ]);
        
        $this->subject = Subject::factory()->create([
            'name' => 'Riyaziyyat',
            'short_name' => 'RIY',
            'code' => 'MATH',
            'default_weekly_hours' => 4
        ]);
    }

    /** @test */
    public function teacher_can_create_attendance_record()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $attendanceData = [
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
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
            'notes' => 'Test notes'
        ];

        $response = $this->postJson('/api/attendance', $attendanceData);

        $response->assertStatus(201)
                ->assertJson([
                    'success' => true,
                    'message' => 'Davamiyyət qeydi uğurla yaradıldı'
                ]);

        $this->assertDatabaseHas('class_attendance', [
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'students_present' => 23,
            'approval_status' => 'pending'
        ]);
    }

    /** @test */
    public function it_prevents_duplicate_attendance_records()
    {
        $this->actingAs($this->teacher, 'sanctum');

        // Create first attendance record
        ClassAttendance::factory()->create([
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'attendance_date' => now()->format('Y-m-d'),
            'period_number' => 1,
            'teacher_id' => $this->teacher->id
        ]);

        $attendanceData = [
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'attendance_date' => now()->format('Y-m-d'),
            'period_number' => 1,
            'start_time' => '08:00',
            'end_time' => '08:45',
            'total_students_registered' => 25,
            'students_present' => 23,
            'students_absent_excused' => 1,
            'students_absent_unexcused' => 1,
            'lesson_status' => 'completed'
        ];

        $response = $this->postJson('/api/attendance', $attendanceData);

        $response->assertStatus(409)
                ->assertJson([
                    'success' => false,
                    'message' => 'Bu tarix və dərs üçün artıq davamiyyət qeydi mövcuddur'
                ]);
    }

    /** @test */
    public function it_validates_attendance_numbers()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $attendanceData = [
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'attendance_date' => now()->format('Y-m-d'),
            'period_number' => 1,
            'start_time' => '08:00',
            'end_time' => '08:45',
            'total_students_registered' => 25,
            'students_present' => 20,
            'students_absent_excused' => 3,
            'students_absent_unexcused' => 5, // Total: 28 > 25
            'lesson_status' => 'completed'
        ];

        $response = $this->postJson('/api/attendance', $attendanceData);

        $response->assertStatus(422)
                ->assertJson([
                    'success' => false,
                    'message' => 'İştirak edən və qayıb şagirdlərin cəmi qeydiyyatlı şagird sayından çox ola bilməz'
                ]);
    }

    /** @test */
    public function teacher_can_update_pending_attendance()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $attendance = ClassAttendance::factory()->create([
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'approval_status' => 'pending',
            'students_present' => 20
        ]);

        $updateData = [
            'students_present' => 22,
            'students_absent_excused' => 2,
            'students_absent_unexcused' => 1,
            'notes' => 'Updated notes'
        ];

        $response = $this->putJson("/api/attendance/{$attendance->id}", $updateData);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Davamiyyət qeydi uğurla yeniləndi'
                ]);

        $attendance->refresh();
        $this->assertEquals(22, $attendance->students_present);
        $this->assertEquals('pending', $attendance->approval_status); // Should reset to pending
    }

    /** @test */
    public function it_prevents_editing_approved_attendance()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $attendance = ClassAttendance::factory()->create([
            'teacher_id' => $this->teacher->id,
            'approval_status' => 'approved'
        ]);

        $response = $this->putJson("/api/attendance/{$attendance->id}", [
            'students_present' => 20
        ]);

        $response->assertStatus(403)
                ->assertJson([
                    'success' => false,
                    'message' => 'Təsdiqlənmiş davamiyyət qeydini dəyişmək mümkün deyil'
                ]);
    }

    /** @test */
    public function admin_can_approve_attendance()
    {
        $this->actingAs($this->admin, 'sanctum');

        $attendance = ClassAttendance::factory()->create([
            'teacher_id' => $this->teacher->id,
            'approval_status' => 'pending'
        ]);

        $response = $this->postJson("/api/attendance/{$attendance->id}/approve", [
            'approval_status' => 'approved',
            'comments' => 'Approved by admin'
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Davamiyyət qeydi təsdiqləndi'
                ]);

        $attendance->refresh();
        $this->assertEquals('approved', $attendance->approval_status);
        $this->assertEquals($this->admin->id, $attendance->approved_by);
        $this->assertNotNull($attendance->approved_at);
    }

    /** @test */
    public function admin_can_reject_attendance()
    {
        $this->actingAs($this->admin, 'sanctum');

        $attendance = ClassAttendance::factory()->create([
            'teacher_id' => $this->teacher->id,
            'approval_status' => 'pending'
        ]);

        $response = $this->postJson("/api/attendance/{$attendance->id}/approve", [
            'approval_status' => 'rejected',
            'comments' => 'Needs correction'
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Davamiyyət qeydi rədd edildi'
                ]);

        $attendance->refresh();
        $this->assertEquals('rejected', $attendance->approval_status);
    }

    /** @test */
    public function it_can_get_attendance_statistics()
    {
        $this->actingAs($this->admin, 'sanctum');

        // Create test attendance records
        ClassAttendance::factory()->count(5)->create([
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'attendance_date' => now()->format('Y-m-d'),
            'students_present' => 20,
            'total_students_registered' => 25,
            'lesson_status' => 'completed',
            'approval_status' => 'approved'
        ]);

        $response = $this->getJson('/api/attendance/statistics?' . http_build_query([
            'class_id' => $this->class->id,
            'start_date' => now()->startOfMonth()->format('Y-m-d'),
            'end_date' => now()->endOfMonth()->format('Y-m-d')
        ]));

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'total_lessons',
                        'total_students_registered',
                        'total_students_present',
                        'avg_attendance_rate',
                        'lessons_by_status',
                        'approval_status',
                        'daily_breakdown'
                    ]
                ]);

        $stats = $response->json('data');
        $this->assertEquals(5, $stats['total_lessons']);
        $this->assertEquals(125, $stats['total_students_registered']); // 5 * 25
        $this->assertEquals(100, $stats['total_students_present']); // 5 * 20
        $this->assertEquals(80, $stats['avg_attendance_rate']); // 100/125 * 100
    }

    /** @test */
    public function admin_can_perform_bulk_operations()
    {
        $this->actingAs($this->admin, 'sanctum');

        $attendances = ClassAttendance::factory()->count(3)->create([
            'teacher_id' => $this->teacher->id,
            'approval_status' => 'pending'
        ]);

        $attendanceIds = $attendances->pluck('id')->toArray();

        $response = $this->postJson('/api/attendance/bulk-action', [
            'action' => 'approve',
            'attendance_ids' => $attendanceIds,
            'comments' => 'Bulk approval'
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'processed_count' => 3,
                    'error_count' => 0
                ]);

        foreach ($attendances as $attendance) {
            $attendance->refresh();
            $this->assertEquals('approved', $attendance->approval_status);
        }
    }

    /** @test */
    public function it_can_filter_attendance_records()
    {
        $this->actingAs($this->admin, 'sanctum');

        // Create test data with different statuses
        ClassAttendance::factory()->count(3)->create([
            'class_id' => $this->class->id,
            'approval_status' => 'approved'
        ]);
        
        ClassAttendance::factory()->count(2)->create([
            'class_id' => $this->class->id,
            'approval_status' => 'pending'
        ]);

        $response = $this->getJson('/api/attendance?' . http_build_query([
            'class_id' => $this->class->id,
            'approval_status' => 'approved',
            'per_page' => 10
        ]));

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $this->assertEquals(3, count($data));
        
        foreach ($data as $attendance) {
            $this->assertEquals('approved', $attendance['approval_status']);
        }
    }

    /** @test */
    public function it_prevents_deleting_approved_attendance()
    {
        $this->actingAs($this->admin, 'sanctum');

        $attendance = ClassAttendance::factory()->create([
            'teacher_id' => $this->teacher->id,
            'approval_status' => 'approved'
        ]);

        $response = $this->deleteJson("/api/attendance/{$attendance->id}");

        $response->assertStatus(403)
                ->assertJson([
                    'success' => false,
                    'message' => 'Təsdiqlənmiş davamiyyət qeydini silmək mümkün deyil'
                ]);
    }

    /** @test */
    public function teacher_can_only_see_own_attendance_records()
    {
        $otherTeacher = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        $otherTeacher->assignRole('müəllim');

        // Create attendance for both teachers
        ClassAttendance::factory()->create(['teacher_id' => $this->teacher->id]);
        ClassAttendance::factory()->create(['teacher_id' => $otherTeacher->id]);

        $this->actingAs($this->teacher, 'sanctum');

        $response = $this->getJson('/api/attendance');
        
        $response->assertStatus(200);
        
        $attendances = $response->json('data');
        $this->assertEquals(1, count($attendances));
        $this->assertEquals($this->teacher->id, $attendances[0]['teacher_id']);
    }
}