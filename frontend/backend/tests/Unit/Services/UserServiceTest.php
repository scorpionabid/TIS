<?php

namespace Tests\Unit\Services;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test user can be created through service pattern
     *
     * @return void
     */
    public function test_user_creation_service_pattern()
    {
        $userData = [
            'username' => 'serviceuser',
            'email' => 'service@example.com',
            'password' => 'password123',
            'is_active' => true,
        ];

        $user = User::create($userData);

        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('serviceuser', $user->username);
        $this->assertEquals('service@example.com', $user->email);
        $this->assertTrue($user->is_active);
    }

    /**
     * Test user update functionality
     *
     * @return void
     */
    public function test_user_update_functionality()
    {
        $user = User::factory()->create([
            'username' => 'original',
            'email' => 'original@example.com',
        ]);

        $user->update([
            'username' => 'updated',
            'email' => 'updated@example.com',
        ]);

        $this->assertEquals('updated', $user->username);
        $this->assertEquals('updated@example.com', $user->email);
    }

    /**
     * Test user deletion
     *
     * @return void
     */
    public function test_user_deletion()
    {
        $user = User::factory()->create();
        $userId = $user->id;

        $user->delete();

        $this->assertNull(User::find($userId));
    }

    /**
     * Test user query scopes and filtering
     *
     * @return void
     */
    public function test_user_query_filtering()
    {
        // Create active and inactive users
        User::factory()->create(['is_active' => true, 'username' => 'active1']);
        User::factory()->create(['is_active' => true, 'username' => 'active2']);
        User::factory()->create(['is_active' => false, 'username' => 'inactive1']);

        // Test filtering by active status
        $activeUsers = User::where('is_active', true)->get();
        $inactiveUsers = User::where('is_active', false)->get();

        $this->assertCount(2, $activeUsers);
        $this->assertCount(1, $inactiveUsers);
    }

    /**
     * Test user search functionality
     *
     * @return void
     */
    public function test_user_search_functionality()
    {
        User::factory()->create(['username' => 'john_doe', 'email' => 'john@example.com']);
        User::factory()->create(['username' => 'jane_smith', 'email' => 'jane@example.com']);
        User::factory()->create(['username' => 'bob_wilson', 'email' => 'bob@example.com']);

        // Search by username
        $johnUsers = User::where('username', 'like', '%john%')->get();
        $this->assertCount(1, $johnUsers);
        $this->assertEquals('john_doe', $johnUsers->first()->username);

        // Search by email domain
        $exampleUsers = User::where('email', 'like', '%@example.com')->get();
        $this->assertCount(3, $exampleUsers);
    }

    /**
     * Test user password hashing
     *
     * @return void
     */
    public function test_user_password_hashing()
    {
        $plainPassword = 'plaintext123';
        
        $user = User::factory()->create([
            'password' => bcrypt($plainPassword)
        ]);

        $this->assertNotEquals($plainPassword, $user->password);
        $this->assertTrue(\Hash::check($plainPassword, $user->password));
    }
}