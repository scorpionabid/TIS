<?php

namespace Tests\Feature\Task;

use App\Models\Institution;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use App\Mail\TaskAssignedMail;
use App\Mail\TaskCompletedMail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TaskAssignmentServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $regionadmin;
    private User $schooladmin;
    private Institution $region;
    private Institution $school;

    protected function setUp(): void
    {
        parent::setUp();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'schooladmin', 'guard_name' => 'sanctum']);

        $this->region = Institution::factory()->create([
            'level' => 2,
            'type' => 'region',
            'is_active' => true,
        ]);

        $this->school = Institution::factory()->create([
            'level' => 4,
            'type' => 'school',
            'parent_id' => $this->region->id,
            'is_active' => true,
        ]);

        $this->regionadmin = User::factory()->create([
            'institution_id' => $this->region->id,
            'email' => 'regionadmin@test.az',
            'is_active' => true,
        ]);
        $this->regionadmin->assignRole('regionadmin');

        $this->schooladmin = User::factory()->create([
            'institution_id' => $this->school->id,
            'email' => 'schooladmin@test.az',
            'is_active' => true,
        ]);
        $this->schooladmin->assignRole('schooladmin');
    }

    // ─── EMAIL TESTS ───────────────────────────────────────────────────────────

    public function test_task_assigned_mail_is_sent_when_user_assigned()
    {
        Mail::fake();

        // Create a task
        $task = Task::factory()->create([
            'title' => 'Test Tapşırığı',
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
            'deadline' => now()->addDays(7),
        ]);

        // Sync assignments — triggers email
        $service = app(\App\Services\TaskAssignmentService::class);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        Mail::assertQueued(TaskAssignedMail::class, function ($mail) {
            return $mail->hasTo($this->schooladmin->email);
        });
    }

    public function test_task_assigned_mail_not_sent_for_removed_users()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'title' => 'Silinəcək Tapşırıq',
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);

        // First assign
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        // Reset mail fakes
        Mail::fake();

        // Now remove — sync with empty array
        $service->syncTaskAssignments($task, [], $this->regionadmin);

        // No new assignment emails should be sent
        Mail::assertNotQueued(TaskAssignedMail::class);
    }

    // ─── SYNC ASSIGNMENT TESTS ─────────────────────────────────────────────────

    public function test_sync_creates_new_assignment_for_new_user()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        $this->assertDatabaseHas('task_assignments', [
            'task_id' => $task->id,
            'assigned_user_id' => $this->schooladmin->id,
            'assignment_status' => 'pending',
        ]);
    }

    public function test_sync_removes_assignment_when_user_removed()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);

        // Assign
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);
        $this->assertDatabaseHas('task_assignments', [
            'task_id' => $task->id,
            'assigned_user_id' => $this->schooladmin->id,
        ]);

        // Remove
        $service->syncTaskAssignments($task, [], $this->regionadmin);
        $this->assertDatabaseMissing('task_assignments', [
            'task_id' => $task->id,
            'assigned_user_id' => $this->schooladmin->id,
        ]);
    }

    public function test_sync_does_not_duplicate_assignment()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);

        // Assign twice
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        $count = \App\Models\TaskAssignment::where('task_id', $task->id)
            ->where('assigned_user_id', $this->schooladmin->id)
            ->count();

        $this->assertEquals(1, $count);
    }

    // ─── STATUS TRANSITION TESTS ────────────────────────────────────────────────

    public function test_update_assignment_status_from_pending_to_in_progress()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        $assignment = \App\Models\TaskAssignment::where('task_id', $task->id)
            ->where('assigned_user_id', $this->schooladmin->id)
            ->first();

        $service->updateAssignmentStatus($assignment->id, [
            'status' => 'in_progress',
            'progress' => 30,
        ], $this->schooladmin);

        $this->assertDatabaseHas('task_assignments', [
            'id' => $assignment->id,
            'assignment_status' => 'in_progress',
        ]);
    }

    public function test_task_completed_mail_sent_when_assignment_completed()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
            'requires_approval' => false,
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        $assignment = \App\Models\TaskAssignment::where('task_id', $task->id)
            ->where('assigned_user_id', $this->schooladmin->id)
            ->first();

        // Move to in_progress first
        $service->updateAssignmentStatus($assignment->id, [
            'status' => 'in_progress',
        ], $this->schooladmin);

        // Then complete
        $service->updateAssignmentStatus($assignment->id, [
            'status' => 'completed',
        ], $this->schooladmin);

        Mail::assertQueued(TaskCompletedMail::class, function ($mail) {
            return $mail->hasTo($this->schooladmin->email);
        });
    }

    public function test_invalid_status_transition_throws_exception()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        $assignment = \App\Models\TaskAssignment::where('task_id', $task->id)->first();

        // pending -> completed is valid, but completed -> in_progress is NOT
        $service->updateAssignmentStatus($assignment->id, ['status' => 'completed'], $this->schooladmin);

        $this->expectException(\Exception::class);
        $service->updateAssignmentStatus($assignment->id, ['status' => 'in_progress'], $this->schooladmin);
    }

    // ─── PROGRESS CALCULATION TESTS ────────────────────────────────────────────

    public function test_task_progress_updates_when_assignment_completed()
    {
        Mail::fake();

        $task = Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status' => 'pending',
            'priority' => 'medium',
            'requires_approval' => false,
        ]);

        $service = app(\App\Services\TaskAssignmentService::class);
        $service->syncTaskAssignments($task, [$this->schooladmin->id], $this->regionadmin);

        $assignment = \App\Models\TaskAssignment::where('task_id', $task->id)->first();
        $service->updateAssignmentStatus($assignment->id, ['status' => 'in_progress'], $this->schooladmin);
        $service->updateAssignmentStatus($assignment->id, ['status' => 'completed'], $this->schooladmin);

        $task->refresh();
        $this->assertEquals(100, $task->progress);
        $this->assertEquals('completed', $task->status);
    }
}
