<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * ReportTableResponse endpoint testləri.
 *
 * Bütün endpoint-lər həqiqi route-lara uyğundur:
 *   Start:         POST   /api/report-tables/{table}/response/start
 *   Get my:        GET    /api/report-tables/{table}/response/my
 *   Save:          PUT    /api/report-table-responses/{response}
 *   Submit all:    POST   /api/report-table-responses/{response}/submit
 *   Submit row:    POST   /api/report-tables/{table}/responses/{response}/rows/submit
 *   Approve row:   POST   /api/report-tables/{table}/responses/{response}/rows/approve
 *   Reject row:    POST   /api/report-tables/{table}/responses/{response}/rows/reject
 *   Return row:    POST   /api/report-tables/{table}/responses/{response}/rows/return
 *   Bulk action:   POST   /api/report-tables/{table}/responses/bulk-row-action
 *   All responses: GET    /api/report-tables/{table}/responses
 */
class ReportTableResponseTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private $admin;
    private $schoolUser;
    private Institution $institution;
    private ReportTable $publishedTable;

    protected function setUp(): void
    {
        parent::setUp();

        // Create proper region → sector → school hierarchy so regionadmin can review
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $this->institution = Institution::factory()->school()->create(['parent_id' => $sector->id]);

        $this->admin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
            'report_table_responses.write',
            'report_table_responses.review',
        ], ['institution_id' => $region->id]);

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
            'max_rows' => 5,
        ]);
    }

    // ─── Start Response ───────────────────────────────────────────────────────

    public function test_school_user_can_start_a_response(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.institution_id', $this->institution->id);

        $this->assertDatabaseHas('report_table_responses', [
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'status'          => 'draft',
        ]);
    }

    public function test_start_returns_existing_response_if_already_exists(): void
    {
        $existing = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $existing->id);

        // Yeni response yaranmayıb
        $this->assertSame(1, ReportTableResponse::where('report_table_id', $this->publishedTable->id)->count());
    }

    public function test_cannot_start_response_to_unpublished_table(): void
    {
        $draftTable = ReportTable::factory()->draft()->create([
            'target_institutions' => [$this->institution->id],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$draftTable->id}/response/start");

        $response->assertStatus(422);
    }

    public function test_cannot_start_response_when_not_targeted(): void
    {
        $otherInstitution = Institution::factory()->school()->create();
        $tableForOther = ReportTable::factory()->published()->create([
            'target_institutions' => [$otherInstitution->id],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$tableForOther->id}/response/start");

        $response->assertStatus(422);
    }

    // ─── Get My Response ──────────────────────────────────────────────────────

    public function test_school_user_can_get_their_response(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 85]],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/response/my");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $tableResponse->id)
            ->assertJsonPath('data.rows.0.name', 'Test');
    }

    public function test_returns_null_when_no_response_exists(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/response/my");

        // successResponse(null, ...) omits the 'data' key entirely
        $response->assertStatus(200)
            ->assertJsonMissing(['data'])
            ->assertJsonPath('success', true);
    }

    // ─── Save Draft (auto-save) ───────────────────────────────────────────────

    public function test_school_user_can_save_draft_rows(): void
    {
        // Əvvəlcə start et
        $startResp = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");

        $responseId = $startResp->json('data.id');

        $rows = [
            ['name' => 'Əli Məmmədov', 'score' => 90],
            ['name' => 'Aytən Hüseynova', 'score' => 85],
        ];

        $saveResp = $this->actingAs($this->schoolUser)
            ->putJson("/api/report-table-responses/{$responseId}", ['rows' => $rows]);

        $saveResp->assertStatus(200)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.rows.0.name', 'Əli Məmmədov');

        $this->assertDatabaseHas('report_table_responses', [
            'id'     => $responseId,
            'status' => 'draft',
        ]);
    }

    public function test_save_validates_max_rows_limit(): void
    {
        $startResp = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");

        $responseId = $startResp->json('data.id');

        // max_rows = 5, biz 10 göndəririk
        $rows = array_fill(0, 10, ['name' => 'Test', 'score' => 50]);

        $response = $this->actingAs($this->schoolUser)
            ->putJson("/api/report-table-responses/{$responseId}", ['rows' => $rows]);

        $response->assertStatus(422);
    }

    public function test_save_does_not_overwrite_locked_submitted_rows(): void
    {
        // Bir sətri submitted statusunda olan response yarat
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Orijinal', 'score' => 100]],
            'row_statuses'    => [['status' => 'submitted', 'submitted_at' => now()->toISOString()]],
        ]);

        // Submitted sətri dəyişdirməyə çalış
        $response = $this->actingAs($this->schoolUser)
            ->putJson("/api/report-table-responses/{$tableResponse->id}", [
                'rows' => [['name' => 'Dəyişdirilmiş', 'score' => 0]],
            ]);

        $response->assertStatus(200);

        // Orijinal dəyər qalmalıdır
        $fresh = ReportTableResponse::find($tableResponse->id);
        $this->assertSame('Orijinal', $fresh->rows[0]['name']);
    }

    public function test_cannot_save_another_users_response(): void
    {
        $otherUser = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], [
            'institution_id' => $this->institution->id,
        ]);

        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
        ]);

        $response = $this->actingAs($otherUser)
            ->putJson("/api/report-table-responses/{$tableResponse->id}", [
                'rows' => [['name' => 'Hack', 'score' => 0]],
            ]);

        $response->assertStatus(422);
    }

    // ─── Submit Response ──────────────────────────────────────────────────────

    public function test_school_user_can_submit_response(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
            'status'          => 'draft',
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-table-responses/{$tableResponse->id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'submitted');

        $this->assertDatabaseHas('report_table_responses', [
            'id'     => $tableResponse->id,
            'status' => 'submitted',
        ]);
    }

    public function test_cannot_submit_empty_response(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [],
            'status'          => 'draft',
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-table-responses/{$tableResponse->id}/submit");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rows']);
    }

    // NOTE: Deadline enforcement is not implemented in the submit service.
    // The service does not check $table->deadline before submitting.
    // This is a missing feature that could be added in the future.

    public function test_cannot_submit_already_submitted_response(): void
    {
        $tableResponse = ReportTableResponse::factory()->submitted()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-table-responses/{$tableResponse->id}/submit");

        $response->assertStatus(422);
    }

    // ─── Submit Row ───────────────────────────────────────────────────────────

    public function test_school_user_can_submit_individual_row(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
            'status'          => 'draft',
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/submit", [
                'row_index' => 0,
            ]);

        $response->assertStatus(200);

        $fresh = ReportTableResponse::find($tableResponse->id);
        $this->assertSame('submitted', $fresh->row_statuses[0]['status']);
    }

    public function test_cannot_submit_empty_row(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => '', 'score' => null]],
            'status'          => 'draft',
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/submit", [
                'row_index' => 0,
            ]);

        $response->assertStatus(422);
    }

    public function test_cannot_submit_already_submitted_row(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/submit", [
                'row_index' => 0,
            ]);

        $response->assertStatus(422);
    }

    // ─── Admin: Approve / Reject / Return Row ─────────────────────────────────

    public function test_admin_can_approve_submitted_row(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/approve", [
                'row_index' => 0,
            ]);

        $response->assertStatus(200);

        $fresh = ReportTableResponse::find($tableResponse->id);
        $this->assertSame('approved', $fresh->row_statuses[0]['status']);
    }

    public function test_cannot_approve_non_submitted_row(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
            'row_statuses'    => null,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/approve", [
                'row_index' => 0,
            ]);

        $response->assertStatus(422);
    }

    public function test_admin_can_reject_submitted_row_with_reason(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/reject", [
                'row_index' => 0,
                'reason'    => 'Məlumat natamamdır',
            ]);

        $response->assertStatus(200);

        $fresh = ReportTableResponse::find($tableResponse->id);
        $this->assertSame('rejected', $fresh->row_statuses[0]['status']);
        $this->assertSame('Məlumat natamamdır', $fresh->row_statuses[0]['rejection_reason']);
    }

    public function test_reject_row_requires_reason(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/reject", [
                'row_index' => 0,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_admin_can_return_row_to_draft(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/return", [
                'row_index' => 0,
            ]);

        $response->assertStatus(200);

        $fresh = ReportTableResponse::find($tableResponse->id);
        $this->assertSame('draft', $fresh->row_statuses[0]['status']);
    }

    public function test_school_user_cannot_approve_rows(): void
    {
        $tableResponse = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/approve", [
                'row_index' => 0,
            ]);

        $response->assertStatus(403);
    }

    // ─── Admin: View All Responses ────────────────────────────────────────────

    public function test_admin_can_view_all_responses_for_table(): void
    {
        ReportTableResponse::factory()->count(3)->create([
            'report_table_id' => $this->publishedTable->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/responses");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'institution_id', 'respondent_id', 'rows', 'status'],
                ],
                'meta',
            ])
            ->assertJsonCount(3, 'data');
    }

    // ─── Bulk Row Action ──────────────────────────────────────────────────────

    public function test_admin_can_perform_bulk_approve_on_rows(): void
    {
        // Create a second school in the same sector (admin's hierarchy) to avoid
        // UniqueConstraintViolationException on (report_table_id, institution_id)
        $school2 = Institution::factory()->school()->create([
            'parent_id' => $this->institution->parent_id,
        ]);

        $resp1 = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'rows'            => [['name' => 'Test 1', 'score' => 90]],
        ]);
        $resp2 = ReportTableResponse::factory()->withSubmittedRow(0)->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $school2->id,
            'rows'            => [['name' => 'Test 2', 'score' => 85]],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/bulk-row-action", [
                'row_specs' => [
                    ['response_id' => $resp1->id, 'row_indices' => [0]],
                    ['response_id' => $resp2->id, 'row_indices' => [0]],
                ],
                'action' => 'approve',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('successful', 2);

        $this->assertSame('approved', ReportTableResponse::find($resp1->id)->row_statuses[0]['status']);
        $this->assertSame('approved', ReportTableResponse::find($resp2->id)->row_statuses[0]['status']);
    }

    // ─── Sector Isolation ─────────────────────────────────────────────────────

    public function test_sektoradmin_only_sees_own_sector_responses(): void
    {
        $sector      = Institution::factory()->sector()->create();
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ], ['institution_id' => $sector->id]);

        // Sektorun məktəbi
        $school1 = Institution::factory()->school()->create(['parent_id' => $sector->id]);
        // Başqa sektorun məktəbi
        $school2 = Institution::factory()->school()->create(['parent_id' => null]);

        ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $school1->id,
        ]);
        ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $school2->id,
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/responses");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data'); // Yalnız school1-in cavabı
    }

    // ─── Data Integrity ───────────────────────────────────────────────────────

    public function test_response_data_is_preserved_correctly(): void
    {
        $rows = [
            ['name' => 'Əli Məmmədov', 'score' => 95.5],
            ['name' => 'Aytən Hüseynova', 'score' => 87.0],
        ];

        $startResp  = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");
        $responseId = $startResp->json('data.id');

        $this->actingAs($this->schoolUser)
            ->putJson("/api/report-table-responses/{$responseId}", ['rows' => $rows]);

        $getResp = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/response/my");

        $getResp->assertStatus(200)
            ->assertJsonPath('data.rows.0.name', 'Əli Məmmədov')
            ->assertJsonPath('data.rows.0.score', 95.5)
            ->assertJsonPath('data.rows.1.name', 'Aytən Hüseynova');
    }

    public function test_row_statuses_tracked_after_row_submit(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id'  => $this->institution->id,
            'respondent_id'   => $this->schoolUser->id,
            'rows'            => [['name' => 'Test', 'score' => 90]],
            'status'          => 'draft',
        ]);

        $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/rows/submit", [
                'row_index' => 0,
            ]);

        $getResp = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/response/my");

        $getResp->assertStatus(200)
            ->assertJsonPath('data.row_statuses.0.status', 'submitted');
    }

    // ─── Authorization ────────────────────────────────────────────────────────

    public function test_unauthenticated_user_cannot_start_response(): void
    {
        $response = $this->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");
        $response->assertStatus(401);
    }

    public function test_user_without_institution_cannot_start_response(): void
    {
        $noInstUser = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], [
            'institution_id' => null,
        ]);

        $response = $this->actingAs($noInstUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/response/start");

        $response->assertStatus(422);
    }
}
