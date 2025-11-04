<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Survey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyStatusTransitionsTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    public function test_superadmin_can_cycle_through_survey_statuses(): void
    {
        $institution = Institution::factory()->create();

        $admin = $this->createUserWithRole(
            'superadmin',
            [
                'surveys.read',
                'surveys.write',
                'surveys.publish',
                'surveys.manage',
            ],
            ['institution_id' => $institution->id]
        );

        $payload = [
            'title' => 'Annual Infrastructure Survey',
            'description' => 'Collecting data points for infrastructure planning',
            'questions' => [
                [
                    'question' => 'What are the top infrastructure priorities for the upcoming year?',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => [$institution->id],
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
        ];

        $create = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/surveys', $payload);

        $surveyId = $create->json('data.id');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/pause")
            ->assertOk()
            ->assertJsonPath('data.status', 'paused');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/resume")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/close")
            ->assertOk()
            ->assertJsonPath('data.status', 'closed');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/reopen")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/restore", [
                'target_status' => 'draft',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('surveys', [
            'id' => $surveyId,
            'status' => 'draft',
        ]);
    }
}
