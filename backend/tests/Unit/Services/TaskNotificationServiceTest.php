<?php

namespace Tests\Unit\Services;

use App\Models\Institution;
use App\Models\Task;
use App\Services\NotificationService;
use App\Services\TaskNotificationService;
use Mockery;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class TaskNotificationServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_notify_task_created_sends_notification_to_target_users(): void
    {
        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $creator = $this->createUserWithRole('regionadmin', [], ['institution_id' => $region->id]);
        $targetUser = $this->createUserWithRole('schooladmin', [], ['institution_id' => $school->id]);

        $task = Task::factory()
            ->for($creator, 'creator')
            ->for($school, 'assignedInstitution')
            ->create([
                'target_institutions' => [$school->id],
                'deadline' => now()->addDays(5),
                'status' => 'pending',
                'priority' => 'medium',
            ]);

        $notificationService = Mockery::mock(NotificationService::class);
        $notificationService->shouldReceive('sendTaskNotification')
            ->once()
            ->with(
                Mockery::on(fn ($arg) => $arg->id === $task->id),
                'assigned',
                [$targetUser->id],
                Mockery::on(fn ($extra) => $extra['creator_name'] === $creator->name
                    && $extra['action_url'] === "/tasks/{$task->id}")
            )
            ->andReturn([]);

        $service = new TaskNotificationService($notificationService);
        $service->notifyTaskCreated($task);

        $this->addToAssertionCount(1);
    }
}
