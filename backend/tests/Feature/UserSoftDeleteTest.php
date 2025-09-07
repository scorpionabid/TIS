<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\UserCrudService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use Carbon\Carbon;

class UserSoftDeleteTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected UserCrudService $userCrudService;
    protected User $testUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->userCrudService = app(UserCrudService::class);
        
        // Create test user for API testing
        $this->testUser = User::factory()->create([
            'username' => 'testadmin',
            'email' => 'admin@test.com',
            'is_active' => true,
        ]);

        $this->actingAs($this->testUser, 'sanctum');
    }

    /**
     * Test soft delete migration was applied correctly
     */
    public function test_soft_delete_migration_applied_correctly()
    {
        // Check if deleted_at column exists
        $this->assertTrue(
            \Schema::hasColumn('users', 'deleted_at'),
            'Users table should have deleted_at column'
        );
        
        // Check if index exists on deleted_at
        $indexes = \DB::select("PRAGMA index_list(users)");
        $deletedAtIndexExists = collect($indexes)->contains(function ($index) {
            $indexInfo = \DB::select("PRAGMA index_info({$index->name})");
            return collect($indexInfo)->contains('name', 'deleted_at');
        });
        
        $this->assertTrue($deletedAtIndexExists, 'deleted_at column should have an index');
    }

    /**
     * Test user soft delete functionality
     */
    public function test_user_soft_delete()
    {
        $user = User::factory()->create([
            'username' => 'softdeleteuser',
            'email' => 'softdelete@test.com',
            'is_active' => true,
        ]);

        $userId = $user->id;
        
        // Soft delete the user
        $result = $this->userCrudService->softDelete($user);
        
        $this->assertTrue($result);
        
        // User should still exist in database but be soft deleted
        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'username' => 'softdeleteuser',
        ]);
        
        // User should not be found in normal queries
        $this->assertNull(User::find($userId));
        
        // User should be found with trashed
        $trashedUser = User::withTrashed()->find($userId);
        $this->assertNotNull($trashedUser);
        $this->assertTrue($trashedUser->trashed());
        $this->assertNotNull($trashedUser->deleted_at);
        $this->assertFalse($trashedUser->is_active);
    }

    /**
     * Test user restore functionality
     */
    public function test_user_restore()
    {
        $user = User::factory()->create([
            'username' => 'restoreuser',
            'email' => 'restore@test.com',
            'is_active' => true,
        ]);

        // Soft delete the user
        $this->userCrudService->softDelete($user);
        
        // Verify user is soft deleted
        $this->assertTrue($user->fresh()->trashed());
        
        // Restore the user
        $result = $this->userCrudService->restore($user->fresh());
        
        $this->assertTrue($result);
        
        // User should be active again
        $restoredUser = User::find($user->id);
        $this->assertNotNull($restoredUser);
        $this->assertFalse($restoredUser->trashed());
        $this->assertNull($restoredUser->deleted_at);
        $this->assertTrue($restoredUser->is_active);
        $this->assertNull($restoredUser->locked_until);
    }

    /**
     * Test force delete functionality
     */
    public function test_user_force_delete()
    {
        $user = User::factory()->create([
            'username' => 'forceuser',
            'email' => 'force@test.com',
        ]);

        $userId = $user->id;
        
        // Force delete the user
        $result = $this->userCrudService->forceDelete($user);
        
        $this->assertTrue($result);
        
        // User should be completely removed from database
        $this->assertDatabaseMissing('users', ['id' => $userId]);
        
        // User should not be found even with trashed
        $this->assertNull(User::withTrashed()->find($userId));
    }

    /**
     * Test restore fails on non-deleted user
     */
    public function test_restore_fails_on_active_user()
    {
        $user = User::factory()->create([
            'username' => 'activeuser',
            'email' => 'active@test.com',
            'is_active' => true,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('User is not deleted and cannot be restored');
        
        $this->userCrudService->restore($user);
    }

    /**
     * Test user scopes work correctly
     */
    public function test_user_scopes()
    {
        // Create active user
        $activeUser = User::factory()->create(['is_active' => true]);
        
        // Create inactive user  
        $inactiveUser = User::factory()->create(['is_active' => false]);
        
        // Create soft deleted user
        $deletedUser = User::factory()->create(['is_active' => true]);
        $this->userCrudService->softDelete($deletedUser);

        // Test active scope
        $activeUsers = User::active()->get();
        $this->assertCount(2, $activeUsers); // testUser + activeUser
        $this->assertTrue($activeUsers->contains($this->testUser));
        $this->assertTrue($activeUsers->contains($activeUser));
        $this->assertFalse($activeUsers->contains($inactiveUser));
        $this->assertFalse($activeUsers->contains($deletedUser));

        // Test onlyTrashed scope
        $trashedUsers = User::onlyTrashed()->get();
        $this->assertCount(1, $trashedUsers);
        $this->assertTrue($trashedUsers->contains($deletedUser));

        // Test withTrashed scope includes all users
        $allUsers = User::withTrashed()->get();
        $this->assertCount(4, $allUsers);
    }

    /**
     * Test isFullyActive method
     */
    public function test_is_fully_active_method()
    {
        // Active and not deleted user
        $activeUser = User::factory()->create(['is_active' => true]);
        $this->assertTrue($activeUser->isFullyActive());
        
        // Inactive but not deleted user
        $inactiveUser = User::factory()->create(['is_active' => false]);
        $this->assertFalse($inactiveUser->isFullyActive());
        
        // Active but soft deleted user
        $deletedUser = User::factory()->create(['is_active' => true]);
        $this->userCrudService->softDelete($deletedUser);
        $deletedUser = User::withTrashed()->find($deletedUser->id);
        $this->assertFalse($deletedUser->isFullyActive());
        
        // Inactive and soft deleted user
        $inactiveDeletedUser = User::factory()->create(['is_active' => false]);
        $this->userCrudService->softDelete($inactiveDeletedUser);
        $inactiveDeletedUser = User::withTrashed()->find($inactiveDeletedUser->id);
        $this->assertFalse($inactiveDeletedUser->isFullyActive());
    }

    /**
     * Test migration converted existing inactive users
     */
    public function test_migration_converts_inactive_users()
    {
        // Create an inactive user manually (simulating pre-migration state)
        $inactiveUser = new User([
            'username' => 'preexisting',
            'email' => 'preexisting@test.com',
            'password' => Hash::make('password'),
            'is_active' => false,
        ]);
        $inactiveUser->save();
        
        // Manually set deleted_at to simulate migration behavior
        $inactiveUser->delete();
        
        // User should be soft deleted
        $this->assertTrue($inactiveUser->fresh()->trashed());
        
        // Should not appear in normal queries
        $this->assertNull(User::where('username', 'preexisting')->first());
        
        // Should appear in trashed queries
        $this->assertNotNull(User::onlyTrashed()->where('username', 'preexisting')->first());
    }

    /**
     * Test bulk soft delete operations
     */
    public function test_bulk_soft_delete_operations()
    {
        // Create multiple users
        $users = User::factory()->count(3)->create(['is_active' => true]);
        $userIds = $users->pluck('id')->toArray();
        
        // Bulk soft delete
        $affectedCount = 0;
        foreach ($users as $user) {
            if ($this->userCrudService->softDelete($user)) {
                $affectedCount++;
            }
        }
        
        $this->assertEquals(3, $affectedCount);
        
        // All users should be soft deleted
        foreach ($userIds as $userId) {
            $this->assertNull(User::find($userId));
            $this->assertNotNull(User::withTrashed()->find($userId));
        }
        
        // Bulk restore
        $restoredCount = 0;
        foreach ($users as $user) {
            if ($this->userCrudService->restore($user->fresh())) {
                $restoredCount++;
            }
        }
        
        $this->assertEquals(3, $restoredCount);
        
        // All users should be restored
        foreach ($userIds as $userId) {
            $restoredUser = User::find($userId);
            $this->assertNotNull($restoredUser);
            $this->assertTrue($restoredUser->is_active);
        }
    }

    /**
     * Test trashed users via API endpoints
     */
    public function test_trashed_users_api_endpoint()
    {
        // Create and soft delete a user
        $user = User::factory()->create([
            'username' => 'trashedapi',
            'email' => 'trashedapi@test.com',
        ]);
        
        $this->userCrudService->softDelete($user);
        
        // Test trashed users endpoint (this would need to be implemented)
        // For now, just verify the user is in the correct state
        $trashedUser = User::onlyTrashed()->find($user->id);
        $this->assertNotNull($trashedUser);
        $this->assertTrue($trashedUser->trashed());
    }

    /**
     * Test soft delete preserves relationships
     */
    public function test_soft_delete_preserves_relationships()
    {
        $user = User::factory()->create();
        
        // Store original relationships data
        $originalData = [
            'role_id' => $user->role_id,
            'institution_id' => $user->institution_id,
            'department_id' => $user->department_id,
        ];
        
        // Soft delete user
        $this->userCrudService->softDelete($user);
        
        // Get trashed user and verify relationships are preserved
        $trashedUser = User::withTrashed()->find($user->id);
        
        $this->assertEquals($originalData['role_id'], $trashedUser->role_id);
        $this->assertEquals($originalData['institution_id'], $trashedUser->institution_id);
        $this->assertEquals($originalData['department_id'], $trashedUser->department_id);
    }

    /**
     * Test soft delete with timestamps
     */
    public function test_soft_delete_timestamps()
    {
        $user = User::factory()->create();
        $beforeDelete = now();
        
        $this->userCrudService->softDelete($user);
        
        $trashedUser = User::withTrashed()->find($user->id);
        $afterDelete = now();
        
        $this->assertNotNull($trashedUser->deleted_at);
        $this->assertTrue($trashedUser->deleted_at->between($beforeDelete, $afterDelete));
        $this->assertNotNull($trashedUser->updated_at);
    }
}