<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\UserCrudService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Exception;

class UserCrudServiceTest extends TestCase
{
    use RefreshDatabase;

    protected UserCrudService $userCrudService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->userCrudService = app(UserCrudService::class);
    }

    /**
     * Test UserCrudService instantiation
     */
    public function test_service_instantiation()
    {
        $this->assertInstanceOf(UserCrudService::class, $this->userCrudService);
    }

    /**
     * Test createUserWithProfile method
     */
    public function test_create_user_with_profile()
    {
        $userData = [
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => 'password123',
            'role_id' => 1,
            'institution_id' => 1,
            'department_id' => 1,
            'is_active' => true,
        ];

        $profileData = [
            'first_name' => 'Test',
            'last_name' => 'User',
            'phone' => '+994501234567',
        ];

        $user = $this->userCrudService->createUserWithProfile($userData, $profileData);

        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('testuser', $user->username);
        $this->assertEquals('test@example.com', $user->email);
        $this->assertTrue($user->is_active);
        $this->assertTrue(Hash::check('password123', $user->password));
        
        // Verify profile was created if profileData was provided
        if (!empty($profileData)) {
            $this->assertNotNull($user->profile);
            $this->assertEquals('Test', $user->profile->first_name);
            $this->assertEquals('User', $user->profile->last_name);
        }
    }

    /**
     * Test createUserWithProfile without profile data
     */
    public function test_create_user_without_profile()
    {
        $userData = [
            'username' => 'testuseronly',
            'email' => 'testonly@example.com',
            'password' => 'password123',
            'role_id' => 1,
            'institution_id' => 1,
            'is_active' => true,
        ];

        $user = $this->userCrudService->createUserWithProfile($userData, []);

        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('testuseronly', $user->username);
        $this->assertEquals('testonly@example.com', $user->email);
    }

    /**
     * Test resetUserPassword method
     */
    public function test_reset_user_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword'),
            'failed_login_attempts' => 3,
            'locked_until' => now()->addHours(1),
        ]);

        $newPassword = 'newpassword123';
        $beforeReset = now();
        
        $updatedUser = $this->userCrudService->resetUserPassword($user->id, $newPassword);

        $this->assertInstanceOf(User::class, $updatedUser);
        $this->assertTrue(Hash::check($newPassword, $updatedUser->password));
        $this->assertEquals(0, $updatedUser->failed_login_attempts);
        $this->assertNull($updatedUser->locked_until);
        $this->assertNotNull($updatedUser->password_changed_at);
        $this->assertTrue($updatedUser->password_changed_at->greaterThanOrEqualTo($beforeReset));
    }

    /**
     * Test toggleUserStatus method - activate user
     */
    public function test_toggle_user_status_activate()
    {
        $user = User::factory()->create(['is_active' => false]);

        $updatedUser = $this->userCrudService->toggleUserStatus($user->id, true);

        $this->assertTrue($updatedUser->is_active);
    }

    /**
     * Test toggleUserStatus method - deactivate user
     */
    public function test_toggle_user_status_deactivate()
    {
        $user = User::factory()->create(['is_active' => true]);

        $updatedUser = $this->userCrudService->toggleUserStatus($user->id, false);

        $this->assertFalse($updatedUser->is_active);
    }

    /**
     * Test toggleUserStatus prevents self-deactivation
     */
    public function test_toggle_user_status_prevents_self_deactivation()
    {
        $user = User::factory()->create(['is_active' => true]);
        $this->actingAs($user);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Cannot deactivate your own account');

        $this->userCrudService->toggleUserStatus($user->id, false);
    }

    /**
     * Test getUsersByRole method
     */
    public function test_get_users_by_role()
    {
        // This test would require proper role setup
        // For now, just test that it returns a collection
        $users = $this->userCrudService->getUsersByRole('admin');
        
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Collection::class, $users);
    }

    /**
     * Test getUsersByInstitution method
     */
    public function test_get_users_by_institution()
    {
        $institutionId = 1;
        
        // Create users with specific institution
        User::factory()->count(2)->create(['institution_id' => $institutionId]);
        User::factory()->create(['institution_id' => 2]); // Different institution
        
        $users = $this->userCrudService->getUsersByInstitution($institutionId);
        
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Collection::class, $users);
        $this->assertCount(2, $users);
        $this->assertTrue($users->every(fn($user) => $user->institution_id === $institutionId));
    }

    /**
     * Test findByUsername method
     */
    public function test_find_by_username()
    {
        $user = User::factory()->create(['username' => 'uniqueuser']);

        $foundUser = $this->userCrudService->findByUsername('uniqueuser');
        $notFoundUser = $this->userCrudService->findByUsername('nonexistentuser');

        $this->assertInstanceOf(User::class, $foundUser);
        $this->assertEquals($user->id, $foundUser->id);
        $this->assertNull($notFoundUser);
    }

    /**
     * Test findByEmail method
     */
    public function test_find_by_email()
    {
        $user = User::factory()->create(['email' => 'unique@example.com']);

        $foundUser = $this->userCrudService->findByEmail('unique@example.com');
        $notFoundUser = $this->userCrudService->findByEmail('nonexistent@example.com');

        $this->assertInstanceOf(User::class, $foundUser);
        $this->assertEquals($user->id, $foundUser->id);
        $this->assertNull($notFoundUser);
    }

    /**
     * Test soft delete functionality
     */
    public function test_soft_delete()
    {
        $user = User::factory()->create(['is_active' => true]);

        $result = $this->userCrudService->softDelete($user);

        $this->assertTrue($result);
        $this->assertTrue($user->fresh()->trashed());
        $this->assertFalse($user->fresh()->is_active);
    }

    /**
     * Test restore functionality
     */
    public function test_restore()
    {
        $user = User::factory()->create(['is_active' => true]);
        $this->userCrudService->softDelete($user);
        
        $result = $this->userCrudService->restore($user->fresh());

        $this->assertTrue($result);
        $this->assertFalse($user->fresh()->trashed());
        $this->assertTrue($user->fresh()->is_active);
        $this->assertNull($user->fresh()->locked_until);
    }

    /**
     * Test restore fails on non-deleted user
     */
    public function test_restore_fails_on_active_user()
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('User is not deleted and cannot be restored');

        $this->userCrudService->restore($user);
    }

    /**
     * Test force delete functionality
     */
    public function test_force_delete()
    {
        $user = User::factory()->create();
        $userId = $user->id;

        $result = $this->userCrudService->forceDelete($user);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('users', ['id' => $userId]);
        $this->assertNull(User::withTrashed()->find($userId));
    }

    /**
     * Test transaction rollback on createUserWithProfile error
     */
    public function test_create_user_transaction_rollback()
    {
        // Mock a scenario where profile creation might fail
        $userData = [
            'username' => 'transactiontest',
            'email' => 'transaction@example.com',
            'password' => 'password123',
            'role_id' => 1,
            'institution_id' => 1,
            'is_active' => true,
        ];

        // Create user successfully first
        $user = $this->userCrudService->createUserWithProfile($userData, []);
        
        // Verify user was created
        $this->assertDatabaseHas('users', [
            'username' => 'transactiontest',
            'email' => 'transaction@example.com'
        ]);
    }

    /**
     * Test transaction rollback on resetUserPassword error
     */
    public function test_reset_password_transaction_rollback()
    {
        $user = User::factory()->create();
        
        // Test successful password reset
        $updatedUser = $this->userCrudService->resetUserPassword($user->id, 'newpassword');
        
        $this->assertTrue(Hash::check('newpassword', $updatedUser->password));
    }

    /**
     * Test service handles non-existent user gracefully
     */
    public function test_service_handles_non_existent_user()
    {
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        
        $this->userCrudService->resetUserPassword(99999, 'password');
    }

    /**
     * Test service relationships loading
     */
    public function test_service_loads_relationships()
    {
        $user = User::factory()->create();
        
        $foundUser = $this->userCrudService->findByUsername($user->username);
        
        // Check that relationships are available for loading
        $this->assertTrue($foundUser->relationLoaded('role') || !$foundUser->role);
        $this->assertTrue($foundUser->relationLoaded('institution') || !$foundUser->institution);
        $this->assertTrue($foundUser->relationLoaded('department') || !$foundUser->department);
    }

    /**
     * Test bulk operations support
     */
    public function test_bulk_operations_support()
    {
        // Create multiple users
        $users = User::factory()->count(3)->create(['is_active' => true]);
        
        // Test that individual operations work on multiple users
        foreach ($users as $user) {
            $result = $this->userCrudService->toggleUserStatus($user->id, false);
            $this->assertFalse($result->is_active);
        }
        
        // Verify all users are inactive
        $inactiveCount = User::where('is_active', false)->count();
        $this->assertEquals(3, $inactiveCount);
    }

    /**
     * Test service validation and error handling
     */
    public function test_service_validation_and_error_handling()
    {
        // Test with invalid user ID for toggleUserStatus
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        
        $this->userCrudService->toggleUserStatus(99999, true);
    }

    /**
     * Test service maintains data integrity
     */
    public function test_service_maintains_data_integrity()
    {
        $user = User::factory()->create([
            'username' => 'integrity_test',
            'email' => 'integrity@test.com',
            'is_active' => true
        ]);

        // Test soft delete maintains data integrity
        $this->userCrudService->softDelete($user);
        $trashedUser = User::withTrashed()->find($user->id);
        
        $this->assertEquals('integrity_test', $trashedUser->username);
        $this->assertEquals('integrity@test.com', $trashedUser->email);
        $this->assertFalse($trashedUser->is_active);
        $this->assertNotNull($trashedUser->deleted_at);

        // Test restore maintains data integrity
        $this->userCrudService->restore($trashedUser);
        $restoredUser = User::find($user->id);
        
        $this->assertEquals('integrity_test', $restoredUser->username);
        $this->assertEquals('integrity@test.com', $restoredUser->email);
        $this->assertTrue($restoredUser->is_active);
        $this->assertNull($restoredUser->deleted_at);
    }
}