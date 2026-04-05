<?php

namespace Tests\Feature\CurriculumPlan;

use App\Models\Institution;
use App\Models\Region;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * GET  /api/curriculum-plans/settings
 * POST /api/curriculum-plans/settings
 */
class CurriculumPlanSettingsTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $regionInstitution;

    private Institution $school;

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
            'curriculum_deadline' => null,
            'can_sektor_edit' => true,
            'can_operator_edit' => true,
        ]);

        $this->school = Institution::factory()->school()->create([
            'parent_id' => $this->regionInstitution->id,
        ]);

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

    private function defaultUpdatePayload(array $override = []): array
    {
        return array_merge([
            'is_locked' => false,
            'deadline' => null,
            'can_sektor_edit' => true,
            'can_operator_edit' => true,
        ], $override);
    }

    // =========================================================================
    // GET /settings
    // =========================================================================

    /** @test */
    public function unauthenticated_get_settings_returns_401(): void
    {
        $this->getJson('/api/curriculum-plans/settings')
            ->assertStatus(401);
    }

    /** @test */
    public function school_admin_gets_own_region_settings(): void
    {
        $this->region->update([
            'is_curriculum_locked' => true,
            'curriculum_deadline' => '2026-05-01',
            'can_sektor_edit' => false,
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans/settings');

        $response->assertOk()
            ->assertJsonStructure(['status', 'deadline', 'is_locked', 'can_sektor_edit', 'can_operator_edit']);

        $this->assertTrue($response->json('is_locked'));
        $this->assertFalse($response->json('can_sektor_edit'));
        $this->assertNotNull($response->json('deadline'));
    }

    /** @test */
    public function superadmin_without_institution_gets_default_settings(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans/settings');

        $response->assertOk();
        $this->assertNull($response->json('deadline'));
        $this->assertFalse($response->json('is_locked'));
        $this->assertTrue($response->json('can_sektor_edit'));
        $this->assertTrue($response->json('can_operator_edit'));
    }

    /** @test */
    public function institution_without_region_returns_default_settings(): void
    {
        // Region-a bağlı olmayan müəssisə — service exception atmır, default qaytarır
        $orphanInstitution = Institution::factory()->school()->create(['parent_id' => null]);
        $orphanAdmin = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $orphanInstitution->id,
        ]);

        $response = $this->actingAs($orphanAdmin, 'sanctum')
            ->getJson('/api/curriculum-plans/settings');

        $response->assertOk();
        $this->assertNull($response->json('deadline'));
        $this->assertFalse($response->json('is_locked'));
        $this->assertTrue($response->json('can_sektor_edit'));
        $this->assertTrue($response->json('can_operator_edit'));
    }

    // =========================================================================
    // POST /settings
    // =========================================================================

    /** @test */
    public function regionadmin_can_update_settings(): void
    {
        $response = $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload([
                'is_locked' => true,
                'deadline' => '2026-06-01',
                'can_sektor_edit' => false,
            ]));

        $response->assertOk()->assertJsonFragment(['status' => 'success']);

        $this->assertDatabaseHas('regions', [
            'institution_id' => $this->regionInstitution->id,
            'is_curriculum_locked' => true,
            'can_sektor_edit' => false,
        ]);
    }

    /** @test */
    public function superadmin_can_update_settings_with_institution_id(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload([
                'institution_id' => $this->regionInstitution->id,
                'is_locked' => true,
            ]))
            ->assertOk();

        $this->assertDatabaseHas('regions', [
            'institution_id' => $this->regionInstitution->id,
            'is_curriculum_locked' => true,
        ]);
    }

    /** @test */
    public function schooladmin_cannot_update_settings(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload())
            ->assertStatus(403);
    }

    /** @test */
    public function sektoradmin_cannot_update_settings(): void
    {
        $this->actingAs($this->sektorAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload())
            ->assertStatus(403);
    }

    /** @test */
    public function missing_is_locked_returns_422(): void
    {
        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', [
                'deadline' => null,
                'can_sektor_edit' => true,
                'can_operator_edit' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['is_locked']);
    }

    /** @test */
    public function invalid_deadline_format_returns_422(): void
    {
        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload([
                'deadline' => 'not-a-date',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['deadline']);
    }

    /** @test */
    public function null_deadline_is_accepted(): void
    {
        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload([
                'deadline' => null,
            ]))
            ->assertOk();
    }

    /** @test */
    public function can_lock_and_unlock_curriculum(): void
    {
        // Kilid
        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload(['is_locked' => true]))
            ->assertOk();

        $this->assertDatabaseHas('regions', [
            'institution_id' => $this->regionInstitution->id,
            'is_curriculum_locked' => true,
        ]);

        // Kilidini aç
        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload(['is_locked' => false]))
            ->assertOk();

        $this->assertDatabaseHas('regions', [
            'institution_id' => $this->regionInstitution->id,
            'is_curriculum_locked' => false,
        ]);
    }

    /** @test */
    public function region_not_found_for_institution_returns_422(): void
    {
        // RegionAdmin-in institution-u Region cədvəlindən silinib
        $this->region->delete();

        $this->actingAs($this->regionAdmin, 'sanctum')
            ->postJson('/api/curriculum-plans/settings', $this->defaultUpdatePayload())
            ->assertStatus(422);
    }
}
