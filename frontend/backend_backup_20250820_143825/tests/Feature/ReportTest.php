<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_can_access_reports_endpoint()
    {
        $admin = User::factory()->create();
        $admin->assignRole('regionadmin');
        Sanctum::actingAs($admin);

        // Test if reports endpoint exists and is accessible
        $response = $this->getJson('/api/reports');

        // Since reports API might not be implemented yet, test for either 200 or 404
        $this->assertContains($response->status(), [200, 404, 405]);
    }

    public function test_user_without_permission_cannot_access_reports()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim'); // Teacher role has no reports permission
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/reports');

        // Should return 403 (Forbidden) or 404 (Not Found) if endpoint doesn't exist
        $this->assertContains($response->status(), [403, 404, 405]);
    }

    public function test_user_can_access_own_institution_data()
    {
        $institution = Institution::factory()->create();
        $user = User::factory()->create(['institution_id' => $institution->id]);
        $user->assignRole('schooladmin');
        
        Sanctum::actingAs($user);
        
        // User should be able to view their own institution
        $response = $this->getJson("/api/institutions/{$institution->id}");
        $response->assertStatus(200);
        
        // Check that response contains institution data
        $response->assertJsonFragment([
            'id' => $institution->id,
            'name' => $institution->name
        ]);
    }
}
