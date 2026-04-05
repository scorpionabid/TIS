<?php

namespace Tests\Feature\CurriculumPlan;

use App\Models\AcademicYear;
use App\Models\CurriculumPlan;
use App\Models\CurriculumPlanApproval;
use App\Models\Grade;
use App\Models\Institution;
use App\Models\Region;
use App\Models\Subject;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * POST /api/curriculum-plans/delete
 */
class CurriculumPlanDeleteTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $regionInstitution;

    private Institution $school;

    private AcademicYear $year;

    private Subject $subject;

    private Region $region;

    private $schoolAdmin;

    private $sektorAdmin;

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
        $this->subject = Subject::factory()->create();

        $this->schoolAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $this->school->id,
        ]);
        $this->sektorAdmin = $this->createUserWithRole('sektoradmin', [], [
            'institution_id' => $this->school->id,
        ]);
    }

    private function deletePayload(array $override = []): array
    {
        return array_merge([
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'subject_id' => $this->subject->id,
            'education_type' => 'umumi',
        ], $override);
    }

    private function createPlan(string $educationType = 'umumi'): CurriculumPlan
    {
        return CurriculumPlan::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->forSubject($this->subject)
            ->create(['class_level' => 5, 'education_type' => $educationType, 'hours' => 3]);
    }

    // =========================================================================
    // Happy path
    // =========================================================================

    /** @test */
    public function school_admin_can_delete_subject_from_draft_plan(): void
    {
        $this->createPlan();

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', $this->deletePayload());

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $this->assertDatabaseMissing('curriculum_plans', [
            'institution_id' => $this->school->id,
            'subject_id' => $this->subject->id,
            'education_type' => 'umumi',
        ]);
    }

    /** @test */
    public function deleting_nonexistent_subject_type_combo_returns_success(): void
    {
        // Heç bir plan yoxdur — yenə də 200 qaytarmalıdır
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', $this->deletePayload());

        $response->assertOk()->assertJsonFragment(['status' => 'success']);
    }

    /** @test */
    public function delete_recalculates_all_grade_hours(): void
    {
        $this->createPlan();

        Grade::factory()
            ->forInstitution($this->school)
            ->create([
                'academic_year_id' => $this->year->id,
                'class_level' => 5,
                'curriculum_hours' => 3,
            ]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', $this->deletePayload())
            ->assertOk();

        $grade = Grade::where([
            'institution_id' => $this->school->id,
            'class_level' => 5,
        ])->first();

        $this->assertEquals(0, $grade->curriculum_hours);
    }

    // =========================================================================
    // isEditable
    // =========================================================================

    /** @test */
    public function locked_region_prevents_deletion(): void
    {
        $this->createPlan();
        $this->region->update(['is_curriculum_locked' => true]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', $this->deletePayload())
            ->assertStatus(403);

        // Plan silinməyib
        $this->assertDatabaseHas('curriculum_plans', [
            'institution_id' => $this->school->id,
            'subject_id' => $this->subject->id,
        ]);
    }

    /** @test */
    public function submitted_plan_prevents_school_admin_deletion(): void
    {
        $this->createPlan();

        CurriculumPlanApproval::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->submitted()
            ->create();

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', $this->deletePayload())
            ->assertStatus(403);
    }

    // =========================================================================
    // Validation
    // =========================================================================

    /** @test */
    public function missing_subject_id_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', [
                'institution_id' => $this->school->id,
                'academic_year_id' => $this->year->id,
                'education_type' => 'umumi',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['subject_id']);
    }

    /** @test */
    public function invalid_education_type_in_delete_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/delete', $this->deletePayload([
                'education_type' => 'yanlish',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['education_type']);
    }
}
