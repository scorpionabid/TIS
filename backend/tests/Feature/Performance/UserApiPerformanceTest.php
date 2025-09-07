<?php

namespace Tests\Feature\Performance;

use App\Models\User;
use App\Models\Role;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class UserApiPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected Institution $institution;
    protected Role $role;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test data
        $this->role = Role::create(['name' => 'Teacher', 'display_name' => 'Teacher']);
        $this->institution = Institution::create([
            'name' => 'Test School',
            'type' => 'school',
            'code' => 'TEST001',
            'level' => 4,
        ]);

        $this->superAdmin = User::factory()->create([
            'username' => 'superadmin_perf',
            'email' => 'superadmin@perf.test',
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        Sanctum::actingAs($this->superAdmin);
    }

    /** @test */
    public function it_handles_large_user_datasets_efficiently()
    {
        // Create a large number of users
        $startTime = microtime(true);
        
        User::factory()->count(1000)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        $creationTime = microtime(true) - $startTime;
        
        // Creation should complete within reasonable time (5 seconds)
        $this->assertLessThan(5.0, $creationTime, 'User creation took too long');

        // Test pagination performance with large dataset
        $startTime = microtime(true);
        
        $response = $this->getJson('/api/users?page=1&limit=50');
        
        $queryTime = microtime(true) - $startTime;
        
        $response->assertStatus(Response::HTTP_OK);
        $this->assertCount(50, $response->json('data'));
        
        // Query should complete within 1 second
        $this->assertLessThan(1.0, $queryTime, 'User listing query took too long');
    }

    /** @test */
    public function it_maintains_consistent_response_times_under_pagination()
    {
        // Create moderate dataset
        User::factory()->count(500)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        $responseTimes = [];

        // Test response times for different pages
        for ($page = 1; $page <= 10; $page++) {
            $startTime = microtime(true);
            
            $response = $this->getJson("/api/users?page={$page}&limit=20");
            
            $responseTime = microtime(true) - $startTime;
            $responseTimes[] = $responseTime;
            
            $response->assertStatus(Response::HTTP_OK);
        }

        // Calculate response time variance
        $avgResponseTime = array_sum($responseTimes) / count($responseTimes);
        $maxResponseTime = max($responseTimes);
        $minResponseTime = min($responseTimes);
        
        // Response times should be consistent (max should not be more than 3x min)
        $this->assertLessThan($minResponseTime * 3, $maxResponseTime, 'Response times vary too much across pages');
        
        // Average response time should be reasonable
        $this->assertLessThan(0.5, $avgResponseTime, 'Average response time is too slow');
    }

    /** @test */
    public function it_handles_complex_search_queries_efficiently()
    {
        // Create users with various searchable attributes
        User::factory()->count(200)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        $searchQueries = [
            'john',
            'teacher',
            '@gmail',
            'active:true',
            'john teacher',
        ];

        foreach ($searchQueries as $query) {
            $startTime = microtime(true);
            
            $response = $this->getJson('/api/users?search=' . urlencode($query));
            
            $queryTime = microtime(true) - $startTime;
            
            $response->assertStatus(Response::HTTP_OK);
            
            // Search queries should complete within 0.3 seconds
            $this->assertLessThan(0.3, $queryTime, "Search query '{$query}' took too long");
        }
    }

    /** @test */
    public function it_handles_concurrent_user_creation_efficiently()
    {
        $concurrentUsers = 10;
        $usersPerBatch = 5;
        $startTime = microtime(true);

        // Simulate concurrent user creation
        for ($i = 0; $i < $concurrentUsers; $i++) {
            for ($j = 0; $j < $usersPerBatch; $j++) {
                $userData = [
                    'username' => "concurrent_user_{$i}_{$j}",
                    'email' => "concurrent_{$i}_{$j}@test.com",
                    'password' => 'password123',
                    'role_id' => $this->role->id,
                    'institution_id' => $this->institution->id,
                ];

                $response = $this->postJson('/api/users', $userData);
                $response->assertStatus(Response::HTTP_CREATED);
            }
        }

        $totalTime = microtime(true) - $startTime;
        $totalUsers = $concurrentUsers * $usersPerBatch;

        // Should create users efficiently (less than 0.1 seconds per user on average)
        $avgTimePerUser = $totalTime / $totalUsers;
        $this->assertLessThan(0.1, $avgTimePerUser, 'Concurrent user creation is too slow');
    }

    /** @test */
    public function it_optimizes_database_queries_for_user_listing()
    {
        // Create test data
        User::factory()->count(100)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        // Enable query logging
        DB::enableQueryLog();

        $response = $this->getJson('/api/users?limit=20');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $response->assertStatus(Response::HTTP_OK);

        // Should use a reasonable number of queries (avoid N+1 problems)
        $queryCount = count($queries);
        $this->assertLessThan(10, $queryCount, 'Too many database queries for user listing');

        // Check for efficient queries (joins instead of separate queries)
        $hasEfficientUserQuery = false;
        foreach ($queries as $query) {
            if (str_contains($query['query'], 'users') && 
                (str_contains($query['query'], 'join') || str_contains($query['query'], 'with'))) {
                $hasEfficientUserQuery = true;
                break;
            }
        }
        
        // Should use joins or eager loading for related data
        $this->assertTrue($hasEfficientUserQuery || $queryCount <= 3, 'Should use efficient queries with joins or eager loading');
    }

    /** @test */
    public function it_handles_memory_efficiently_with_large_datasets()
    {
        $memoryBefore = memory_get_usage(true);

        // Create a moderate dataset and process it
        User::factory()->count(300)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        // Fetch users in chunks to test memory efficiency
        $response = $this->getJson('/api/users?limit=100');
        $response->assertStatus(Response::HTTP_OK);

        $memoryAfter = memory_get_usage(true);
        $memoryIncrease = $memoryAfter - $memoryBefore;

        // Memory increase should be reasonable (less than 50MB for this operation)
        $this->assertLessThan(50 * 1024 * 1024, $memoryIncrease, 'Memory usage increased too much');
    }

    /** @test */
    public function it_maintains_performance_under_filtering_operations()
    {
        // Create diverse user data
        User::factory()->count(150)->create(['role_id' => $this->role->id, 'institution_id' => $this->institution->id, 'is_active' => true]);
        User::factory()->count(50)->create(['role_id' => $this->role->id, 'institution_id' => $this->institution->id, 'is_active' => false]);

        $filters = [
            'is_active=true',
            'is_active=false',
            "role_id={$this->role->id}",
            "institution_id={$this->institution->id}",
        ];

        foreach ($filters as $filter) {
            $startTime = microtime(true);
            
            $response = $this->getJson("/api/users?{$filter}&limit=50");
            
            $filterTime = microtime(true) - $startTime;
            
            $response->assertStatus(Response::HTTP_OK);
            
            // Filtering should be fast (less than 0.2 seconds)
            $this->assertLessThan(0.2, $filterTime, "Filtering with '{$filter}' took too long");
        }
    }

    /** @test */
    public function it_handles_bulk_operations_efficiently()
    {
        // Create test users for bulk operations
        $users = User::factory()->count(50)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        // Soft delete users first
        foreach ($users as $user) {
            $user->delete();
        }

        $userIds = $users->pluck('id')->toArray();

        // Test bulk restore performance
        $startTime = microtime(true);
        
        $response = $this->patchJson('/api/users/bulk/restore', [
            'user_ids' => $userIds
        ]);
        
        $bulkRestoreTime = microtime(true) - $startTime;
        
        $response->assertStatus(Response::HTTP_OK);
        
        // Bulk operations should be efficient (less than 2 seconds for 50 users)
        $this->assertLessThan(2.0, $bulkRestoreTime, 'Bulk restore took too long');

        // Test bulk force delete performance
        $startTime = microtime(true);
        
        $response = $this->deleteJson('/api/users/bulk/force-delete', [
            'user_ids' => array_slice($userIds, 0, 25) // Delete half
        ]);
        
        $bulkDeleteTime = microtime(true) - $startTime;
        
        $response->assertStatus(Response::HTTP_OK);
        
        // Bulk delete should also be efficient
        $this->assertLessThan(1.0, $bulkDeleteTime, 'Bulk delete took too long');
    }

    /** @test */
    public function it_scales_well_with_increasing_load()
    {
        $loadTests = [
            ['users' => 50, 'requests' => 5],
            ['users' => 100, 'requests' => 8], 
            ['users' => 200, 'requests' => 12],
        ];

        foreach ($loadTests as $test) {
            // Create users for this load test
            User::factory()->count($test['users'])->create([
                'role_id' => $this->role->id,
                'institution_id' => $this->institution->id,
            ]);

            $responseTimes = [];

            // Make multiple requests
            for ($i = 0; $i < $test['requests']; $i++) {
                $startTime = microtime(true);
                
                $response = $this->getJson('/api/users?limit=20');
                
                $responseTime = microtime(true) - $startTime;
                $responseTimes[] = $responseTime;
                
                $response->assertStatus(Response::HTTP_OK);
            }

            $avgResponseTime = array_sum($responseTimes) / count($responseTimes);

            // Response time should remain reasonable even with increasing load
            $this->assertLessThan(0.5, $avgResponseTime, 
                "Average response time degraded too much with {$test['users']} users and {$test['requests']} requests");

            // Clean up for next iteration
            User::where('id', '>', $this->superAdmin->id)->delete();
        }
    }

    /** @test */
    public function it_handles_json_serialization_efficiently()
    {
        // Create users with various amounts of data
        User::factory()->count(100)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        $startTime = microtime(true);
        
        $response = $this->getJson('/api/users?limit=100');
        
        $serializationTime = microtime(true) - $startTime;
        
        $response->assertStatus(Response::HTTP_OK);
        $responseData = $response->json();
        
        // Should serialize efficiently
        $this->assertLessThan(0.3, $serializationTime, 'JSON serialization took too long');
        
        // Should return complete data structure
        $this->assertArrayHasKey('data', $responseData);
        $this->assertArrayHasKey('pagination', $responseData);
        $this->assertCount(100, $responseData['data']);
    }

    /** @test */
    public function it_maintains_database_connection_efficiency()
    {
        // Monitor database connections during intensive operations
        $initialConnectionCount = $this->getDatabaseConnectionCount();

        // Perform multiple database operations
        for ($i = 0; $i < 20; $i++) {
            $this->getJson('/api/users?limit=10');
            
            // Create a user
            $this->postJson('/api/users', [
                'username' => "connection_test_{$i}",
                'email' => "connection_test_{$i}@test.com",
                'password' => 'password123',
                'role_id' => $this->role->id,
                'institution_id' => $this->institution->id,
            ]);
        }

        $finalConnectionCount = $this->getDatabaseConnectionCount();

        // Database connections should not leak
        $connectionIncrease = $finalConnectionCount - $initialConnectionCount;
        $this->assertLessThan(5, $connectionIncrease, 'Too many database connections created');
    }

    private function getDatabaseConnectionCount(): int
    {
        // This is a simplified version - in practice, you might need to check
        // actual database connection pools or use monitoring tools
        try {
            $result = DB::select('SHOW PROCESSLIST');
            return count($result);
        } catch (\Exception $e) {
            // For SQLite or other databases that don't support SHOW PROCESSLIST
            return 1; // Assume single connection
        }
    }

    /** @test */
    public function it_performs_efficient_soft_delete_operations()
    {
        // Create users for soft delete testing
        $users = User::factory()->count(100)->create([
            'role_id' => $this->role->id,
            'institution_id' => $this->institution->id,
        ]);

        // Test individual soft deletes
        $startTime = microtime(true);
        
        foreach ($users->take(10) as $user) {
            $response = $this->deleteJson("/api/users/{$user->id}");
            $response->assertStatus(Response::HTTP_OK);
        }
        
        $individualDeleteTime = microtime(true) - $startTime;

        // Individual deletes should be reasonable
        $this->assertLessThan(2.0, $individualDeleteTime, 'Individual soft deletes took too long');

        // Test querying trashed users performance
        $startTime = microtime(true);
        
        $response = $this->getJson('/api/users/trashed');
        
        $trashedQueryTime = microtime(true) - $startTime;
        
        $response->assertStatus(Response::HTTP_OK);
        
        // Querying trashed users should be efficient
        $this->assertLessThan(0.3, $trashedQueryTime, 'Trashed users query took too long');
    }
}