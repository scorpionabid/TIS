<?php

namespace Tests\Feature\Attendance;

use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use App\Services\Attendance\AttendanceStatsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AttendanceStatsServiceTest extends TestCase
{
    use RefreshDatabase;

    private AttendanceStatsService $service;
    private $region;
    private $sector;
    private $school;
    private $admin;
    private $academicYear;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AttendanceStatsService();

        // Create Roles
        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'schooladmin', 'guard_name' => 'sanctum']);

        // Create Academic Year
        $this->academicYear = \App\Models\AcademicYear::factory()->create(['is_active' => true]);

        // Setup Hierarchy: Region (L2) -> Sector (L3) -> School (L4)
        $this->region = Institution::factory()->create(['level' => 2, 'name' => 'Baku Region']);
        $this->sector = Institution::factory()->create(['level' => 3, 'parent_id' => $this->region->id, 'name' => 'Sabail Sector']);
        $this->school = Institution::factory()->create(['level' => 4, 'parent_id' => $this->sector->id, 'name' => 'School #1']);

        $this->admin = User::factory()->create(['institution_id' => $this->region->id]);
        $this->admin->assignRole('regionadmin');
    }

    private function createAttendance($data)
    {
        return ClassBulkAttendance::create(array_merge([
            'academic_year_id' => $this->academicYear->id,
            'recorded_by' => $this->admin->id,
        ], $data));
    }

    public function test_get_overview_returns_empty_structure_when_no_data()
    {
        $filters = [
            'start_date' => now()->subDays(7)->format('Y-m-d'),
            'end_date' => now()->format('Y-m-d'),
        ];

        $result = $this->service->getOverview($this->admin, $filters);

        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('trends', $result);
        $this->assertEquals(0, $result['summary']['attending_students']);
        $this->assertEquals(1, $result['summary']['total_schools']); // Our created school
    }

    public function test_get_overview_calculates_correct_aggregates()
    {
        // 1. Create a Grade
        $grade = Grade::factory()->create([
            'institution_id' => $this->school->id,
            'student_count' => 20,
            'class_level' => 5
        ]);

        $date = now()->format('Y-m-d');

        // 2. Create Attendance Record
        $this->createAttendance([
            'grade_id' => $grade->id,
            'institution_id' => $this->school->id,
            'attendance_date' => $date,
            'morning_present' => 15,
            'total_students' => 20,
            'daily_attendance_rate' => 75.0, // 15/20
            'morning_recorded_at' => now(),
            'status' => 'submitted'
        ]);

        $filters = ['date' => $date];
        $result = $this->service->getOverview($this->admin, $filters);

        $this->assertEquals(75.0, $result['summary']['average_attendance_rate']);
        $this->assertEquals(15, $result['summary']['attending_students']);
        $this->assertEquals(20, $result['summary']['total_students']);
        
        // Trends check
        $this->assertCount(1, $result['trends']);
        $this->assertEquals(75.0, $result['trends'][0]['rate']);
    }

    public function test_get_grade_level_stats_calculates_weighted_average()
    {
        // School 1, Grade 5, 20 students, 100% attendance
        $grade1 = Grade::factory()->create(['institution_id' => $this->school->id, 'student_count' => 20, 'class_level' => 5]);
        
        // School 2 (Same Region), Grade 5, 10 students, 40% attendance
        $school2 = Institution::factory()->create(['level' => 4, 'parent_id' => $this->sector->id]);
        $grade2 = Grade::factory()->create(['institution_id' => $school2->id, 'student_count' => 10, 'class_level' => 5]);

        $date = now()->format('Y-m-d');

        $this->createAttendance([
            'grade_id' => $grade1->id, 'institution_id' => $this->school->id, 'attendance_date' => $date,
            'morning_present' => 20, 'total_students' => 20, 'daily_attendance_rate' => 100.0, 'morning_recorded_at' => now()
        ]);

        $this->createAttendance([
            'grade_id' => $grade2->id, 'institution_id' => $school2->id, 'attendance_date' => $date,
            'morning_present' => 4, 'total_students' => 10, 'daily_attendance_rate' => 40.0, 'morning_recorded_at' => now()
        ]);

        $result = $this->service->getGradeLevelStats($this->admin, ['date' => $date]);

        // Weighted Average for Level 5: (20*100 + 10*40) / (20+10) = 2400 / 30 = 80.0
        $level5 = collect($result['grade_levels'])->firstWhere('class_level', 5);
        $this->assertEquals(80.0, $level5['average_attendance_rate']);
        $this->assertEquals(30, $level5['student_count']);
    }

    public function test_get_overview_respects_regional_isolation()
    {
        // Create another region and school
        $otherRegion = Institution::factory()->create(['level' => 2]);
        $otherSchool = Institution::factory()->create(['level' => 4, 'parent_id' => $otherRegion->id]);
        $otherGrade = Grade::factory()->create(['institution_id' => $otherSchool->id, 'student_count' => 100]);

        $this->createAttendance([
            'grade_id' => $otherGrade->id, 'institution_id' => $otherSchool->id, 
            'attendance_date' => now()->format('Y-m-d'), 'daily_attendance_rate' => 100.0,
            'total_students' => 100
        ]);

        // admin is regionadmin for Baku Region, should not see other region's data
        $result = $this->service->getOverview($this->admin, ['date' => now()->format('Y-m-d')]);

        $this->assertEquals(0, $result['summary']['attending_students']);
        $this->assertEquals(1, $result['summary']['total_schools']); // Only our Sabail school
    }
}
