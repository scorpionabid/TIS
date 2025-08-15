<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\KSQResult;
use App\Models\BSQResult;
use App\Models\Role;
use App\Services\PerformanceAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssessmentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $regionadmin;
    protected User $teacher;
    protected Institution $institution;
    protected AcademicYear $academicYear;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test roles
        $superadminRole = \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        $regionadminRole = \Spatie\Permission\Models\Role::create(['name' => 'regionadmin', 'guard_name' => 'web']);
        $teacherRole = \Spatie\Permission\Models\Role::create(['name' => 'müəllim', 'guard_name' => 'web']);
        
        // Create test institution
        $this->institution = Institution::create([
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
            'is_active' => true
        ]);
        
        // Create test academic year
        $this->academicYear = AcademicYear::create([
            'name' => '2024-2025',
            'start_date' => '2024-09-01',
            'end_date' => '2025-06-30',
            'is_active' => true
        ]);
        
        // Create test users
        $this->superadmin = User::factory()->create([
            'username' => 'superadmin',
            'institution_id' => $this->institution->id
        ]);
        $this->superadmin->assignRole($superadminRole);
        
        $this->regionadmin = User::factory()->create([
            'username' => 'regionadmin',
            'institution_id' => $this->institution->id
        ]);
        $this->regionadmin->assignRole($regionadminRole);
        
        $this->teacher = User::factory()->create([
            'username' => 'teacher',
            'institution_id' => $this->institution->id
        ]);
        $this->teacher->assignRole($teacherRole);
        
        // Create test assessment results
        $this->createTestAssessmentResults();
    }

    private function createTestAssessmentResults(): void
    {
        // Create KSQ results
        KSQResult::create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'subject' => 'Riyaziyyat',
            'grade_level' => 9,
            'total_students' => 25,
            'participated_students' => 23,
            'average_score' => 75.5,
            'passing_rate' => 85.2,
            'assessment_date' => '2024-10-15',
            'created_by' => $this->teacher->id
        ]);

        KSQResult::create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'subject' => 'Fizika',
            'grade_level' => 10,
            'total_students' => 30,
            'participated_students' => 28,
            'average_score' => 68.3,
            'passing_rate' => 78.6,
            'assessment_date' => '2024-10-16',
            'created_by' => $this->teacher->id
        ]);

        // Create BSQ results
        BSQResult::create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'subject' => 'Kimya',
            'grade_level' => 11,
            'total_students' => 20,
            'participated_students' => 19,
            'average_score' => 82.1,
            'passing_rate' => 94.7,
            'assessment_date' => '2024-11-01',
            'created_by' => $this->teacher->id
        ]);

        BSQResult::create([
            'institution_id' => $this->institution->id,
            'academic_year_id' => $this->academicYear->id,
            'subject' => 'Biologiya',
            'grade_level' => 11,
            'total_students' => 22,
            'participated_students' => 21,
            'average_score' => 77.8,
            'passing_rate' => 90.9,
            'assessment_date' => '2024-11-02',
            'created_by' => $this->teacher->id
        ]);
    }

    /** @test */
    public function authorized_user_can_get_assessment_overview()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'ksq_results',
                'bsq_results',
                'analytics'
            ]);
    }

    /** @test */
    public function assessment_overview_returns_ksq_results()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments?assessment_type=ksq');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'ksq_results' => [
                    'data' => [
                        '*' => [
                            'id',
                            'subject',
                            'grade_level',
                            'total_students',
                            'participated_students',
                            'average_score',
                            'passing_rate',
                            'assessment_date'
                        ]
                    ]
                ]
            ]);

        $ksqResults = $response->json('ksq_results.data');
        $this->assertCount(2, $ksqResults);
    }

    /** @test */
    public function assessment_overview_returns_bsq_results()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments?assessment_type=bsq');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'bsq_results' => [
                    'data' => [
                        '*' => [
                            'id',
                            'subject',
                            'grade_level',
                            'total_students',
                            'participated_students',
                            'average_score',
                            'passing_rate',
                            'assessment_date'
                        ]
                    ]
                ]
            ]);

        $bsqResults = $response->json('bsq_results.data');
        $this->assertCount(2, $bsqResults);
    }

    /** @test */
    public function assessment_overview_returns_both_results_by_default()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments');

        $response->assertStatus(200);

        $data = $response->json();
        $this->assertArrayHasKey('ksq_results', $data);
        $this->assertArrayHasKey('bsq_results', $data);
        $this->assertArrayHasKey('analytics', $data);
    }

    /** @test */
    public function assessment_overview_filters_by_institution()
    {
        // Create another institution
        $otherInstitution = Institution::create([
            'name' => 'Başqa Məktəb',
            'level' => 4,
            'type' => 'school',
            'is_active' => true
        ]);

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments?institution_id=' . $this->institution->id);

        $response->assertStatus(200);

        $ksqResults = $response->json('ksq_results.data');
        $bsqResults = $response->json('bsq_results.data');

        // All results should be from the specified institution
        foreach ($ksqResults as $result) {
            $this->assertEquals($this->institution->id, $result['institution_id']);
        }

        foreach ($bsqResults as $result) {
            $this->assertEquals($this->institution->id, $result['institution_id']);
        }
    }

    /** @test */
    public function assessment_overview_filters_by_academic_year()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments?academic_year_id=' . $this->academicYear->id);

        $response->assertStatus(200);

        $ksqResults = $response->json('ksq_results.data');
        $bsqResults = $response->json('bsq_results.data');

        // All results should be from the specified academic year
        foreach ($ksqResults as $result) {
            $this->assertEquals($this->academicYear->id, $result['academic_year_id']);
        }

        foreach ($bsqResults as $result) {
            $this->assertEquals($this->academicYear->id, $result['academic_year_id']);
        }
    }

    /** @test */
    public function user_can_create_ksq_result()
    {
        $ksqData = [
            'subject' => 'Tarix',
            'grade_level' => 8,
            'total_students' => 28,
            'participated_students' => 26,
            'average_score' => 72.4,
            'passing_rate' => 80.8,
            'assessment_date' => '2024-12-01',
            'academic_year_id' => $this->academicYear->id
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson('/api/assessments/ksq', $ksqData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'subject',
                    'grade_level',
                    'total_students',
                    'participated_students',
                    'average_score',
                    'passing_rate',
                    'assessment_date'
                ]
            ]);

        $this->assertDatabaseHas('k_s_q_results', [
            'subject' => 'Tarix',
            'grade_level' => 8,
            'created_by' => $this->teacher->id,
            'institution_id' => $this->institution->id
        ]);
    }

    /** @test */
    public function user_can_create_bsq_result()
    {
        $bsqData = [
            'subject' => 'Coğrafiya',
            'grade_level' => 9,
            'total_students' => 24,
            'participated_students' => 22,
            'average_score' => 79.2,
            'passing_rate' => 86.4,
            'assessment_date' => '2024-12-01',
            'academic_year_id' => $this->academicYear->id
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson('/api/assessments/bsq', $bsqData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'subject',
                    'grade_level',
                    'total_students',
                    'participated_students',
                    'average_score',
                    'passing_rate',
                    'assessment_date'
                ]
            ]);

        $this->assertDatabaseHas('b_s_q_results', [
            'subject' => 'Coğrafiya',
            'grade_level' => 9,
            'created_by' => $this->teacher->id,
            'institution_id' => $this->institution->id
        ]);
    }

    /** @test */
    public function ksq_creation_validates_required_fields()
    {
        $response = $this->actingAs($this->teacher)
            ->postJson('/api/assessments/ksq', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'subject',
                'grade_level',
                'total_students',
                'participated_students',
                'average_score',
                'passing_rate',
                'assessment_date'
            ]);
    }

    /** @test */
    public function bsq_creation_validates_required_fields()
    {
        $response = $this->actingAs($this->teacher)
            ->postJson('/api/assessments/bsq', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'subject',
                'grade_level',
                'total_students',
                'participated_students',
                'average_score',
                'passing_rate',
                'assessment_date'
            ]);
    }

    /** @test */
    public function ksq_creation_validates_data_types()
    {
        $invalidData = [
            'subject' => 123, // should be string
            'grade_level' => 'invalid', // should be integer
            'total_students' => 'invalid', // should be integer
            'participated_students' => 'invalid', // should be integer
            'average_score' => 'invalid', // should be numeric
            'passing_rate' => 'invalid', // should be numeric
            'assessment_date' => 'invalid-date', // should be valid date
            'academic_year_id' => 'invalid' // should be integer
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson('/api/assessments/ksq', $invalidData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'subject',
                'grade_level',
                'total_students',
                'participated_students',
                'average_score',
                'passing_rate',
                'assessment_date'
            ]);
    }

    /** @test */
    public function ksq_creation_validates_logical_constraints()
    {
        $invalidData = [
            'subject' => 'Riyaziyyat',
            'grade_level' => 5,
            'total_students' => 10,
            'participated_students' => 15, // Cannot be more than total
            'average_score' => 110, // Cannot be more than 100
            'passing_rate' => 110, // Cannot be more than 100
            'assessment_date' => '2024-12-01',
            'academic_year_id' => $this->academicYear->id
        ];

        $response = $this->actingAs($this->teacher)
            ->postJson('/api/assessments/ksq', $invalidData);

        $response->assertStatus(422);
    }

    /** @test */
    public function user_can_update_ksq_result()
    {
        $ksqResult = KSQResult::first();
        
        $updateData = [
            'average_score' => 80.0,
            'passing_rate' => 88.0
        ];

        $response = $this->actingAs($this->teacher)
            ->putJson('/api/assessments/ksq/' . $ksqResult->id, $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'KSQ nəticəsi uğurla yeniləndi'
            ]);

        $this->assertDatabaseHas('k_s_q_results', [
            'id' => $ksqResult->id,
            'average_score' => 80.0,
            'passing_rate' => 88.0
        ]);
    }

    /** @test */
    public function user_can_delete_ksq_result()
    {
        $ksqResult = KSQResult::first();

        $response = $this->actingAs($this->teacher)
            ->deleteJson('/api/assessments/ksq/' . $ksqResult->id);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'KSQ nəticəsi uğurla silindi'
            ]);

        $this->assertSoftDeleted('k_s_q_results', [
            'id' => $ksqResult->id
        ]);
    }

    /** @test */
    public function user_can_get_assessment_analytics()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments/analytics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'institution_performance',
                'subject_performance',
                'grade_performance',
                'trends',
                'comparisons'
            ]);
    }

    /** @test */
    public function user_cannot_access_other_institution_assessments()
    {
        // Create another institution and user
        $otherInstitution = Institution::create([
            'name' => 'Başqa Məktəb',
            'level' => 4,
            'type' => 'school',
            'is_active' => true
        ]);

        $otherUser = User::factory()->create([
            'username' => 'otheruser',
            'institution_id' => $otherInstitution->id
        ]);

        $response = $this->actingAs($otherUser)
            ->getJson('/api/assessments?institution_id=' . $this->institution->id);

        $response->assertStatus(403);
    }

    /** @test */
    public function assessment_overview_supports_pagination()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments?per_page=1');

        $response->assertStatus(200);

        $ksqResults = $response->json('ksq_results');
        $bsqResults = $response->json('bsq_results');

        // Check pagination structure
        $this->assertArrayHasKey('current_page', $ksqResults);
        $this->assertArrayHasKey('last_page', $ksqResults);
        $this->assertArrayHasKey('per_page', $ksqResults);
        $this->assertArrayHasKey('total', $ksqResults);
    }

    /** @test */
    public function unauthorized_users_cannot_access_assessments()
    {
        $response = $this->getJson('/api/assessments');
        
        $response->assertStatus(401);
    }

    /** @test */
    public function assessment_endpoints_return_proper_json_structure()
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/assessments');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json');

        $data = $response->json();
        $this->assertIsArray($data);
        $this->assertArrayHasKey('ksq_results', $data);
        $this->assertArrayHasKey('bsq_results', $data);
        $this->assertArrayHasKey('analytics', $data);
    }
}