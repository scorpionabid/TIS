<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class UserCrudTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test user with admin role for API testing
        $this->testUser = User::factory()->create([
            'username' => 'testadmin',
            'email' => 'admin@test.com',
            'is_active' => true,
        ]);

        // Create auth token for API testing
        $this->token = $this->testUser->createToken('test-token')->plainTextToken;
    }

    /**
     * Test user creation via API
     *
     * @return void
     */
    public function test_can_create_user_via_api()
    {
        $userData = [
            'username' => 'newuser',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'is_active' => true,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/users', $userData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'username',
                        'email',
                        'is_active',
                        'created_at',
                        'updated_at'
                    ]
                ]);

        $this->assertDatabaseHas('users', [
            'username' => 'newuser',
            'email' => 'newuser@example.com',
            'is_active' => true,
        ]);
    }

    /**
     * Test user creation validation
     *
     * @return void
     */
    public function test_user_creation_validation()
    {
        // Test empty data
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/users', []);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['username', 'email', 'password']);

        // Test invalid email
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/users', [
            'username' => 'testuser',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);

        // Test duplicate username
        User::factory()->create(['username' => 'duplicate']);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/users', [
            'username' => 'duplicate',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['username']);
    }

    /**
     * Test user retrieval via API
     *
     * @return void
     */
    public function test_can_retrieve_users_via_api()
    {
        // Create additional test users
        User::factory()->count(3)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/users');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'users' => [
                        '*' => [
                            'id',
                            'username',
                            'email',
                            'is_active',
                            'created_at',
                            'updated_at'
                        ]
                    ],
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total',
                        'last_page'
                    ]
                ]);

        // Should have at least 4 users (1 test user + 3 created)
        $this->assertGreaterThanOrEqual(4, count($response->json('users')));
    }

    /**
     * Test single user retrieval
     *
     * @return void
     */
    public function test_can_retrieve_single_user()
    {
        $user = User::factory()->create([
            'username' => 'singleuser',
            'email' => 'single@example.com',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson("/api/users/{$user->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'user' => [
                        'id' => $user->id,
                        'username' => 'singleuser',
                        'email' => 'single@example.com',
                    ]
                ]);
    }

    /**
     * Test user update via API
     *
     * @return void
     */
    public function test_can_update_user_via_api()
    {
        $user = User::factory()->create([
            'username' => 'oldusername',
            'email' => 'old@example.com',
        ]);

        $updateData = [
            'username' => 'newusername',
            'email' => 'new@example.com',
            'is_active' => false,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->putJson("/api/users/{$user->id}", $updateData);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'İstifadəçi uğurla yeniləndi',
                    'user' => [
                        'id' => $user->id,
                        'username' => 'newusername',
                        'email' => 'new@example.com',
                        'is_active' => false,
                    ]
                ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'newusername',
            'email' => 'new@example.com',
            'is_active' => false,
        ]);
    }

    /**
     * Test user deletion via API
     *
     * @return void
     */
    public function test_can_delete_user_via_api()
    {
        $user = User::factory()->create([
            'username' => 'deleteme',
            'email' => 'delete@example.com',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->deleteJson("/api/users/{$user->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'İstifadəçi uğurla silindi'
                ]);

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);
    }

    /**
     * Test user search functionality
     *
     * @return void
     */
    public function test_can_search_users()
    {
        User::factory()->create([
            'username' => 'johndoe',
            'email' => 'john@example.com',
        ]);

        User::factory()->create([
            'username' => 'janesmith',
            'email' => 'jane@example.com',
        ]);

        // Search by username
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/users?search=john');

        $response->assertStatus(200);
        $users = $response->json('users');
        
        $this->assertGreaterThanOrEqual(1, count($users));
        $this->assertStringContainsString('john', strtolower($users[0]['username']));
    }

    /**
     * Test user pagination
     *
     * @return void
     */
    public function test_user_pagination()
    {
        // Create more users than per_page limit
        User::factory()->count(25)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/users?per_page=10');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'users',
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total',
                        'last_page',
                        'from',
                        'to'
                    ]
                ]);

        $meta = $response->json('meta');
        $this->assertEquals(10, $meta['per_page']);
        $this->assertGreaterThan(1, $meta['last_page']);
        $this->assertGreaterThan(25, $meta['total']);
    }

    /**
     * Test user status toggle
     *
     * @return void
     */
    public function test_can_toggle_user_status()
    {
        $user = User::factory()->create([
            'username' => 'toggleuser',
            'is_active' => true,
        ]);

        // Deactivate user
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson("/api/users/{$user->id}/toggle-status");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'İstifadəçi statusu dəyişdirildi',
                    'user' => [
                        'is_active' => false
                    ]
                ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_active' => false,
        ]);

        // Reactivate user
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson("/api/users/{$user->id}/toggle-status");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'İstifadəçi statusu dəyişdirildi',
                    'user' => [
                        'is_active' => true
                    ]
                ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_active' => true,
        ]);
    }

    /**
     * Test unauthorized access
     *
     * @return void
     */
    public function test_unauthorized_access_denied()
    {
        // Test without token
        $response = $this->postJson('/api/users', [
            'username' => 'newuser',
            'email' => 'new@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);

        // Test with invalid token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer invalid-token',
            'Accept' => 'application/json',
        ])->postJson('/api/users', [
            'username' => 'newuser',
            'email' => 'new@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test bulk user operations
     *
     * @return void
     */
    public function test_bulk_user_operations()
    {
        $users = User::factory()->count(3)->create();
        $userIds = $users->pluck('id')->toArray();

        // Test bulk deactivation
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/users/bulk-deactivate', [
            'user_ids' => $userIds
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'İstifadəçilər uğurla deaktiv edildi',
                    'affected_count' => 3
                ]);

        // Verify all users are deactivated
        foreach ($userIds as $userId) {
            $this->assertDatabaseHas('users', [
                'id' => $userId,
                'is_active' => false,
            ]);
        }

        // Test bulk activation
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/users/bulk-activate', [
            'user_ids' => $userIds
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'İstifadəçilər uğurla aktiv edildi',
                    'affected_count' => 3
                ]);

        // Verify all users are activated
        foreach ($userIds as $userId) {
            $this->assertDatabaseHas('users', [
                'id' => $userId,
                'is_active' => true,
            ]);
        }
    }
}