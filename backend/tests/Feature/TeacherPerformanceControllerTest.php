<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\TeacherEvaluation;
use App\Models\PerformanceMetric;
use App\Models\TeacherProfessionalDevelopment;

class TeacherPerformanceControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $admin;
    protected User $teacher;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->institution = Institution::factory()->create();
        
        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->admin->assignRole('SchoolAdmin');
        
        $this->teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->teacher->assignRole('Müəllim');
    }

    public function test_admin_can_list_teacher_evaluations()
    {
        $this->actingAs($this->admin, 'sanctum');

        TeacherEvaluation::factory()->count(3)->create([
            'teacher_id' => $this->teacher->id,
            'evaluator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/teacher-performance/evaluations');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'teacher_name',
                            'evaluation_period',
                            'overall_score',
                            'status',
                        ]
                    ]
                ]);
    }

    public function test_admin_can_create_teacher_evaluation()
    {
        $this->actingAs($this->admin, 'sanctum');

        $evaluationData = [
            'teacher_id' => $this->teacher->id,
            'evaluation_period' => '2024-2025-1',
            'teaching_quality' => 85,
            'student_engagement' => 90,
            'professional_development' => 80,
            'collaboration' => 88,
            'innovation' => 75,
            'comments' => 'Excellent teaching performance with room for innovation.',
            'goals' => [
                'Implement more interactive teaching methods',
                'Attend advanced pedagogy workshop'
            ]
        ];

        $response = $this->postJson('/api/teacher-performance/evaluations', $evaluationData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'teacher_name',
                        'overall_score',
                        'evaluation_period',
                    ]
                ]);

        $this->assertDatabaseHas('teacher_evaluations', [
            'teacher_id' => $this->teacher->id,
            'evaluator_id' => $this->admin->id,
            'teaching_quality' => 85,
        ]);
    }

    public function test_teacher_can_view_own_evaluations()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $evaluation = TeacherEvaluation::factory()->create([
            'teacher_id' => $this->teacher->id,
            'evaluator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/teacher-performance/my-evaluations');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'evaluation_period',
                            'overall_score',
                            'status',
                        ]
                    ]
                ]);
    }

    public function test_can_get_performance_metrics()
    {
        $this->actingAs($this->admin, 'sanctum');

        PerformanceMetric::factory()->count(5)->create([
            'user_id' => $this->teacher->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson("/api/teacher-performance/metrics/{$this->teacher->id}");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'teacher_info',
                        'current_period_metrics',
                        'historical_trends',
                        'performance_indicators',
                    ]
                ]);
    }

    public function test_can_create_professional_development_record()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $pdData = [
            'activity_type' => 'workshop',
            'title' => 'Digital Teaching Methods',
            'provider' => 'Education Ministry',
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDays(3)->format('Y-m-d'),
            'hours' => 24,
            'certificate_earned' => true,
            'description' => 'Advanced workshop on digital teaching methodologies',
        ];

        $response = $this->postJson('/api/teacher-performance/professional-development', $pdData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'title',
                        'activity_type',
                        'hours',
                        'certificate_earned',
                    ]
                ]);

        $this->assertDatabaseHas('teacher_professional_developments', [
            'teacher_id' => $this->teacher->id,
            'title' => $pdData['title'],
            'hours' => 24,
        ]);
    }

    public function test_can_get_performance_dashboard()
    {
        $this->actingAs($this->admin, 'sanctum');

        TeacherEvaluation::factory()->count(3)->create([
            'evaluator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        PerformanceMetric::factory()->count(5)->create([
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/teacher-performance/dashboard');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'overall_statistics',
                        'evaluation_summary',
                        'top_performers',
                        'improvement_areas',
                        'pd_completion_rates',
                    ]
                ]);
    }

    public function test_can_update_evaluation_status()
    {
        $this->actingAs($this->admin, 'sanctum');

        $evaluation = TeacherEvaluation::factory()->create([
            'teacher_id' => $this->teacher->id,
            'evaluator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
            'status' => 'draft',
        ]);

        $response = $this->putJson("/api/teacher-performance/evaluations/{$evaluation->id}/status", [
            'status' => 'finalized',
            'finalization_notes' => 'Evaluation completed and reviewed.',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('teacher_evaluations', [
            'id' => $evaluation->id,
            'status' => 'finalized',
        ]);
    }

    public function test_teacher_cannot_view_other_teacher_evaluations()
    {
        $this->actingAs($this->teacher, 'sanctum');

        $otherTeacher = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $otherTeacher->assignRole('Müəllim');

        $otherEvaluation = TeacherEvaluation::factory()->create([
            'teacher_id' => $otherTeacher->id,
            'evaluator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson("/api/teacher-performance/evaluations/{$otherEvaluation->id}");

        $response->assertStatus(403);
    }

    public function test_validates_evaluation_data()
    {
        $this->actingAs($this->admin, 'sanctum');

        $invalidData = [
            'teacher_id' => 99999, // Non-existent teacher
            'teaching_quality' => 110, // Out of range (max 100)
            'evaluation_period' => '', // Required
        ];

        $response = $this->postJson('/api/teacher-performance/evaluations', $invalidData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['teacher_id', 'teaching_quality', 'evaluation_period']);
    }

    public function test_can_get_performance_reports()
    {
        $this->actingAs($this->admin, 'sanctum');

        TeacherEvaluation::factory()->count(5)->create([
            'evaluator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/teacher-performance/reports?' . http_build_query([
            'report_type' => 'comprehensive',
            'period' => '2024-2025-1',
            'format' => 'json'
        ]));

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'report_metadata',
                        'teacher_summaries',
                        'institutional_averages',
                        'recommendations',
                    ]
                ]);
    }

    public function test_requires_appropriate_permissions()
    {
        // Test without authentication
        $response = $this->getJson('/api/teacher-performance/evaluations');
        $response->assertStatus(401);

        // Test teacher trying to access admin-only endpoints
        $this->actingAs($this->teacher, 'sanctum');
        $response = $this->getJson('/api/teacher-performance/dashboard');
        $response->assertStatus(403);
    }
}