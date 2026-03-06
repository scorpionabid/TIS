<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * ReportTable export funksionallığının testləri.
 *
 * Endpointlər:
 *   Tam export:          GET /api/report-tables/{table}/export
 *   Approved export:     GET /api/report-tables/{table}/export/approved
 *   Məktəb öz export:   GET /api/report-tables/{table}/export/my
 *   Statistika export:   GET /api/report-tables/{table}/statistics/export
 */
class ReportTableExportTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private $admin;
    private $schoolUser;
    private Institution $institution;
    private ReportTable $publishedTable;

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

        $this->publishedTable = ReportTable::factory()->published()->create([
            'creator_id'          => $this->admin->id,
            'target_institutions' => [$this->institution->id],
            'columns'             => [
                ['key' => 'name', 'label' => 'Ad', 'type' => 'text', 'required' => true],
                ['key' => 'score', 'label' => 'Bal', 'type' => 'number'],
            ],
        ]);
    }

    // ─── Full Export ──────────────────────────────────────────────────────────

    public function test_admin_can_export_table_with_responses(): void
    {
        ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->admin)
            ->get("/api/report-tables/{$this->publishedTable->id}/export");

        $response->assertStatus(200);
        // Excel faylı olduğunu yoxla
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
        $this->assertStringContainsString('.xlsx', $response->headers->get('Content-Disposition') ?? '');
    }

    public function test_export_returns_error_when_no_responses(): void
    {
        // Heç bir cavab yoxdur

        $response = $this->actingAs($this->admin)
            ->get("/api/report-tables/{$this->publishedTable->id}/export");

        // Controller returns 404 (not 500) when no responses: errorResponse('...', 404)
        $response->assertStatus(404);
    }

    public function test_school_user_cannot_export_full_table(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->get("/api/report-tables/{$this->publishedTable->id}/export");

        $response->assertStatus(403);
    }

    // ─── Approved Export ──────────────────────────────────────────────────────

    public function test_admin_can_export_only_approved_rows(): void
    {
        // Approved sətri olan response
        ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
            'row_statuses'    => [['status' => 'approved', 'approved_at' => now()->toISOString()]],
        ]);

        $response = $this->actingAs($this->admin)
            ->get("/api/report-tables/{$this->publishedTable->id}/export/approved");

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
    }

    public function test_approved_export_fails_when_no_approved_rows_exist(): void
    {
        // Yalnız submitted, approved yox
        ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->admin)
            ->get("/api/report-tables/{$this->publishedTable->id}/export/approved");

        $response->assertStatus(500);
    }

    public function test_school_user_cannot_export_approved_rows(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->get("/api/report-tables/{$this->publishedTable->id}/export/approved");

        $response->assertStatus(403);
    }

    // ─── My Export (Məktəb öz cavabını export edir) ───────────────────────────

    public function test_school_user_can_export_their_own_response(): void
    {
        ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->get("/api/report-tables/{$this->publishedTable->id}/export/my");

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
    }

    public function test_my_export_fails_when_school_has_no_response(): void
    {
        // Heç bir cavab yoxdur

        $response = $this->actingAs($this->schoolUser)
            ->get("/api/report-tables/{$this->publishedTable->id}/export/my");

        // Controller returns 404 when school has no response: errorResponse('...', 404)
        $response->assertStatus(404);
    }

    public function test_user_without_response_write_cannot_use_my_export(): void
    {
        // NOTE: regionadmin role inherently has report_table_responses.write via PermissionSeeder.
        // sektoradmin role only has report_tables.read + report_table_responses.review (no .write),
        // so it correctly gets 403 from the permission:report_table_responses.write middleware.
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/export/my");

        $response->assertStatus(403);
    }

    // ─── Statistics Export ────────────────────────────────────────────────────

    public function test_admin_can_export_fill_statistics(): void
    {
        // Cavab yarat ki, statistika boş olmasın
        ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->get("/api/report-tables/{$this->publishedTable->id}/statistics/export");

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
    }

    public function test_school_user_cannot_export_statistics(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->get("/api/report-tables/{$this->publishedTable->id}/statistics/export");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_cannot_export(): void
    {
        // Use getJson() to get 401 — get() redirects unauthenticated users (302)
        $this->getJson("/api/report-tables/{$this->publishedTable->id}/export")->assertStatus(401);
        $this->getJson("/api/report-tables/{$this->publishedTable->id}/export/approved")->assertStatus(401);
        $this->getJson("/api/report-tables/{$this->publishedTable->id}/export/my")->assertStatus(401);
        $this->getJson("/api/report-tables/{$this->publishedTable->id}/statistics/export")->assertStatus(401);
    }
}
