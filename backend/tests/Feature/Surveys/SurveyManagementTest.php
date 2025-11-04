<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Survey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyManagementTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    public function test_superadmin_can_create_publish_and_retrieve_survey(): void
    {
        $institution = Institution::factory()->create();

        $admin = $this->createUserWithRole(
            'superadmin',
            [
                'surveys.read',
                'surveys.write',
                'surveys.publish',
                'surveys.target',
            ],
            ['institution_id' => $institution->id]
        );

        $payload = [
            'title' => 'Teacher Satisfaction Survey',
            'description' => 'Annual feedback collection for teachers',
            'questions' => [
                [
                    'question' => 'How satisfied are you with the current curriculum?',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => [$institution->id],
        ];

        $createResponse = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/surveys', $payload);

        $createResponse->assertCreated()
            ->assertJsonPath('data.title', 'Teacher Satisfaction Survey')
            ->assertJsonPath('data.status', 'draft');

        $surveyId = $createResponse->json('data.id');

        $this->assertDatabaseHas('surveys', [
            'id' => $surveyId,
            'title' => 'Teacher Satisfaction Survey',
            'status' => 'draft',
        ]);

        $survey = Survey::with('questions')->findOrFail($surveyId);
        $this->assertCount(1, $survey->questions);

        $publishResponse = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/publish");

        $publishResponse->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.id', $surveyId);

        $this->assertDatabaseHas('surveys', [
            'id' => $surveyId,
            'status' => 'published',
        ]);

        $listResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/surveys');

        $listResponse->assertOk()
            ->assertJsonPath('data.data.0.id', $surveyId)
            ->assertJsonPath('data.data.0.title', 'Teacher Satisfaction Survey');
    }
}
