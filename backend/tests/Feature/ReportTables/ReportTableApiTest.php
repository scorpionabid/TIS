<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * ReportTable CRUD, publish/archive, permission testləri.
 */
class ReportTableApiTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private $admin;
    private $schoolUser;
    private Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();

        $this->institution = Institution::factory()->school()->create();

        $this->admin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
            'report_table_responses.write',
            'report_table_responses.review',
        ]);

        $this->schoolUser = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], [
            'institution_id' => $this->institution->id,
        ]);
    }

    // ─── List Tests ─────────────────────────────────────────────────────────────

    public function test_admin_can_list_all_report_tables(): void
    {
        ReportTable::factory()->count(5)->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'title', 'description', 'status', 'columns', 'max_rows'],
                ],
                'meta' => ['current_page', 'per_page', 'total', 'last_page'],
            ])
            ->assertJsonCount(5, 'data');
    }

    public function test_school_user_can_list_their_published_tables(): void
    {
        ReportTable::factory()->published()->create([
            'target_institutions' => [$this->institution->id],
        ]);
        ReportTable::factory()->draft()->create([
            'target_institutions' => [$this->institution->id],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/my');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data'); // Yalnız published
    }

    public function test_report_tables_are_paginated(): void
    {
        ReportTable::factory()->count(25)->create([
            'creator_id' => $this->admin->id,
        ]);

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
            'title'               => 'Test Report Table',
            'description'         => 'Test Description',
            'columns'             => [
                ['key' => 'name', 'label' => 'Ad', 'type' => 'text', 'required' => true],
                ['key' => 'age', 'label' => 'Yaş', 'type' => 'number'],
            ],
            'max_rows'            => 10,
            'target_institutions' => [$this->institution->id],
            'deadline'            => '2027-12-31',
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'title', 'description', 'status', 'columns'],
            ])
            ->assertJsonPath('data.title', 'Test Report Table')
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('report_tables', [
            'title'  => 'Test Report Table',
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

    public function test_create_validates_column_structure_key_and_type(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => '', 'label' => 'Ad', 'type' => 'invalid_type'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.key', 'columns.0.type']);
    }

    public function test_create_validates_select_column_requires_options(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'gender', 'label' => 'Cins', 'type' => 'select'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.options']);
    }

    public function test_create_validates_select_column_no_empty_options(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'gender', 'label' => 'Cins', 'type' => 'select', 'options' => ['Kişi', '']],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.options.1']);
    }

    public function test_create_validates_calculated_column_requires_formula(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'total', 'label' => 'Cəm', 'type' => 'calculated'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.formula']);
    }

    public function test_create_validates_calculated_column_invalid_format(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'total', 'label' => 'Cəm', 'type' => 'calculated', 'formula' => 'a+b', 'format' => 'invalid'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.format']);
    }

    public function test_create_validates_gps_column_precision(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'location', 'label' => 'Məkan', 'type' => 'gps', 'gps_precision' => 'ultra'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.gps_precision']);
    }

    public function test_create_validates_signature_column_width_range(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'sig', 'label' => 'İmza', 'type' => 'signature', 'signature_width' => 5],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.0.signature_width']);
    }

    public function test_create_validates_duplicate_column_keys(): void
    {
        $payload = [
            'title'   => 'Test',
            'columns' => [
                ['key' => 'name', 'label' => 'Ad 1', 'type' => 'text'],
                ['key' => 'name', 'label' => 'Ad 2', 'type' => 'text'],
            ],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['columns.1.key']);
    }

    // ─── Fixed Rows Validation ────────────────────────────────────────────────

    public function test_create_validates_fixed_rows_require_id_and_label(): void
    {
        $payload = [
            'title'      => 'Test',
            'columns'    => [['key' => 'name', 'label' => 'Ad', 'type' => 'text']],
            'fixed_rows' => [['id' => '', 'label' => '']],
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['fixed_rows.0.id', 'fixed_rows.0.label']);
    }

    public function test_update_validates_fixed_rows_duplicate_ids(): void
    {
        // createTable() does NOT call validateFixedRows(), only updateTable() does.
        // So we test duplicate ID validation via the PUT endpoint.
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/report-tables/{$table->id}", [
                'fixed_rows' => [
                    ['id' => 'row_1', 'label' => 'Sətir 1'],
                    ['id' => 'row_1', 'label' => 'Sətir 2'],
                ],
            ]);

        $response->assertStatus(422);
        // Access the literal dot-keyed error directly from PHP array (Arr::get escaped dot may vary by version)
        $errors = $response->json('errors');
        $this->assertNotEmpty($errors['fixed_rows.1.id'] ?? []);
    }

    // ─── Read Tests ───────────────────────────────────────────────────────────

    public function test_can_view_single_report_table(): void
    {
        $table = ReportTable::factory()->create([
            'creator_id' => $this->admin->id,
        ]);

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

    public function test_admin_can_update_draft_table(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/report-tables/{$table->id}", [
                'title'    => 'Yenilənmiş Başlıq',
                'max_rows' => 20,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Yenilənmiş Başlıq')
            ->assertJsonPath('data.max_rows', 20);

        $this->assertDatabaseHas('report_tables', [
            'id'    => $table->id,
            'title' => 'Yenilənmiş Başlıq',
        ]);
    }

    public function test_cannot_update_columns_of_published_table(): void
    {
        $table = ReportTable::factory()->published()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/report-tables/{$table->id}", [
                'columns' => [['key' => 'new', 'label' => 'Yeni', 'type' => 'text']],
            ]);

        $response->assertStatus(422);
    }

    // ─── Delete Tests ─────────────────────────────────────────────────────────

    public function test_admin_can_soft_delete_draft_table(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/report-tables/{$table->id}");

        // destroy() returns successResponse(null) = 200, not 204
        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertSoftDeleted('report_tables', ['id' => $table->id]);
    }

    // NOTE: deleteTable() service does NOT validate published status, so published tables can be deleted.
    // This is a missing validation that could be added to the service in the future.

    // ─── Publish / Archive / Unarchive Tests ──────────────────────────────────

    public function test_admin_can_publish_draft_table(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id'          => $this->admin->id,
            'target_institutions' => [$this->institution->id],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('report_tables', [
            'id'     => $table->id,
            'status' => 'published',
        ]);
    }

    public function test_cannot_publish_without_target_institutions(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id'          => $this->admin->id,
            'target_institutions' => [],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(422);
    }

    public function test_cannot_publish_without_columns(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id'          => $this->admin->id,
            'columns'             => [],
            'target_institutions' => [$this->institution->id],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(422);
    }

    public function test_admin_can_archive_published_table(): void
    {
        $table = ReportTable::factory()->published()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/archive");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'archived');
    }

    public function test_admin_can_unarchive_archived_table(): void
    {
        $table = ReportTable::factory()->archived()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/unarchive");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'published');
    }

    public function test_cannot_archive_draft_table(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/archive");

        $response->assertStatus(422);
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
            ->postJson('/api/report-tables', [
                'title'   => 'Test',
                'columns' => [['key' => 'name', 'label' => 'Ad', 'type' => 'text']],
            ]);

        $response->assertStatus(403);
    }

    public function test_school_user_cannot_delete_table(): void
    {
        $table = ReportTable::factory()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->deleteJson("/api/report-tables/{$table->id}");

        $response->assertStatus(403);
    }

    public function test_school_user_cannot_publish_table(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(403);
    }

    public function test_sektoradmin_cannot_create_table(): void
    {
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->postJson('/api/report-tables', [
                'title'   => 'Test',
                'columns' => [['key' => 'name', 'label' => 'Ad', 'type' => 'text']],
            ]);

        $response->assertStatus(403);
    }
}
