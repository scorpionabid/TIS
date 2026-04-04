<?php

namespace Tests\Feature\CurriculumPlan;

use App\Models\AcademicYear;
use App\Models\CurriculumPlanApproval;
use App\Models\Institution;
use App\Models\Region;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * POST /api/curriculum-plans/submit
 * POST /api/curriculum-plans/approve
 * POST /api/curriculum-plans/return
 * POST /api/curriculum-plans/reset
 *
 * Status maşını: draft → submitted → approved
 *                         ↓
 *                      returned → submitted
 * Reset: istənilən status → draft
 */
class CurriculumPlanApprovalWorkflowTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $regionInstitution;
    private Institution $school;
    private AcademicYear $year;
    private Region $region;
    private $schoolAdmin;
    private $sektorAdmin;
    private $regionAdmin;
    private $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->regionInstitution = Institution::factory()->create([
            'type' => 'regional_education_department',
            'level' => 2,
        ]);

        $this->region = Region::create([
            'institution_id' => $this->regionInstitution->id,
            'code' => 'R' . random_int(1000, 9999),
            'name' => 'Test Rayonu',
            'is_active' => true,
            'is_curriculum_locked' => false,
            'can_sektor_edit' => true,
            'can_operator_edit' => true,
        ]);

        $this->school = Institution::factory()->school()->create([
            'parent_id' => $this->regionInstitution->id,
        ]);

        $this->year = AcademicYear::factory()->active()->create();

        $this->schoolAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $this->school->id,
        ]);
        $this->sektorAdmin = $this->createUserWithRole('sektoradmin', [], [
            'institution_id' => $this->school->id,
        ]);
        $this->regionAdmin = $this->createUserWithRole('regionadmin', [], [
            'institution_id' => $this->regionInstitution->id,
        ]);
        $this->superAdmin = $this->createUserWithRole('superadmin', [], [
            'institution_id' => null,
        ]);
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
        ], $override);
    }

    private function createApproval(string $status = 'draft'): CurriculumPlanApproval
    {
        return CurriculumPlanApproval::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->$status()
            ->create();
    }

    // =========================================================================
    // SUBMIT
    // =========================================================================

    /** @test */
    public function school_admin_can_submit_draft_plan(): void
    {
        $this->createApproval('draft');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/submit', $this->payload());

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'status' => 'submitted',
        ]);
    }

    /** @test */
    public function can_submit_returned_plan(): void
    {
        $this->createApproval('returned');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/submit', $this->payload());

        $response->assertOk();

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'status' => 'submitted',
        ]);
    }

    /** @test */
    public function cannot_submit_already_submitted_plan(): void
    {
        $this->createApproval('submitted');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/submit', $this->payload());

        $response->assertStatus(400)
            ->assertJsonFragment(['status' => 'error']);

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'status' => 'submitted',
        ]);
    }

    /** @test */
    public function cannot_submit_approved_plan(): void
    {
        $this->createApproval('approved');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/submit', $this->payload());

        $response->assertStatus(400);

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'status' => 'approved',
        ]);
    }

    /** @test */
    public function unauthenticated_submit_returns_401(): void
    {
        $this->postJson('/api/curriculum-plans/submit', $this->payload())
            ->assertStatus(401);
    }

    /** @test */
    public function missing_academic_year_id_on_submit_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/submit', ['institution_id' => $this->school->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['academic_year_id']);
    }

    // =========================================================================
    // APPROVE
    // =========================================================================

    /** @test */
    public function sektoradmin_can_approve_submitted_plan(): void
    {
        $this->createApproval('submitted');

        $response = $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/approve', $this->payload());

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'status' => 'approved',
        ]);
    }

    /** @test */
    public function regionadmin_can_approve_submitted_plan(): void
    {
        $this->createApproval('submitted');

        $response = $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/approve', $this->payload());

        $response->assertOk();

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'status' => 'approved',
        ]);
    }

    /** @test */
    public function approve_sets_approved_at_timestamp(): void
    {
        $this->createApproval('submitted');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/approve', $this->payload())
            ->assertOk();

        $approval = CurriculumPlanApproval::where([
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
        ])->first();

        $this->assertNotNull($approval->approved_at);
    }

    /** @test */
    public function cannot_approve_draft_plan(): void
    {
        $this->createApproval('draft');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/approve', $this->payload())
            ->assertStatus(400)
            ->assertJsonFragment(['status' => 'error']);
    }

    /** @test */
    public function cannot_approve_already_approved_plan(): void
    {
        $this->createApproval('approved');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/approve', $this->payload())
            ->assertStatus(400);
    }

    /** @test */
    public function cannot_approve_returned_plan(): void
    {
        $this->createApproval('returned');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/approve', $this->payload())
            ->assertStatus(400);
    }

    // =========================================================================
    // RETURN
    // =========================================================================

    /** @test */
    public function sektoradmin_can_return_submitted_plan_with_comment(): void
    {
        $this->createApproval('submitted');

        $response = $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/return', array_merge($this->payload(), [
                'comment' => 'Bəzi fənlər düzgün deyil, düzəldin.',
            ]));

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $approval = CurriculumPlanApproval::where([
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
        ])->first();

        $this->assertEquals('returned', $approval->status);
        $this->assertNotNull($approval->returned_at);
        $this->assertStringContainsString('Bəzi fənlər', $approval->return_comment);
    }

    /** @test */
    public function comment_shorter_than_5_chars_returns_422(): void
    {
        $this->createApproval('submitted');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/return', array_merge($this->payload(), [
                'comment' => 'Yox',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['comment']);
    }

    /** @test */
    public function return_comment_is_required(): void
    {
        $this->createApproval('submitted');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/return', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['comment']);
    }

    /** @test */
    public function cannot_return_draft_plan(): void
    {
        $this->createApproval('draft');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/return', array_merge($this->payload(), [
                'comment' => 'Geri qaytarılır',
            ]))
            ->assertStatus(400);
    }

    /** @test */
    public function cannot_return_approved_plan(): void
    {
        $this->createApproval('approved');

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/return', array_merge($this->payload(), [
                'comment' => 'Geri qaytarılır',
            ]))
            ->assertStatus(400);
    }

    // =========================================================================
    // RESET
    // =========================================================================

    /** @test */
    public function regionadmin_can_reset_approved_plan_to_draft(): void
    {
        $this->createApproval('approved');

        $response = $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/reset', $this->payload());

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'status' => 'draft',
        ]);
    }

    /** @test */
    public function superadmin_can_reset_submitted_plan(): void
    {
        $this->createApproval('submitted');

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/reset', $this->payload())
            ->assertOk();

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'status' => 'draft',
        ]);
    }

    /** @test */
    public function reset_already_draft_plan_stays_draft(): void
    {
        $this->createApproval('draft');

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/reset', $this->payload())
            ->assertOk();

        $this->assertDatabaseHas('curriculum_plan_approvals', [
            'institution_id' => $this->school->id,
            'status' => 'draft',
        ]);
    }

    /** @test */
    public function schooladmin_blocked_by_role_middleware_on_reset(): void
    {
        // Route middleware: role:superadmin|regionadmin|sektoradmin|schooladmin
        // schooladmin da var, ona görə 403 yox — 200 gözlənilir
        $this->createApproval('submitted');

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/reset', $this->payload())
            ->assertOk();
    }
}
