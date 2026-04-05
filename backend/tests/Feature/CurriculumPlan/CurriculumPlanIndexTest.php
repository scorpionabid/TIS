<?php

namespace Tests\Feature\CurriculumPlan;

use App\Models\AcademicYear;
use App\Models\CurriculumPlan;
use App\Models\CurriculumPlanApproval;
use App\Models\Institution;
use App\Models\Region;
use App\Models\Subject;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * GET /api/curriculum-plans
 */
class CurriculumPlanIndexTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $regionInstitution;

    private Institution $school;

    private AcademicYear $year;

    private Region $region;

    private $schoolAdmin;

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
            'curriculum_deadline' => null,
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
        $this->superAdmin = $this->createUserWithRole('superadmin', [], [
            'institution_id' => null,
        ]);
    }

    private function params(array $override = []): array
    {
        return array_merge([
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
        ], $override);
    }

    // =========================================================================
    // Auth & permission
    // =========================================================================

    /** @test */
    public function unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/curriculum-plans?' . http_build_query($this->params()))
            ->assertStatus(401);
    }

    /** @test */
    public function teacher_role_returns_403(): void
    {
        $teacher = $this->createUserWithRole('müəllim', [], [
            'institution_id' => $this->school->id,
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/curriculum-plans?' . http_build_query($this->params()))
            ->assertStatus(403);
    }

    // =========================================================================
    // Validation
    // =========================================================================

    /** @test */
    public function missing_institution_id_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?academic_year_id=' . $this->year->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['institution_id']);
    }

    /** @test */
    public function missing_academic_year_id_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?institution_id=' . $this->school->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['academic_year_id']);
    }

    /** @test */
    public function nonexistent_institution_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?institution_id=999999&academic_year_id=' . $this->year->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['institution_id']);
    }

    // =========================================================================
    // Happy path
    // =========================================================================

    /** @test */
    public function school_admin_gets_plan_with_required_fields(): void
    {
        Subject::factory()->create();
        CurriculumPlan::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->create(['class_level' => 5, 'education_type' => 'umumi', 'hours' => 3]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?' . http_build_query($this->params()));

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'items',
                'assigned_hours',
                'approval',
                'deadline',
                'is_locked',
            ]);
    }

    /** @test */
    public function response_includes_approval_status_draft_by_default(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?' . http_build_query($this->params()));

        $response->assertOk();
        $this->assertEquals('draft', $response->json('approval.status'));
    }

    /** @test */
    public function response_includes_is_locked_true_when_region_locked(): void
    {
        $this->region->update(['is_curriculum_locked' => true]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?' . http_build_query($this->params()));

        $response->assertOk();
        $this->assertTrue($response->json('is_locked'));
    }

    /** @test */
    public function response_returns_empty_items_when_no_plans_exist(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?' . http_build_query($this->params()));

        $response->assertOk();
        $this->assertCount(0, $response->json('items'));
    }

    /** @test */
    public function existing_approval_status_is_returned_correctly(): void
    {
        CurriculumPlanApproval::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->submitted()
            ->create();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans?' . http_build_query($this->params()));

        $response->assertOk();
        $this->assertEquals('submitted', $response->json('approval.status'));
    }
}
