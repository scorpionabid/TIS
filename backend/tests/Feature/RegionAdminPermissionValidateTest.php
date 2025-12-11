<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegionAdminPermissionValidateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Basic smoke test for the dry-run permission validation service.
     * Tests that the service is callable and returns expected data structure.
     */
    public function test_validate_permissions_service_returns_expected_structure()
    {
        $this->createRoles();
        
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        
        $service = app(\App\Services\RegionAdmin\RegionAdminPermissionService::class);
        
        $result = $service->dryRunValidate(null, [], 'sektoradmin', $admin);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('added', $result);
        $this->assertArrayHasKey('removed', $result);
        $this->assertArrayHasKey('missing_dependencies', $result);
        $this->assertArrayHasKey('missing_required', $result);
        $this->assertArrayHasKey('not_allowed', $result);
        $this->assertArrayHasKey('admin_missing_permissions', $result);
    }

    protected function createRoles(): void
    {
        Role::firstOrCreate(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'sektoradmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
    }
}
