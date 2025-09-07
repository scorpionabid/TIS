<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Role;
use App\Models\Institution;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\Response;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserApiIntegrationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $superAdmin;
    protected User $regionAdmin;
    protected User $teacher;
    protected Institution $institution;
    protected Role $superAdminRole;
    protected Role $regionAdminRole;
    protected Role $teacherRole;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test roles
        $this->superAdminRole = Role::create(['name' => 'SuperAdmin', 'display_name' => 'Super Admin']);
        $this->regionAdminRole = Role::create(['name' => 'RegionAdmin', 'display_name' => 'Region Admin']);
        $this->teacherRole = Role::create(['name' => 'Teacher', 'display_name' => 'Teacher']);

        // Create test institution
        $this->institution = Institution::create([
            'name' => 'Test School',
            'type' => 'school',
            'code' => 'TEST001',
            'level' => 4,
            'parent_id' => null,
        ]);

        // Create test users
        $this->superAdmin = User::factory()->create([
            'username' => 'superadmin_test',
            'email' => 'superadmin@test.com',
            'role_id' => $this->superAdminRole->id,
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $this->regionAdmin = User::factory()->create([
            'username' => 'regionadmin_test',
            'email' => 'regionadmin@test.com', 
            'role_id' => $this->regionAdminRole->id,
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);

        $this->teacher = User::factory()->create([
            'username' => 'teacher_test',
            'email' => 'teacher@test.com',
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function it_can_fetch_users_list_with_authentication()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/users');

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'username', 
                            'email',
                            'role',
                            'institution_name',
                            'is_active',
                        ]
                    ],
                    'pagination' => [
                        'total',
                        'per_page',
                        'current_page',
                        'last_page'
                    ]
                ]);

        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function it_requires_authentication_for_users_endpoint()
    {
        $response = $this->getJson('/api/users');

        $response->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    /** @test */
    public function it_can_create_user_with_valid_data()
    {
        Sanctum::actingAs($this->superAdmin);

        $userData = [
            'username' => 'newuser_test',
            'email' => 'newuser@test.com',
            'password' => 'password123',
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
            'is_active' => true,
        ];

        $response = $this->postJson('/api/users', $userData);

        $response->assertStatus(Response::HTTP_CREATED)
                ->assertJsonFragment([
                    'username' => 'newuser_test',
                    'email' => 'newuser@test.com',
                ]);

        $this->assertDatabaseHas('users', [
            'username' => 'newuser_test',
            'email' => 'newuser@test.com',
        ]);
    }

    /** @test */
    public function it_validates_required_fields_when_creating_user()
    {
        Sanctum::actingAs($this->superAdmin);

        $userData = [
            'username' => '',
            'email' => 'invalid-email',
            'password' => '123', // Too short
        ];

        $response = $this->postJson('/api/users', $userData);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
                ->assertJsonValidationErrors(['username', 'email', 'password']);
    }

    /** @test */
    public function it_prevents_duplicate_username_creation()
    {
        Sanctum::actingAs($this->superAdmin);

        $userData = [
            'username' => $this->teacher->username,
            'email' => 'different@test.com',
            'password' => 'password123',
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
        ];

        $response = $this->postJson('/api/users', $userData);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
                ->assertJsonValidationErrors(['username']);
    }

    /** @test */
    public function it_can_update_user_with_valid_data()
    {
        Sanctum::actingAs($this->superAdmin);

        $updateData = [
            'first_name' => 'Updated',
            'last_name' => 'Name',
            'email' => 'updated@test.com',
        ];

        $response = $this->putJson("/api/users/{$this->teacher->id}", $updateData);

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonFragment([
                    'email' => 'updated@test.com',
                ]);

        $this->teacher->refresh();
        $this->assertEquals('updated@test.com', $this->teacher->email);
    }

    /** @test */
    public function it_can_soft_delete_user()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->deleteJson("/api/users/{$this->teacher->id}");

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonFragment([
                    'message' => 'User deleted successfully'
                ]);

        $this->teacher->refresh();
        $this->assertTrue($this->teacher->trashed());
        $this->assertFalse($this->teacher->is_active);
    }

    /** @test */
    public function it_can_fetch_trashed_users()
    {
        Sanctum::actingAs($this->superAdmin);

        // Soft delete a user
        $this->teacher->delete();

        $response = $this->getJson('/api/users/trashed');

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'username',
                            'email',
                            'deleted_at',
                        ]
                    ]
                ]);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($this->teacher->id, $response->json('data.0.id'));
    }

    /** @test */
    public function it_can_restore_soft_deleted_user()
    {
        Sanctum::actingAs($this->superAdmin);

        // Soft delete user first
        $this->teacher->delete();
        $this->assertTrue($this->teacher->trashed());

        $response = $this->patchJson("/api/users/{$this->teacher->id}/restore");

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonFragment([
                    'message' => 'User restored successfully'
                ]);

        $this->teacher->refresh();
        $this->assertFalse($this->teacher->trashed());
        $this->assertTrue($this->teacher->is_active);
    }

    /** @test */
    public function it_can_force_delete_user()
    {
        Sanctum::actingAs($this->superAdmin);

        // Soft delete user first
        $this->teacher->delete();

        $response = $this->deleteJson("/api/users/{$this->teacher->id}/force-delete");

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonFragment([
                    'message' => 'User permanently deleted'
                ]);

        $this->assertDatabaseMissing('users', ['id' => $this->teacher->id]);
    }

    /** @test */
    public function it_can_bulk_restore_users()
    {
        Sanctum::actingAs($this->superAdmin);

        // Create additional user and soft delete both
        $user2 = User::factory()->create([
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
        ]);

        $this->teacher->delete();
        $user2->delete();

        $userIds = [$this->teacher->id, $user2->id];

        $response = $this->patchJson('/api/users/bulk/restore', [
            'user_ids' => $userIds
        ]);

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonFragment([
                    'message' => '2 users restored successfully'
                ]);

        $this->teacher->refresh();
        $user2->refresh();
        
        $this->assertFalse($this->teacher->trashed());
        $this->assertFalse($user2->trashed());
    }

    /** @test */
    public function it_can_bulk_force_delete_users()
    {
        Sanctum::actingAs($this->superAdmin);

        // Create additional user and soft delete both
        $user2 = User::factory()->create([
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
        ]);

        $this->teacher->delete();
        $user2->delete();

        $userIds = [$this->teacher->id, $user2->id];

        $response = $this->deleteJson('/api/users/bulk/force-delete', [
            'user_ids' => $userIds
        ]);

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonFragment([
                    'message' => '2 users permanently deleted'
                ]);

        $this->assertDatabaseMissing('users', ['id' => $this->teacher->id]);
        $this->assertDatabaseMissing('users', ['id' => $user2->id]);
    }

    /** @test */
    public function it_supports_pagination_for_users_list()
    {
        Sanctum::actingAs($this->superAdmin);

        // Create more users for pagination test
        User::factory()->count(15)->create([
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
        ]);

        $response = $this->getJson('/api/users?page=1&limit=10');

        $response->assertStatus(Response::HTTP_OK)
                ->assertJsonStructure([
                    'data',
                    'pagination' => [
                        'total',
                        'per_page',
                        'current_page',
                        'last_page'
                    ]
                ]);

        $pagination = $response->json('pagination');
        $this->assertEquals(1, $pagination['current_page']);
        $this->assertEquals(10, $pagination['per_page']);
        $this->assertEquals(18, $pagination['total']); // 3 initial + 15 created
        $this->assertCount(10, $response->json('data'));
    }

    /** @test */
    public function it_supports_search_functionality()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/users?search=teacher_test');

        $response->assertStatus(Response::HTTP_OK);
        
        $users = $response->json('data');
        $this->assertCount(1, $users);
        $this->assertEquals('teacher_test', $users[0]['username']);
    }

    /** @test */
    public function it_supports_role_filtering()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson("/api/users?role={$this->teacherRole->name}");

        $response->assertStatus(Response::HTTP_OK);
        
        $users = $response->json('data');
        $this->assertCount(1, $users);
        $this->assertEquals('Teacher', $users[0]['role']);
    }

    /** @test */
    public function it_prevents_self_deletion()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->deleteJson("/api/users/{$this->superAdmin->id}");

        $response->assertStatus(Response::HTTP_FORBIDDEN)
                ->assertJsonFragment([
                    'message' => 'Cannot delete your own account'
                ]);

        $this->superAdmin->refresh();
        $this->assertFalse($this->superAdmin->trashed());
    }

    /** @test */
    public function it_enforces_role_based_authorization()
    {
        Sanctum::actingAs($this->teacher); // Lower privilege user

        // Teacher should not be able to create users
        $response = $this->postJson('/api/users', [
            'username' => 'unauthorized_creation',
            'email' => 'unauthorized@test.com',
            'password' => 'password123',
            'role_id' => $this->teacherRole->id,
            'institution_id' => $this->institution->id,
        ]);

        $response->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /** @test */
    public function it_handles_non_existent_user_operations()
    {
        Sanctum::actingAs($this->superAdmin);

        $nonExistentId = 99999;

        // Test update
        $response = $this->putJson("/api/users/{$nonExistentId}", [
            'first_name' => 'Test'
        ]);
        $response->assertStatus(Response::HTTP_NOT_FOUND);

        // Test delete
        $response = $this->deleteJson("/api/users/{$nonExistentId}");
        $response->assertStatus(Response::HTTP_NOT_FOUND);

        // Test restore
        $response = $this->patchJson("/api/users/{$nonExistentId}/restore");
        $response->assertStatus(Response::HTTP_NOT_FOUND);
    }

    /** @test */
    public function it_validates_bulk_operations_input()
    {
        Sanctum::actingAs($this->superAdmin);

        // Test bulk restore with invalid data
        $response = $this->patchJson('/api/users/bulk/restore', [
            'user_ids' => 'not_an_array'
        ]);
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);

        // Test bulk restore with empty array
        $response = $this->patchJson('/api/users/bulk/restore', [
            'user_ids' => []
        ]);
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /** @test */
    public function it_returns_proper_error_responses_for_invalid_json()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->postJson('/api/users', null, [
            'Content-Type' => 'application/json'
        ]);

        $response->assertStatus(Response::HTTP_BAD_REQUEST);
    }

    /** @test */
    public function it_handles_server_errors_gracefully()
    {
        Sanctum::actingAs($this->superAdmin);

        // Mock a scenario that would cause a server error
        // This is a basic test - in practice, you might mock services to throw exceptions
        $userData = [
            'username' => 'test_user',
            'email' => 'test@example.com',
            'password' => 'password123',
            'role_id' => 99999, // Non-existent role ID should cause an error
            'institution_id' => $this->institution->id,
        ];

        $response = $this->postJson('/api/users', $userData);

        // Should return validation error for invalid role_id
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}