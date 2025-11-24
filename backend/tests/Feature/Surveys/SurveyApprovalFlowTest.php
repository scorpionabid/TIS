<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyApprovalFlowTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    protected array $adminPermissions = [
        'surveys.read',
        'surveys.write',
        'surveys.publish',
        'surveys.target',
        'survey_responses.write',
        'survey_responses.read',
        'survey_responses.approve',
        'survey_responses.bulk_approve',
    ];

    protected array $respondentPermissions = [
        'surveys.respond',
        'survey_responses.write',
        'survey_responses.read',
    ];

    public function test_superadmin_can_approve_submitted_response(): void
    {
        $institution = Institution::factory()->create();
        $admin = $this->createUserWithRole('superadmin', $this->adminPermissions, [
            'institution_id' => $institution->id,
        ]);

        [$survey, $question] = $this->createPublishedSurvey($admin, [$institution->id]);

        $respondent = $this->createUserWithRole('schooladmin', $this->respondentPermissions, [
            'institution_id' => $institution->id,
        ]);

        $response = $this->createSubmittedResponse($respondent, $survey, $question);

        $approval = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/responses/{$response->id}/approve", [
                'comments' => 'Approved for reporting',
            ]);

        $approval->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseHas('survey_responses', [
            'id' => $response->id,
            'status' => 'approved',
            'approved_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('data_approval_requests', [
            'approvalable_id' => $response->id,
            'approvalable_type' => SurveyResponse::class,
            'current_status' => 'approved',
        ]);
    }

    public function test_bulk_approval_approves_multiple_responses(): void
    {
        $institutions = Institution::factory()->count(2)->create();
        $admin = $this->createUserWithRole('superadmin', $this->adminPermissions, [
            'institution_id' => $institutions->first()->id,
        ]);

        [$survey, $question] = $this->createPublishedSurvey($admin, $institutions->pluck('id')->toArray());

        $responses = collect();
        foreach ($institutions as $institution) {
            $respondent = $this->createUserWithRole('schooladmin', $this->respondentPermissions, [
                'institution_id' => $institution->id,
            ]);
            $responses->push($this->createSubmittedResponse($respondent, $survey, $question));
        }

        $bulk = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/responses/bulk-approval', [
                'response_ids' => $responses->pluck('id')->toArray(),
                'action' => 'approve',
                'comments' => 'Approved in bulk',
            ]);

        $bulk->assertOk()
            ->assertJsonPath('data.successful', 2)
            ->assertJsonPath('data.failed', 0);

        foreach ($responses as $response) {
            $this->assertDatabaseHas('survey_responses', [
                'id' => $response->id,
                'status' => 'approved',
                'approved_by' => $admin->id,
            ]);

            $this->assertDatabaseHas('data_approval_requests', [
                'approvalable_id' => $response->id,
                'approvalable_type' => SurveyResponse::class,
                'current_status' => 'approved',
            ]);
        }
    }

    /**
     * Create and publish a survey with a single question.
     *
     * @return array{Survey,\App\Models\SurveyQuestion}
     */
    private function createPublishedSurvey($admin, array $targetInstitutionIds): array
    {
        $payload = [
            'title' => 'Policy Compliance Survey',
            'description' => 'Collecting compliance data from institutions.',
            'questions' => [
                [
                    'question' => 'Describe compliance activities completed this month.',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => $targetInstitutionIds,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
        ];

        $create = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/surveys', $payload);

        $surveyId = $create->json('data.id');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/publish")
            ->assertOk();

        $survey = Survey::with('questions')->findOrFail($surveyId);
        $question = $survey->questions->first();

        return [$survey, $question];
    }

    /**
     * Create a submitted survey response for a given user.
     */
    private function createSubmittedResponse($respondent, Survey $survey, $question): SurveyResponse
    {
        $start = $this->actingAs($respondent, 'sanctum')
            ->postJson("/api/surveys/{$survey->id}/responses/start");

        $responseId = $start->json('data.response.id');

        $this->actingAs($respondent, 'sanctum')
            ->putJson("/api/survey-responses/{$responseId}/save", [
                'responses' => [
                    (string) $question->id => 'Completed compliance audit and submitted report.',
                ],
            ])
            ->assertOk();

        $this->actingAs($respondent, 'sanctum')
            ->postJson("/api/survey-responses/{$responseId}/submit")
            ->assertOk();

        return SurveyResponse::with('approvalRequest')->findOrFail($responseId);
    }
}
