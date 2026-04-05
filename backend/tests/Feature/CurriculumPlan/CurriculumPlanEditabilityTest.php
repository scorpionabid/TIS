<?php

namespace Tests\Feature\CurriculumPlan;

use App\Models\AcademicYear;
use App\Models\CurriculumPlanApproval;
use App\Models\Institution;
use App\Models\Region;
use App\Models\Subject;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * isEditable() kombinasiya testləri — POST /api/curriculum-plans istifadə edilir.
 *
 * Hər test bir kombinasiyanı izolə edir:
 *   locked=true    → hamı blok
 *   deadline keçmiş → yalnız schooladmin blok
 *   can_sektor_edit=false → yalnız sektoradmin blok
 *   can_operator_edit=false → yalnız regionoperator blok
 *   status=approved → schooladmin blok, sektoradmin yox
 */
class CurriculumPlanEditabilityTest extends TestCase
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
        $this->regionOperator = $this->createUserWithRole('regionoperator', [], [
            'institution_id' => $this->regionInstitution->id,
        ]);
    }

    private function storePayload(): array
    {
        return [
            'institution_id' => $this->school->id,
            'academic_year_id' => $this->year->id,
            'items' => [[
                'class_level' => 5,
                'subject_id' => $this->subject->id,
                'education_type' => 'umumi',
                'hours' => 2,
            ]],
        ];
    }

    /** @test */
    public function locked_true_blocks_all_roles(): void
    {
        $this->region->update(['is_curriculum_locked' => true]);

        // is_locked=true → isEditable ilk şərtdə return false qaytarır — hamı blok olur
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);
    }

    /** @test */
    public function expired_deadline_blocks_schooladmin_only(): void
    {
        $this->region->update(['curriculum_deadline' => now()->subDay()]);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertOk();

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertOk();
    }

    /** @test */
    public function can_sektor_edit_false_blocks_only_sektoradmin(): void
    {
        $this->region->update(['can_sektor_edit' => false]);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertOk();

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertOk();
    }

    /** @test */
    public function can_operator_edit_false_blocks_only_regionoperator(): void
    {
        $this->region->update(['can_operator_edit' => false]);

        $this->actingAs($this->regionOperator, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertOk();
    }

    /** @test */
    public function approved_status_blocks_schooladmin_but_not_sektoradmin(): void
    {
        CurriculumPlanApproval::factory()
            ->forInstitution($this->school)
            ->forYear($this->year)
            ->approved()
            ->create();

        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertStatus(403);

        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans', $this->storePayload())
            ->assertOk();
    }
}
