<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Institution;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskComment;

class TaskControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $admin;
    protected User $assignee;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->institution = Institution::factory()->create();
        
        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->admin->assignRole('SchoolAdmin');
        
        $this->assignee = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);
        $this->assignee->assignRole('Müəllim');
    }

    public function test_can_list_tasks()
    {
        $this->actingAs($this->admin, 'sanctum');

        Task::factory()->count(3)->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/tasks');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'title',
                            'description',
                            'priority',
                            'status',
                            'due_date',
                            'creator',
                            'assignees_count',
                        ]
                    ]
                ]);
    }

    public function test_can_create_task()
    {
        $this->actingAs($this->admin, 'sanctum');

        $taskData = [
            'title' => 'Prepare Monthly Report',
            'description' => 'Compile student performance data for monthly review',
            'priority' => 'high',
            'due_date' => now()->addWeek()->format('Y-m-d H:i:s'),
            'category' => 'reporting',
            'assignee_ids' => [$this->assignee->id],
            'tags' => ['monthly', 'report', 'performance'],
            'estimated_hours' => 8,
            'requires_approval' => true,
        ];

        $response = $this->postJson('/api/tasks', $taskData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'title',
                        'description',
                        'priority',
                        'status',
                        'assignees',
                    ]
                ]);

        $this->assertDatabaseHas('tasks', [
            'title' => $taskData['title'],
            'creator_id' => $this->admin->id,
            'priority' => 'high',
        ]);

        $this->assertDatabaseHas('task_assignments', [
            'assignee_id' => $this->assignee->id,
            'status' => 'assigned',
        ]);
    }

    public function test_can_view_single_task()
    {
        $this->actingAs($this->admin, 'sanctum');

        $task = Task::factory()->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        TaskAssignment::factory()->create([
            'task_id' => $task->id,
            'assignee_id' => $this->assignee->id,
        ]);

        $response = $this->getJson("/api/tasks/{$task->id}");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'title',
                        'description',
                        'priority',
                        'status',
                        'creator',
                        'assignees',
                        'comments',
                        'progress_logs',
                    ]
                ]);
    }

    public function test_can_update_task()
    {
        $this->actingAs($this->admin, 'sanctum');

        $task = Task::factory()->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $updateData = [
            'title' => 'Updated Task Title',
            'priority' => 'medium',
            'status' => 'in_progress',
        ];

        $response = $this->putJson("/api/tasks/{$task->id}", $updateData);

        $response->assertStatus(200);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Task Title',
            'priority' => 'medium',
        ]);
    }

    public function test_assignee_can_update_task_status()
    {
        $this->actingAs($this->assignee, 'sanctum');

        $task = Task::factory()->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        TaskAssignment::factory()->create([
            'task_id' => $task->id,
            'assignee_id' => $this->assignee->id,
            'status' => 'assigned',
        ]);

        $response = $this->putJson("/api/tasks/{$task->id}/status", [
            'status' => 'in_progress',
            'progress_note' => 'Started working on the task',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('task_assignments', [
            'task_id' => $task->id,
            'assignee_id' => $this->assignee->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_can_add_task_comment()
    {
        $this->actingAs($this->assignee, 'sanctum');

        $task = Task::factory()->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        TaskAssignment::factory()->create([
            'task_id' => $task->id,
            'assignee_id' => $this->assignee->id,
        ]);

        $commentData = [
            'content' => 'I need clarification on the reporting format.',
            'comment_type' => 'question',
        ];

        $response = $this->postJson("/api/tasks/{$task->id}/comments", $commentData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'content',
                        'author',
                        'comment_type',
                        'created_at',
                    ]
                ]);

        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'user_id' => $this->assignee->id,
            'content' => $commentData['content'],
        ]);
    }

    public function test_can_bulk_assign_tasks()
    {
        $this->actingAs($this->admin, 'sanctum');

        $tasks = Task::factory()->count(3)->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $bulkData = [
            'task_ids' => $tasks->pluck('id')->toArray(),
            'assignee_ids' => [$this->assignee->id],
            'due_date' => now()->addWeek()->format('Y-m-d H:i:s'),
            'notification_message' => 'Multiple tasks assigned to you',
        ];

        $response = $this->postJson('/api/tasks/bulk/assign', $bulkData);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'assigned_count',
                        'successful_assignments',
                        'failed_assignments',
                    ]
                ]);

        foreach ($tasks as $task) {
            $this->assertDatabaseHas('task_assignments', [
                'task_id' => $task->id,
                'assignee_id' => $this->assignee->id,
                'status' => 'assigned',
            ]);
        }
    }

    public function test_can_get_my_tasks()
    {
        $this->actingAs($this->assignee, 'sanctum');

        $task = Task::factory()->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        TaskAssignment::factory()->create([
            'task_id' => $task->id,
            'assignee_id' => $this->assignee->id,
        ]);

        $response = $this->getJson('/api/tasks/my-tasks');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'title',
                            'priority',
                            'status',
                            'due_date',
                            'assignment_status',
                        ]
                    ]
                ]);
    }

    public function test_can_get_task_statistics()
    {
        $this->actingAs($this->admin, 'sanctum');

        Task::factory()->count(5)->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
            'status' => 'completed',
        ]);

        Task::factory()->count(3)->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
            'status' => 'in_progress',
        ]);

        $response = $this->getJson('/api/tasks/statistics');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'total_tasks',
                        'completed_tasks',
                        'in_progress_tasks',
                        'overdue_tasks',
                        'completion_rate',
                        'average_completion_time',
                    ]
                ]);
    }

    public function test_cannot_access_other_institution_tasks()
    {
        $this->actingAs($this->assignee, 'sanctum');

        $otherInstitution = Institution::factory()->create();
        $otherUser = User::factory()->create(['institution_id' => $otherInstitution->id]);
        
        $otherTask = Task::factory()->create([
            'creator_id' => $otherUser->id,
            'institution_id' => $otherInstitution->id,
        ]);

        $response = $this->getJson("/api/tasks/{$otherTask->id}");

        $response->assertStatus(403);
    }

    public function test_validates_task_creation_data()
    {
        $this->actingAs($this->admin, 'sanctum');

        $invalidData = [
            'title' => '', // Required
            'priority' => 'invalid-priority',
            'due_date' => 'invalid-date',
            'assignee_ids' => [99999], // Non-existent user
        ];

        $response = $this->postJson('/api/tasks', $invalidData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['title', 'priority', 'due_date', 'assignee_ids.0']);
    }

    public function test_can_delete_task()
    {
        $this->actingAs($this->admin, 'sanctum');

        $task = Task::factory()->create([
            'creator_id' => $this->admin->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->deleteJson("/api/tasks/{$task->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
    }

    public function test_requires_authentication()
    {
        $response = $this->getJson('/api/tasks');
        $response->assertStatus(401);
    }
}