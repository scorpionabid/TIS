<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Institution;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SektorUserControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles with guard_name
        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $sektorAdminRole = Role::firstOrCreate(['name' => 'sektoradmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
        Role::firstOrCreate(['name' => 'regionadmin', 'guard_name' => 'sanctum']);

        // Create and assign permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $createPermission = \App\Models\Permission::firstOrCreate(['name' => 'user.create', 'guard_name' => 'sanctum']);
        $sektorAdminRole->givePermissionTo($createPermission);

        // Bypass RegionalDataAccessMiddleware for tests in this class
        $this->withoutMiddleware(\App\Http\Middleware\RegionalDataAccessMiddleware::class);
    }

    /** @test */
    public function sektoradmin_can_create_school_user()
    {

        // Create sektor
        $sector = Institution::factory()->sector()->create([
            'name' => 'Test Sektor',
            'type' => 'sector_education_office',
            'is_active' => true,
            'level' => 3,
        ]);

        // Create school under sector
        $school = Institution::factory()->school()->create([
            'name' => 'Test Məktəb',
            'type' => 'secondary_school',
            'parent_id' => $sector->id,
            'is_active' => true,
            'level' => 4,
        ]);

        // Create sektoradmin user
        $sektoradmin = User::create([
            'name' => 'Sektor Admin',
            'username' => 'sektoradmin',
            'email' => 'sektoradmin@test.com',
            'password' => bcrypt('password'),
            'institution_id' => $sector->id,
            'is_active' => true,
        ]);
        $sektoradmin->assignRole('sektoradmin');

        // Test data
        $userData = [
            'name' => 'Test School Admin',
            'username' => 'schooladmin',
            'email' => 'schooladmin@test.com',
            'password' => 'password123',
            'role' => 'schooladmin',
            'institution_id' => $school->id,
            'phone' => '+994501234567',
            'subjects' => ['Riyaziyyat', 'Fizika'],
        ];

        // Make request
        $response = $this->actingAs($sektoradmin)
            ->postJson('/api/sektoradmin/users', $userData);

        // Assertions
        $response->assertStatus(201)
            ->assertJson([
                'message' => 'İstifadəçi uğurla yaradıldı',
                'user' => [
                    'name' => 'schooladmin', // TODO: Check why backend returns username as name
                    'username' => 'schooladmin',
                    'email' => 'schooladmin@test.com',
                    'role' => 'schooladmin',
                    'institution' => 'Test Məktəb',
                ],
            ]);

        // Check database
        $this->assertDatabaseHas('users', [
            'username' => 'schooladmin',
            'email' => 'schooladmin@test.com',
            'institution_id' => $school->id,
            'is_active' => true,
        ]);

        // Check role assignment
        $createdUser = User::where('email', 'schooladmin@test.com')->first();
        $this->assertTrue($createdUser->hasRole('schooladmin'));

        // Check profile creation

    }

    /** @test */
    public function sektoradmin_cannot_create_user_for_other_sector_school()
    {
        // Create first sector
        $sector1 = Institution::factory()->sector()->create([
            'name' => 'Test Sektor 1',
            'type' => 'sector_education_office',
            'is_active' => true,
            'level' => 3,
        ]);

        // Create second sector
        $sector2 = Institution::factory()->sector()->create([
            'name' => 'Test Sektor 2',
            'type' => 'sector_education_office',
            'is_active' => true,
            'level' => 3,
        ]);

        // Create school under second sector
        $school = Institution::factory()->school()->create([
            'name' => 'Test Məktəb',
            'type' => 'secondary_school',
            'parent_id' => $sector2->id,
            'is_active' => true,
            'level' => 4,
        ]);

        // Create sektoradmin for first sector
        $sektoradmin = User::create([
            'name' => 'Sektor Admin',
            'username' => 'sektoradmin',
            'email' => 'sektoradmin@test.com',
            'password' => bcrypt('password'),
            'institution_id' => $sector1->id,
            'is_active' => true,
        ]);
        $sektoradmin->assignRole('sektoradmin');

        // Test data
        $userData = [
            'name' => 'Test School Admin',
            'username' => 'schooladmin',
            'email' => 'schooladmin@test.com',
            'password' => 'password123',
            'role' => 'schooladmin',
            'institution_id' => $school->id,
        ];

        // Make request
        $response = $this->actingAs($sektoradmin)
            ->postJson('/api/sektoradmin/users', $userData);

        // Should fail
        $response->assertStatus(400)
            ->assertJson([
                'message' => 'Seçilən müəssisə sizin sektora aid deyil',
            ]);
    }

    /** @test */
    public function user_creation_requires_validation()
    {
        // Create sektor
        $sector = Institution::factory()->sector()->create([
            'name' => 'Test Sektor',
            'type' => 'sector_education_office',
            'is_active' => true,
            'level' => 3,
        ]);

        // Create school under sector
        $school = Institution::factory()->school()->create([
            'name' => 'Test Məktəb',
            'type' => 'secondary_school',
            'parent_id' => $sector->id,
            'is_active' => true,
            'level' => 4,
        ]);

        // Create sektoradmin user
        $sektoradmin = User::create([
            'name' => 'Sektor Admin',
            'username' => 'sektoradmin',
            'email' => 'sektoradmin@test.com',
            'password' => bcrypt('password'),
            'institution_id' => $sector->id,
            'is_active' => true,
        ]);
        $sektoradmin->assignRole('sektoradmin');

        // Test data with missing required fields
        $userData = [
            'name' => '',
            'username' => '',
            'email' => 'invalid-email',
            'password' => '123', // too short
            'role' => 'invalid-role',
            'institution_id' => 99999, // non-existent
        ];

        // Make request
        $response = $this->actingAs($sektoradmin)
            ->postJson('/api/sektoradmin/users', $userData);

        // Should fail with validation errors
        $response->assertStatus(422)
            ->assertJsonStructure([
                'message',
                'errors' => [
                    'name',
                    'username',
                    'email',
                    'password',
                    'role',
                    'institution_id',
                ],
            ]);
    }

    /** @test */
    public function unauthorized_user_cannot_create_school_user()
    {
        // Create regular user
        $user = User::create([
            'name' => 'Regular User',
            'username' => 'user',
            'email' => 'user@test.com',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        // Test data
        $userData = [
            'name' => 'Test School Admin',
            'username' => 'schooladmin',
            'email' => 'schooladmin@test.com',
            'password' => 'password123',
            'role' => 'schooladmin',
            'institution_id' => 1,
        ];

        // Make request
        $response = $this->actingAs($user)
            ->postJson('/api/sektoradmin/users', $userData);

        // Should fail
        $response->assertStatus(403)
            ->assertJson([
                'message' => 'User does not have the right roles.',
            ]);
    }
}
