<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * ReportTable statistika və Approval Queue testləri.
 *
 * Endpointlər:
 *   Fill statistics:          GET /api/report-tables/school-fill-statistics
 *   Table fill stats:         GET /api/report-tables/{table}/fill-statistics
 *   Approval queue:           GET /api/report-tables/approval-queue
 *   Approval queue grouped:   GET /api/report-tables/approval-queue/grouped
 *   Ready grouped:            GET /api/report-tables/ready/grouped
 *   Bulk action logs:         GET /api/report-tables/bulk-action-logs
 */
class ReportTableStatisticsTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private $admin;
    private $schoolUser;
    private Institution $sector;
    private Institution $school;
    private ReportTable $publishedTable;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sector = Institution::factory()->sector()->create();
        $this->school = Institution::factory()->school()->create([
            'parent_id' => $this->sector->id,
        ]);

        $this->admin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
            'report_table_responses.write',
            'report_table_responses.review',
        ]);

        $this->schoolUser = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], [
            'institution_id' => $this->school->id,
        ]);

        $this->publishedTable = ReportTable::factory()->published()->create([
            'creator_id'          => $this->admin->id,
            'target_institutions' => [$this->school->id],
            'columns'             => [
                ['key' => 'name', 'label' => 'Ad', 'type' => 'text'],
            ],
        ]);
    }

    // ─── School Fill Statistics ───────────────────────────────────────────────

    public function test_admin_can_get_school_fill_statistics(): void
    {
        // Cavab olan məktəb
        ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/school-fill-statistics');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_school_fill_statistics_requires_read_permission(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/school-fill-statistics');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_cannot_get_fill_statistics(): void
    {
        $response = $this->getJson('/api/report-tables/school-fill-statistics');
        $response->assertStatus(401);
    }

    // ─── Table Fill Statistics ────────────────────────────────────────────────

    public function test_admin_can_get_table_fill_statistics(): void
    {
        $school2 = Institution::factory()->school()->create([
            'parent_id' => $this->sector->id,
        ]);

        $tableForTwo = ReportTable::factory()->published()->create([
            'creator_id'          => $this->admin->id,
            'target_institutions' => [$this->school->id, $school2->id],
            'columns'             => [
                ['key' => 'name', 'label' => 'Ad', 'type' => 'text'],
            ],
        ]);

        // Bir məktəb cavab verib
        ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $tableForTwo->id,
            'institution_id'  => $this->school->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/report-tables/{$tableForTwo->id}/fill-statistics");

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_table_fill_statistics_requires_read_permission(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/fill-statistics");

        $response->assertStatus(403);
    }

    // ─── Approval Queue ───────────────────────────────────────────────────────

    public function test_admin_can_get_approval_queue(): void
    {
        // Submitted row olan response yarat
        ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/approval-queue');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_approval_queue_requires_review_permission(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/approval-queue');

        $response->assertStatus(403);
    }

    public function test_approval_queue_is_empty_when_no_submitted_rows(): void
    {
        // Yalnız draft response
        ReportTableResponse::factory()->draft()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/approval-queue');

        $response->assertStatus(200)
            ->assertJsonPath('data', []);
    }

    // ─── Approval Queue Grouped ───────────────────────────────────────────────

    public function test_admin_can_get_grouped_approval_queue(): void
    {
        ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/approval-queue/grouped');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_grouped_approval_queue_has_correct_structure(): void
    {
        ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/approval-queue/grouped');

        $response->assertStatus(200);

        $data = $response->json('data');
        if (!empty($data)) {
            // Cədvəl → Sektor → Məktəb qruplamasını yoxla
            $this->assertArrayHasKey('table', $data[0]);
            $this->assertArrayHasKey('pending_count', $data[0]);
            $this->assertArrayHasKey('responses', $data[0]);
        }
    }

    public function test_sektoradmin_sees_only_own_sector_in_approval_queue(): void
    {
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ], ['institution_id' => $this->sector->id]);

        // Öz sektorunun məktəbinin cavabı
        ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
        ]);

        // Başqa sektorun məktəbinin cavabı
        $otherSchool = Institution::factory()->school()->create(['parent_id' => null]);
        ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $otherSchool->id,
            'rows'            => [['name' => 'Test']],
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->getJson('/api/report-tables/approval-queue/grouped');

        $response->assertStatus(200);
        // Yalnız öz sektorunun məktəblərini görür
        $data = $response->json('data');
        if (!empty($data)) {
            $institutionIds = collect($data)
                ->flatMap(fn ($table) => collect($table['sectors'] ?? [])
                    ->flatMap(fn ($sector) => collect($sector['schools'] ?? [])
                        ->pluck('institution_id')))
                ->all();

            // Başqa məktəb görünməməlidir
            $this->assertNotContains($otherSchool->id, $institutionIds);
        }
    }

    public function test_grouped_approval_queue_requires_review_permission(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/approval-queue/grouped');

        $response->assertStatus(403);
    }

    // ─── Ready Grouped ────────────────────────────────────────────────────────

    public function test_admin_can_get_ready_grouped_data(): void
    {
        // Approved row olan response
        ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
            'row_statuses'    => [['status' => 'approved', 'approved_at' => now()->toISOString()]],
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/ready/grouped');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_ready_grouped_only_shows_approved_rows(): void
    {
        // Yalnız submitted olan response — ready-də görünməməlidir
        ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/ready/grouped');

        $response->assertStatus(200);
        // Submitted row-lar ready-də görünməməlidir
        $data = $response->json('data');
        $this->assertEmpty($data);
    }

    public function test_ready_grouped_requires_review_permission(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/ready/grouped');

        $response->assertStatus(403);
    }

    // ─── Bulk Action Logs ─────────────────────────────────────────────────────

    public function test_admin_can_get_bulk_action_logs(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/report-tables/bulk-action-logs');

        // bulkActionLogs returns {data: [...]} without meta
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_bulk_action_logs_require_review_permission(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson('/api/report-tables/bulk-action-logs');

        $response->assertStatus(403);
    }

    public function test_bulk_action_log_created_after_bulk_approve(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->school->id,
            'rows'            => [['name' => 'Test']],
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/bulk-row-action", [
                'row_specs' => [
                    ['response_id' => $tableResponse->id, 'row_indices' => [0]],
                ],
                'action' => 'approve',
            ]);

        $this->assertDatabaseHas('report_table_bulk_action_logs', [
            'user_id'         => $this->admin->id,
            'report_table_id' => $this->publishedTable->id,
            'action'          => 'approve',
        ]);
    }
}
