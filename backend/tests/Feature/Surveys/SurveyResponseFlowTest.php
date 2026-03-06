<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Survey;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyResponseFlowTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_target_user_can_start_and_save_survey_response(): void
    {
        $institution = Institution::factory()->create();

        $creator = $this->createUserWithRole(
            'superadmin',
            [
                'surveys.read',
                'surveys.write',
                'surveys.publish',
                'surveys.target',
            ],
            ['institution_id' => $institution->id]
        );

        $surveyPayload = [
            'title' => 'Regional Needs Assessment',
            'description' => 'Collecting feedback from institutions',
            'questions' => [
                [
                    'question' => 'List three priority areas for support.',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => [$institution->id],
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
        ];

        $createResponse = $this->actingAs($creator, 'sanctum')
            ->postJson('/api/surveys', $surveyPayload);

        $surveyId = $createResponse->json('data.id');
        $this->actingAs($creator, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/publish")
            ->assertOk();

        $survey = Survey::with('questions')->findOrFail($surveyId);
        $question = $survey->questions->first();

        $respondent = $this->createUserWithRole(
            'schooladmin',
            [
                'survey_responses.write',
                'survey_responses.read',
                'surveys.respond',
            ],
            ['institution_id' => $institution->id]
        );

        $startResponse = $this->actingAs($respondent, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/responses/start");

        $startResponse->assertCreated()
            ->assertJsonPath('data.response.survey_id', $surveyId)
            ->assertJsonPath('data.response.status', 'draft');

        $responseId = $startResponse->json('data.response.id');

        $saveResponse = $this->actingAs($respondent, 'sanctum')
            ->putJson("/api/survey-responses/{$responseId}/save", [
                'responses' => [
                    (string) $question->id => 'Infrastructure upgrades, teacher training, digital resources',
                ],
            ]);

        $saveResponse->assertOk()
            ->assertJsonPath('data.response.progress_percentage', 100)
            ->assertJsonPath('data.response.is_complete', true);

        $this->assertDatabaseHas('survey_responses', [
            'id' => $responseId,
            'survey_id' => $surveyId,
            'respondent_id' => $respondent->id,
            'status' => 'draft',
            'is_complete' => true,
            'progress_percentage' => 100,
        ]);

        $submitResponse = $this->actingAs($respondent, 'sanctum')
            ->postJson("/api/survey-responses/{$responseId}/submit");

        $submitResponse->assertOk()
            ->assertJsonPath('data.response.status', 'submitted');

        $this->assertDatabaseHas('survey_responses', [
            'id' => $responseId,
            'status' => 'submitted',
        ]);

        $this->assertDatabaseHas('surveys', [
            'id' => $surveyId,
            'response_count' => 1,
        ]);
    }
}
