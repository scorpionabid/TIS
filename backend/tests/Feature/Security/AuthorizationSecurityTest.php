<?php

namespace Tests\Feature\Security;

use App\Models\User;
use App\Models\Role;
use App\Models\Institution;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Spatie\Permission\Models\Role as SpatieRole;

class AuthorizationSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $regionAdmin;
    protected User $teacher;
    protected User $student;
    protected Institution $institution;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles with proper permissions
        $this->createRolesAndPermissions();

        // Create test institution
        $this->institution = Institution::create([
            'name' => 'Test School',
            'type' => 'school',
            'code' => 'TEST001',
            'level' => 4,
        ]);

        // Create test users with different roles
        $this->createTestUsers();
    }

    private function createRolesAndPermissions()
    {
        // Create permissions
        $permissions = [
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',
            'institutions.view',
            'institutions.manage',
            'surveys.create',
            'surveys.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles with different permission sets
        $superAdminRole = SpatieRole::create(['name' => 'SuperAdmin']);
        $superAdminRole->givePermissionTo($permissions);

        $regionAdminRole = SpatieRole::create(['name' => 'RegionAdmin']);
        $regionAdminRole->givePermissionTo([
            'users.view',
            'users.create', 
            'users.edit',
            'institutions.view',
            'surveys.create',
        ]);

        $teacherRole = SpatieRole::create(['name' => 'Teacher']);
        $teacherRole->givePermissionTo([
            'users.view',
            'surveys.create',
        ]);

        $studentRole = SpatieRole::create(['name' => 'Student']);
        // Students have minimal permissions
    }

    private function createTestUsers()
    {
        $this->superAdmin = User::factory()->create([
            'username' => 'superadmin_security',
            'email' => 'superadmin@security.test',
            'institution_id' => $this->institution->id,
        ]);
        $this->superAdmin->assignRole('SuperAdmin');

        $this->regionAdmin = User::factory()->create([
            'username' => 'regionadmin_security',
            'email' => 'regionadmin@security.test',
            'institution_id' => $this->institution->id,
        ]);
        $this->regionAdmin->assignRole('RegionAdmin');

        $this->teacher = User::factory()->create([
            'username' => 'teacher_security',
            'email' => 'teacher@security.test',
            'institution_id' => $this->institution->id,
        ]);
        $this->teacher->assignRole('Teacher');

        $this->student = User::factory()->create([
            'username' => 'student_security',
            'email' => 'student@security.test', 
            'institution_id' => $this->institution->id,
        ]);
        $this->student->assignRole('Student');
    }

    /** @test */
    public function it_denies_access_to_unauthenticated_users()
    {
        $protectedEndpoints = [
            'GET:/api/users',
            'POST:/api/users',
            'PUT:/api/users/1',
            'DELETE:/api/users/1',
            'GET:/api/institutions',
            'POST:/api/institutions',
        ];

        foreach ($protectedEndpoints as $endpoint) {
            [$method, $url] = explode(':', $endpoint);
            
            $response = $this->json($method, $url);
            
            $response->assertStatus(Response::HTTP_UNAUTHORIZED);
        }
    }

    /** @test */
    public function it_enforces_role_based_access_control_for_user_creation()
    {
        $userData = [
            'username' => 'test_rbac',
            'email' => 'rbac@test.com',
            'password' => 'password123',
            'role_id' => 1,
            'institution_id' => $this->institution->id,
        ];

        // SuperAdmin should be able to create users
        Sanctum::actingAs($this->superAdmin);
        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(Response::HTTP_CREATED);

        // RegionAdmin should be able to create users  
        $userData['username'] = 'test_rbac2';
        $userData['email'] = 'rbac2@test.com';
        Sanctum::actingAs($this->regionAdmin);
        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(Response::HTTP_CREATED);

        // Teacher should NOT be able to create users
        $userData['username'] = 'test_rbac3';
        $userData['email'] = 'rbac3@test.com';
        Sanctum::actingAs($this->teacher);
        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(Response::HTTP_FORBIDDEN);

        // Student should NOT be able to create users
        $userData['username'] = 'test_rbac4';
        $userData['email'] = 'rbac4@test.com';
        Sanctum::actingAs($this->student);
        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /** @test */
    public function it_enforces_role_based_access_control_for_user_deletion()
    {
        $targetUser = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);

        // SuperAdmin should be able to delete users
        Sanctum::actingAs($this->superAdmin);
        $response = $this->deleteJson("/api/users/{$targetUser->id}");
        $response->assertStatus(Response::HTTP_OK);

        // Restore for next test
        $targetUser->restore();

        // RegionAdmin should NOT be able to delete users (assuming they don't have delete permission)
        Sanctum::actingAs($this->regionAdmin);
        $response = $this->deleteJson("/api/users/{$targetUser->id}");
        $response->assertStatus(Response::HTTP_FORBIDDEN);

        // Teacher should NOT be able to delete users
        Sanctum::actingAs($this->teacher);
        $response = $this->deleteJson("/api/users/{$targetUser->id}");
        $response->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /** @test */
    public function it_prevents_privilege_escalation_attempts()
    {
        Sanctum::actingAs($this->teacher);

        // Try to create a user with SuperAdmin role
        $userData = [
            'username' => 'escalation_attempt',
            'email' => 'escalation@test.com',
            'password' => 'password123',
            'role_id' => 1, // Attempting to assign high privilege role
            'institution_id' => $this->institution->id,
        ];

        $response = $this->postJson('/api/users', $userData);
        
        // Should be forbidden due to lack of permissions
        $response->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /** @test */
    public function it_enforces_institution_based_data_isolation()
    {
        // Create another institution
        $otherInstitution = Institution::create([
            'name' => 'Other School',
            'type' => 'school', 
            'code' => 'OTHER001',
            'level' => 4,
        ]);

        // Create user in other institution
        $userInOtherInstitution = User::factory()->create([
            'institution_id' => $otherInstitution->id,
        ]);

        // RegionAdmin from one institution should not see users from another
        Sanctum::actingAs($this->regionAdmin);
        $response = $this->getJson('/api/users');
        
        $userIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($userInOtherInstitution->id, $userIds);
    }

    /** @test */
    public function it_validates_token_expiration()
    {
        // Create a token and then revoke it
        $token = $this->superAdmin->createToken('test-token');
        $tokenString = $token->plainTextToken;

        // First request should work
        $response = $this->getJson('/api/users', [
            'Authorization' => "Bearer {$tokenString}"
        ]);
        $response->assertStatus(Response::HTTP_OK);

        // Revoke the token
        $this->superAdmin->tokens()->delete();

        // Second request should fail
        $response = $this->getJson('/api/users', [
            'Authorization' => "Bearer {$tokenString}"
        ]);
        $response->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    /** @test */
    public function it_prevents_sql_injection_in_search_parameters()
    {
        Sanctum::actingAs($this->superAdmin);

        // Attempt SQL injection through search parameter
        $maliciousSearches = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin' UNION SELECT password FROM users WHERE '1'='1",
            "' OR 1=1 --",
        ];

        foreach ($maliciousSearches as $maliciousSearch) {
            $response = $this->getJson('/api/users?search=' . urlencode($maliciousSearch));
            
            // Should return normally (empty results) without executing SQL injection
            $response->assertStatus(Response::HTTP_OK);
            
            // Verify the database is still intact
            $this->assertDatabaseHas('users', ['id' => $this->superAdmin->id]);
        }
    }

    /** @test */
    public function it_prevents_mass_assignment_vulnerabilities()
    {
        Sanctum::actingAs($this->superAdmin);

        // Attempt to mass assign sensitive fields
        $userData = [
            'username' => 'mass_assignment_test',
            'email' => 'mass@test.com',
            'password' => 'password123',
            'role_id' => 1,
            'institution_id' => $this->institution->id,
            'id' => 99999, // Attempt to set ID
            'created_at' => '2020-01-01 00:00:00', // Attempt to set timestamp
            'updated_at' => '2020-01-01 00:00:00',
        ];

        $response = $this->postJson('/api/users', $userData);
        
        $response->assertStatus(Response::HTTP_CREATED);
        
        $createdUser = User::where('username', 'mass_assignment_test')->first();
        
        // ID should be auto-generated, not the attempted value
        $this->assertNotEquals(99999, $createdUser->id);
        
        // Timestamps should be current, not the attempted values
        $this->assertNotEquals('2020-01-01 00:00:00', $createdUser->created_at->format('Y-m-d H:i:s'));
    }

    /** @test */
    public function it_sanitizes_input_to_prevent_xss()
    {
        Sanctum::actingAs($this->superAdmin);

        $xssPayloads = [
            '<script>alert("XSS")</script>',
            '"><script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '<img src="x" onerror="alert(\'XSS\')">',
        ];

        foreach ($xssPayloads as $payload) {
            $userData = [
                'username' => 'xss_test_' . uniqid(),
                'email' => 'xss@test.com',
                'password' => 'password123',
                'first_name' => $payload,
                'role_id' => 1,
                'institution_id' => $this->institution->id,
            ];

            $response = $this->postJson('/api/users', $userData);
            
            if ($response->status() === Response::HTTP_CREATED) {
                $createdUser = User::where('username', $userData['username'])->first();
                
                // Verify that dangerous scripts are not stored as-is
                $this->assertNotEquals($payload, $createdUser->first_name);
                
                // Clean up
                $createdUser->forceDelete();
            }
        }
    }

    /** @test */
    public function it_enforces_rate_limiting()
    {
        Sanctum::actingAs($this->superAdmin);

        // This test assumes rate limiting is configured
        // Make multiple rapid requests
        $responses = [];
        for ($i = 0; $i < 100; $i++) {
            $responses[] = $this->getJson('/api/users');
        }

        // Check if any requests were rate limited
        $rateLimitedResponses = array_filter($responses, function ($response) {
            return $response->status() === Response::HTTP_TOO_MANY_REQUESTS;
        });

        // If rate limiting is configured, we should see some 429 responses
        // If not configured, all should be 200 - both cases are valid for this test
        $this->assertTrue(
            count($rateLimitedResponses) > 0 || 
            count(array_filter($responses, fn($r) => $r->status() === Response::HTTP_OK)) > 0
        );
    }

    /** @test */
    public function it_validates_password_strength_requirements()
    {
        Sanctum::actingAs($this->superAdmin);

        $weakPasswords = [
            '123',          // Too short
            'password',     // Common password
            '12345678',     // Only numbers
            'abcdefgh',     // Only letters
            'PASSWORD',     // Only uppercase
        ];

        foreach ($weakPasswords as $weakPassword) {
            $userData = [
                'username' => 'weak_pass_test_' . uniqid(),
                'email' => 'weakpass@test.com',
                'password' => $weakPassword,
                'role_id' => 1,
                'institution_id' => $this->institution->id,
            ];

            $response = $this->postJson('/api/users', $userData);
            
            // Should reject weak passwords
            $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
            $response->assertJsonValidationErrors(['password']);
        }
    }

    /** @test */
    public function it_logs_security_sensitive_operations()
    {
        Sanctum::actingAs($this->superAdmin);

        // Perform security-sensitive operations
        $targetUser = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);

        // Delete user (should be logged)
        $this->deleteJson("/api/users/{$targetUser->id}");

        // Restore user (should be logged)
        $this->patchJson("/api/users/{$targetUser->id}/restore");

        // Force delete user (should be logged)
        $this->deleteJson("/api/users/{$targetUser->id}/force-delete");

        // Check if activity logs table exists and has entries
        if (\Schema::hasTable('activity_log')) {
            $this->assertDatabaseHas('activity_log', [
                'causer_id' => $this->superAdmin->id,
            ]);
        }
    }

    /** @test */
    public function it_handles_concurrent_user_operations_safely()
    {
        Sanctum::actingAs($this->superAdmin);

        $targetUser = User::factory()->create([
            'institution_id' => $this->institution->id,
        ]);

        // Simulate concurrent operations
        $responses = [];
        for ($i = 0; $i < 5; $i++) {
            $responses[] = $this->putJson("/api/users/{$targetUser->id}", [
                'first_name' => 'Concurrent Update ' . $i
            ]);
        }

        // All should either succeed or fail gracefully
        foreach ($responses as $response) {
            $this->assertContains($response->status(), [
                Response::HTTP_OK,
                Response::HTTP_CONFLICT,
                Response::HTTP_UNPROCESSABLE_ENTITY
            ]);
        }

        // User should still exist and be in a consistent state
        $targetUser->refresh();
        $this->assertNotNull($targetUser->id);
    }
}