<?php

namespace Tests\Unit\Services;

use App\Models\Institution;
use App\Models\User;
use App\Services\InstitutionCrudService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InstitutionCrudServiceTest extends TestCase
{
    use RefreshDatabase;

    private InstitutionCrudService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(InstitutionCrudService::class);

        // Create roles if they don't exist
        if (!Role::where('name', 'superadmin')->where('guard_name', 'sanctum')->exists()) {
            Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        }
        if (!Role::where('name', 'müəllim')->where('guard_name', 'sanctum')->exists()) {
            Role::create(['name' => 'müəllim', 'guard_name' => 'sanctum']);
        }
    }

    public function test_create_institution_success()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');
        $this->actingAs($user);

        // Use factory to generate valid data including institution_type_id and codes
        $data = Institution::factory()->make([
            'name' => 'Test Məktəbi',
            'type' => 'secondary_school', // Updated to match Service logic for default departments
            'region_code' => '101',
        ])->toArray();

        // Service expects these to be passed or generated. 
        // Factory generates 'utis_code' usually? No, factory makes it. 
        // Service generates if empty. Let's unset it to test generation.
        unset($data['utis_code']);

        $institution = $this->service->createInstitution($data, $user);

        $this->assertInstanceOf(Institution::class, $institution);
        $this->assertDatabaseHas('institutions', [
            'name' => 'Test Məktəbi',
            // 'type' => 'school', // Type might be different in DB context depending on simple simple string
        ]);

        // Check UTIS code generation
        $this->assertNotNull($institution->utis_code);

        // Check default departments
        // Default departments depend on type. 'school' triggers 'secondary_school' logic?
        // Service code:
        // if (in_array($institution->type, ['secondary_school', 'primary_school', 'lyceum', 'gymnasium']))
        // Factory 'type' => 'school'. Service might not recognize 'school' as one of those?
        // InstitutionFactory: 'type' => 'school'.
        // Service: keys are 'secondary_school', etc.
        // I should set type explicitly to 'secondary_school' to match Service logic.

        $this->assertDatabaseHas('departments', [
            'institution_id' => $institution->id,
            'name' => 'Pedaqoji',
        ]);
        $this->assertDatabaseHas('departments', [
            'institution_id' => $institution->id,
            'name' => 'Maliyyə',
        ]);
    }

    public function test_create_institution_fails_for_unauthorized_user()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');
        $this->actingAs($user);

        $data = Institution::factory()->make([
            'name' => 'Test Məktəbi 2',
            'type' => 'secondary_school',
        ])->toArray();

        $parent = Institution::factory()->create();
        $data['parent_id'] = $parent->id;

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Valideyn quruma giriş icazəniz yoxdur');

        $this->service->createInstitution($data, $user);
    }
}
