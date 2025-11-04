<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Survey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyAnalyticsTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    public function test_survey_statistics_and_overview_endpoints_return_metrics(): void
    {
        $institution = Institution::factory()->create();

        $admin = $this->createUserWithRole(
            'superadmin',
            [
                'surveys.read',
                'surveys.write',
                'surveys.publish',
                'surveys.target',
                'survey_responses.write',
                'survey_responses.read',
            ],
            ['institution_id' => $institution->id]
        );

        $payload = [
            'title' => 'Regional Satisfaction Survey',
            'description' => 'Quarterly survey to capture satisfaction indicators.',
            'questions' => [
                [
                    'question' => 'Rate overall satisfaction on a scale of 1-5.',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => [$institution->id],
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

        $respondent = $this->createUserWithRole(
            'schooladmin',
            [
                'surveys.respond',
                'survey_responses.write',
                'survey_responses.read',
            ],
            ['institution_id' => $institution->id]
        );

        $start = $this->actingAs($respondent, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/responses/start");

        $responseId = $start->json('data.response.id');

        $this->actingAs($respondent, 'sanctum')
            ->putJson("/api/survey-responses/{$responseId}/save", [
                'responses' => [
                    (string) $question->id => '5',
                ],
            ])
            ->assertOk();

        $this->actingAs($respondent, 'sanctum')
            ->postJson("/api/survey-responses/{$responseId}/submit")
            ->assertOk();

        $statistics = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/surveys/{$surveyId}/statistics");

        $statistics->assertOk()
            ->assertJsonPath('data.basic_stats.total_responses', 1);

        $overview = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/surveys/{$surveyId}/analytics/overview");

        $overview->assertOk()
            ->assertJsonPath('data.survey_id', $surveyId)
            ->assertJsonStructure([
                'data' => [
                    'survey_id',
                    'survey_title',
                    'kpi_metrics' => [
                        'total_responses',
                        'completed_responses',
                        'in_progress_responses',
                        'not_started',
                        'response_rate',
                    ],
                    'status_distribution',
                ],
            ]);
    }
}
