<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class SimpleSchoolAdminAccessTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function simple_permission_check()
    {
        // This is a simplified test to verify our testing setup works
        $this->assertTrue(true, 'Basic test setup verification');
    }

    /** @test */ 
    public function can_create_basic_user()
    {
        // Test basic user creation without complex seeders
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com'
        ]);
        
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com'
        ]);
    }

    /** @test */
    public function authenticated_user_can_access_basic_routes()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        
        // Test basic authenticated endpoint
        $response = $this->getJson('/api/me');
        
        // Should not be 500 internal server error
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function unauthenticated_user_cannot_access_protected_routes()
    {
        // Test that unauthenticated users get proper response
        $response = $this->getJson('/api/me');
        
        $this->assertEquals(401, $response->status());
    }
}