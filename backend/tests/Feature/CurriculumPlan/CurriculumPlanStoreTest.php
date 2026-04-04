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
 * POST /api/curriculum-plans
 *
 * bulkUpsertPlanItems + isEditable yoxlamaları:
 *   1. is_locked  → hamı blok
 *   2. deadline keçmiş → yalnız schooladmin blok
 *   3. can_sektor_edit=false → yalnız sektoradmin blok
 *   4. can_operator_edit=false → yalnız regionoperator blok
 *   5. approval status=submitted/approved → schooladmin blok
 */
class CurriculumPlanStoreTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $regionInstitution;
    private Institution $school;
    private AcademicYear $year;
    private Subject $subject;
    private Region $region;
    private $schoolAdmin;
    private $sektorAdmin;
    private $regionAdmin;
    private $superAdmin;
    private $regionOperator;

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
        $this->regionAdmin = $this->createUserWithRole('regionadmin', [], [
            'institution_id' => $this->regionInstitution->id,
        ]);
        $this->superAdmin = $this->createUserWithRole('superadmin', [], [
            'institution_id' => null,
        ]);
        $this->regionOperator = $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $this->regionInstitution->id,
        ]);
    }

    private function validPayload(array $override = []): array
    {
        return array_merge([
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'items' => [
                [
                    'class_level' => 5,
                    'subject_id' => $this->subject->id,
                    'education_type' => 'umumi',
                    'hours' => 4,
                    'is_extra' => false,
                ],
            ],
        ], $override);
    }

    private function setRegion(array $attrs): void
    {
        $this->region->update($attrs);
    }

    private function createApproval(string $status): CurriculumPlanApproval
    {
        return CurriculumPlanApproval::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->$status()
            ->create();
    }

    // =========================================================================
    // Happy path
    // =========================================================================

    /** @test */
    public function school_admin_can_save_plan_items(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload());

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $this->assertDatabaseHas('curriculum_plans', [
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'subject_id' => $this->subject->id,
            'class_level' => 5,
            'education_type' => 'umumi',
            'hours' => 4,
        ]);
    }

    /** @test */
    public function updating_existing_plan_item_does_upsert_not_duplicate(): void
    {
        // Əvvəlcə plan yarat
        CurriculumPlan::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->forSubject($this->subject)
            ->create(['class_level' => 5, 'education_type' => 'umumi', 'hours' => 2]);

        // Eyni key ilə yenilə
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload());

        // Yalnız 1 qeyd olmalıdır
        $this->assertEquals(1, CurriculumPlan::where([
            'institution_id' => $this->school->id,
            'subject_id' => $this->subject->id,
            'class_level' => 5,
            'education_type' => 'umumi',
        ])->count());

        // Saatlar 4-ə yenilənib
        $this->assertDatabaseHas('curriculum_plans', [
            'institution_id' => $this->school->id,
            'subject_id' => $this->subject->id,
            'hours' => 4,
        ]);
    }

    /** @test */
    public function store_recalculates_grade_curriculum_hours(): void
    {
        Grade::factory()
            ->forInstitution($this->school)
            ->create([
                'academic_year_id' => $this->year->id,
                'class_level' => 5,
                'curriculum_hours' => 0,
            ]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertOk();

        $grade = Grade::where([
            'institution_id' => $this->school->id,
            'class_level' => 5,
        ])->first();

        $this->assertEquals(4, $grade->curriculum_hours);
    }

    // =========================================================================
    // Validation
    // =========================================================================

    /** @test */
    public function missing_items_array_returns_422(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', [
                'institution_id' => $this->school->id,
                'academic_year_id' => $this->year->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }

    /** @test */
    public function invalid_education_type_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['items'][0]['education_type'] = 'yanlish_tip';

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.education_type']);
    }

    /** @test */
    public function negative_hours_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['items'][0]['hours'] = -1;

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.hours']);
    }

    /** @test */
    public function nonexistent_subject_id_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['items'][0]['subject_id'] = 999999;

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.subject_id']);
    }

    /** @test */
    public function class_level_must_be_integer_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['items'][0]['class_level'] = 'not_integer';

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.class_level']);
    }

    // =========================================================================
    // isEditable — is_locked
    // =========================================================================

    /** @test */
    public function locked_region_prevents_school_admin_from_saving(): void
    {
        $this->setRegion(['is_curriculum_locked' => true]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function locked_region_prevents_sektoradmin_from_saving(): void
    {
        $this->setRegion(['is_curriculum_locked' => true]);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function locked_region_also_prevents_regionadmin(): void
    {
        // is_locked=true → isEditable ilk şərtdə hamını blok edir (regionadmin daxil)
        $this->setRegion(['is_curriculum_locked' => true]);

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function locked_region_also_prevents_superadmin(): void
    {
        $this->setRegion(['is_curriculum_locked' => true]);

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    // =========================================================================
    // isEditable — deadline
    // =========================================================================

    /** @test */
    public function expired_deadline_prevents_school_admin_from_saving(): void
    {
        $this->setRegion(['curriculum_deadline' => now()->subDay()]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function expired_deadline_does_not_prevent_sektoradmin(): void
    {
        $this->setRegion(['curriculum_deadline' => now()->subDay()]);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertOk();
    }

    /** @test */
    public function expired_deadline_does_not_prevent_regionadmin(): void
    {
        $this->setRegion(['curriculum_deadline' => now()->subDay()]);

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertOk();
    }

    /** @test */
    public function future_deadline_allows_school_admin(): void
    {
        $this->setRegion(['curriculum_deadline' => now()->addDay()]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertOk();
    }

    // =========================================================================
    // isEditable — can_sektor_edit / can_operator_edit
    // =========================================================================

    /** @test */
    public function can_sektor_edit_false_prevents_sektoradmin(): void
    {
        $this->setRegion(['can_sektor_edit' => false]);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function can_operator_edit_false_prevents_regionoperator(): void
    {
        $this->setRegion(['can_operator_edit' => false]);

        $this->actingAs($this->regionOperator, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function can_sektor_edit_false_does_not_affect_schooladmin(): void
    {
        $this->setRegion(['can_sektor_edit' => false]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertOk();
    }

    // =========================================================================
    // isEditable — approval status
    // =========================================================================

    /** @test */
    public function submitted_plan_prevents_school_admin_from_saving(): void
    {
        $this->createApproval('submitted');

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function approved_plan_prevents_school_admin_from_saving(): void
    {
        $this->createApproval('approved');

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertStatus(403);
    }

    /** @test */
    public function returned_plan_allows_school_admin_to_save(): void
    {
        $this->createApproval('returned');

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->validPayload())
            ->assertOk();
    }
}
