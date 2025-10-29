<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitutionCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RoleSeeder::class,
            \Database\Seeders\PermissionSeeder::class,
        ]);

        $this->superadmin = User::factory()->create(['is_active' => true]);
        $this->superadmin->assignRole('superadmin');
        $this->superadmin->givePermissionTo(
            Permission::where('guard_name', 'sanctum')->pluck('name')->all()
        );

        Sanctum::actingAs($this->superadmin);
    }

    public function test_superadmin_can_create_institution(): void
    {
        $payload = [
            'name' => 'Test Nazirlik',
            'short_name' => 'TN',
            'type' => 'ministry',
            'level' => 1,
            'region_code' => 'AZ-01',
            'institution_code' => 'MIN-' . Str::upper(Str::random(5)),
            'is_active' => true,
        ];

        $response = $this->postJson('/api/institutions', $payload);

        $response->assertCreated()
            ->assertJsonFragment([
                'name' => 'Test Nazirlik',
                'type' => 'ministry',
                'level' => 1,
            ]);

        $this->assertDatabaseHas('institutions', [
            'name' => 'Test Nazirlik',
            'institution_code' => $payload['institution_code'],
        ]);
    }

    public function test_required_fields_are_validated_when_creating_institution(): void
    {
        $response = $this->postJson('/api/institutions', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'name',
                'type',
                'level',
                'institution_code',
                'region_code',
            ]);
    }

    public function test_can_list_and_filter_institutions(): void
    {
        $ministry = Institution::factory()->create([
            'name' => 'Təhsil Nazirliyi',
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null,
            'institution_code' => 'MIN' . Str::upper(Str::random(4)),
            'region_code' => 'AZ-00',
        ]);

        $region = Institution::factory()->create([
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'institution_code' => 'REG' . Str::upper(Str::random(4)),
            'region_code' => 'AZ-BA',
        ]);

        Institution::factory()->count(2)->create([
            'type' => 'school',
            'level' => 4,
            'parent_id' => $region->id,
        ]);

        $listResponse = $this->getJson('/api/institutions');
        $listResponse->assertOk();
        $this->assertGreaterThanOrEqual(3, $listResponse->json('data') ? count($listResponse->json('data')) : 0);

        $levelResponse = $this->getJson('/api/institutions?level=2');
        $levelResponse->assertOk();
        $this->assertSame(1, count($levelResponse->json('data')));
        $this->assertEquals('region', $levelResponse->json('data')[0]['type']);

        $typeResponse = $this->getJson('/api/institutions?type=school');
        $typeResponse->assertOk();
        $this->assertSame(2, count($typeResponse->json('data')));

        $searchResponse = $this->getJson('/api/institutions?search=' . urlencode('Bakı'));
        $searchResponse->assertOk();
        $this->assertGreaterThanOrEqual(1, count($searchResponse->json('data')));
        $this->assertStringContainsString('Bakı', $searchResponse->json('data')[0]['name']);
    }

    public function test_can_view_single_institution(): void
    {
        $institution = Institution::factory()->create([
            'name' => 'Tək Məktəb',
            'type' => 'school',
            'level' => 4,
        ]);

        $this->getJson("/api/institutions/{$institution->id}")
            ->assertOk()
            ->assertJsonFragment([
                'id' => $institution->id,
                'name' => 'Tək Məktəb',
                'type' => 'school',
                'level' => 4,
            ]);
    }

    public function test_can_update_institution(): void
    {
        $parent = Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
        ]);

        $institution = Institution::factory()->create([
            'name' => 'Köhnə Ad',
            'type' => 'school',
            'level' => 4,
            'is_active' => true,
            'parent_id' => $parent->id,
        ]);

        $payload = [
            'name' => 'Yeni Ad',
            'is_active' => false,
            'region_code' => 'AZ-99',
            'parent_id' => $parent->id,
        ];

        $this->putJson("/api/institutions/{$institution->id}", $payload)
            ->assertOk()
            ->assertJsonFragment([
                'id' => $institution->id,
                'name' => 'Yeni Ad',
                'is_active' => false,
            ]);

        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'name' => 'Yeni Ad',
            'is_active' => false,
            'region_code' => 'AZ-99',
        ]);
    }

    public function test_soft_delete_requires_confirmation_payload(): void
    {
        $institution = Institution::factory()->create();

        $this->deleteJson("/api/institutions/{$institution->id}", [
            'type' => 'soft',
        ])->assertStatus(422)->assertJsonFragment([
            'message' => 'Doğrulama xətası',
        ]);
    }

    public function test_can_soft_delete_institution_when_confirmed(): void
    {
        $institution = Institution::factory()->create([
            'is_active' => true,
        ]);

        $response = $this->deleteJson("/api/institutions/{$institution->id}", [
            'type' => 'soft',
            'confirmation' => true,
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'success' => true,
                'delete_type' => 'soft',
            ]);

        $this->assertSoftDeleted('institutions', ['id' => $institution->id]);
    }
}
