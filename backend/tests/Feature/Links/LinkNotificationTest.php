<?php

namespace Tests\Feature\Links;

use App\Models\Institution;
use App\Models\LinkShare;
use App\Services\LinkSharingService;
use App\Services\NotificationService;
use Mockery;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class LinkNotificationTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_link_update_triggers_notifications_for_target_institutions(): void
    {
        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $editor = $this->createUserWithRole('regionadmin', ['links.update'], [
            'institution_id' => $region->id,
        ]);

        $targetUser = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $school->id,
        ]);

        $linkShare = new LinkShare([
            'title' => 'Digital Resource Portal',
            'description' => 'Portal description',
            'url' => 'https://example.com/resource',
            'link_type' => 'external',
            'share_scope' => 'institutional',
            'target_institutions' => [$school->id],
            'target_roles' => ['schooladmin'],
        ]);
        $linkShare->id = 42;
        $linkShare->setAttribute('institution_id', $editor->institution_id);
        $linkShare->setRelation('sharedBy', $editor);
        $linkShare->setRelation('institution', $editor->institution);

        $linkSharingService = Mockery::mock(LinkSharingService::class);
        $linkSharingService->shouldReceive('updateLinkShare')
            ->once()
            ->with(
                $linkShare->id,
                Mockery::type('array'),
                Mockery::on(fn ($user) => $user->id === $editor->id)
            )
            ->andReturn($linkShare);
        $this->app->instance(LinkSharingService::class, $linkSharingService);

        $notificationService = Mockery::mock(NotificationService::class);
        $notificationService->shouldReceive('sendLinkNotification')
            ->once()
            ->with(
                $linkShare,
                'updated',
                Mockery::on(fn ($users) => $users === [$targetUser->id]),
                Mockery::on(fn ($data) => $data['link_title'] === $linkShare->title)
            )
            ->andReturn([]);
        $this->app->instance(NotificationService::class, $notificationService);

        $response = $this->actingAs($editor, 'sanctum')->putJson("/api/links/{$linkShare->id}", [
            'description' => 'Updated portal description',
        ]);

        $response->assertOk();
    }
}
