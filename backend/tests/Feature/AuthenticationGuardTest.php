<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Authentication Guard Test Suite
 *
 * Validates multi-guard authentication system:
 * - Sanctum (Bearer token) authentication
 * - Web (session-based) authentication
 * - Unauthorized access handling
 *
 * @package Tests\Feature
 */
class AuthenticationGuardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test successful authentication with Sanctum token
     *
     * @return void
     */
    public function test_sanctum_guard_authentication_with_token(): void
    {
        $user = User::factory()->create([
            'email' => 'sanctum.test@atis.az',
            'password' => bcrypt('test-password-123'),
        ]);

        // Create Sanctum token
        $token = $user->createToken('test-token')->plainTextToken;

        // Make authenticated request with Bearer token
        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/me');

        $response->assertOk()
                 ->assertJsonFragment([
                     'id' => $user->id,
                     'email' => $user->email,
                 ]);
    }

    /**
     * Test successful authentication with web session
     *
     * @return void
     */
    public function test_web_guard_authentication_with_session(): void
    {
        $user = User::factory()->create([
            'email' => 'session.test@atis.az',
            'password' => bcrypt('test-password-456'),
        ]);

        // Authenticate with web guard (session)
        $response = $this->actingAs($user, 'web')
                         ->getJson('/api/me');

        $response->assertOk()
                 ->assertJsonFragment([
                     'id' => $user->id,
                     'email' => $user->email,
                 ]);
    }

    /**
     * Test unauthenticated request returns 401
     *
     * @return void
     */
    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertUnauthorized();
    }

    /**
     * Test invalid token returns 401
     *
     * @return void
     */
    public function test_invalid_token_returns_401(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid-token-xyz')
                         ->getJson('/api/me');

        $response->assertUnauthorized();
    }

    /**
     * Test token-based access to protected route
     *
     * @return void
     */
    public function test_token_access_to_protected_route(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;

        // Test access to devices endpoint (requires auth)
        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->getJson('/api/devices');

        // Should be authenticated (not 401), may return 200, 403, or empty data
        $this->assertNotEquals(401, $response->status());
    }

    /**
     * Test CSRF protection is not required for Sanctum token auth
     *
     * @return void
     */
    public function test_csrf_not_required_for_token_auth(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;

        // POST request without CSRF token should work with Bearer auth
        $response = $this->withHeader('Authorization', "Bearer $token")
                         ->postJson('/api/users/search', [
                             'query' => 'test',
                         ]);

        // Should not return 419 (CSRF token mismatch)
        $this->assertNotEquals(419, $response->status());
    }

    /**
     * Ensure seeded superadmin has Sanctum access to institutions API.
     */
    public function test_superadmin_institutions_access_via_sanctum_token(): void
    {
        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            SuperAdminSeeder::class,
        ]);

        $superadmin = User::where('username', 'superadmin')->firstOrFail();
        $token = $superadmin->createToken('integration-test')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/institutions');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'current_page',
                'per_page',
            ]);
    }
}
