<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\PsychologySession;
use App\Models\PsychologyAssessment;
use App\Models\PsychologyNote;

class PsychologyControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->institution = Institution::factory()->create();
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->user->assignRole('Müəllim');
    }

    public function test_can_list_psychology_sessions()
    {
        $this->actingAs($this->user, 'sanctum');

        PsychologySession::factory()->count(3)->create([
            'institution_id' => $this->institution->id,
            'psychologist_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/psychology/sessions');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'student_name',
                            'session_date',
                            'session_type',
                            'status',
                        ]
                    ]
                ]);
    }

    public function test_can_create_psychology_session()
    {
        $this->actingAs($this->user, 'sanctum');

        $sessionData = [
            'student_name' => $this->faker->name,
            'student_class' => '8A',
            'session_date' => now()->addDays(1)->format('Y-m-d H:i:s'),
            'session_type' => 'individual',
            'duration_minutes' => 45,
            'reason' => 'Academic anxiety assessment',
        ];

        $response = $this->postJson('/api/psychology/sessions', $sessionData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'student_name',
                        'session_date',
                        'session_type',
                        'status',
                    ]
                ]);

        $this->assertDatabaseHas('psychology_sessions', [
            'student_name' => $sessionData['student_name'],
            'psychologist_id' => $this->user->id,
            'institution_id' => $this->institution->id,
        ]);
    }

    public function test_can_view_psychology_session()
    {
        $this->actingAs($this->user, 'sanctum');

        $session = PsychologySession::factory()->create([
            'institution_id' => $this->institution->id,
            'psychologist_id' => $this->user->id,
        ]);

        $response = $this->getJson("/api/psychology/sessions/{$session->id}");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'student_name',
                        'session_date',
                        'session_type',
                        'notes',
                        'assessments',
                    ]
                ]);
    }

    public function test_can_update_psychology_session()
    {
        $this->actingAs($this->user, 'sanctum');

        $session = PsychologySession::factory()->create([
            'institution_id' => $this->institution->id,
            'psychologist_id' => $this->user->id,
        ]);

        $updateData = [
            'status' => 'completed',
            'notes' => 'Session completed successfully',
        ];

        $response = $this->putJson("/api/psychology/sessions/{$session->id}", $updateData);

        $response->assertStatus(200);

        $this->assertDatabaseHas('psychology_sessions', [
            'id' => $session->id,
            'status' => 'completed',
        ]);
    }

    public function test_can_create_psychology_assessment()
    {
        $this->actingAs($this->user, 'sanctum');

        $session = PsychologySession::factory()->create([
            'institution_id' => $this->institution->id,
            'psychologist_id' => $this->user->id,
        ]);

        $assessmentData = [
            'assessment_type' => 'anxiety',
            'assessment_method' => 'BAI',
            'results' => [
                'score' => 15,
                'level' => 'mild',
                'recommendations' => ['Regular follow-up', 'Relaxation techniques']
            ],
            'assessment_date' => now()->format('Y-m-d'),
        ];

        $response = $this->postJson("/api/psychology/sessions/{$session->id}/assessments", $assessmentData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'assessment_type',
                        'assessment_method',
                        'results',
                    ]
                ]);
    }

    public function test_can_add_session_notes()
    {
        $this->actingAs($this->user, 'sanctum');

        $session = PsychologySession::factory()->create([
            'institution_id' => $this->institution->id,
            'psychologist_id' => $this->user->id,
        ]);

        $noteData = [
            'note_type' => 'session_summary',
            'content' => 'Student showed significant improvement in anxiety management.',
            'is_confidential' => true,
        ];

        $response = $this->postJson("/api/psychology/sessions/{$session->id}/notes", $noteData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'note_type',
                        'content',
                        'created_at',
                    ]
                ]);
    }

    public function test_cannot_access_other_institution_sessions()
    {
        $this->actingAs($this->user, 'sanctum');

        $otherInstitution = Institution::factory()->create();
        $otherUser = User::factory()->create(['institution_id' => $otherInstitution->id]);
        
        $otherSession = PsychologySession::factory()->create([
            'institution_id' => $otherInstitution->id,
            'psychologist_id' => $otherUser->id,
        ]);

        $response = $this->getJson("/api/psychology/sessions/{$otherSession->id}");

        $response->assertStatus(403);
    }

    public function test_requires_authentication()
    {
        $response = $this->getJson('/api/psychology/sessions');
        $response->assertStatus(401);
    }

    public function test_validates_session_creation_data()
    {
        $this->actingAs($this->user, 'sanctum');

        $invalidData = [
            'student_name' => '', // Required field
            'session_date' => 'invalid-date',
            'session_type' => 'invalid-type',
        ];

        $response = $this->postJson('/api/psychology/sessions', $invalidData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['student_name', 'session_date', 'session_type']);
    }

    public function test_can_get_psychology_statistics()
    {
        $this->actingAs($this->user, 'sanctum');

        PsychologySession::factory()->count(5)->create([
            'institution_id' => $this->institution->id,
            'psychologist_id' => $this->user->id,
            'status' => 'completed',
        ]);

        PsychologyAssessment::factory()->count(3)->create([
            'psychologist_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/psychology/statistics');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'total_sessions',
                        'completed_sessions',
                        'pending_sessions',
                        'total_assessments',
                        'monthly_stats',
                    ]
                ]);
    }
}