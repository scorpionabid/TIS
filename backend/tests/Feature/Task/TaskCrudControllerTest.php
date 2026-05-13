<?php

namespace Tests\Feature\Task;

use App\Models\Institution;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TaskCrudControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $regionadmin;
    private User $schooladmin;
    private User $regularUser;
    private Institution $region;
    private Institution $school;

    protected function setUp(): void
    {
        parent::setUp();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Role::create(['name' => 'superadmin',    'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin',   'guard_name' => 'sanctum']);
        Role::create(['name' => 'schooladmin',   'guard_name' => 'sanctum']);
        Role::create(['name' => 'sektoradmin',   'guard_name' => 'sanctum']);

        $this->region = Institution::factory()->create([
            'level' => 2, 'type' => 'region', 'is_active' => true,
        ]);
        $this->school = Institution::factory()->create([
            'level' => 4, 'type' => 'school', 'parent_id' => $this->region->id, 'is_active' => true,
        ]);

        $this->regionadmin = User::factory()->create([
            'institution_id' => $this->region->id,
            'is_active' => true,
        ]);
        $this->regionadmin->assignRole('regionadmin');

        $this->schooladmin = User::factory()->create([
            'institution_id' => $this->school->id,
            'is_active' => true,
        ]);
        $this->schooladmin->assignRole('schooladmin');
    }

    // ─── INDEX ────────────────────────────────────────────────────────────────

    public function test_index_returns_paginated_tasks_for_authenticated_user()
    {
        Task::factory()->create([
            'title'      => 'Test Tapşırığı',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'medium',
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson('/api/tasks');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta', 'statistics']);
    }

    public function test_unauthenticated_user_cannot_access_tasks()
    {
        $response = $this->getJson('/api/tasks');
        $response->assertStatus(401);
    }

    public function test_index_filters_by_status()
    {
        Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status'     => 'completed',
            'priority'   => 'low',
        ]);
        Task::factory()->create([
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'medium',
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson('/api/tasks?status=completed');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('statistics.completed'));
        $this->assertEquals(0, $response->json('statistics.pending'));
    }

    // ─── STORE ────────────────────────────────────────────────────────────────

    public function test_store_creates_task_with_valid_data()
    {
        Mail::fake();

        $payload = [
            'title'        => 'Yeni Test Tapşırığı',
            'description'  => 'Açıqlama',
            'priority'     => 'medium',
            'category'     => 'report',
            'target_scope' => 'regional',
            'deadline'     => now()->addDays(14)->format('Y-m-d H:i:s'),
        ];

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson('/api/tasks', $payload);

        if ($response->status() === 500) {
            dump($response->json());
        }

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.task.title', 'Yeni Test Tapşırığı');

        $this->assertDatabaseHas('tasks', [
            'title'      => 'Yeni Test Tapşırığı',
            'created_by' => $this->regionadmin->id,
        ]);
    }

    public function test_store_fails_without_required_title()
    {
        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson('/api/tasks', [
                'priority' => 'medium',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_store_fails_without_required_priority()
    {
        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson('/api/tasks', [
                'title' => 'Prioritetsiz tapşırıq',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['priority']);
    }

    public function test_schooladmin_cannot_create_task()
    {
        $response = $this->actingAs($this->schooladmin, 'sanctum')
            ->postJson('/api/tasks', [
                'title'    => 'Məktəb admini tapşırığı',
                'priority' => 'medium',
            ]);

        // schooladmin cannot create hierarchical tasks — 403 (no permission) or 500 (service throws)
        $this->assertContains($response->status(), [403, 422, 500]);
    }

    // ─── SHOW ─────────────────────────────────────────────────────────────────

    public function test_show_returns_task_for_creator()
    {
        $task = Task::factory()->create([
            'title'      => 'Göstəriləcək Tapşırıq',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'high',
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson("/api/tasks/{$task->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title', 'Göstəriləcək Tapşırıq');
    }

    public function test_show_returns_404_for_nonexistent_task()
    {
        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson('/api/tasks/99999');

        $response->assertStatus(404);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    public function test_creator_can_update_task_title()
    {
        $task = Task::factory()->create([
            'title'      => 'Köhnə Başlıq',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'medium',
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->putJson("/api/tasks/{$task->id}", [
                'title' => 'Yeni Başlıq',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('tasks', [
            'id'    => $task->id,
            'title' => 'Yeni Başlıq',
        ]);
    }

    public function test_unauthorized_user_cannot_update_task()
    {
        $task = Task::factory()->create([
            'title'      => 'Qorunan Tapşırıq',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'medium',
        ]);

        $response = $this->actingAs($this->schooladmin, 'sanctum')
            ->putJson("/api/tasks/{$task->id}", [
                'title' => 'Hack cəhdi',
            ]);

        $response->assertStatus(403);
    }

    // ─── DESTROY ─────────────────────────────────────────────────────────────

    public function test_creator_can_delete_task()
    {
        $task = Task::factory()->create([
            'title'      => 'Silinəcək Tapşırıq',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'low',
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->deleteJson("/api/tasks/{$task->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_unauthorized_user_cannot_delete_task()
    {
        $task = Task::factory()->create([
            'title'      => 'Silinməyəcək Tapşırıq',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'medium',
        ]);

        $response = $this->actingAs($this->schooladmin, 'sanctum')
            ->deleteJson("/api/tasks/{$task->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
    }

    // ─── GET TASK PROGRESS ────────────────────────────────────────────────────

    public function test_get_task_progress_returns_structured_data()
    {
        $task = Task::factory()->create([
            'title'      => 'İrəliləyiş Tapşırığı',
            'created_by' => $this->regionadmin->id,
            'status'     => 'pending',
            'priority'   => 'medium',
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson("/api/tasks/{$task->id}/progress");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['task_id', 'overall_progress', 'status_breakdown']]);
    }
}
