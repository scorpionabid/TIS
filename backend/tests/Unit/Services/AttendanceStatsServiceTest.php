<?php

namespace Tests\Unit\Services;

use PHPUnit\Framework\Attributes\Test;

use App\Models\AcademicYear;
use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use App\Services\Attendance\AttendanceStatsService;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;
use Carbon\Carbon;

class AttendanceStatsServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private AttendanceStatsService $service;

    private Institution $bakuRegion;
    private Institution $bakuSector1;
    private Institution $bakuSchool1;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AttendanceStatsService();

        // Create Hierarchy
        $this->bakuRegion = Institution::factory()->create(['level' => 2, 'name' => 'Baku Region']);
        $this->bakuSector1 = Institution::factory()->create(['level' => 3, 'parent_id' => $this->bakuRegion->id, 'name' => 'Baku Sector 1']);
        $this->bakuSchool1 = Institution::factory()->school()->create(['parent_id' => $this->bakuSector1->id, 'name' => 'School 1']);
    }

    #[Test]
    public function it_converts_number_to_roman_numeral()
    {
        $this->assertEquals('I', $this->service->getRomanNumeral(1));
        $this->assertEquals('V', $this->service->getRomanNumeral(5));
        $this->assertEquals('X', $this->service->getRomanNumeral(10));
        $this->assertEquals('XI', $this->service->getRomanNumeral(11));
        $this->assertEquals('0', $this->service->getRomanNumeral(0));
        $this->assertEquals('12', $this->service->getRomanNumeral(12));
    }

    #[Test]
    public function get_overview_returns_empty_structure_when_no_schools()
    {
        $superAdmin = $this->createUserWithRole('superadmin');
        
        $filters = [
            'start_date' => Carbon::today()->subDays(5)->format('Y-m-d'),
            'end_date' => Carbon::today()->format('Y-m-d'),
        ];

        // Ensure there are no schools in DB
        Institution::where('level', 4)->delete();

        $result = $this->service->getOverview($superAdmin, $filters);

        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('trends', $result);
        $this->assertArrayHasKey('schools', $result);
        $this->assertEquals(0, $result['summary']['total_schools']);
        $this->assertEquals([], $result['schools']);
    }

    #[Test]
    public function get_overview_returns_stats_for_school()
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->bakuSchool1->id]);
        
        $academicYear = AcademicYear::factory()->active()->create();
        $grade = Grade::factory()->forInstitution($this->bakuSchool1)->create([
            'academic_year_id' => $academicYear->id,
            'student_count' => 30,
            'class_level' => 5
        ]);

        $date = Carbon::today()->format('Y-m-d');

        ClassBulkAttendance::insert([
            'grade_id' => $grade->id,
            'institution_id' => $this->bakuSchool1->id,
            'academic_year_id' => $academicYear->id,
            'attendance_date' => $date,
            'morning_present' => 28,
            'morning_excused' => 1,
            'morning_unexcused' => 1,
            'total_students' => 30,
            'daily_attendance_rate' => 93.33,
            'morning_recorded_at' => now(),
            'evening_recorded_at' => now(),
            'recorded_by' => $schoolAdmin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $filters = [
            'start_date' => $date,
            'end_date' => $date,
        ];

        $result = $this->service->getOverview($schoolAdmin, $filters);

        $this->assertArrayHasKey('summary', $result);
        $this->assertEquals(1, $result['summary']['total_schools']);
        $this->assertEquals(30, $result['summary']['total_students']);
        
        $this->assertNotEmpty($result['schools']);
        $schoolStats = $result['schools'][0];
        $this->assertEquals($this->bakuSchool1->id, $schoolStats['school_id']);
        $this->assertEquals(1, $schoolStats['reported_days']);
        $this->assertEquals(30, $schoolStats['total_students']);
        $this->assertEquals(93.33, $schoolStats['average_attendance_rate']);
    }

    #[Test]
    public function get_grade_level_stats_returns_aggregated_data_by_class_level()
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [], ['institution_id' => $this->bakuSchool1->id]);
        
        $academicYear = AcademicYear::factory()->active()->create();
        $grade = Grade::factory()->forInstitution($this->bakuSchool1)->create([
            'academic_year_id' => $academicYear->id,
            'student_count' => 20,
            'class_level' => 3
        ]);

        $date = Carbon::today()->format('Y-m-d');

        ClassBulkAttendance::insert([
            'grade_id' => $grade->id,
            'institution_id' => $this->bakuSchool1->id,
            'academic_year_id' => $academicYear->id,
            'attendance_date' => $date,
            'morning_present' => 20,
            'morning_excused' => 0,
            'morning_unexcused' => 0,
            'total_students' => 20,
            'daily_attendance_rate' => 100,
            'morning_recorded_at' => now(),
            'recorded_by' => $schoolAdmin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $filters = [
            'start_date' => $date,
            'end_date' => $date,
        ];

        $result = $this->service->getGradeLevelStats($schoolAdmin, $filters);

        $this->assertArrayHasKey('summary', $result);
        $this->assertEquals(20, $result['summary']['total_students']);

        $this->assertArrayHasKey('grade_levels', $result);
        
        // Check 3rd grade
        $grade3Stats = collect($result['grade_levels'])->firstWhere('class_level', 3);
        $this->assertNotNull($grade3Stats);
        $this->assertEquals(20, $grade3Stats['student_count']);
        $this->assertEquals(100, $grade3Stats['average_attendance_rate']);
    }
}
