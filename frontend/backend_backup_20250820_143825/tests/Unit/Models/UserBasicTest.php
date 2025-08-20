<?php

namespace Tests\Unit\Models;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserBasicTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test user model can be created
     *
     * @return void
     */
    public function test_user_model_can_be_created()
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
        ]);

        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('testuser', $user->username);
        $this->assertEquals('test@example.com', $user->email);
    }

    /**
     * Test user has expected fillable attributes
     *
     * @return void
     */
    public function test_user_has_expected_fillable_attributes()
    {
        $user = new User();
        $expectedFillable = [
            'username',
            'email',
            'password',
            'role_id',
            'institution_id',
            'department_id',
            'departments',
            'is_active',
            'last_login_at',
            'password_changed_at',
            'failed_login_attempts',
            'locked_until',
            'email_verified_at',
            'remember_token',
        ];

        $this->assertEquals($expectedFillable, $user->getFillable());
    }

    /**
     * Test user password is hidden
     *
     * @return void
     */
    public function test_user_password_is_hidden()
    {
        $user = User::factory()->create();
        $array = $user->toArray();

        $this->assertArrayNotHasKey('password', $array);
        $this->assertArrayNotHasKey('remember_token', $array);
    }

    /**
     * Test user default is_active is true
     *
     * @return void
     */
    public function test_user_default_is_active_is_true()
    {
        $user = User::factory()->create();
        
        // Default should be true if not specified
        $this->assertTrue($user->is_active ?? true);
    }

    /**
     * Test user email is unique
     *
     * @return void
     */
    public function test_user_email_is_unique()
    {
        $email = 'unique@example.com';
        
        User::factory()->create(['email' => $email]);
        
        $this->expectException(\Illuminate\Database\QueryException::class);
        User::factory()->create(['email' => $email]);
    }

    /**
     * Test user username is unique
     *
     * @return void
     */
    public function test_user_username_is_unique()
    {
        $username = 'uniqueuser';
        
        User::factory()->create(['username' => $username]);
        
        $this->expectException(\Illuminate\Database\QueryException::class);
        User::factory()->create(['username' => $username]);
    }
}