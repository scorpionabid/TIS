<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Institution;
use App\Models\RegionOperatorPermission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegionOperatorPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $regionAdmin;
    protected User $regionOperator;
    protected Institution $region;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionoperator', 'guard_name' => 'sanctum']);

        $this->region = Institution::factory()->create([
            'name' => 'Test Region',
            'type' => 'regional_education_department',
            'level' => 2,
            'is_active' => true,
        ]);

        $this->department = Department::factory()->active()->create([
            'institution_id' => $this->region->id,
            'department_type' => 'inzibati',
        ]);

        $this->regionAdmin = User::factory()->create([
            'institution_id' => $this->region->id,
            'department_id' => $this->department->id,
        ]);
        $this->regionAdmin->assignRole('regionadmin');

        $this->regionOperator = User::factory()->create([
            'institution_id' => $this->region->id,
            'department_id' => $this->department->id,
        ]);
        $this->regionOperator->assignRole('regionoperator');
    }

    public function test_regionadmin_can_view_regionoperator_permissions(): void
    {
        Sanctum::actingAs($this->regionAdmin);

        $response = $this->getJson("/api/regionadmin/region-operators/{$this->regionOperator->id}/permissions");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'operator' => ['id', 'username', 'full_name', 'institution', 'department'],
                'permissions' => [
                    'can_manage_surveys',
                    'can_manage_tasks',
                    'can_manage_documents',
                    'can_manage_folders',
                    'can_manage_links',
                ],
                'modules',
            ]);

        $this->assertDatabaseHas('region_operator_permissions', [
            'user_id' => $this->regionOperator->id,
            'can_manage_surveys' => false,
            'can_manage_tasks' => false,
            'can_manage_documents' => false,
            'can_manage_folders' => false,
            'can_manage_links' => false,
        ]);
    }

    public function test_regionadmin_can_update_permissions(): void
    {
        Sanctum::actingAs($this->regionAdmin);

        $payload = [
            'can_manage_surveys' => true,
            'can_manage_tasks' => true,
            'can_manage_documents' => false,
            'can_manage_folders' => true,
            'can_manage_links' => false,
        ];

        $response = $this->putJson("/api/regionadmin/region-operators/{$this->regionOperator->id}/permissions", $payload);
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Səlahiyyətlər yeniləndi',
                'permissions' => $payload,
            ]);

        $this->assertDatabaseHas('region_operator_permissions', array_merge(
            ['user_id' => $this->regionOperator->id],
            $payload
        ));
    }

    public function test_regionadmin_cannot_manage_operator_outside_region(): void
    {
        $otherRegion = Institution::factory()->create([
            'type' => 'regional_education_department',
            'level' => 2,
        ]);

        $otherOperator = User::factory()->create([
            'institution_id' => $otherRegion->id,
            'department_id' => Department::factory()->create([
                'institution_id' => $otherRegion->id,
            ])->id,
        ]);
        $otherOperator->assignRole('regionoperator');

        Sanctum::actingAs($this->regionAdmin);

        $response = $this->getJson("/api/regionadmin/region-operators/{$otherOperator->id}/permissions");
        $response->assertStatus(403);

        $response = $this->putJson("/api/regionadmin/region-operators/{$otherOperator->id}/permissions", [
            'can_manage_surveys' => true,
        ]);
        $response->assertStatus(403);
    }

    public function test_regionoperator_cannot_update_permissions(): void
    {
        Sanctum::actingAs($this->regionOperator);

        $response = $this->putJson("/api/regionadmin/region-operators/{$this->regionOperator->id}/permissions", [
            'can_manage_surveys' => true,
        ]);

        $response->assertStatus(403);
    }
}

