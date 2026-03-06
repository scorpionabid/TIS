<?php

namespace Tests\Feature\Tasks;

use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskSubDelegation;
use App\Models\User;
use App\Services\TaskSubDelegationService;
use App\Notifications\TaskSubDelegationNotification;
use Illuminate\Support\Facades\Notification;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class TaskSubDelegationServiceTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected TaskSubDelegationService $service;
    protected User $parentUser;
    protected User $delegateUser1;
    protected User $delegateUser2;
    protected Institution $region;
    protected Institution $school;
    protected Task $task;
    protected TaskAssignment $parentAssignment;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->service = app(TaskSubDelegationService::class);

        $this->region = Institution::factory()->regional()->create();
        $this->school = Institution::factory()->school()->create(['parent_id' => $this->region->id]);

        $this->parentUser = $this->createUserWithRole('sektoradmin', [
            'tasks.read',
            'tasks.create',
            'tasks.update',
        ], [
            'institution_id' => $this->region->id,
        ]);

        $this->delegateUser1 = $this->createUserWithRole('schooladmin', [
            'tasks.read',
            'tasks.update',
        ], [
            'institution_id' => $this->school->id,
        ]);

        $this->delegateUser2 = $this->createUserWithRole('schooladmin', [
            'tasks.read',
            'tasks.update',
        ], [
            'institution_id' => $this->school->id,
        ]);

        $this->task = Task::create([
            'title' => 'Test task for sub-delegation',
            'description' => 'Testing sub-delegation workflow',
            'category' => 'report',
            'priority' => 'medium',
            'status' => 'in_progress',
            'progress' => 0,
            'created_by' => $this->parentUser->id,
            'target_institutions' => [$this->school->id],
        ]);

        $this->parentAssignment = TaskAssignment::create([
            'task_id' => $this->task->id,
            'assigned_user_id' => $this->parentUser->id,
            'institution_id' => $this->region->id,
            'assignment_status' => 'in_progress',
            'priority' => 'medium',
            'progress' => 0,
            'has_sub_delegations' => false,
            'sub_delegation_count' => 0,
            'completed_sub_delegations' => 0,
        ]);
    }

    public function test_can_delegate_to_multiple_users(): void
    {
        $delegations = [
            ['user_id' => $this->delegateUser1->id, 'notes' => 'First delegation'],
            ['user_id' => $this->delegateUser2->id, 'notes' => 'Second delegation'],
        ];

        $result = $this->service->delegateToMultiple(
            $this->task,
            $this->parentAssignment,
            $delegations,
            $this->parentUser
        );

        $this->assertCount(2, $result);

        $this->assertDatabaseHas('task_sub_delegations', [
            'task_id' => $this->task->id,
            'parent_assignment_id' => $this->parentAssignment->id,
            'delegated_to_user_id' => $this->delegateUser1->id,
            'delegated_by_user_id' => $this->parentUser->id,
            'status' => 'pending',
            'delegation_notes' => 'First delegation',
        ]);

        $this->assertDatabaseHas('task_sub_delegations', [
            'task_id' => $this->task->id,
            'delegated_to_user_id' => $this->delegateUser2->id,
            'delegation_notes' => 'Second delegation',
        ]);

        // Parent assignment should be updated
        $this->parentAssignment->refresh();
        $this->assertTrue($this->parentAssignment->has_sub_delegations);
        $this->assertEquals(2, $this->parentAssignment->sub_delegation_count);
        $this->assertEquals(0, $this->parentAssignment->completed_sub_delegations);
    }

    public function test_delegate_with_deadline(): void
    {
        $deadline = now()->addDays(7);

        $delegations = [
            [
                'user_id' => $this->delegateUser1->id,
                'deadline' => $deadline->toDateTimeString(),
                'notes' => 'With deadline',
            ],
        ];

        $result = $this->service->delegateToMultiple(
            $this->task,
            $this->parentAssignment,
            $delegations,
            $this->parentUser
        );

        $this->assertCount(1, $result);
        $this->assertEquals($deadline->toDateTimeString(), $result->first()->deadline->toDateTimeString());
    }

    public function test_notifications_sent_on_delegation(): void
    {
        $delegations = [
            ['user_id' => $this->delegateUser1->id],
        ];

        $this->service->delegateToMultiple(
            $this->task,
            $this->parentAssignment,
            $delegations,
            $this->parentUser
        );

        Notification::assertSentTo(
            $this->delegateUser1,
            TaskSubDelegationNotification::class
        );
    }

    public function test_can_update_delegation_status_to_accepted(): void
    {
        $delegation = $this->createDelegation();

        $result = $this->service->updateStatus(
            $delegation,
            'accepted',
            [],
            $this->delegateUser1
        );

        $this->assertEquals('accepted', $result->status);
        $this->assertNotNull($result->accepted_at);
    }

    public function test_can_update_delegation_status_to_in_progress(): void
    {
        $delegation = $this->createDelegation('accepted');

        $result = $this->service->updateStatus(
            $delegation,
            'in_progress',
            ['progress' => 25],
            $this->delegateUser1
        );

        $this->assertEquals('in_progress', $result->status);
        $this->assertEquals(25, $result->progress);
        $this->assertNotNull($result->started_at);
    }

    public function test_can_update_delegation_status_to_completed(): void
    {
        $delegation = $this->createDelegation('in_progress');

        $result = $this->service->updateStatus(
            $delegation,
            'completed',
            [
                'completion_notes' => 'Task completed successfully',
                'completion_data' => ['key' => 'value'],
            ],
            $this->delegateUser1
        );

        $this->assertEquals('completed', $result->status);
        $this->assertEquals(100, $result->progress);
        $this->assertNotNull($result->completed_at);
        $this->assertEquals('Task completed successfully', $result->completion_notes);
        $this->assertEquals(['key' => 'value'], $result->completion_data);
    }

    public function test_can_cancel_delegation(): void
    {
        $delegation = $this->createDelegation('pending');

        $result = $this->service->updateStatus(
            $delegation,
            'cancelled',
            [],
            $this->parentUser
        );

        $this->assertEquals('cancelled', $result->status);
        $this->assertNotNull($result->cancelled_at);
    }

    public function test_parent_progress_calculated_correctly(): void
    {
        // Create two delegations
        $delegation1 = $this->createDelegation('in_progress', $this->delegateUser1);
        $delegation2 = $this->createDelegation('in_progress', $this->delegateUser2);

        // Update first delegation progress
        $delegation1->update(['progress' => 60]);
        $delegation2->update(['progress' => 40]);

        $averageProgress = $this->service->calculateParentProgress($this->parentAssignment);

        $this->assertEquals(50, $averageProgress);

        $this->parentAssignment->refresh();
        $this->assertEquals(50, $this->parentAssignment->progress);
    }

    public function test_cancelled_delegations_excluded_from_progress(): void
    {
        $delegation1 = $this->createDelegation('in_progress', $this->delegateUser1);
        $delegation2 = $this->createDelegation('cancelled', $this->delegateUser2);

        $delegation1->update(['progress' => 80]);
        $delegation2->update(['progress' => 0]);

        $averageProgress = $this->service->calculateParentProgress($this->parentAssignment);

        // Only active delegation should count (80/1 = 80)
        $this->assertEquals(80, $averageProgress);
    }

    public function test_are_all_completed_returns_true_when_all_done(): void
    {
        $delegation1 = $this->createDelegation('completed', $this->delegateUser1);
        $delegation2 = $this->createDelegation('completed', $this->delegateUser2);

        $result = $this->service->areAllCompleted($this->parentAssignment);

        $this->assertTrue($result);
    }

    public function test_are_all_completed_returns_false_when_not_all_done(): void
    {
        $delegation1 = $this->createDelegation('completed', $this->delegateUser1);
        $delegation2 = $this->createDelegation('in_progress', $this->delegateUser2);

        $result = $this->service->areAllCompleted($this->parentAssignment);

        $this->assertFalse($result);
    }

    public function test_cancelled_delegations_ignored_in_completion_check(): void
    {
        $delegation1 = $this->createDelegation('completed', $this->delegateUser1);
        $delegation2 = $this->createDelegation('cancelled', $this->delegateUser2);

        $result = $this->service->areAllCompleted($this->parentAssignment);

        // Should be true because cancelled is excluded
        $this->assertTrue($result);
    }

    public function test_can_delete_pending_delegation(): void
    {
        $delegation = $this->createDelegation('pending');
        $delegationId = $delegation->id;

        $result = $this->service->deleteDelegation($delegation, $this->parentUser);

        $this->assertTrue($result);
        $this->assertSoftDeleted('task_sub_delegations', ['id' => $delegationId]);

        $this->parentAssignment->refresh();
        $this->assertFalse($this->parentAssignment->has_sub_delegations);
        $this->assertEquals(0, $this->parentAssignment->sub_delegation_count);
    }

    public function test_delete_updates_parent_assignment_counts(): void
    {
        $delegation1 = $this->createDelegation('completed', $this->delegateUser1);
        $delegation2 = $this->createDelegation('pending', $this->delegateUser2);

        $this->parentAssignment->update([
            'sub_delegation_count' => 2,
            'completed_sub_delegations' => 1,
        ]);

        $this->service->deleteDelegation($delegation2, $this->parentUser);

        $this->parentAssignment->refresh();
        $this->assertTrue($this->parentAssignment->has_sub_delegations);
        $this->assertEquals(1, $this->parentAssignment->sub_delegation_count);
        $this->assertEquals(1, $this->parentAssignment->completed_sub_delegations);
    }

    public function test_notification_sent_when_all_delegations_completed(): void
    {
        $delegation = $this->createDelegation('in_progress', $this->delegateUser1);

        $this->service->updateStatus(
            $delegation,
            'completed',
            ['completion_notes' => 'Done'],
            $this->delegateUser1
        );

        // Parent user should receive notification about all completed
        Notification::assertSentTo(
            $this->parentUser,
            TaskSubDelegationNotification::class,
            function ($notification, $channels, $notifiable) {
                return true; // Verify notification was sent
            }
        );
    }

    /**
     * Helper to create a delegation
     */
    protected function createDelegation(string $status = 'pending', ?User $user = null): TaskSubDelegation
    {
        $user = $user ?? $this->delegateUser1;

        return TaskSubDelegation::create([
            'task_id' => $this->task->id,
            'parent_assignment_id' => $this->parentAssignment->id,
            'delegated_to_user_id' => $user->id,
            'delegated_by_user_id' => $this->parentUser->id,
            'status' => $status,
            'progress' => $status === 'completed' ? 100 : 0,
            'completed_at' => $status === 'completed' ? now() : null,
            'accepted_at' => in_array($status, ['accepted', 'in_progress', 'completed']) ? now() : null,
            'started_at' => in_array($status, ['in_progress', 'completed']) ? now() : null,
            'cancelled_at' => $status === 'cancelled' ? now() : null,
        ]);
    }
}
