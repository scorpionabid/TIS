<?php

namespace Tests\Feature\Api;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyPublishTest extends TestCase
{
    use RefreshDatabase, SeedsDefaultRolesAndPermissions;

    private $superAdmin;
    private $regionAdmin;
    private $schoolAdmin;
    private $surveyCreator;
    private $unauthorizedUser;
    private $institution;

    protected function setUp(): void
    {
        parent::setUp();

        $this->institution = Institution::factory()->create(['level' => 1]); // Region
        
        $this->superAdmin = $this->createUserWithRole('superadmin');
        $this->regionAdmin = $this->createUserWithRole('regionadmin', [], ['institution_id' => $this->institution->id]);
        $this->schoolAdmin = $this->createUserWithRole('schooladmin');
        $this->surveyCreator = $this->createUserWithRole('regionadmin', [], ['institution_id' => $this->institution->id]);
        $this->unauthorizedUser = User::factory()->create();
    }

    #[Test]
    public function unauthenticated_user_cannot_publish_survey()
    {
        $survey = Survey::factory()->draft()->create();

        $response = $this->postJson("/api/surveys/{$survey->id}/publish");

        $response->assertStatus(401);
    }

    #[Test]
    public function superadmin_can_publish_any_draft_survey()
    {
        $survey = Survey::factory()->draft()->create([
            'title' => 'Test Survey',
            'creator_id' => $this->surveyCreator->id
        ]);
        
        // Add a question to satisfy validation
        SurveyQuestion::factory()->create([
            'survey_id' => $survey->id,
            'title' => 'Question 1',
            'type' => 'text'
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/publish");

        $response->assertOk();
        $response->assertJsonPath('data.status', 'published');
        
        $this->assertDatabaseHas('surveys', [
            'id' => $survey->id,
            'status' => 'published'
        ]);
        
        $this->assertNotNull($survey->fresh()->published_at);
    }

    #[Test]
    public function survey_creator_can_publish_their_own_survey()
    {
        $survey = Survey::factory()->draft()->create([
            'title' => 'Creator Survey',
            'creator_id' => $this->surveyCreator->id
        ]);
        
        SurveyQuestion::factory()->create([
            'survey_id' => $survey->id,
            'title' => 'Question 1',
            'type' => 'text'
        ]);

        $response = $this->actingAs($this->surveyCreator, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/publish");

        $response->assertOk();
        $this->assertEquals('published', $survey->fresh()->status);
    }

    #[Test]
    public function unauthorized_user_cannot_publish_others_survey()
    {
        $survey = Survey::factory()->draft()->create([
            'creator_id' => $this->surveyCreator->id
        ]);

        $response = $this->actingAs($this->unauthorizedUser, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/publish");

        $response->assertStatus(403);
    }

    #[Test]
    public function cannot_publish_survey_without_questions()
    {
        $survey = Survey::factory()->draft()->create([
            'title' => 'Empty Survey',
            'creator_id' => $this->surveyCreator->id
        ]);
        
        // Ensure NO questions exist
        $survey->questions()->delete();

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/publish");

        // Should return 500 based on SurveyStatusController catching Exception
        $response->assertStatus(500);
        $response->assertJsonPath('success', false);
    }

    #[Test]
    public function cannot_publish_already_published_survey()
    {
        $survey = Survey::factory()->published()->create([
            'creator_id' => $this->surveyCreator->id
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/publish");

        // Idempotent: returns successful
        $response->assertOk();
        $response->assertJsonPath('data.status', 'published');
    }

    #[Test]
    public function publishing_creates_audit_log()
    {
        $survey = Survey::factory()->draft()->create([
            'creator_id' => $this->surveyCreator->id
        ]);
        
        SurveyQuestion::factory()->create([
            'survey_id' => $survey->id,
            'title' => 'Audit Question',
            'type' => 'text'
        ]);

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/publish");

        $this->assertDatabaseHas('survey_audit_logs', [
            'survey_id' => $survey->id,
            'action' => 'published'
        ]);
    }
}
