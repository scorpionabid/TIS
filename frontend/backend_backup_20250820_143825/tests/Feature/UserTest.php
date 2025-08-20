<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_user_registration()
    {
        // Use unique data to avoid conflicts with seeded users
        $uniqueId = uniqid();
        $response = $this->postJson('/api/register', [
            'username' => 'testuser_' . $uniqueId,
            'email' => 'test_' . $uniqueId . '@example.com',
            'password' => 'Password123!',  // Complex password matching regex requirements
            'password_confirmation' => 'Password123!',
            'role_id' => 1
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'username',
                    'email',
                ]
            ]);
    }

    public function test_user_login()
    {
        $uniqueId = uniqid();
        $user = User::factory()->create([
            'username' => 'testuser_' . $uniqueId,
            'email' => 'test_' . $uniqueId . '@example.com',
            'password' => bcrypt('Password123!')
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'testuser_' . $uniqueId,
            'password' => 'Password123!'
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'user' => [
                        'id',
                        'username',
                        'email',
                    ],
                    'token'
                ]
            ]);
    }

    public function test_protected_route_access()
    {
        $user = User::factory()->create();
        
        // Unauthenticated request - using /api/me endpoint which exists in routes
        $response = $this->getJson('/api/me');
        $response->assertStatus(401);

        // Authenticated request
        Sanctum::actingAs($user);
        $response = $this->getJson('/api/me');
        $response->assertStatus(200);
    }
}
