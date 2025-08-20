<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use App\Models\Institution;
use App\Models\Notification;
use Spatie\Permission\Models\Role;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create roles and permissions
        $this->artisan('db:seed', ['--class' => 'RoleSeeder']);
        $this->artisan('db:seed', ['--class' => 'PermissionSeeder']);
        $this->artisan('db:seed', ['--class' => 'InstitutionHierarchySeeder']);
    }

    public function test_regionadmin_can_create_task_for_schools()
    {
        $regionadmin = User::factory()->create();
        $regionadmin->assignRole('regionadmin');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        $taskData = [
            'title' => 'Test Survey Task',
            'description' => 'Complete the academic survey',
            'priority' => 'yuksek',
            'deadline' => now()->addDays(7)->toDateString(),
            'assigned_to' => $regionadmin->id,
            'assigned_institution_id' => $institution->id,
            'category' => 'hesabat',
            'target_scope' => 'specific'
        ];
        
        $response = $this->actingAs($regionadmin)
            ->postJson('/api/tasks', $taskData);
        
        $response->assertStatus(201);
        $this->assertDatabaseHas('tasks', [
            'title' => 'Test Survey Task',
            'assigned_institution_id' => $institution->id,
            'created_by' => $regionadmin->id
        ]);
    }

    public function test_task_approval_workflow()
    {
        $schooladmin = User::factory()->create();
        $schooladmin->assignRole('schooladmin');
        
        $regionadmin = User::factory()->create();
        $regionadmin->assignRole('regionadmin');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        // Create task
        $task = Task::create([
            'title' => 'Test Approval Task',
            'description' => 'Test task requiring approval',
            'priority' => 'orta',
            'deadline' => now()->addDays(5),
            'assigned_to' => $schooladmin->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $regionadmin->id,
            'category' => 'tedbir',
            'target_scope' => 'specific',
            'status' => 'pending'
        ]);
        
        // School admin submits for approval using update endpoint
        $response = $this->actingAs($schooladmin)
            ->putJson("/api/tasks/{$task->id}", ['status' => 'review']);
        
        $response->assertStatus(200);
        
        $task->refresh();
        $this->assertEquals('review', $task->status);
        
        // Region admin approves using update endpoint
        $response = $this->actingAs($regionadmin)
            ->putJson("/api/tasks/{$task->id}", ['status' => 'completed']);
        
        $response->assertStatus(200);
        
        $task->refresh();
        $this->assertEquals('completed', $task->status);
    }

    public function test_task_progress_tracking()
    {
        $institution = Institution::where('type', 'secondary_school')->first();
        
        $teacher = User::factory()->create();
        $teacher->assignRole('müəllim');
        $teacher->update(['institution_id' => $institution->id]);
        
        $regionadmin = User::factory()->create();
        $regionadmin->assignRole('regionadmin');
        
        $task = Task::create([
            'title' => 'Test Progress Task',
            'description' => 'Test task for progress tracking',
            'priority' => 'orta',
            'deadline' => now()->addDays(5),
            'assigned_institution_id' => $institution->id,
            'assigned_to' => $teacher->id,
            'created_by' => $regionadmin->id,
            'category' => 'hesabat',
            'target_scope' => 'specific',
            'status' => 'in_progress'
        ]);
        
        // Update progress using regular update endpoint
        $response = $this->actingAs($teacher)
            ->putJson("/api/tasks/{$task->id}", [
                'progress' => 50,
                'notes' => 'Half completed'
            ]);
        
        $response->assertStatus(200);
        
        $task->refresh();
        $this->assertEquals(50, $task->progress);
        $this->assertEquals('Half completed', $task->notes);
    }

    public function test_task_commenting_system()
    {
        $teacher = User::factory()->create();
        $teacher->assignRole('müəllim');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        $task = Task::create([
            'title' => 'Test Comment Task',
            'description' => 'Test task for commenting',
            'priority' => 'asagi',
            'deadline' => now()->addDays(3),
            'assigned_institution_id' => $institution->id,
            'assigned_to' => $teacher->id,
            'created_by' => $teacher->id,
            'category' => 'telimat',
            'target_scope' => 'specific'
        ]);
        
        $response = $this->actingAs($teacher)
            ->postJson("/api/tasks/{$task->id}/comments", [
                'comment' => 'This is a test comment'
            ]);
        
        $response->assertStatus(201);
        
        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'user_id' => $teacher->id,
            'comment' => 'This is a test comment'
        ]);
    }

    public function test_bulk_task_assignment()
    {
        $regionadmin = User::factory()->create();
        $regionadmin->assignRole('regionadmin');
        
        $schools = Institution::where('type', 'secondary_school')->take(3)->get();
        
        // Create multiple tasks for different schools (simulating bulk assignment)
        foreach ($schools as $school) {
            Task::create([
                'title' => 'Bulk Assignment Task',
                'description' => 'Task assigned to multiple schools',
                'priority' => 'yuksek',
                'deadline' => now()->addDays(10),
                'assigned_to' => $regionadmin->id,
                'assigned_institution_id' => $school->id,
                'created_by' => $regionadmin->id,
                'category' => 'hesabat',
                'target_scope' => 'specific'
            ]);
        }
        
        foreach ($schools as $school) {
            $this->assertDatabaseHas('tasks', [
                'title' => 'Bulk Assignment Task',
                'assigned_institution_id' => $school->id,
                'created_by' => $regionadmin->id
            ]);
        }
    }

    public function test_task_deadline_notifications()
    {
        $teacher = User::factory()->create();
        $teacher->assignRole('müəllim');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        // Create task with deadline approaching
        $task = Task::create([
            'title' => 'Deadline Test Task',
            'description' => 'Task with approaching deadline',
            'priority' => 'yuksek',
            'deadline' => now()->addDays(1), // Tomorrow
            'assigned_institution_id' => $institution->id,
            'assigned_to' => $teacher->id,
            'created_by' => $teacher->id,
            'category' => 'tedbir',
            'target_scope' => 'specific',
            'status' => 'pending'
        ]);
        
        // Simulate notification creation for deadline reminder
        Notification::create([
            'user_id' => $teacher->id,
            'title' => 'Task Deadline Reminder',
            'message' => 'Your task "' . $task->title . '" is due tomorrow.',
            'type' => 'task_deadline',
            'channel' => 'in_app',
            'priority' => 'high'
        ]);
        
        // Check if notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $teacher->id,
            'type' => 'task_deadline'
        ]);
    }

    public function test_task_filtering_and_search()
    {
        $teacher = User::factory()->create();
        $teacher->assignRole('müəllim');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        // Create multiple tasks
        Task::create([
            'title' => 'High Priority Task',
            'description' => 'Important task',
            'priority' => 'yuksek',
            'deadline' => now()->addDays(2),
            'assigned_to' => $teacher->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $teacher->id,
            'category' => 'hesabat',
            'target_scope' => 'specific',
            'status' => 'pending'
        ]);
        
        Task::create([
            'title' => 'Low Priority Task',
            'description' => 'Regular task',
            'priority' => 'asagi',
            'deadline' => now()->addDays(7),
            'assigned_to' => $teacher->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $teacher->id,
            'category' => 'tedbir',
            'target_scope' => 'specific',
            'status' => 'completed'
        ]);
        
        // Filter by priority
        $response = $this->actingAs($teacher)
            ->getJson('/api/tasks?priority=yuksek');
        
        $response->assertStatus(200);
        $tasks = $response->json('data');
        $this->assertCount(1, $tasks);
        $this->assertEquals('High Priority Task', $tasks[0]['title']);
        
        // Filter by status
        $response = $this->actingAs($teacher)
            ->getJson('/api/tasks?status=completed');
        
        $response->assertStatus(200);
        $tasks = $response->json('data');
        $this->assertCount(1, $tasks);
        $this->assertEquals('Low Priority Task', $tasks[0]['title']);
        
        // Search by title
        $response = $this->actingAs($teacher)
            ->getJson('/api/tasks?search=High Priority');
        
        $response->assertStatus(200);
        $tasks = $response->json('data');
        $this->assertCount(1, $tasks);
        $this->assertEquals('High Priority Task', $tasks[0]['title']);
    }

    public function test_task_statistics_and_analytics()
    {
        $regionadmin = User::factory()->create();
        $regionadmin->assignRole('regionadmin');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        // Create tasks with different statuses
        Task::create([
            'title' => 'Completed Task 1',
            'description' => 'Completed task description',
            'priority' => 'yuksek',
            'deadline' => now()->addDays(1),
            'assigned_to' => $regionadmin->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $regionadmin->id,
            'category' => 'hesabat',
            'target_scope' => 'specific',
            'status' => 'completed'
        ]);
        
        Task::create([
            'title' => 'Pending Task 1',
            'description' => 'Pending task description',
            'priority' => 'orta',
            'deadline' => now()->addDays(3),
            'assigned_to' => $regionadmin->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $regionadmin->id,
            'category' => 'tedbir',
            'target_scope' => 'specific',
            'status' => 'pending'
        ]);
        
        Task::create([
            'title' => 'Overdue Task 1',
            'description' => 'Overdue task description',
            'priority' => 'yuksek',
            'deadline' => now()->subDays(1), // Yesterday
            'assigned_to' => $regionadmin->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $regionadmin->id,
            'category' => 'temir',
            'target_scope' => 'specific',
            'status' => 'pending'
        ]);
        
        $response = $this->actingAs($regionadmin)
            ->getJson('/api/tasks/statistics');
        
        $response->assertStatus(200);
        $stats = $response->json('data');
        
        $this->assertEquals(1, $stats['completed']);
        $this->assertEquals(2, $stats['pending']);
        $this->assertEquals(1, $stats['overdue']);
        $this->assertEquals(3, $stats['total']);
    }

    public function test_unauthorized_access_prevention()
    {
        $teacher = User::factory()->create();
        $teacher->assignRole('müəllim');
        
        $regionadmin = User::factory()->create();
        $regionadmin->assignRole('regionadmin');
        
        $institution = Institution::where('type', 'secondary_school')->first();
        
        $task = Task::create([
            'title' => 'Admin Only Task',
            'description' => 'Task only for administrators',
            'priority' => 'yuksek',
            'deadline' => now()->addDays(5),
            'assigned_to' => $regionadmin->id,
            'assigned_institution_id' => $institution->id,
            'created_by' => $regionadmin->id,
            'category' => 'tedbir',
            'target_scope' => 'specific'
        ]);
        
        // Teacher tries to delete admin task
        $response = $this->actingAs($teacher)
            ->deleteJson("/api/tasks/{$task->id}");
        
        $response->assertStatus(403);
        
        // Teacher tries to access another user's task that they shouldn't see
        $anotherUser = User::factory()->create();
        $anotherUser->assignRole('müəllim');
        
        $response = $this->actingAs($anotherUser)
            ->getJson("/api/tasks/{$task->id}");
        
        $response->assertStatus(403);
    }
}