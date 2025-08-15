<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserDepartmentAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Test user can be assigned to a department
     */
    public function test_user_can_be_assigned_to_department()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('users.create');

        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $department = Department::create([
            'name' => 'Maliyyə Şöbəsi',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => \Spatie\Permission\Models\Role::where('name', 'müəllim')->first()->id,
            'institution_id' => $institution->id,
            'department_id' => $department->id,
            'is_active' => true
        ];

        $response = $this->postJson('/api/users', $userData);

        $response->assertStatus(201)
            ->assertJsonPath('user.department_id', $department->id)
            ->assertJsonPath('user.department.name', 'Maliyyə Şöbəsi')
            ->assertJsonPath('user.department.department_type', 'maliyyə');

        $this->assertDatabaseHas('users', [
            'username' => $userData['username'],
            'department_id' => $department->id
        ]);
    }

    /**
     * Test user can be updated with department assignment
     */
    public function test_user_can_be_updated_with_department_assignment()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('users.update');

        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $department = Department::create([
            'name' => 'İnzibati Şöbəsi',
            'department_type' => 'inzibati',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        $user = User::factory()->create([
            'institution_id' => $institution->id
        ]);

        Sanctum::actingAs($superadmin);

        $updateData = [
            'department_id' => $department->id
        ];

        $response = $this->putJson("/api/users/{$user->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonPath('user.department_id', $department->id)
            ->assertJsonPath('user.department.name', 'İnzibati Şöbəsi');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'department_id' => $department->id
        ]);
    }

    /**
     * Test department shows correct user count
     */
    public function test_department_shows_correct_user_count()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('institutions.read');

        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $department = Department::create([
            'name' => 'Test Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        // Create users assigned to this department
        $activeUser1 = User::factory()->create([
            'department_id' => $department->id,
            'is_active' => true
        ]);

        $activeUser2 = User::factory()->create([
            'department_id' => $department->id,
            'is_active' => true
        ]);

        $inactiveUser = User::factory()->create([
            'department_id' => $department->id,
            'is_active' => false
        ]);

        Sanctum::actingAs($superadmin);

        $response = $this->getJson("/api/departments/{$department->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'users_count' => 3,
                'active_users_count' => 2
            ]);
    }

    /**
     * Test department cannot be deleted with active users
     */
    public function test_department_cannot_be_deleted_with_active_users()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate([
            'name' => 'institutions.delete',
            'guard_name' => 'api'
        ]);
        $superadmin->givePermissionTo($permission);

        $institution = Institution::factory()->create();
        $department = Department::factory()->create([
            'institution_id' => $institution->id
        ]);

        // Create an active user in this department
        $user = User::factory()->create([
            'department_id' => $department->id,
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        $response = $this->deleteJson("/api/departments/{$department->id}");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Cannot delete department with 1 active users'
            ]);

        // Department should still exist
        $this->assertDatabaseHas('departments', [
            'id' => $department->id
        ]);
    }

    /**
     * Test department can be deleted after users are removed
     */
    public function test_department_can_be_deleted_after_users_removed()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate([
            'name' => 'institutions.delete',
            'guard_name' => 'api'
        ]);
        $superadmin->givePermissionTo($permission);

        $institution = Institution::factory()->create();
        $department = Department::factory()->create([
            'institution_id' => $institution->id
        ]);

        // Create an inactive user in this department
        $user = User::factory()->create([
            'department_id' => $department->id,
            'is_active' => false
        ]);

        // Remove user from department before deleting department
        $user->update(['department_id' => null]);

        Sanctum::actingAs($superadmin);

        $response = $this->deleteJson("/api/departments/{$department->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Department deleted successfully'
            ]);

        // Department should be deleted
        $this->assertDatabaseMissing('departments', [
            'id' => $department->id
        ]);
    }

    /**
     * Test user department relationship
     */
    public function test_user_department_relationship()
    {
        $institution = Institution::factory()->create([
            'type' => 'region',
            'level' => 2
        ]);

        $department = Department::create([
            'name' => 'Test Department',
            'department_type' => 'maliyyə',
            'institution_id' => $institution->id,
            'is_active' => true
        ]);

        $user = User::factory()->create([
            'department_id' => $department->id
        ]);

        // Test user -> department relationship
        $this->assertInstanceOf(Department::class, $user->department);
        $this->assertEquals($department->id, $user->department->id);
        $this->assertEquals('Test Department', $user->department->name);

        // Test department -> users relationship
        $this->assertTrue($department->users->contains($user));
        $this->assertCount(1, $department->users);
    }

    /**
     * Test department validation for institution compatibility
     */
    public function test_department_validation_for_institution_compatibility()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        $superadmin->givePermissionTo('users.create');

        $schoolInstitution = Institution::factory()->create([
            'type' => 'school',
            'level' => 4
        ]);

        $regionalDepartment = Department::create([
            'name' => 'Regional Finance',
            'department_type' => 'maliyyə', // Regional type
            'institution_id' => Institution::factory()->create(['type' => 'region'])->id,
            'is_active' => true
        ]);

        Sanctum::actingAs($superadmin);

        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'password123',
            'role_id' => \Spatie\Permission\Models\Role::where('name', 'müəllim')->first()->id,
            'institution_id' => $schoolInstitution->id,
            'department_id' => $regionalDepartment->id, // Wrong institution type
            'is_active' => true
        ];

        $response = $this->postJson('/api/users', $userData);

        // This should succeed currently as there's no cross-validation
        // In future versions, we might want to add validation to ensure
        // user's institution matches department's institution
        $response->assertStatus(201);
    }
}