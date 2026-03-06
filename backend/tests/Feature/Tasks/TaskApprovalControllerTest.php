<?php

namespace Tests\Feature\Tasks;

use App\Models\Institution;
use App\Models\Task;
use App\Models\User;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class TaskApprovalControllerTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected User $creator;
    protected User $approver;
    protected Institution $school;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $region = Institution::factory()->regional()->create();
        $this->school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $this->creator = $this->createUserWithRole('schooladmin', [
            'tasks.read',
            'tasks.create',
            'tasks.update',
        ], [
            'institution_id' => $this->school->id,
        ]);

        $this->approver = $this->createUserWithRole('sektoradmin', [
            'tasks.read',
            'tasks.update',
            'tasks.approve',
        ], [
            'institution_id' => $region->id,
        ]);

        $this->task = Task::create([
            'title' => 'Test task for approval',
            'description' => 'Testing approval workflow',
            'category' => 'report',
            'priority' => 'medium',
            'status' => 'completed',
            'progress' => 100,
            'created_by' => $this->creator->id,
            'target_institutions' => [$this->school->id],
            'requires_approval' => true,
            'approval_status' => null,
        ]);
    }

    public function test_user_can_submit_task_for_approval(): void
    {
        $response = $this->actingAs($this->creator, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/submit-for-approval");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.approval_status', 'pending');

        $this->assertDatabaseHas('tasks', [
            'id' => $this->task->id,
            'approval_status' => 'pending',
        ]);

        $this->assertNotNull($this->task->fresh()->submitted_for_approval_at);
    }

    public function test_cannot_submit_incomplete_task_for_approval(): void
    {
        $this->task->update(['status' => 'in_progress', 'progress' => 50]);

        $response = $this->actingAs($this->creator, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/submit-for-approval");

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_cannot_submit_task_that_does_not_require_approval(): void
    {
        $this->task->update(['requires_approval' => false]);

        $response = $this->actingAs($this->creator, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/submit-for-approval");

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_approver_can_approve_pending_task(): void
    {
        $this->task->update(['approval_status' => 'pending']);

        $response = $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/approve", [
                'notes' => 'Approved - well done!',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.approval_status', 'approved');

        $this->assertDatabaseHas('tasks', [
            'id' => $this->task->id,
            'approval_status' => 'approved',
            'approved_by' => $this->approver->id,
            'approval_notes' => 'Approved - well done!',
        ]);
    }

    public function test_approver_can_reject_pending_task(): void
    {
        $this->task->update(['approval_status' => 'pending']);

        $response = $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/reject", [
                'notes' => 'Incomplete report, please add more details.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.approval_status', 'rejected')
            ->assertJsonPath('data.status', 'pending'); // Status reset for rework

        $this->assertDatabaseHas('tasks', [
            'id' => $this->task->id,
            'approval_status' => 'rejected',
            'status' => 'pending',
            'approval_notes' => 'Incomplete report, please add more details.',
        ]);
    }

    public function test_reject_requires_notes(): void
    {
        $this->task->update(['approval_status' => 'pending']);

        $response = $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/reject", [
                'notes' => '',
            ]);

        $response->assertStatus(422);
    }

    public function test_user_without_approve_permission_cannot_approve(): void
    {
        $this->task->update(['approval_status' => 'pending']);

        $response = $this->actingAs($this->creator, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/approve");

        $response->assertStatus(403);
    }

    public function test_cannot_approve_non_pending_task(): void
    {
        $this->task->update(['approval_status' => 'approved']);

        $response = $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/approve");

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_cannot_reject_non_pending_task(): void
    {
        $this->task->update(['approval_status' => null]);

        $response = $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/tasks/{$this->task->id}/reject", [
                'notes' => 'Test rejection',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
