<?php

namespace Tests\Feature\Project;

use App\Models\Project;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $superadmin;
    private User $regionadmin;
    private User $regularUser;
    private Institution $region;

    protected function setUp(): void
    {
        parent::setUp();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $this->region = Institution::factory()->create(['level' => 2, 'type' => 'region']);

        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'teacher', 'guard_name' => 'sanctum']);

        $this->superadmin = User::factory()->create(['institution_id' => $this->region->id]);
        $this->superadmin->assignRole('superadmin');

        $this->regionadmin = User::factory()->create(['institution_id' => $this->region->id]);
        $this->regionadmin->assignRole('regionadmin');

        $this->regularUser = User::factory()->create(['institution_id' => $this->region->id]);
        $this->regularUser->assignRole('teacher');
    }

    // ─── INDEX ────────────────────────────────────────────────────────────────

    public function test_index_returns_projects_for_authenticated_user()
    {
        Project::create([
            'name' => 'Test Layihəsi',
            'description' => 'Açıqlama',
            'status' => 'active',
            'created_by' => $this->superadmin->id,
        ]);

        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/projects');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_unauthenticated_user_cannot_access_projects()
    {
        $response = $this->getJson('/api/projects');

        $response->assertStatus(401);
    }

    // ─── STORE ────────────────────────────────────────────────────────────────

    public function test_store_creates_project_with_valid_data()
    {
        $payload = [
            'name' => 'Yeni Layihə',
            'description' => 'Test açıqlaması',
            'status' => 'active',
            'start_date' => '2026-06-01',
            'end_date' => '2026-12-31',
        ];

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson('/api/projects', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('projects', [
            'name' => 'Yeni Layihə',
            'created_by' => $this->regionadmin->id,
        ]);
    }

    public function test_store_fails_without_required_name()
    {
        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson('/api/projects', ['description' => 'Ad olmadan']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_store_fails_with_invalid_status()
    {
        $payload = [
            'name' => 'Yanlış Status Layihəsi',
            'status' => 'invalid_status',
        ];

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson('/api/projects', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    // ─── SHOW ─────────────────────────────────────────────────────────────────

    public function test_show_returns_project_for_creator()
    {
        $project = Project::create([
            'name' => 'Mənim Layihəm',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->getJson("/api/projects/{$project->id}");

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Mənim Layihəm');
    }

    public function test_show_returns_404_for_nonexistent_project()
    {
        $response = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/projects/99999');

        $response->assertStatus(404);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    public function test_update_modifies_project_by_creator()
    {
        $project = Project::create([
            'name' => 'Köhnə Ad',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->putJson("/api/projects/{$project->id}", [
                'name' => 'Yeni Ad',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'name' => 'Yeni Ad']);
    }

    public function test_unauthorized_user_cannot_update_project()
    {
        $project = Project::create([
            'name' => 'Başqasının Layihəsi',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->putJson("/api/projects/{$project->id}", ['name' => 'Hack cəhdi']);

        $response->assertStatus(403);
    }

    // ─── ARCHIVE / UNARCHIVE ──────────────────────────────────────────────────

    public function test_creator_can_archive_project()
    {
        $project = Project::create([
            'name' => 'Arxivə göndəriləcək',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson("/api/projects/{$project->id}/archive");

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'status' => 'archived']);
    }

    public function test_creator_can_unarchive_project()
    {
        $project = Project::create([
            'name' => 'Arxivdən çıxarılacaq',
            'status' => 'archived',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson("/api/projects/{$project->id}/unarchive");

        $response->assertStatus(200);
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'status' => 'active']);
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    public function test_creator_can_delete_project()
    {
        $project = Project::create([
            'name' => 'Silinəcək Layihə',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }

    public function test_unauthorized_user_cannot_delete_project()
    {
        $project = Project::create([
            'name' => 'Qorunan Layihə',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    // ─── ADD ACTIVITY ─────────────────────────────────────────────────────────

    public function test_creator_can_add_activity_to_project()
    {
        $project = Project::create([
            'name' => 'Fəaliyyətli Layihə',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson("/api/projects/{$project->id}/activities", [
                'name' => 'Test Fəaliyyəti',
                'description' => 'Fəaliyyət açıqlaması',
                'priority' => 'medium',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('project_activities', [
            'project_id' => $project->id,
            'name' => 'Test Fəaliyyəti',
        ]);
    }

    public function test_add_activity_fails_without_name()
    {
        $project = Project::create([
            'name' => 'Ad Tələb Olunan Layihə',
            'status' => 'active',
            'created_by' => $this->regionadmin->id,
        ]);

        $response = $this->actingAs($this->regionadmin, 'sanctum')
            ->postJson("/api/projects/{$project->id}/activities", [
                'description' => 'Ad olmadan fəaliyyət',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
