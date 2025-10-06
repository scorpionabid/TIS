<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Institution;
use App\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SektorAdminDataIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        $institutionsRead = Permission::create(['name' => 'institutions.read', 'guard_name' => 'web']);
        $institutionsWrite = Permission::create(['name' => 'institutions.write', 'guard_name' => 'web']);
        $usersRead = Permission::create(['name' => 'users.read', 'guard_name' => 'web']);
        $usersWrite = Permission::create(['name' => 'users.write', 'guard_name' => 'web']);

        // Create roles with guard_name
        $superadmin = Role::create(['name' => 'superadmin', 'guard_name' => 'web', 'display_name' => 'SuperAdmin', 'level' => 1]);
        $regionadmin = Role::create(['name' => 'regionadmin', 'guard_name' => 'web', 'display_name' => 'RegionAdmin', 'level' => 2]);
        $sektoradmin = Role::create(['name' => 'sektoradmin', 'guard_name' => 'web', 'display_name' => 'SektorAdmin', 'level' => 3]);
        $schooladmin = Role::create(['name' => 'schooladmin', 'guard_name' => 'web', 'display_name' => 'SchoolAdmin', 'level' => 4]);

        // Assign permissions to roles
        $sektoradmin->givePermissionTo($institutionsRead);
        $sektoradmin->givePermissionTo($usersRead);
        $sektoradmin->givePermissionTo($usersWrite);
        $schooladmin->givePermissionTo($institutionsRead);
        $schooladmin->givePermissionTo($usersRead);
    }

    /** @test */
    public function sektoradmin_can_only_see_sector_institutions()
    {
        // Create institution hierarchy
        $region = Institution::create([
            'name' => 'Test Region',
            'level' => 2,
            'type' => 'regional_education_department',
            'is_active' => true
        ]);

        $sector1 = Institution::create([
            'name' => 'Test Sector 1',
            'parent_id' => $region->id,
            'level' => 3,
            'type' => 'sector_education_office',
            'is_active' => true
        ]);

        $sector2 = Institution::create([
            'name' => 'Test Sector 2',
            'parent_id' => $region->id,
            'level' => 3,
            'type' => 'sector_education_office',
            'is_active' => true
        ]);

        $school1 = Institution::create([
            'name' => 'School 1 - Sector 1',
            'parent_id' => $sector1->id,
            'level' => 4,
            'type' => 'secondary_school',
            'is_active' => true
        ]);

        $school2 = Institution::create([
            'name' => 'School 2 - Sector 1',
            'parent_id' => $sector1->id,
            'level' => 4,
            'type' => 'secondary_school',
            'is_active' => true
        ]);

        $school3 = Institution::create([
            'name' => 'School 1 - Sector 2',
            'parent_id' => $sector2->id,
            'level' => 4,
            'type' => 'secondary_school',
            'is_active' => true
        ]);

        // Create SektorAdmin user for sector1
        $sektorAdmin = User::create([
            'username' => 'sektoradmin1',
            'email' => 'sektoradmin1@test.az',
            'password' => bcrypt('password'),
            'institution_id' => $sector1->id,
            'is_active' => true
        ]);
        $sektorAdmin->assignRole('sektoradmin');

        // Act: Get institutions as SektorAdmin
        $response = $this->actingAs($sektorAdmin, 'sanctum')
            ->getJson('/api/institutions');

        // Assert
        $response->assertStatus(200);

        $institutionIds = collect($response->json('data'))->pluck('id')->toArray();

        // SektorAdmin should see their sector and schools under it
        $this->assertContains($sector1->id, $institutionIds, 'Should see own sector');
        $this->assertContains($school1->id, $institutionIds, 'Should see school 1');
        $this->assertContains($school2->id, $institutionIds, 'Should see school 2');

        // Should NOT see other sector or its schools
        $this->assertNotContains($sector2->id, $institutionIds, 'Should NOT see other sector');
        $this->assertNotContains($school3->id, $institutionIds, 'Should NOT see other sector schools');
        $this->assertNotContains($region->id, $institutionIds, 'Should NOT see parent region');
    }

    /** @test */
    public function sektoradmin_can_only_see_sector_users()
    {
        // Create institution hierarchy
        $region = Institution::create([
            'name' => 'Test Region',
            'level' => 2,
            'type' => 'regional_education_department',
            'is_active' => true
        ]);

        $sector1 = Institution::create([
            'name' => 'Test Sector 1',
            'parent_id' => $region->id,
            'level' => 3,
            'type' => 'sector_education_office',
            'is_active' => true
        ]);

        $sector2 = Institution::create([
            'name' => 'Test Sector 2',
            'parent_id' => $region->id,
            'level' => 3,
            'type' => 'sector_education_office',
            'is_active' => true
        ]);

        $school1 = Institution::create([
            'name' => 'School 1 - Sector 1',
            'parent_id' => $sector1->id,
            'level' => 4,
            'type' => 'secondary_school',
            'is_active' => true
        ]);

        $school2 = Institution::create([
            'name' => 'School 1 - Sector 2',
            'parent_id' => $sector2->id,
            'level' => 4,
            'type' => 'secondary_school',
            'is_active' => true
        ]);

        // Create users
        $sektorAdmin = User::create([
            'username' => 'sektoradmin1',
            'email' => 'sektoradmin1@test.az',
            'password' => bcrypt('password'),
            'institution_id' => $sector1->id,
            'is_active' => true
        ]);
        $sektorAdmin->assignRole('sektoradmin');

        $schoolAdmin1 = User::create([
            'username' => 'schooladmin1',
            'email' => 'schooladmin1@test.az',
            'password' => bcrypt('password'),
            'institution_id' => $school1->id,
            'is_active' => true
        ]);
        $schoolAdmin1->assignRole('schooladmin');

        $schoolAdmin2 = User::create([
            'username' => 'schooladmin2',
            'email' => 'schooladmin2@test.az',
            'password' => bcrypt('password'),
            'institution_id' => $school2->id,
            'is_active' => true
        ]);
        $schoolAdmin2->assignRole('schooladmin');

        // Act: Get users as SektorAdmin
        $response = $this->actingAs($sektorAdmin, 'sanctum')
            ->getJson('/api/users');

        // Assert
        $response->assertStatus(200);

        $userIds = collect($response->json('data'))->pluck('id')->toArray();

        // Should see users from own sector and schools
        $this->assertContains($sektorAdmin->id, $userIds, 'Should see self');
        $this->assertContains($schoolAdmin1->id, $userIds, 'Should see school admin 1');

        // Should NOT see users from other sectors
        $this->assertNotContains($schoolAdmin2->id, $userIds, 'Should NOT see other sector school admin');
    }

    /** @test */
    public function sektoradmin_institution_must_be_level_3()
    {
        // Create a school (level 4) instead of sector
        $school = Institution::create([
            'name' => 'Test School',
            'level' => 4,
            'type' => 'secondary_school',
            'is_active' => true
        ]);

        // Create SektorAdmin user assigned to wrong level institution
        $sektorAdmin = User::create([
            'username' => 'wrongsektoradmin',
            'email' => 'wrongsektoradmin@test.az',
            'password' => bcrypt('password'),
            'institution_id' => $school->id,  // Wrong level!
            'is_active' => true
        ]);
        $sektorAdmin->assignRole('sektoradmin');

        // Act: Try to get institutions
        $response = $this->actingAs($sektorAdmin, 'sanctum')
            ->getJson('/api/institutions');

        // Assert: Should get empty result due to level mismatch
        $response->assertStatus(200);
        $this->assertEmpty($response->json('data'), 'SektorAdmin with wrong level institution should see nothing');
    }

    /** @test */
    public function sektoradmin_without_institution_sees_nothing()
    {
        // Create SektorAdmin without institution
        $sektorAdmin = User::create([
            'username' => 'noinstitution',
            'email' => 'noinstitution@test.az',
            'password' => bcrypt('password'),
            'institution_id' => null,  // No institution!
            'is_active' => true
        ]);
        $sektorAdmin->assignRole('sektoradmin');

        // Act: Try to get institutions
        $response = $this->actingAs($sektorAdmin, 'sanctum')
            ->getJson('/api/institutions');

        // Assert: Should get empty result
        $response->assertStatus(200);
        $this->assertEmpty($response->json('data'), 'SektorAdmin without institution should see nothing');
    }
}
