<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\TeachingLoad;
use App\Models\Teacher;
use App\Models\Subject;
use App\Models\ClassModel;
use App\Models\ScheduleGenerationSetting;
use App\Services\Schedule\WorkloadScheduleIntegrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

class WorkloadScheduleIntegrationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected WorkloadScheduleIntegrationService $service;
    protected User $user;
    protected Institution $institution;
    protected AcademicYear $academicYear;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new WorkloadScheduleIntegrationService();
        
        // Create test data
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school'
        ]);
        
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        
        $this->academicYear = AcademicYear::factory()->create([
            'name' => '2024-2025',
            'is_active' => true
        ]);

        // Create schedule generation settings
        ScheduleGenerationSetting::factory()->create([
            'institution_id' => $this->institution->id,
            'working_days' => [1, 2, 3, 4, 5],
            'daily_periods' => 7,
            'period_duration' => 45,
            'break_periods' => [3, 6],
            'lunch_break_period' => 4,
            'first_period_start' => '08:00',
            'break_duration' => 10,
            'lunch_duration' => 60,
            'is_active' => true
        ]);

        $this->actingAs($this->user);
    }

    public function test_gets_workload_ready_data_successfully()
    {
        // Create test teaching loads
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        
        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_id' => $class->id,
            'weekly_hours' => 4,
            'priority_level' => 8,
            'preferred_consecutive_hours' => 2
        ]);

        $result = $this->service->getWorkloadReadyData($this->user);

        $this->assertArrayHasKey('institution', $result);
        $this->assertArrayHasKey('academic_year_id', $result);
        $this->assertArrayHasKey('settings', $result);
        $this->assertArrayHasKey('teaching_loads', $result);
        $this->assertArrayHasKey('time_slots', $result);
        $this->assertArrayHasKey('validation', $result);
        $this->assertArrayHasKey('statistics', $result);
        $this->assertArrayHasKey('ready_for_generation', $result);

        $this->assertEquals($this->institution->id, $result['institution']['id']);
        $this->assertEquals($this->academicYear->id, $result['academic_year_id']);
        $this->assertCount(1, $result['teaching_loads']);
    }

    public function test_validates_workload_data_successfully()
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        
        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_id' => $class->id,
            'weekly_hours' => 4,
        ]);

        $result = $this->service->validateWorkloadData($this->user, $this->academicYear->id);

        $this->assertArrayHasKey('is_valid', $result);
        $this->assertArrayHasKey('errors', $result);
        $this->assertArrayHasKey('warnings', $result);
        $this->assertArrayHasKey('total_hours', $result);
        $this->assertArrayHasKey('teacher_hours', $result);
        $this->assertArrayHasKey('loads_count', $result);

        $this->assertTrue($result['is_valid']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals(4, $result['total_hours']);
        $this->assertEquals(1, $result['loads_count']);
    }

    public function test_detects_validation_errors()
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        
        // Create teaching load that exceeds maximum hours per teacher (26 > 25)
        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_id' => $class->id,
            'weekly_hours' => 26,
        ]);

        $result = $this->service->validateWorkloadData($this->user, $this->academicYear->id);

        $this->assertFalse($result['is_valid']);
        $this->assertNotEmpty($result['errors']);
        $this->assertStringContainsString('maksimum həftəlik saat həddini aşır', $result['errors'][0]);
    }

    public function test_generates_time_slots_correctly()
    {
        $result = $this->service->generateTimeSlots($this->user);

        $this->assertIsArray($result);
        $this->assertNotEmpty($result);

        // Check if we have the expected number of slots (periods + breaks)
        $expectedSlots = 7 + 2 + 1; // 7 periods + 2 breaks + 1 lunch
        $this->assertCount($expectedSlots, $result);

        // Check structure of first period
        $firstPeriod = collect($result)->first(fn($slot) => $slot['period_number'] === 1);
        $this->assertArrayHasKey('period_number', $firstPeriod);
        $this->assertArrayHasKey('start_time', $firstPeriod);
        $this->assertArrayHasKey('end_time', $firstPeriod);
        $this->assertArrayHasKey('duration', $firstPeriod);
        $this->assertArrayHasKey('is_break', $firstPeriod);
        $this->assertArrayHasKey('slot_type', $firstPeriod);

        $this->assertEquals('08:00', $firstPeriod['start_time']);
        $this->assertEquals('08:45', $firstPeriod['end_time']);
        $this->assertFalse($firstPeriod['is_break']);
    }

    public function test_calculates_statistics_correctly()
    {
        $teacher1 = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $teacher2 = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class1 = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        $class2 = ClassModel::factory()->create(['institution_id' => $this->institution->id]);

        // Create multiple teaching loads
        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher1->id,
            'subject_id' => $subject->id,
            'class_id' => $class1->id,
            'weekly_hours' => 10,
        ]);

        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher2->id,
            'subject_id' => $subject->id,
            'class_id' => $class2->id,
            'weekly_hours' => 6,
        ]);

        $teachingLoads = TeachingLoad::where('institution_id', $this->institution->id)
            ->where('academic_year_id', $this->academicYear->id)
            ->with(['teacher', 'subject', 'class'])
            ->get();

        $result = $this->service->calculateWorkloadStatistics($teachingLoads);

        $this->assertArrayHasKey('total_loads', $result);
        $this->assertArrayHasKey('total_weekly_hours', $result);
        $this->assertArrayHasKey('unique_teachers', $result);
        $this->assertArrayHasKey('unique_subjects', $result);
        $this->assertArrayHasKey('unique_classes', $result);
        $this->assertArrayHasKey('average_hours_per_teacher', $result);
        $this->assertArrayHasKey('max_hours_per_teacher', $result);
        $this->assertArrayHasKey('min_hours_per_teacher', $result);

        $this->assertEquals(2, $result['total_loads']);
        $this->assertEquals(16, $result['total_weekly_hours']);
        $this->assertEquals(2, $result['unique_teachers']);
        $this->assertEquals(1, $result['unique_subjects']);
        $this->assertEquals(2, $result['unique_classes']);
        $this->assertEquals(8, $result['average_hours_per_teacher']);
        $this->assertEquals(10, $result['max_hours_per_teacher']);
        $this->assertEquals(6, $result['min_hours_per_teacher']);
    }

    public function test_preparation_with_no_teaching_loads()
    {
        $result = $this->service->getWorkloadReadyData($this->user);

        $this->assertFalse($result['ready_for_generation']);
        $this->assertEmpty($result['teaching_loads']);
        $this->assertEquals(0, $result['statistics']['total_loads']);
        $this->assertFalse($result['validation']['is_valid']);
        $this->assertContains('Heç bir dərs yükü tapılmadı', $result['validation']['errors']);
    }

    public function test_preparation_with_no_generation_settings()
    {
        // Remove generation settings
        ScheduleGenerationSetting::where('institution_id', $this->institution->id)->delete();

        $result = $this->service->getWorkloadReadyData($this->user);

        $this->assertFalse($result['ready_for_generation']);
        $this->assertNull($result['settings']);
    }

    public function test_handles_invalid_academic_year()
    {
        $result = $this->service->validateWorkloadData($this->user, 999);

        $this->assertFalse($result['is_valid']);
        $this->assertContains('Akademik il tapılmadı', $result['errors']);
    }

    public function test_calculates_ideal_distribution_correctly()
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        
        $teachingLoad = TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_id' => $class->id,
            'weekly_hours' => 5,
            'preferred_consecutive_hours' => 2
        ]);

        $result = $this->service->calculateIdealDistribution($teachingLoad);

        $this->assertIsArray($result);
        $this->assertNotEmpty($result);
        
        $totalDistributedHours = array_sum(array_column($result, 'lessons'));
        $this->assertEquals(5, $totalDistributedHours);
    }

    public function test_detects_teacher_overload_warnings()
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        
        // Create teaching load close to maximum (23 hours)
        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_id' => $class->id,
            'weekly_hours' => 23,
        ]);

        $result = $this->service->validateWorkloadData($this->user, $this->academicYear->id);

        $this->assertTrue($result['is_valid']);
        $this->assertNotEmpty($result['warnings']);
        $this->assertStringContainsString('yüksək iş yükü', $result['warnings'][0]);
    }

    public function test_generation_readiness_check()
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        
        TeachingLoad::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_id' => $class->id,
            'weekly_hours' => 4,
        ]);

        $result = $this->service->getWorkloadReadyData($this->user);

        $this->assertTrue($result['ready_for_generation']);
        $this->assertTrue($result['validation']['is_valid']);
        $this->assertNotNull($result['settings']);
        $this->assertNotEmpty($result['teaching_loads']);
        $this->assertNotEmpty($result['time_slots']);
    }
}