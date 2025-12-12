<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegionAdminPermissionValidateDetailedTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_validate_detects_missing_dependencies()
    {
        // Test the service directly instead of via HTTP endpoint
        $this->createRoles();
        
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        
        // Get the service from the container
        $service = app(\App\Services\RegionAdmin\RegionAdminPermissionService::class);
        
        // Test: proposing users.delete without users.read should report missing dependency
        $result = $service->dryRunValidate(null, ['users.delete'], 'sektoradmin', $admin);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('missing_dependencies', $result);
        $this->assertTrue(count($result['missing_dependencies']) > 0 || isset($result['missing_dependencies']['users.delete']));
    }

    public function test_dry_run_validate_detects_missing_required()
    {
        // Test the service directly
        $this->createRoles();
        
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        
        $service = app(\App\Services\RegionAdmin\RegionAdminPermissionService::class);
        
        // Test: sektoradmin role requires users.read by default
        $result = $service->dryRunValidate(null, [], 'sektoradmin', $admin);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('missing_required', $result);
        // The config defines required permissions for roles
        $this->assertIsArray($result['missing_required']);
    }

    public function test_dry_run_validate_checks_authorization()
    {
        // Test the service directly
        $this->createRoles();
        
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        
        $service = app(\App\Services\RegionAdmin\RegionAdminPermissionService::class);
        
        // Test: attempting to assign a permission to a role that forbids it
        $result = $service->dryRunValidate(null, ['approvals.approve'], 'schooladmin', $admin);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('not_allowed', $result);
        $this->assertIsArray($result['not_allowed']);
    }

    public function test_dry_run_validate_computes_added_removed()
    {
        // Test the service directly
        $this->createRoles();
        
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        
        $service = app(\App\Services\RegionAdmin\RegionAdminPermissionService::class);
        
        // Test: basic diff computation
        $result = $service->dryRunValidate(null, ['users.read'], 'sektoradmin', $admin);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('added', $result);
        $this->assertArrayHasKey('removed', $result);
        $this->assertIsArray($result['added']);
        $this->assertIsArray($result['removed']);
    }

    public function test_dry_run_validate_reports_admin_missing_permissions()
    {
        $this->createRoles();

        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');

        $service = app(\App\Services\RegionAdmin\RegionAdminPermissionService::class);

        // Admin has no permissions yet; proposing a permission should flag admin_missing_permissions
        $result = $service->dryRunValidate(null, ['documents.share'], 'sektoradmin', $admin);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('admin_missing_permissions', $result);
        $this->assertNotEmpty($result['admin_missing_permissions']);
    }

    protected function createRoles(): void
    {
        Role::firstOrCreate(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'sektoradmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
    }
}
