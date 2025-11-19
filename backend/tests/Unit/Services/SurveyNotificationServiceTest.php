<?php

namespace Tests\Unit\Services;

use App\Models\Institution;
use App\Models\Survey;
use App\Services\InstitutionNotificationHelper;
use App\Services\NotificationService;
use App\Services\SurveyNotificationService;
use Mockery;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class SurveyNotificationServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_notify_survey_published_targets_institution_users(): void
    {
        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $creator = $this->createUserWithRole('regionadmin', [], ['institution_id' => $region->id]);
        $targetUser = $this->createUserWithRole('schooladmin', [], ['institution_id' => $school->id]);

        $survey = Survey::factory()
            ->for($creator, 'creator')
            ->published()
            ->create([
                'target_institutions' => [$school->id],
                'end_date' => now()->addWeeks(2),
            ]);

        $notificationService = Mockery::mock(NotificationService::class);
        $notificationService->shouldReceive('sendSurveyNotification')
            ->once()
            ->with(
                Mockery::on(fn ($arg) => $arg->id === $survey->id),
                'published',
                [$targetUser->id],
                Mockery::on(fn ($extra) => $extra['survey_id'] === $survey->id),
                Mockery::on(fn ($options) => $options['channels'] === ['in_app'])
            )
            ->andReturn([]);

        $helper = new InstitutionNotificationHelper();
        $service = new SurveyNotificationService($notificationService, $helper);
        $service->notifySurveyPublished($survey);

        $this->addToAssertionCount(1);
    }
}
