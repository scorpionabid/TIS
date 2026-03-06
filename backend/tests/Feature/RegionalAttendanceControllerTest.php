<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassBulkAttendance;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegionalAttendanceControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'] as $role) {
            Role::firstOrCreate([
                'name' => $role,
                'guard_name' => 'sanctum',
            ]);
        }
    }

    public function test_region_admin_can_view_overview(): void
    {
        [$region, $sector, $school, $grade, $user] = $this->seedAttendanceFixture('regionadmin');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/regional-attendance/overview?start_date=2024-02-01&end_date=2024-02-05');

        $response->assertOk();
        $response->assertJsonPath('data.summary.total_schools', 1);
        $response->assertJsonPath('data.sectors.0.sector_id', $sector->id);
        $response->assertJsonPath('data.schools.0.school_id', $school->id);
        $response->assertJsonPath('data.schools.0.reported_days', 1);
    }

    public function test_sektor_admin_scope_is_limited_to_their_sector(): void
    {
        [$region, $sectorOne, $schoolOne, $gradeOne, $regionUser] = $this->seedAttendanceFixture('regionadmin');

        $sectorTwo = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $schoolTwo = Institution::factory()->school()->create(['parent_id' => $sectorTwo->id]);
        AcademicYear::factory()->create(); // ensure academic year exists for potential grades

        $sektorUser = User::factory()->create([
            'institution_id' => $sectorOne->id,
        ]);
        $sektorUser->assignRole('sektoradmin');

        $response = $this->actingAs($sektorUser, 'sanctum')->getJson('/api/regional-attendance/overview');

        $response->assertOk();
        $payload = $response->json('data');
        $this->assertEquals(1, $payload['summary']['total_schools']);
        $this->assertEquals($schoolOne->id, $payload['schools'][0]['school_id']);
        $this->assertCount(1, $payload['schools']);
    }

    public function test_school_class_breakdown_returns_grade_data(): void
    {
        [$region, $sector, $school, $grade, $user] = $this->seedAttendanceFixture('regionadmin');

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/regional-attendance/schools/{$school->id}/classes?start_date=2024-02-01&end_date=2024-02-05");

        $response->assertOk();
        $response->assertJsonPath('data.school.id', $school->id);
        $response->assertJsonPath('data.classes.0.grade_id', $grade->id);
        $response->assertJsonPath('data.classes.0.reported_days', 1);
    }

    public function test_school_admin_cannot_access_regional_attendance(): void
    {
        [$region, $sector, $school, $grade, $regionUser] = $this->seedAttendanceFixture('regionadmin');

        $schoolAdmin = User::factory()->create([
            'institution_id' => $school->id,
        ]);
        $schoolAdmin->assignRole('schooladmin');

        $response = $this->actingAs($schoolAdmin, 'sanctum')->getJson('/api/regional-attendance/overview');

        $response->assertForbidden();
    }

    public function test_region_operator_can_view_overview(): void
    {
        [$region, $sector, $school, $grade, $user] = $this->seedAttendanceFixture('regionoperator');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/regional-attendance/overview?start_date=2024-02-01&end_date=2024-02-05');

        $response->assertOk();
        $response->assertJsonPath('data.summary.total_schools', 1);
        $response->assertJsonPath('data.sectors.0.sector_id', $sector->id);
        $response->assertJsonPath('data.schools.0.school_id', $school->id);
        $response->assertJsonPath('data.schools.0.reported_days', 1);
    }

    public function test_region_operator_can_access_school_breakdown(): void
    {
        [$region, $sector, $school, $grade, $user] = $this->seedAttendanceFixture('regionoperator');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/regional-attendance/schools/{$school->id}/classes?start_date=2024-02-01&end_date=2024-02-05");

        $response->assertOk();
        $response->assertJsonPath('data.school.id', $school->id);
        $response->assertJsonPath('data.classes.0.grade_id', $grade->id);
        $response->assertJsonPath('data.classes.0.reported_days', 1);
    }

    public function test_region_operator_scope_matches_regionadmin(): void
    {
        // Create base data
        $region = Institution::factory()->regional()->create();
        $sectorOne = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $schoolOne = Institution::factory()->school()->create(['parent_id' => $sectorOne->id]);

        // Create another region with schools that should NOT be accessible
        $regionTwo = Institution::factory()->regional()->create();
        $sectorTwo = Institution::factory()->sector()->create(['parent_id' => $regionTwo->id]);
        $schoolTwo = Institution::factory()->school()->create(['parent_id' => $sectorTwo->id]);

        $academicYear = AcademicYear::factory()->create();

        // Create regionoperator user for region one
        $regionOperator = User::factory()->create([
            'institution_id' => $region->id,
        ]);
        $regionOperator->assignRole('regionoperator');

        // Create attendance data for both schools
        $gradeOne = Grade::create([
            'name' => 'A',
            'class_level' => 5,
            'academic_year_id' => $academicYear->id,
            'institution_id' => $schoolOne->id,
            'student_count' => 24,
            'is_active' => true,
        ]);

        ClassBulkAttendance::create([
            'grade_id' => $gradeOne->id,
            'institution_id' => $schoolOne->id,
            'academic_year_id' => $academicYear->id,
            'recorded_by' => $regionOperator->id,
            'attendance_date' => '2024-02-01',
            'morning_present' => 22,
            'morning_excused' => 1,
            'morning_unexcused' => 1,
            'evening_present' => 21,
            'evening_excused' => 2,
            'evening_unexcused' => 1,
            'total_students' => 24,
            'morning_attendance_rate' => 91.67,
            'evening_attendance_rate' => 87.5,
            'daily_attendance_rate' => 89.5,
            'is_complete' => true,
        ]);

        // Test that regionoperator only sees their region's data
        $response = $this->actingAs($regionOperator, 'sanctum')->getJson('/api/regional-attendance/overview');

        $response->assertOk();
        $payload = $response->json('data');

        // Should only see 1 school (from their region)
        $this->assertEquals(1, $payload['summary']['total_schools']);
        $this->assertEquals($schoolOne->id, $payload['schools'][0]['school_id']);
        $this->assertCount(1, $payload['schools']);

        // Should NOT see schoolTwo from different region
        $schoolIds = array_column($payload['schools'], 'school_id');
        $this->assertNotContains($schoolTwo->id, $schoolIds);
    }

    /**
     * Seed sample attendance data for tests.
     *
     * @return array{Institution, Institution, Institution, Grade, User}
     */
    private function seedAttendanceFixture(string $role): array
    {
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $school = Institution::factory()->school()->create(['parent_id' => $sector->id]);
        $academicYear = AcademicYear::factory()->create();

        $grade = Grade::create([
            'name' => 'A',
            'class_level' => 5,
            'academic_year_id' => $academicYear->id,
            'institution_id' => $school->id,
            'student_count' => 24,
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'institution_id' => in_array($role, ['regionadmin', 'regionoperator']) ? $region->id : $sector->id,
        ]);
        $user->assignRole($role);

        ClassBulkAttendance::create([
            'grade_id' => $grade->id,
            'institution_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'recorded_by' => $user->id,
            'attendance_date' => '2024-02-01',
            'morning_present' => 22,
            'morning_excused' => 1,
            'morning_unexcused' => 1,
            'evening_present' => 21,
            'evening_excused' => 2,
            'evening_unexcused' => 1,
            'total_students' => 24,
            'morning_attendance_rate' => 91.67,
            'evening_attendance_rate' => 87.5,
            'daily_attendance_rate' => 89.5,
            'is_complete' => true,
        ]);

        return [$region, $sector, $school, $grade, $user];
    }
}
