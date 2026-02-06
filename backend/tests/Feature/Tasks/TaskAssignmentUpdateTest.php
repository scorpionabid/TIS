<?php

namespace Tests\Feature\Tasks;

use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskAssignment;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class TaskAssignmentUpdateTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function createTaskWithAssignment(): array
    {
        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $creator = $this->createUserWithRole('superadmin', [
            'tasks.read',
            'tasks.create',
            'tasks.update',
            'tasks.bulk',
        ], [
            'institution_id' => $region->id,
        ]);

        $assignee = $this->createUserWithRole('schooladmin', [
            'tasks.read',
            'tasks.update',
        ], [
            'institution_id' => $school->id,
        ]);

        $task = Task::create([
            'title' => 'Inspect laboratory equipment',
            'description' => 'Check lab equipment for compliance.',
            'category' => 'audit',
            'priority' => 'medium',
            'status' => 'pending',
            'created_by' => $creator->id,
            'assigned_to' => $assignee->id,
            'assigned_to_institution_id' => $school->id,
            'target_institutions' => [$school->id],
            'progress' => 0,
        ]);

        $assignment = TaskAssignment::create([
            'task_id' => $task->id,
            'assigned_user_id' => $assignee->id,
            'institution_id' => $school->id,
            'assignment_status' => 'pending',
            'priority' => 'medium',
            'progress' => 0,
        ]);

        return [$task, $assignment, $assignee, $creator];
    }

    public function test_assignee_can_update_assignment_status(): void
    {
        [$task, $assignment, $assignee] = $this->createTaskWithAssignment();

        $response = $this->actingAs($assignee, 'sanctum')
            ->putJson("/api/assignments/{$assignment->id}/status", [
                'status' => 'in_progress',
                'progress' => 40,
                'completion_notes' => 'Initial inspection done.',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.assignment_status', 'in_progress')
            ->assertJsonPath('data.progress', 40);

        $this->assertDatabaseHas('task_assignments', [
            'id' => $assignment->id,
            'assignment_status' => 'in_progress',
            'progress' => 40,
            'completion_notes' => 'Initial inspection done.',
        ]);

        $task->refresh();
        $this->assertEquals(40, $task->progress);
    }

    public function test_creator_can_bulk_update_assignments(): void
    {
        [$task, $assignment, $assignee, $creator] = $this->createTaskWithAssignment();

        $response = $this->actingAs($creator, 'sanctum')
            ->postJson('/api/assignments/bulk-update', [
                'assignment_ids' => [$assignment->id],
                'status' => 'completed',
                'progress' => 100,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.successful', 1);

        $this->assertDatabaseHas('task_assignments', [
            'id' => $assignment->id,
            'assignment_status' => 'completed',
            'progress' => 100,
        ]);

        $task->refresh();
        $this->assertEquals(100, $task->progress);
        $this->assertEquals('review', $task->status);
    }
}
