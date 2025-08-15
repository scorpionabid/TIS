<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\Schedule;
use App\Models\ScheduleSlot;
use App\Models\Classes;
use App\Models\Subject;
use App\Models\TeachingLoad;
use App\Models\AcademicYear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class ScheduleControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $admin;
    protected $teacher;
    protected $institution;
    protected $academicYear;
    protected $class;
    protected $subject;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create permissions
        Permission::create(['name' => 'schedules.read', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'schedules.create', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'schedules.update', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'schedules.delete', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'schedules.approve', 'guard_name' => 'sanctum']);
        
        // Create roles
        $adminRole = Role::create(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
        $teacherRole = Role::create(['name' => 'müəllim', 'guard_name' => 'sanctum']);
        
        $adminRole->givePermissionTo(['schedules.read', 'schedules.create', 'schedules.update', 'schedules.delete', 'schedules.approve']);
        $teacherRole->givePermissionTo(['schedules.read']);
        
        // Create test data
        $this->institution = Institution::factory()->create([
            'name' => 'Test School',
            'type' => 'school',
            'is_active' => true
        ]);
        
        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true
        ]);
        $this->admin->assignRole('schooladmin');
        
        $this->teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true
        ]);
        $this->teacher->assignRole('müəllim');
        
        $this->academicYear = AcademicYear::factory()->create([
            'name' => '2024-2025',
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
            'is_active' => true
        ]);
        
        $this->class = Classes::factory()->create([
            'institution_id' => $this->institution->id,
            'name' => '9A',
            'grade_level' => 9,
            'section' => 'A'
        ]);
        
        $this->subject = Subject::factory()->create([
            'name' => 'Riyaziyyat',
            'short_name' => 'RIY',
            'code' => 'MATH'
        ]);
    }

    /** @test */
    public function admin_can_create_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        $scheduleData = [
            'name' => 'Test Schedule',
            'type' => 'weekly',
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'effective_from' => now()->format('Y-m-d'),
            'effective_to' => now()->addMonth()->format('Y-m-d'),
            'schedule_data' => [
                'slots' => [
                    [
                        'class_id' => $this->class->id,
                        'subject_id' => $this->subject->id,
                        'teacher_id' => $this->teacher->id,
                        'day_of_week' => 1,
                        'period_number' => 1,
                        'start_time' => '08:00',
                        'end_time' => '08:45',
                        'room_location' => '101'
                    ]
                ]
            ],
            'notes' => 'Test schedule notes'
        ];

        $response = $this->postJson('/api/schedules', $scheduleData);

        $response->assertStatus(201)
                ->assertJson([
                    'success' => true,
                    'message' => 'Cədvəl uğurla yaradıldı'
                ]);

        $this->assertDatabaseHas('schedules', [
            'name' => 'Test Schedule',
            'type' => 'weekly',
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id,
            'status' => 'draft'
        ]);

        $this->assertDatabaseHas('schedule_slots', [
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'day_of_week' => 1,
            'period_number' => 1
        ]);
    }

    /** @test */
    public function teacher_cannot_create_schedule()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $scheduleData = [
            'name' => 'Test Schedule',
            'type' => 'weekly',
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'effective_from' => now()->format('Y-m-d'),
            'schedule_data' => ['slots' => []]
        ];

        $response = $this->postJson('/api/schedules', $scheduleData);

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_update_draft_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        $schedule = Schedule::factory()->create([
            'name' => 'Original Schedule',
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id,
            'status' => 'draft'
        ]);

        $updateData = [
            'name' => 'Updated Schedule',
            'notes' => 'Updated notes'
        ];

        $response = $this->putJson("/api/schedules/{$schedule->id}", $updateData);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Cədvəl uğurla yeniləndi'
                ]);

        $schedule->refresh();
        $this->assertEquals('Updated Schedule', $schedule->name);
        $this->assertEquals('Updated notes', $schedule->notes);
    }

    /** @test */
    public function it_prevents_updating_approved_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        $schedule = Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id,
            'status' => 'approved'
        ]);

        $response = $this->putJson("/api/schedules/{$schedule->id}", [
            'name' => 'Updated Schedule'
        ]);

        $response->assertStatus(403)
                ->assertJson([
                    'success' => false,
                    'message' => 'Təsdiqlənmiş cədvəli redaktə etmək mümkün deyil'
                ]);
    }

    /** @test */
    public function admin_can_approve_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        $schedule = Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id,
            'status' => 'draft'
        ]);

        $response = $this->postJson("/api/schedules/{$schedule->id}/approve", [
            'approval_status' => 'approved',
            'comments' => 'Schedule approved'
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Cədvəl təsdiqləndi'
                ]);

        $schedule->refresh();
        $this->assertEquals('approved', $schedule->status);
        $this->assertEquals($this->admin->id, $schedule->approved_by);
        $this->assertNotNull($schedule->approved_at);
    }

    /** @test */
    public function it_can_generate_automatic_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        // Create teaching load for automatic generation
        $teachingLoad = TeachingLoad::factory()->create([
            'teacher_id' => $this->teacher->id,
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'weekly_hours' => 4,
            'status' => 'active'
        ]);

        $generationData = [
            'settings' => [
                'institution_id' => $this->institution->id,
                'academic_year_id' => $this->academicYear->id,
                'week_start_date' => now()->startOfWeek()->format('Y-m-d'),
                'working_days' => [1, 2, 3, 4, 5], // Monday to Friday
                'periods_per_day' => 6,
                'break_periods' => [3], // 3rd period is break
                'lunch_period' => 4
            ],
            'time_slots' => [
                ['period' => 1, 'start_time' => '08:00', 'end_time' => '08:45'],
                ['period' => 2, 'start_time' => '08:50', 'end_time' => '09:35'],
                ['period' => 3, 'start_time' => '09:40', 'end_time' => '10:25'], // Break
                ['period' => 4, 'start_time' => '10:45', 'end_time' => '11:30'], // Lunch
                ['period' => 5, 'start_time' => '12:00', 'end_time' => '12:45'],
                ['period' => 6, 'start_time' => '12:50', 'end_time' => '13:35']
            ]
        ];

        $response = $this->postJson('/api/schedules/generate', $generationData);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Cədvəl uğurla yaradıldı'
                ])
                ->assertJsonStructure([
                    'data' => [
                        'schedule_slots',
                        'conflicts',
                        'generation_stats'
                    ]
                ]);

        $data = $response->json('data');
        $this->assertGreaterThan(0, count($data['schedule_slots']));
        $this->assertEquals(1, $data['generation_stats']['teaching_loads_processed']);
    }

    /** @test */
    public function it_detects_teacher_conflicts_in_schedule()
    {
        $scheduleSlots = [
            [
                'teacher_id' => $this->teacher->id,
                'class_id' => $this->class->id,
                'subject_id' => $this->subject->id,
                'day_of_week' => 1,
                'period_number' => 1,
                'start_time' => '08:00',
                'end_time' => '08:45'
            ],
            [
                'teacher_id' => $this->teacher->id, // Same teacher
                'class_id' => $this->class->id + 1, // Different class
                'subject_id' => $this->subject->id,
                'day_of_week' => 1, // Same day
                'period_number' => 1, // Same period
                'start_time' => '08:00',
                'end_time' => '08:45'
            ]
        ];

        $this->actingAs($this->admin, 'sanctum');

        $response = $this->postJson('/api/schedules/validate', [
            'schedule_slots' => $scheduleSlots
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true
                ])
                ->assertJsonStructure([
                    'data' => [
                        'conflicts',
                        'total_conflicts',
                        'is_valid'
                    ]
                ]);

        $data = $response->json('data');
        $this->assertGreaterThan(0, $data['total_conflicts']);
        $this->assertFalse($data['is_valid']);
        $this->assertEquals('teacher_double_booking', $data['conflicts'][0]['type']);
    }

    /** @test */
    public function it_can_filter_schedules_by_type()
    {
        $this->actingAs($this->admin, 'sanctum');

        // Create different types of schedules
        Schedule::factory()->count(2)->create([
            'institution_id' => $this->institution->id,
            'type' => 'weekly'
        ]);
        
        Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'type' => 'exam'
        ]);

        $response = $this->getJson('/api/schedules?' . http_build_query([
            'type' => 'weekly',
            'per_page' => 10
        ]));

        $response->assertStatus(200);
        
        $schedules = $response->json('data');
        $this->assertEquals(2, count($schedules));
        
        foreach ($schedules as $schedule) {
            $this->assertEquals('weekly', $schedule['type']);
        }
    }

    /** @test */
    public function it_can_filter_schedules_by_status()
    {
        $this->actingAs($this->admin, 'sanctum');

        Schedule::factory()->count(3)->create([
            'institution_id' => $this->institution->id,
            'status' => 'draft'
        ]);
        
        Schedule::factory()->count(2)->create([
            'institution_id' => $this->institution->id,
            'status' => 'approved'
        ]);

        $response = $this->getJson('/api/schedules?' . http_build_query([
            'status' => 'approved',
            'per_page' => 10
        ]));

        $response->assertStatus(200);
        
        $schedules = $response->json('data');
        $this->assertEquals(2, count($schedules));
        
        foreach ($schedules as $schedule) {
            $this->assertEquals('approved', $schedule['status']);
        }
    }

    /** @test */
    public function it_prevents_deleting_active_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        $schedule = Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id,
            'status' => 'active'
        ]);

        $response = $this->deleteJson("/api/schedules/{$schedule->id}");

        $response->assertStatus(403)
                ->assertJson([
                    'success' => false,
                    'message' => 'Aktiv cədvəli silmək mümkün deyil'
                ]);
    }

    /** @test */
    public function it_can_export_schedule()
    {
        $this->actingAs($this->admin, 'sanctum');

        $exportData = [
            'format' => 'pdf',
            'schedule_slots' => [
                [
                    'class_id' => $this->class->id,
                    'subject_id' => $this->subject->id,
                    'teacher_id' => $this->teacher->id,
                    'day_of_week' => 1,
                    'period_number' => 1,
                    'start_time' => '08:00',
                    'end_time' => '08:45'
                ]
            ],
            'view_mode' => 'class',
            'selected_class' => $this->class->id
        ];

        $response = $this->postJson('/api/schedules/export', $exportData);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Export hazırlanır'
                ])
                ->assertJsonStructure([
                    'data' => [
                        'export_url',
                        'format',
                        'expires_at'
                    ]
                ]);
    }

    /** @test */
    public function it_shows_schedule_details_with_slots()
    {
        $this->actingAs($this->admin, 'sanctum');

        $schedule = Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id
        ]);

        $slot = ScheduleSlot::factory()->create([
            'schedule_id' => $schedule->id,
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id
        ]);

        $response = $this->getJson("/api/schedules/{$schedule->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true
                ])
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'name',
                        'type',
                        'status',
                        'creator',
                        'slots'
                    ]
                ]);

        $scheduleData = $response->json('data');
        $this->assertCount(1, $scheduleData['slots']);
        $this->assertEquals($this->class->id, $scheduleData['slots'][0]['class_id']);
    }

    /** @test */
    public function it_applies_authority_based_filtering()
    {
        // Create another institution
        $otherInstitution = Institution::factory()->create();
        $otherAdmin = User::factory()->create([
            'institution_id' => $otherInstitution->id
        ]);
        $otherAdmin->assignRole('schooladmin');

        // Create schedules for both institutions
        Schedule::factory()->create([
            'institution_id' => $this->institution->id,
            'created_by' => $this->admin->id
        ]);
        
        Schedule::factory()->create([
            'institution_id' => $otherInstitution->id,
            'created_by' => $otherAdmin->id
        ]);

        $this->actingAs($this->admin, 'sanctum');

        $response = $this->getJson('/api/schedules');

        $response->assertStatus(200);
        
        $schedules = $response->json('data');
        $this->assertEquals(1, count($schedules));
        $this->assertEquals($this->institution->id, $schedules[0]['institution_id']);
    }
}