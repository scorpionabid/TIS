<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTableApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $schoolUser;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->schoolUser = User::factory()->create(['role' => 'school']);
        $this->institution = Institution::factory()->create();
        $this->schoolUser->institution_id = $this->institution->id;
        $this->schoolUser->save();
    }

    // ─── List Tests ─────────────────────────────────────────────────────────────

    public function test_admin_can_list_all_report_tables(): void
    {
        ReportTable::factory()->count(5)->create();

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'title', 'description', 'status', 'columns', 'max_rows']
                ],
                'meta' => ['current_page', 'per_page', 'total', 'last_page']
            ])
            ->assertJsonCount(5, 'data');
    }

    public function test_school_user_can_list_published_tables(): void
    {
        ReportTable::factory()->create(['status' => 'published']);
        ReportTable::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/my');

        $response->assertStatus(200)
            ->assertJsonCount(1); // Only published
    }

    public function test_report_tables_are_paginated(): void
    {
        ReportTable::factory()->count(25)->create();

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables?per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonCount(10, 'data');
    }

    // ─── Create Tests ───────────────────────────────────────────────────────────

    public function test_admin_can_create_report_table(): void
    {
        $payload = [
            'title' => 'Test Report Table',
            'description' => 'Test Description',
            'columns' => [
                ['key' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true],
                ['key' => 'age', 'label' => 'Age', 'type' => 'number'],
            ],
            'max_rows' => 10,
            'target_institutions' => [$this->institution->id],
            'deadline' => '2026-12-31',
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'title', 'description', 'status', 'columns']
            ])
            ->assertJsonPath('data.title', 'Test Report Table');

        $this->assertDatabaseHas('report_tables', [
            'title' => 'Test Report Table',
            'status' => 'draft',
        ]);
    }

    public function test_create_validates_required_fields(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'columns']);
    }

    public function test_create_validates_column_structure(): void
    {
        $payload = [
            'title' => 'Test',
            'columns' => [
                ['key' => '', 'label' => 'Name', 'type' => 'invalid_type'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.key', 'columns.0.type']);
    }

    // ─── Read Tests ───────────────────────────────────────────────────────────

    public function test_can_view_single_report_table(): void
    {
        $table = ReportTable::factory()->create();

        $response = $this->actingAs($this->admin)
            ->getJson("/api/report-tables/{$table->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $table->id)
            ->assertJsonPath('data.title', $table->title);
    }

    public function test_returns_404_for_nonexistent_table(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/99999');

        $response->assertStatus(404);
    }

    // ─── Update Tests ─────────────────────────────────────────────────────────

    public function test_admin_can_update_report_table(): void
    {
        $table = ReportTable::factory()->create(['status' => 'draft']);

        $payload = [
            'title' => 'Updated Title',
            'max_rows' => 20,
        ];

        $response = $this->actingAs($this->admin)
            ->putJson("/api/report-tables/{$table->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated Title')
            ->assertJsonPath('data.max_rows', 20);

        $this->assertDatabaseHas('report_tables', [
            'id' => $table->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_cannot_update_published_table_columns(): void
    {
        $table = ReportTable::factory()->create(['status' => 'published']);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/report-tables/{$table->id}", [
                'columns' => [['key' => 'new', 'label' => 'New', 'type' => 'text']],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot modify columns of published table');
    }

    // ─── Delete Tests ─────────────────────────────────────────────────────────

    public function test_admin_can_delete_draft_table(): void
    {
        $table = ReportTable::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/report-tables/{$table->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('report_tables', ['id' => $table->id]);
    }

    public function test_cannot_delete_published_table(): void
    {
        $table = ReportTable::factory()->create(['status' => 'published']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/report-tables/{$table->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot delete published table. Archive it first.');
    }

    // ─── Publish/Archive Tests ─────────────────────────────────────────────────

    public function test_admin_can_publish_draft_table(): void
    {
        $table = ReportTable::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('report_tables', [
            'id' => $table->id,
            'status' => 'published',
        ]);
    }

    public function test_admin_can_archive_published_table(): void
    {
        $table = ReportTable::factory()->create(['status' => 'published']);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/archive");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'archived');
    }

    public function test_school_user_cannot_publish_table(): void
    {
        $table = ReportTable::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(403);
    }

    // ─── Authorization Tests ───────────────────────────────────────────────────

    public function test_unauthenticated_user_cannot_access(): void
    {
        $response = $this->getJson('/api/report-tables');
        $response->assertStatus(401);
    }

    public function test_school_user_cannot_create_table(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->postJson('/api/report-tables', ['title' => 'Test']);

        $response->assertStatus(403);
    }

    public function test_school_user_cannot_delete_table(): void
    {
        $table = ReportTable::factory()->create();

        $response = $this->actingAs($this->schoolUser)
            ->deleteJson("/api/report-tables/{$table->id}");

        $response->assertStatus(403);
    }
}
