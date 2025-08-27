<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InstitutionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create necessary roles and permissions
        $this->createRolesAndPermissions();
    }
    
    protected function createRolesAndPermissions()
    {
        // Create all permissions that might be needed
        $permissions = [
            // Institution permissions
            'institutions.read',
            'institutions.write',
            'institutions.view',
            'institutions.create',
            'institutions.update',
            'institutions.delete',
            // User permissions
            'users.read',
            'users.write',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
        ];
        
        // Create permissions if they don't exist
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        
        // Create roles if they don't exist
        $adminRole = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $regionAdminRole = Role::firstOrCreate(['name' => 'regionadmin', 'guard_name' => 'web']);
        $schoolAdminRole = Role::firstOrCreate(['name' => 'schooladmin', 'guard_name' => 'web']);
        
        // Assign permissions to region admin
        $regionAdminRole->syncPermissions([
            'institutions.read', 'institutions.write',
            'users.read', 'users.write'
        ]);
        
        // Assign permissions to school admin
        $schoolAdminRole->syncPermissions([
            'institutions.read', 'users.read'
        ]);
        
        // Super admin gets all permissions
        $adminRole->syncPermissions(Permission::all());
    }

    public function test_admin_can_create_institution()
    {
        // Create a parent institution first
        $parentInstitution = \App\Models\Institution::factory()->create([
            'type' => 'sektor',
            'level' => 3,
            'is_active' => true
        ]);

        // Create a super admin user with all permissions
        $admin = User::factory()->create();
        $admin->assignRole('superadmin');
        
        // Grant all permissions to the super admin
        $admin->givePermissionTo([
            'institutions.read',
            'institutions.write'
        ]);
        
        Sanctum::actingAs($admin, ['web']);

        $institutionData = [
            'name' => 'Test Institution',
            'institution_code' => 'TEST001',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $parentInstitution->id,
            'contact_info' => [
                'phone' => '1234567890',
                'email' => 'institution@test.com',
                'address' => 'Test Address'
            ],
            'is_active' => true,
            'region_code' => 'TEST',
            'short_name' => 'Test Inst',
            'established_date' => '2020-01-01'
        ];

        // Test that the user has the required permission
        $this->assertTrue($admin->hasPermissionTo('institutions.create'));
        
        // Test that the user has the superadmin role
        $this->assertTrue($admin->hasRole('superadmin'));
        
        // Make the request
        $response = $this->postJson('/api/institutions', $institutionData);

        // Debugging output if the test fails
        if ($response->status() !== 201) {
            dump('Response status: ' . $response->status());
            dump('Response content: ' . $response->content());
            dump('User permissions: ' . json_encode($admin->getAllPermissions()->pluck('name')));
        }

        // Check the response status
        $response->assertStatus(201);

        // Check the database
        $this->assertDatabaseHas('institutions', [
            'name' => 'Test Institution',
            'institution_code' => 'TEST001',
            'type' => 'school',
            'is_active' => 1
        ]);
    }

    public function test_user_can_view_own_institution()
    {
        // Create an institution
        $institution = Institution::factory()->create();
        
        // Create a user and assign to the institution
        $user = User::factory()->create(['institution_id' => $institution->id]);
        
        // Assign schooladmin role and grant necessary permissions
        $user->assignRole('schooladmin');
        $user->givePermissionTo('institutions.view');
        
        // Authenticate the user
        Sanctum::actingAs($user, ['web']);
        
        // Verify the user doesn't have institution creation permissions
        $this->assertFalse($user->hasPermissionTo('institutions.create'));
        
        // Make the request
        $response = $this->getJson("/api/institutions/{$institution->id}");
        
        // Debugging output if the test fails
        if ($response->status() !== 200) {
            dump('Response status: ' . $response->status());
            dump('Response content: ' . $response->content());
            dump('User permissions: ' . json_encode($user->getAllPermissions()->pluck('name')));
        }
        
        // Check the response
        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $institution->id,
                'name' => $institution->name
            ]);
    }

    public function test_admin_can_update_institution()
    {
        // Create an institution
        $institution = Institution::factory()->create();
        
        // Create an admin user with update permissions
        $admin = User::factory()->create();
        $admin->assignRole('superadmin');
        
        // Grant all necessary permissions
        $admin->givePermissionTo([
            'institutions.read',
            'institutions.write'
        ]);
        
        // Authenticate the admin
        Sanctum::actingAs($admin, ['web']);
        
        // Test that the user has the required permissions
        $this->assertTrue($admin->hasPermissionTo('institutions.write'));
        
        // Prepare update data
        $updateData = ['name' => 'Updated Institution Name'];
        
        // Make the update request
        $response = $this->putJson("/api/institutions/{$institution->id}", $updateData);
        
        // Debugging output if the test fails
        if ($response->status() !== 200) {
            dump('Response status: ' . $response->status());
            dump('Response content: ' . $response->content());
            dump('User permissions: ' . json_encode($admin->getAllPermissions()->pluck('name')));
        }
        
        // Check the response
        $response->assertStatus(200)
            ->assertJsonFragment([
                'name' => 'Updated Institution Name'
            ]);
            
        // Check the database
        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'name' => 'Updated Institution Name'
        ]);
    }

    public function test_regular_user_cannot_create_institution()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/institutions', [
            'name' => 'Unauthorized Institution'
        ]);

        $response->assertStatus(403);
    }
}
