<?php

namespace Tests\Feature\Surveys;

use App\Models\Institution;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\Survey;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyNotificationTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_publishing_survey_creates_notifications_for_target_institution(): void
    {
        $institution = Institution::factory()->create();

        $superadmin = $this->createUserWithRole('superadmin', [
            'surveys.read',
            'surveys.write',
            'surveys.publish',
            'surveys.target',
        ], [
            'institution_id' => $institution->id,
        ]);

        $targetUser = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $institution->id,
        ]);

        NotificationTemplate::factory()->create([
            'key' => 'survey_published',
            'type' => 'survey_published',
            'title_template' => 'Yeni sorğu: {survey_title}',
            'message_template' => '{survey_title} sorğusu {creator_name} tərəfindən dərc edildi',
            'channels' => ['in_app'],
        ]);

        $payload = [
            'title' => 'Infrastructure Update Survey',
            'description' => 'Collecting data about school infrastructure projects.',
            'questions' => [
                [
                    'question' => 'Describe completed infrastructure work this term.',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => [$institution->id],
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(7)->toDateString(),
        ];

        $create = $this->actingAs($superadmin, 'sanctum')
            ->postJson('/api/surveys', $payload);

        $surveyId = $create->json('data.id');

        $this->actingAs($superadmin, 'sanctum')
            ->postJson("/api/surveys/{$surveyId}/publish")
            ->assertOk();

        $this->assertDatabaseHas('surveys', [
            'id' => $surveyId,
            'status' => 'published',
        ]);

        $notification = Notification::where('type', 'survey_published')
            ->where('user_id', $targetUser->id)
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame('in_app', $notification->channel);
        $this->assertSame($surveyId, $notification->related_id);
    }

    public function test_updating_target_institutions_persists_changes(): void
    {
        $institution = Institution::factory()->create();
        $otherInstitution = Institution::factory()->create();

        $superadmin = $this->createUserWithRole('superadmin', [
            'surveys.read',
            'surveys.write',
            'surveys.publish',
            'surveys.target',
        ], [
            'institution_id' => $institution->id,
        ]);

        $payload = [
            'title' => 'Teacher Feedback Survey',
            'description' => 'Collect feedback from teaching staff.',
            'questions' => [
                [
                    'question' => 'How satisfied are you with current teaching resources?',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
            'target_institutions' => [$institution->id],
        ];

        $create = $this->actingAs($superadmin, 'sanctum')
            ->postJson('/api/surveys', $payload);

        $surveyId = $create->json('data.id');

        $update = $this->actingAs($superadmin, 'sanctum')
            ->putJson("/api/surveys/{$surveyId}", [
                'target_institutions' => [$otherInstitution->id],
            ]);

        $update->assertOk()
            ->assertJsonPath('data.target_institutions.0', $otherInstitution->id);

        $this->assertDatabaseHas('surveys', [
            'id' => $surveyId,
        ]);

        $survey = Survey::findOrFail($surveyId);
        $this->assertSame([$otherInstitution->id], $survey->target_institutions);
    }
}
