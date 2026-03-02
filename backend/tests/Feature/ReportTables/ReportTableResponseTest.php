<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use App\Models\ReportTableResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTableResponseTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $schoolUser;
    protected Institution $institution;
    protected ReportTable $publishedTable;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->schoolUser = User::factory()->create(['role' => 'school']);
        $this->institution = Institution::factory()->create();
        $this->schoolUser->institution_id = $this->institution->id;
        $this->schoolUser->save();

        $this->publishedTable = ReportTable::factory()->create([
            'status' => 'published',
            'target_institutions' => [$this->institution->id],
            'columns' => [
                ['key' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true],
                ['key' => 'score', 'label' => 'Score', 'type' => 'number'],
            ],
            'max_rows' => 5,
        ]);
    }

    // ─── My Response Tests ────────────────────────────────────────────────────

    public function test_school_user_can_get_their_response(): void
    {
        $response = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id' => $this->institution->id,
            'respondent_id' => $this->schoolUser->id,
            'rows' => [['name' => 'Test', 'score' => 85]],
        ]);

        $apiResponse = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/my-response");

        $apiResponse->assertStatus(200)
            ->assertJsonPath('data.id', $response->id)
            ->assertJsonPath('data.rows.0.name', 'Test');
    }

    public function test_returns_null_when_no_response_exists(): void
    {
        $response = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/my-response");

        $response->assertStatus(200)
            ->assertJson(['data' => null]);
    }

    // ─── Save Draft Tests ─────────────────────────────────────────────────────

    public function test_school_user_can_save_draft_response(): void
    {
        $rows = [
            ['name' => 'John Doe', 'score' => 90],
            ['name' => 'Jane Smith', 'score' => 85],
        ];

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/save-response", [
                'rows' => $rows,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.rows', $rows);

        $this->assertDatabaseHas('report_table_responses', [
            'report_table_id' => $this->publishedTable->id,
            'institution_id' => $this->institution->id,
            'respondent_id' => $this->schoolUser->id,
            'status' => 'draft',
        ]);
    }

    public function test_cannot_save_response_to_unpublished_table(): void
    {
        $draftTable = ReportTable::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$draftTable->id}/save-response", [
                'rows' => [['name' => 'Test']],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot respond to unpublished table');
    }

    public function test_validates_max_rows_limit(): void
    {
        $rows = array_fill(0, 10, ['name' => 'Test', 'score' => 50]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/save-response", [
                'rows' => $rows,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Maximum 5 rows allowed');
    }

    public function test_validates_required_fields(): void
    {
        $rows = [['name' => '', 'score' => 90]]; // Empty required field

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/save-response", [
                'rows' => $rows,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rows.0.name']);
    }

    // ─── Submit Response Tests ─────────────────────────────────────────────────

    public function test_school_user_can_submit_final_response(): void
    {
        // First save as draft
        $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/save-response", [
                'rows' => [['name' => 'Test', 'score' => 90]],
            ]);

        // Then submit
        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/submit-response", [
                'rows' => [['name' => 'Test', 'score' => 90]],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.submitted_at', fn ($value) => !is_null($value));

        $this->assertDatabaseHas('report_table_responses', [
            'report_table_id' => $this->publishedTable->id,
            'status' => 'submitted',
        ]);
    }

    public function test_cannot_submit_after_deadline(): void
    {
        $expiredTable = ReportTable::factory()->create([
            'status' => 'published',
            'deadline' => now()->subDay(),
            'target_institutions' => [$this->institution->id],
        ]);

        $response = $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$expiredTable->id}/submit-response", [
                'rows' => [['name' => 'Test']],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Deadline has passed');
    }

    // ─── Admin Response Management Tests ──────────────────────────────────────

    public function test_admin_can_view_all_responses(): void
    {
        ReportTableResponse::factory()->count(3)->create([
            'report_table_id' => $this->publishedTable->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/responses");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'institution_id', 'respondent_id', 'rows', 'status']
                ],
                'meta',
            ])
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_approve_response(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('report_table_responses', [
            'id' => $tableResponse->id,
            'status' => 'approved',
        ]);
    }

    public function test_admin_can_reject_response_with_reason(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/reject", [
                'reason' => 'Incomplete data provided',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('report_table_responses', [
            'id' => $tableResponse->id,
            'status' => 'rejected',
        ]);
    }

    public function test_reject_requires_reason(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/reject", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_cannot_approve_draft_response(): void
    {
        $tableResponse = ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/responses/{$tableResponse->id}/approve");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot approve draft response');
    }

    // ─── Bulk Action Tests ────────────────────────────────────────────────────

    public function test_admin_can_perform_bulk_approve(): void
    {
        $responses = ReportTableResponse::factory()->count(3)->create([
            'report_table_id' => $this->publishedTable->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/bulk-row-action", [
                'row_specs' => [
                    ['response_id' => $responses[0]->id, 'row_indices' => [0]],
                    ['response_id' => $responses[1]->id, 'row_indices' => [0]],
                ],
                'action' => 'approve',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('successful', 2);

        foreach ($responses->take(2) as $resp) {
            $this->assertDatabaseHas('report_table_responses', [
                'id' => $resp->id,
                'status' => 'approved',
            ]);
        }
    }

    // ─── Sector Isolation Tests ────────────────────────────────────────────────

    public function test_sector_admin_only_sees_their_sector_responses(): void
    {
        $sectorAdmin = User::factory()->create(['role' => 'sector']);
        $sector = Institution::factory()->create(['type' => 'sector']);
        $sectorAdmin->institution_id = $sector->id;
        $sectorAdmin->save();

        // Create institutions in different sectors
        $institution1 = Institution::factory()->create(['parent_id' => $sector->id]);
        $institution2 = Institution::factory()->create(['parent_id' => 999]); // Different sector

        ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id' => $institution1->id,
        ]);

        ReportTableResponse::factory()->create([
            'report_table_id' => $this->publishedTable->id,
            'institution_id' => $institution2->id,
        ]);

        $response = $this->actingAs($sectorAdmin)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/responses");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data'); // Only sees institution1's response
    }

    // ─── Data Integrity Tests ────────────────────────────────────────────────

    public function test_response_data_structure_is_preserved(): void
    {
        $rows = [
            ['name' => 'John Doe', 'score' => 95.5],
            ['name' => 'Jane Smith', 'score' => 87.0],
        ];

        $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/save-response", [
                'rows' => $rows,
            ]);

        $response = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/my-response");

        $response->assertStatus(200)
            ->assertJsonPath('data.rows.0.name', 'John Doe')
            ->assertJsonPath('data.rows.0.score', 95.5)
            ->assertJsonPath('data.rows.1.name', 'Jane Smith');
    }

    public function test_row_statuses_are_tracked(): void
    {
        $rows = [['name' => 'Test', 'score' => 90]];

        $this->actingAs($this->schoolUser)
            ->postJson("/api/report-tables/{$this->publishedTable->id}/submit-response", [
                'rows' => $rows,
            ]);

        $response = $this->actingAs($this->schoolUser)
            ->getJson("/api/report-tables/{$this->publishedTable->id}/my-response");

        $response->assertStatus(200)
            ->assertJsonPath('data.row_statuses.0.status', 'submitted');
    }
}
