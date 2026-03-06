<?php

namespace Tests\Feature\ReportTables;

use App\Models\ReportTable;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * ReportTable şablon (template) əməliyyatlarının testləri.
 *
 * Endpointlər:
 *   Save as template:    POST  /api/report-tables/{id}/save-as-template
 *   List templates:      GET   /api/report-tables/templates/list
 *   Create from tmpl:    POST  /api/report-tables/templates
 *   Remove template:     POST  /api/report-tables/{id}/remove-template
 */
class ReportTableTemplateTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
        ]);
    }

    // ─── Save as Template ─────────────────────────────────────────────────────

    public function test_admin_can_save_draft_table_as_template(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/save-as-template", [
                'category' => 'ümumi',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_template', true)
            ->assertJsonPath('data.template_category', 'ümumi');

        $this->assertDatabaseHas('report_tables', [
            'id'                => $table->id,
            'is_template'       => true,
            'template_category' => 'ümumi',
        ]);
    }

    public function test_admin_can_save_published_table_as_template(): void
    {
        $table = ReportTable::factory()->published()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/save-as-template");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_template', true);
    }

    public function test_cannot_save_archived_table_as_template(): void
    {
        $table = ReportTable::factory()->archived()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/save-as-template");

        // saveAsTemplate controller catches \Exception and returns 400 (not 422)
        $response->assertStatus(400);
    }

    public function test_save_as_template_without_category_works(): void
    {
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$table->id}/save-as-template");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_template', true);

        $this->assertDatabaseHas('report_tables', [
            'id'                => $table->id,
            'is_template'       => true,
            'template_category' => null,
        ]);
    }

    // ─── Get Templates List ───────────────────────────────────────────────────

    public function test_admin_can_list_templates(): void
    {
        // Şablon cədvəllər
        ReportTable::factory()->asTemplate()->count(3)->create([
            'creator_id' => $this->admin->id,
        ]);

        // Şablon olmayan cədvəllər
        ReportTable::factory()->draft()->count(2)->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/templates/list');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');

        // Bütün nəticələr şablon olmalıdır
        foreach ($response->json('data') as $item) {
            $this->assertTrue($item['is_template']);
        }
    }

    public function test_templates_list_is_empty_when_no_templates_exist(): void
    {
        ReportTable::factory()->draft()->count(2)->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/templates/list');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    // ─── Create from Template ─────────────────────────────────────────────────

    public function test_admin_can_clone_table_from_template(): void
    {
        $template = ReportTable::factory()->asTemplate('test')->create([
            'creator_id' => $this->admin->id,
            'columns'    => [
                ['key' => 'name', 'label' => 'Ad', 'type' => 'text'],
                ['key' => 'score', 'label' => 'Bal', 'type' => 'number'],
            ],
            'max_rows' => 30,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $template->id,
                'title'       => 'Şablondan Yeni Cədvəl',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Şablondan Yeni Cədvəl')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.is_template', false);

        $this->assertDatabaseHas('report_tables', [
            'title'          => 'Şablondan Yeni Cədvəl',
            'status'         => 'draft',
            'is_template'    => false,
            'cloned_from_id' => $template->id,
        ]);
    }

    public function test_cloned_table_inherits_columns_from_template(): void
    {
        $template = ReportTable::factory()->asTemplate()->create([
            'creator_id' => $this->admin->id,
            'columns'    => [
                ['key' => 'teacher', 'label' => 'Müəllim', 'type' => 'text'],
                ['key' => 'subject', 'label' => 'Fənn', 'type' => 'text'],
            ],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $template->id,
                'title'       => 'Klonlanmış Cədvəl',
            ]);

        $response->assertStatus(201);

        $newTable = ReportTable::where('title', 'Klonlanmış Cədvəl')->first();
        $this->assertNotNull($newTable);
        $this->assertCount(2, $newTable->columns);
        $this->assertSame('teacher', $newTable->columns[0]['key']);
    }

    public function test_cloned_table_target_institutions_is_empty(): void
    {
        $template = ReportTable::factory()->asTemplate()->create([
            'creator_id'          => $this->admin->id,
            'target_institutions' => [1, 2, 3], // Şablonda var
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $template->id,
                'title'       => 'Yeni Cədvəl',
            ]);

        $response->assertStatus(201);

        $newTable = ReportTable::where('title', 'Yeni Cədvəl')->first();
        $this->assertEmpty($newTable->target_institutions);
    }

    public function test_original_template_is_unchanged_after_clone(): void
    {
        $template = ReportTable::factory()->asTemplate('qrup1')->create([
            'creator_id' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $template->id,
                'title'       => 'Klonlanmış',
            ]);

        $fresh = ReportTable::find($template->id);
        $this->assertTrue($fresh->is_template);
        $this->assertSame('qrup1', $fresh->template_category);
    }

    public function test_cannot_clone_non_template_table(): void
    {
        $regularTable = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $regularTable->id,
                'title'       => 'Klonlanmış',
            ]);

        // createFromTemplate controller catches \Exception and returns 400 (not 422)
        $response->assertStatus(400);
    }

    public function test_clone_requires_title(): void
    {
        $template = ReportTable::factory()->asTemplate()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $template->id,
            ]);

        // createFromTemplate catches ValidationException as \Exception → returns 400
        $response->assertStatus(400);
    }

    // ─── Remove Template Status ───────────────────────────────────────────────

    public function test_admin_can_remove_template_status(): void
    {
        $template = ReportTable::factory()->asTemplate('test-cat')->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$template->id}/remove-template");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_template', false);

        $this->assertDatabaseHas('report_tables', [
            'id'                => $template->id,
            'is_template'       => false,
            'template_category' => null,
        ]);
    }

    public function test_after_remove_template_it_disappears_from_list(): void
    {
        $template = ReportTable::factory()->asTemplate()->create([
            'creator_id' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$template->id}/remove-template");

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/templates/list');

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertNotContains($template->id, $ids->toArray());
    }

    // ─── Authorization ────────────────────────────────────────────────────────

    public function test_school_user_cannot_save_as_template(): void
    {
        $schoolUser = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ]);

        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($schoolUser)
            ->postJson("/api/report-tables/{$table->id}/save-as-template");

        $response->assertStatus(403);
    }

    public function test_school_user_cannot_clone_from_template(): void
    {
        $schoolUser = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ]);

        $template = ReportTable::factory()->asTemplate()->create([
            'creator_id' => $this->admin->id,
        ]);

        $response = $this->actingAs($schoolUser)
            ->postJson('/api/report-tables/templates', [
                'template_id' => $template->id,
                'title'       => 'Hack',
            ]);

        $response->assertStatus(403);
    }
}
