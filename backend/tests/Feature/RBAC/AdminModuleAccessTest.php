<?php

namespace Tests\Feature\RBAC;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminModuleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup roles for Sanctum guard
        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'müəllim', 'guard_name' => 'sanctum']);
    }

    /**
     * Test SuperAdmin can access user management.
     */
    public function test_superadmin_can_access_user_management()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/users');

        $response->assertStatus(200);
    }

    /**
     * Test Teacher cannot access user management.
     */
    public function test_teacher_cannot_access_user_management()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/users');

        $response->assertStatus(403);
    }

    /**
     * Test Teacher cannot access institution management.
     */
    public function test_teacher_cannot_access_institution_management()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/institutions');

        $response->assertStatus(403);
    }

    /**
     * Test SuperAdmin can access system config.
     */
    public function test_superadmin_can_access_system_config()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/system/config');

        $response->assertStatus(200);
    }
}
