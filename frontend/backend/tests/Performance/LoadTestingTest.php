<?php

namespace Tests\Performance;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class LoadTestingTest extends TestCase
{
    use RefreshDatabase;

    protected User $testUser;
    protected Institution $testInstitution;
    protected $startTime;
    protected $memoryStart;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test roles
        $role = \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        
        // Create test institution
        $this->testInstitution = Institution::create([
            'name' => 'Test Institution',
            'level' => 4,
            'type' => 'school',
            'is_active' => true
        ]);
        
        // Create test user
        $this->testUser = User::factory()->create([
            'username' => 'loadtest',
            'institution_id' => $this->testInstitution->id
        ]);
        $this->testUser->assignRole($role);
        
        // Initialize performance tracking
        $this->startTime = microtime(true);
        $this->memoryStart = memory_get_usage();
    }

    protected function tearDown(): void
    {
        $endTime = microtime(true);
        $memoryEnd = memory_get_usage();
        $executionTime = ($endTime - $this->startTime) * 1000; // Convert to milliseconds
        $memoryUsage = ($memoryEnd - $this->memoryStart) / 1024 / 1024; // Convert to MB
        
        Log::info("Performance Test Results", [
            'test' => $this->getName(),
            'execution_time_ms' => $executionTime,
            'memory_usage_mb' => $memoryUsage,
            'peak_memory_mb' => memory_get_peak_usage() / 1024 / 1024
        ]);
        
        parent::tearDown();
    }

    /** @test */
    public function authentication_endpoint_performs_under_load()
    {
        // Test concurrent authentication requests
        $responses = [];
        $startTime = microtime(true);
        
        // Simulate 10 concurrent login attempts
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/login', [
                'login' => 'loadtest',
                'password' => 'password'
            ]);
            
            $responses[] = $response;
        }
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        
        // All requests should complete within 2 seconds
        $this->assertLessThan(2000, $totalTime);
        
        // All responses should be successful
        foreach ($responses as $response) {
            $response->assertStatus(200);
        }
        
        // Average response time should be under 200ms
        $avgResponseTime = $totalTime / count($responses);
        $this->assertLessThan(200, $avgResponseTime);
    }

    /** @test */
    public function dashboard_stats_endpoint_handles_concurrent_requests()
    {
        // Create test data
        User::factory()->count(100)->create(['institution_id' => $this->testInstitution->id]);
        Survey::factory()->count(50)->create();
        
        $responses = [];
        $startTime = microtime(true);
        
        // Simulate 5 concurrent dashboard requests
        for ($i = 0; $i < 5; $i++) {
            $response = $this->actingAs($this->testUser)
                ->getJson('/api/dashboard/stats');
            
            $responses[] = $response;
        }
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        
        // All requests should complete within 1 second
        $this->assertLessThan(1000, $totalTime);
        
        // All responses should be successful
        foreach ($responses as $response) {
            $response->assertStatus(200);
        }
        
        // Check that caching is working (subsequent requests should be faster)
        $cachedStartTime = microtime(true);
        $cachedResponse = $this->actingAs($this->testUser)
            ->getJson('/api/dashboard/stats');
        $cachedTime = (microtime(true) - $cachedStartTime) * 1000;
        
        $cachedResponse->assertStatus(200);
        $this->assertLessThan(100, $cachedTime); // Cached request should be very fast
    }

    /** @test */
    public function users_endpoint_performs_with_large_dataset()
    {
        // Create large dataset
        User::factory()->count(1000)->create(['institution_id' => $this->testInstitution->id]);
        
        $startTime = microtime(true);
        
        // Test paginated request
        $response = $this->actingAs($this->testUser)
            ->getJson('/api/users?per_page=50');
        
        $responseTime = (microtime(true) - $startTime) * 1000;
        
        // Should handle large dataset efficiently
        $this->assertLessThan(500, $responseTime);
        $response->assertStatus(200);
        
        // Check pagination works correctly
        $data = $response->json();
        $this->assertCount(50, $data['users']);
        $this->assertEquals(1001, $data['meta']['total']); // 1000 + 1 test user
    }

    /** @test */
    public function search_functionality_performs_efficiently()
    {
        // Create test data with searchable content
        User::factory()->count(500)->create(['institution_id' => $this->testInstitution->id]);
        
        $searchTerms = ['admin', 'teacher', 'student', 'manager'];
        
        foreach ($searchTerms as $term) {
            $startTime = microtime(true);
            
            $response = $this->actingAs($this->testUser)
                ->getJson('/api/users?search=' . $term);
            
            $responseTime = (microtime(true) - $startTime) * 1000;
            
            // Search should complete within 300ms
            $this->assertLessThan(300, $responseTime);
            $response->assertStatus(200);
        }
    }

    /** @test */
    public function survey_creation_handles_complex_data()
    {
        $complexSurveyData = [
            'title' => 'Complex Survey',
            'description' => 'A complex survey with many sections',
            'sections' => [
                [
                    'title' => 'Section 1',
                    'questions' => array_fill(0, 20, [
                        'question' => 'Sample question',
                        'type' => 'text',
                        'required' => true
                    ])
                ],
                [
                    'title' => 'Section 2',
                    'questions' => array_fill(0, 15, [
                        'question' => 'Sample question',
                        'type' => 'select',
                        'options' => ['Option 1', 'Option 2', 'Option 3']
                    ])
                ]
            ]
        ];
        
        $startTime = microtime(true);
        
        $response = $this->actingAs($this->testUser)
            ->postJson('/api/surveys', $complexSurveyData);
        
        $responseTime = (microtime(true) - $startTime) * 1000;
        
        // Complex survey creation should complete within 1 second
        $this->assertLessThan(1000, $responseTime);
        $response->assertStatus(201);
    }

    /** @test */
    public function database_query_performance_is_optimized()
    {
        // Create test data
        User::factory()->count(200)->create(['institution_id' => $this->testInstitution->id]);
        
        // Enable query logging
        DB::enableQueryLog();
        
        $startTime = microtime(true);
        
        // Make request that involves multiple queries
        $response = $this->actingAs($this->testUser)
            ->getJson('/api/users?include=role,institution');
        
        $responseTime = (microtime(true) - $startTime) * 1000;
        $queries = DB::getQueryLog();
        
        // Should complete within reasonable time
        $this->assertLessThan(400, $responseTime);
        $response->assertStatus(200);
        
        // Should not have excessive number of queries (N+1 problem)
        $this->assertLessThan(10, count($queries));
        
        // Check for efficient queries
        foreach ($queries as $query) {
            $this->assertLessThan(100, $query['time']); // Each query should be under 100ms
        }
    }

    /** @test */
    public function cache_performance_is_effective()
    {
        // Clear cache first
        Cache::flush();
        
        // First request (should cache)
        $startTime = microtime(true);
        $response1 = $this->actingAs($this->testUser)
            ->getJson('/api/dashboard/stats');
        $firstRequestTime = (microtime(true) - $startTime) * 1000;
        
        // Second request (should use cache)
        $startTime = microtime(true);
        $response2 = $this->actingAs($this->testUser)
            ->getJson('/api/dashboard/stats');
        $secondRequestTime = (microtime(true) - $startTime) * 1000;
        
        $response1->assertStatus(200);
        $response2->assertStatus(200);
        
        // Cached request should be significantly faster
        $this->assertLessThan($firstRequestTime * 0.5, $secondRequestTime);
        
        // Data should be identical
        $this->assertEquals($response1->json(), $response2->json());
    }

    /** @test */
    public function file_upload_performance_is_acceptable()
    {
        // Create a mock file
        $fileContent = str_repeat('a', 1024 * 100); // 100KB file
        $tempFile = tmpfile();
        fwrite($tempFile, $fileContent);
        $tempFilePath = stream_get_meta_data($tempFile)['uri'];
        
        $startTime = microtime(true);
        
        $response = $this->actingAs($this->testUser)
            ->postJson('/api/documents', [
                'title' => 'Test Document',
                'file' => new \Illuminate\Http\UploadedFile(
                    $tempFilePath,
                    'test.txt',
                    'text/plain',
                    null,
                    true
                )
            ]);
        
        $responseTime = (microtime(true) - $startTime) * 1000;
        
        // File upload should complete within 2 seconds
        $this->assertLessThan(2000, $responseTime);
        
        // Clean up
        fclose($tempFile);
    }

    /** @test */
    public function memory_usage_remains_within_limits()
    {
        $memoryBefore = memory_get_usage();
        
        // Create large dataset
        User::factory()->count(100)->create(['institution_id' => $this->testInstitution->id]);
        
        // Make multiple requests
        for ($i = 0; $i < 10; $i++) {
            $this->actingAs($this->testUser)
                ->getJson('/api/users?per_page=50');
        }
        
        $memoryAfter = memory_get_usage();
        $memoryIncrease = ($memoryAfter - $memoryBefore) / 1024 / 1024; // MB
        
        // Memory increase should be reasonable (under 50MB)
        $this->assertLessThan(50, $memoryIncrease);
        
        // Peak memory should be within limits
        $peakMemory = memory_get_peak_usage() / 1024 / 1024; // MB
        $this->assertLessThan(256, $peakMemory); // Under 256MB
    }

    /** @test */
    public function concurrent_user_operations_are_safe()
    {
        // Create multiple users
        $users = User::factory()->count(5)->create(['institution_id' => $this->testInstitution->id]);
        
        $responses = [];
        $startTime = microtime(true);
        
        // Simulate concurrent operations
        foreach ($users as $user) {
            $response = $this->actingAs($user)
                ->getJson('/api/me');
            
            $responses[] = $response;
        }
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        
        // All requests should complete within 1 second
        $this->assertLessThan(1000, $totalTime);
        
        // All responses should be successful
        foreach ($responses as $response) {
            $response->assertStatus(200);
        }
    }

    /** @test */
    public function api_rate_limiting_works_correctly()
    {
        $responses = [];
        $startTime = microtime(true);
        
        // Make many requests quickly
        for ($i = 0; $i < 100; $i++) {
            $response = $this->actingAs($this->testUser)
                ->getJson('/api/me');
            
            $responses[] = $response;
        }
        
        $totalTime = (microtime(true) - $startTime) * 1000;
        
        // Check that rate limiting kicks in
        $rateLimitedResponses = array_filter($responses, function($response) {
            return $response->status() === 429;
        });
        
        // Should have some rate limited responses
        $this->assertGreaterThan(0, count($rateLimitedResponses));
        
        // But not all should be rate limited
        $successfulResponses = array_filter($responses, function($response) {
            return $response->status() === 200;
        });
        
        $this->assertGreaterThan(0, count($successfulResponses));
    }
}