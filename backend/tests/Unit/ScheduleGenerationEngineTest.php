<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\Schedule;
use App\Models\TeachingLoad;
use App\Models\Teacher;
use App\Models\Subject;
use App\Models\ClassModel;
use App\Models\Room;
use App\Models\ScheduleSession;
use App\Services\Schedule\ScheduleGenerationEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

class ScheduleGenerationEngineTest extends TestCase
{
    use RefreshDatabase;

    protected ScheduleGenerationEngine $engine;
    protected User $user;
    protected Institution $institution;
    protected AcademicYear $academicYear;
    protected Schedule $schedule;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->engine = new ScheduleGenerationEngine();
        
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

        $this->schedule = Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'name' => 'Test Schedule'
        ]);

        $this->actingAs($this->user);
    }

    public function test_generates_schedule_successfully()
    {
        $workloadData = $this->createTestWorkloadData();
        
        $result = $this->engine->generateSchedule($workloadData, [], $this->user);

        $this->assertArrayHasKey('schedule', $result);
        $this->assertArrayHasKey('conflicts', $result);
        $this->assertArrayHasKey('sessions_created', $result);
        $this->assertArrayHasKey('generation_time', $result);

        $this->assertIsArray($result['conflicts']);
        $this->assertIsInt($result['sessions_created']);
        $this->assertIsFloat($result['generation_time']);
        $this->assertGreaterThan(0, $result['sessions_created']);
    }

    public function test_detects_teacher_conflicts()
    {
        $workloadData = $this->createConflictingWorkloadData();
        
        $result = $this->engine->generateSchedule($workloadData, [], $this->user);

        $this->assertNotEmpty($result['conflicts']);
        
        $teacherConflicts = array_filter($result['conflicts'], function($conflict) {
            return $conflict['type'] === 'teacher_conflict';
        });
        
        $this->assertNotEmpty($teacherConflicts);
    }

    public function test_respects_time_constraints()
    {
        $workloadData = $this->createTestWorkloadData();
        $preferences = [
            'avoid_late_periods' => true,
            'prefer_morning_core_subjects' => true
        ];
        
        $result = $this->engine->generateSchedule($workloadData, $preferences, $this->user);
        
        // Check that core subjects are scheduled in morning periods
        $sessions = ScheduleSession::where('schedule_id', $result['schedule']['id'])->get();
        $morningCoreSubjects = $sessions->filter(function($session) {
            return $session->period_number <= 4 && 
                   in_array($session->subject->name, ['Riyaziyyat', 'Azərbaycan dili']);
        });
        
        $this->assertGreaterThan(0, $morningCoreSubjects->count());
    }

    public function test_validates_generation_constraints()
    {
        $invalidWorkloadData = [
            'teaching_loads' => [],
            'time_slots' => [],
            'settings' => [
                'working_days' => [],
                'daily_periods' => 0
            ]
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->engine->generateSchedule($invalidWorkloadData, [], $this->user);
    }

    public function test_applies_consecutive_hours_preference()
    {
        $workloadData = $this->createTestWorkloadData();
        $workloadData['teaching_loads'][0]['preferred_consecutive_hours'] = 2;
        
        $result = $this->engine->generateSchedule($workloadData, [], $this->user);
        
        $sessions = ScheduleSession::where('schedule_id', $result['schedule']['id'])
            ->where('teacher_id', $workloadData['teaching_loads'][0]['teacher']['id'])
            ->orderBy('day_of_week')
            ->orderBy('period_number')
            ->get();

        // Check if there are consecutive sessions for this teacher
        $consecutivePairs = 0;
        for ($i = 0; $i < $sessions->count() - 1; $i++) {
            $current = $sessions[$i];
            $next = $sessions[$i + 1];
            
            if ($current->day_of_week === $next->day_of_week && 
                $current->period_number + 1 === $next->period_number) {
                $consecutivePairs++;
            }
        }
        
        $this->assertGreaterThan(0, $consecutivePairs);
    }

    public function test_handles_room_assignments()
    {
        $room = Room::factory()->create(['institution_id' => $this->institution->id]);
        $workloadData = $this->createTestWorkloadData();
        
        $result = $this->engine->generateSchedule($workloadData, ['room_optimization' => true], $this->user);
        
        $sessions = ScheduleSession::where('schedule_id', $result['schedule']['id'])->get();
        
        // Check that sessions have room assignments when available
        $sessionsWithRooms = $sessions->whereNotNull('room_id');
        $this->assertGreaterThan(0, $sessionsWithRooms->count());
    }

    public function test_calculates_generation_statistics()
    {
        $workloadData = $this->createTestWorkloadData();
        
        $result = $this->engine->generateSchedule($workloadData, [], $this->user);
        
        $this->assertArrayHasKey('sessions_created', $result);
        $this->assertArrayHasKey('generation_time', $result);
        
        $expectedSessions = array_sum(array_column($workloadData['teaching_loads'], 'weekly_hours'));
        $this->assertEquals($expectedSessions, $result['sessions_created']);
    }

    public function test_resolves_conflicts_automatically()
    {
        $workloadData = $this->createConflictingWorkloadData();
        $preferences = ['conflict_resolution_strategy' => 'teacher_priority'];
        
        $result = $this->engine->generateSchedule($workloadData, $preferences, $this->user);
        
        // Should have fewer conflicts due to automatic resolution
        $criticalConflicts = array_filter($result['conflicts'], function($conflict) {
            return $conflict['severity'] === 'critical';
        });
        
        // With teacher priority strategy, teacher conflicts should be resolved
        $this->assertLessThan(2, count($criticalConflicts));
    }

    public function test_handles_empty_workload_gracefully()
    {
        $emptyWorkloadData = [
            'teaching_loads' => [],
            'time_slots' => $this->createTimeSlots(),
            'settings' => [
                'working_days' => [1, 2, 3, 4, 5],
                'daily_periods' => 7
            ]
        ];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Heç bir dərs yükü tapılmadı');
        
        $this->engine->generateSchedule($emptyWorkloadData, [], $this->user);
    }

    public function test_optimization_with_different_strategies()
    {
        $workloadData = $this->createTestWorkloadData();
        
        // Test balanced strategy
        $balancedResult = $this->engine->generateSchedule($workloadData, [
            'conflict_resolution_strategy' => 'balanced',
            'minimize_gaps' => true
        ], $this->user);
        
        // Test class priority strategy
        $classPriorityResult = $this->engine->generateSchedule($workloadData, [
            'conflict_resolution_strategy' => 'class_priority',
            'balance_daily_load' => true
        ], $this->user);
        
        $this->assertIsArray($balancedResult);
        $this->assertIsArray($classPriorityResult);
        
        // Both should generate sessions
        $this->assertGreaterThan(0, $balancedResult['sessions_created']);
        $this->assertGreaterThan(0, $classPriorityResult['sessions_created']);
    }

    public function test_validates_time_slot_availability()
    {
        $workloadData = $this->createTestWorkloadData();
        
        // Add unavailable periods to a teaching load
        $workloadData['teaching_loads'][0]['unavailable_periods'] = ['monday_1', 'tuesday_2'];
        
        $result = $this->engine->generateSchedule($workloadData, [], $this->user);
        
        $sessions = ScheduleSession::where('schedule_id', $result['schedule']['id'])
            ->where('teacher_id', $workloadData['teaching_loads'][0]['teacher']['id'])
            ->get();
        
        // Verify no sessions are scheduled in unavailable periods
        $mondayFirstPeriod = $sessions->where('day_of_week', 1)->where('period_number', 1);
        $tuesdaySecondPeriod = $sessions->where('day_of_week', 2)->where('period_number', 2);
        
        $this->assertEmpty($mondayFirstPeriod);
        $this->assertEmpty($tuesdaySecondPeriod);
    }

    private function createTestWorkloadData(): array
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class = ClassModel::factory()->create(['institution_id' => $this->institution->id]);

        return [
            'teaching_loads' => [
                [
                    'id' => 1,
                    'teacher' => [
                        'id' => $teacher->id,
                        'name' => $teacher->name,
                        'email' => $teacher->email
                    ],
                    'subject' => [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code
                    ],
                    'class' => [
                        'id' => $class->id,
                        'name' => $class->name
                    ],
                    'weekly_hours' => 4,
                    'priority_level' => 8,
                    'preferred_consecutive_hours' => 1,
                    'preferred_time_slots' => [],
                    'unavailable_periods' => [],
                    'ideal_distribution' => []
                ]
            ],
            'time_slots' => $this->createTimeSlots(),
            'settings' => [
                'working_days' => [1, 2, 3, 4, 5],
                'daily_periods' => 7,
                'period_duration' => 45
            ]
        ];
    }

    private function createConflictingWorkloadData(): array
    {
        $teacher = Teacher::factory()->create(['institution_id' => $this->institution->id]);
        $subject1 = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $subject2 = Subject::factory()->create(['institution_id' => $this->institution->id]);
        $class1 = ClassModel::factory()->create(['institution_id' => $this->institution->id]);
        $class2 = ClassModel::factory()->create(['institution_id' => $this->institution->id]);

        return [
            'teaching_loads' => [
                [
                    'id' => 1,
                    'teacher' => [
                        'id' => $teacher->id,
                        'name' => $teacher->name,
                        'email' => $teacher->email
                    ],
                    'subject' => [
                        'id' => $subject1->id,
                        'name' => $subject1->name
                    ],
                    'class' => [
                        'id' => $class1->id,
                        'name' => $class1->name
                    ],
                    'weekly_hours' => 15, // High hours for one teacher
                    'priority_level' => 10,
                    'preferred_consecutive_hours' => 2,
                    'preferred_time_slots' => [],
                    'unavailable_periods' => [],
                    'ideal_distribution' => []
                ],
                [
                    'id' => 2,
                    'teacher' => [
                        'id' => $teacher->id, // Same teacher - potential conflict
                        'name' => $teacher->name,
                        'email' => $teacher->email
                    ],
                    'subject' => [
                        'id' => $subject2->id,
                        'name' => $subject2->name
                    ],
                    'class' => [
                        'id' => $class2->id,
                        'name' => $class2->name
                    ],
                    'weekly_hours' => 12, // Another high load for same teacher
                    'priority_level' => 9,
                    'preferred_consecutive_hours' => 2,
                    'preferred_time_slots' => [],
                    'unavailable_periods' => [],
                    'ideal_distribution' => []
                ]
            ],
            'time_slots' => $this->createTimeSlots(),
            'settings' => [
                'working_days' => [1, 2, 3, 4, 5],
                'daily_periods' => 7,
                'period_duration' => 45
            ]
        ];
    }

    private function createTimeSlots(): array
    {
        return [
            ['period_number' => 1, 'start_time' => '08:00', 'end_time' => '08:45', 'is_break' => false, 'duration' => 45],
            ['period_number' => 2, 'start_time' => '08:55', 'end_time' => '09:40', 'is_break' => false, 'duration' => 45],
            ['period_number' => 3, 'start_time' => '09:50', 'end_time' => '10:35', 'is_break' => false, 'duration' => 45],
            ['period_number' => 4, 'start_time' => '10:45', 'end_time' => '11:30', 'is_break' => false, 'duration' => 45],
            ['period_number' => 5, 'start_time' => '11:40', 'end_time' => '12:25', 'is_break' => false, 'duration' => 45],
            ['period_number' => 6, 'start_time' => '13:25', 'end_time' => '14:10', 'is_break' => false, 'duration' => 45],
            ['period_number' => 7, 'start_time' => '14:20', 'end_time' => '15:05', 'is_break' => false, 'duration' => 45],
        ];
    }
}