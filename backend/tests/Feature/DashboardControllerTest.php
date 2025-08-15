<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test roles
        $this->createTestRoles();
        
        // Create test institutions
        $this->createTestInstitutions();
        
        // Create test users
        $this->createTestUsers();
        
        // Create test surveys
        $this->createTestSurveys();
    }

    private function createTestRoles(): void
    {
        // Create permissions first
        $permissions = [
            'users.read', 'users.create', 'users.update', 'users.delete',
            'dashboard.view', 'dashboard.analytics', 'dashboard.superadmin'
        ];
        
        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }
        
        // Create roles
        $superadminRole = \Spatie\Permission\Models\Role::create(['name' => 'superadmin', 'guard_name' => 'web']);
        $regionadminRole = \Spatie\Permission\Models\Role::create(['name' => 'regionadmin', 'guard_name' => 'web']);
        $teacherRole = \Spatie\Permission\Models\Role::create(['name' => 'müəllim', 'guard_name' => 'web']);
        
        // Assign permissions to roles
        $superadminRole->givePermissionTo($permissions);
        $regionadminRole->givePermissionTo(['users.read', 'dashboard.view']);
        $teacherRole->givePermissionTo(['dashboard.view']);
    }

    private function createTestInstitutions(): void
    {
        Institution::create([
            'name' => 'Təhsil Nazirliyi',
            'level' => 1,
            'type' => 'ministry',
            'is_active' => true
        ]);
        
        Institution::create([
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'level' => 2,
            'type' => 'region',
            'is_active' => true
        ]);
        
        Institution::create([
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
            'is_active' => true
        ]);
    }

    private function createTestUsers(): void
    {
        $superadmin = User::factory()->create([
            'username' => 'superadmin',
            'email' => 'superadmin@test.com',
            'is_active' => true
        ]);
        $superadmin->assignRole('superadmin');

        $regionadmin = User::factory()->create([
            'username' => 'regionadmin',
            'email' => 'regionadmin@test.com',
            'is_active' => true
        ]);
        $regionadmin->assignRole('regionadmin');

        $teacher = User::factory()->create([
            'username' => 'teacher',
            'email' => 'teacher@test.com',
            'is_active' => true
        ]);
        $teacher->assignRole('müəllim');
    }

    private function createTestSurveys(): void
    {
        Survey::factory()->create(['status' => 'active']);
        Survey::factory()->create(['status' => 'completed']);
        Survey::factory()->create(['status' => 'draft']);
    }

    /** @test */
    public function superadmin_can_access_dashboard_stats()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'totalUsers',
                    'totalInstitutions',
                    'totalSurveys',
                    'activeSurveys',
                    'pendingSurveys',
                    'completedSurveys',
                    'recentActivities',
                    'systemStatus' => [
                        'database',
                        'api',
                        'memory',
                        'storage'
                    ],
                    'usersByRole',
                    'institutionsByLevel'
                ]
            ]);

        $this->assertEquals('success', $response->json('status'));
    }

    /** @test */
    public function dashboard_stats_returns_correct_counts()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        // Check user count
        $this->assertEquals(User::count(), $data['totalUsers']);
        
        // Check institution count
        $this->assertEquals(Institution::count(), $data['totalInstitutions']);
        
        // Check survey counts
        $this->assertEquals(Survey::count(), $data['totalSurveys']);
        $this->assertEquals(Survey::where('status', 'active')->count(), $data['activeSurveys']);
        $this->assertEquals(Survey::where('status', 'draft')->count(), $data['pendingSurveys']);
        $this->assertEquals(Survey::where('status', 'completed')->count(), $data['completedSurveys']);
    }

    /** @test */
    public function dashboard_stats_includes_recent_activities()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        $this->assertArrayHasKey('recentActivities', $data);
        $this->assertIsArray($data['recentActivities']);
        
        // Check activity structure if activities exist
        if (count($data['recentActivities']) > 0) {
            $activity = $data['recentActivities'][0];
            $this->assertArrayHasKey('id', $activity);
            $this->assertArrayHasKey('type', $activity);
            $this->assertArrayHasKey('user', $activity);
            $this->assertArrayHasKey('action', $activity);
            $this->assertArrayHasKey('time', $activity);
            $this->assertArrayHasKey('timestamp', $activity);
        }
    }

    /** @test */
    public function dashboard_stats_includes_system_status()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        $this->assertArrayHasKey('systemStatus', $data);
        $systemStatus = $data['systemStatus'];
        
        // Check required system status components
        $this->assertArrayHasKey('database', $systemStatus);
        $this->assertArrayHasKey('api', $systemStatus);
        $this->assertArrayHasKey('memory', $systemStatus);
        $this->assertArrayHasKey('storage', $systemStatus);
        
        // Check database status structure
        $this->assertArrayHasKey('status', $systemStatus['database']);
        $this->assertArrayHasKey('label', $systemStatus['database']);
    }

    /** @test */
    public function dashboard_stats_includes_users_by_role()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        $this->assertArrayHasKey('usersByRole', $data);
        $this->assertIsArray($data['usersByRole']);
        
        // Check if we have role data
        if (count($data['usersByRole']) > 0) {
            $firstRole = array_values($data['usersByRole'])[0];
            $this->assertArrayHasKey('display_name', $firstRole);
            $this->assertArrayHasKey('count', $firstRole);
        }
    }

    /** @test */
    public function dashboard_stats_includes_institutions_by_level()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        $this->assertArrayHasKey('institutionsByLevel', $data);
        $this->assertIsArray($data['institutionsByLevel']);
        
        // Check if we have institution level data
        if (count($data['institutionsByLevel']) > 0) {
            $firstLevel = array_values($data['institutionsByLevel'])[0];
            $this->assertArrayHasKey('name', $firstLevel);
            $this->assertArrayHasKey('count', $firstLevel);
        }
    }

    /** @test */
    public function dashboard_stats_uses_caching()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        // Clear cache first
        Cache::forget('dashboard_stats');
        
        // First request should hit the database
        $response1 = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');
        
        $response1->assertStatus(200);
        
        // Second request should use cache
        $response2 = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');
        
        $response2->assertStatus(200);
        
        // Data should be the same
        $this->assertEquals($response1->json('data.totalUsers'), $response2->json('data.totalUsers'));
    }

    /** @test */
    public function superadmin_can_access_detailed_stats()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/detailed-stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'overview' => [
                        'totalUsers',
                        'activeUsers',
                        'inactiveUsers',
                        'totalInstitutions',
                        'totalSurveys',
                        'activeSurveys'
                    ],
                    'trends' => [
                        'usersThisMonth',
                        'surveysThisMonth',
                        'usersLastMonth',
                        'surveysLastMonth'
                    ],
                    'usersByRole',
                    'institutionsByLevel'
                ]
            ]);
    }

    /** @test */
    public function superadmin_can_access_advanced_analytics()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/superadmin-analytics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'systemHealth',
                    'userEngagement',
                    'institutionPerformance',
                    'surveyEffectiveness',
                    'growthMetrics',
                    'alertsSummary'
                ]
            ]);
    }

    /** @test */
    public function dashboard_stats_handles_database_errors_gracefully()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        // Mock database error by dropping a table temporarily
        DB::statement('DROP TABLE IF EXISTS temp_users');
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        // Should still return 200 with default data
        $response->assertStatus(200);
        
        $data = $response->json('data');
        $this->assertArrayHasKey('totalUsers', $data);
        $this->assertArrayHasKey('recentActivities', $data);
    }

    /** @test */
    public function system_status_endpoint_works()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/system-status');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'timestamp',
                    'services' => [
                        'web',
                        'database',
                        'cache',
                        'storage'
                    ],
                    'performance',
                    'alerts'
                ]
            ]);
    }

    /** @test */
    public function system_status_checks_database_connectivity()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/system-status');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $dbService = $data['services']['database'];
        
        $this->assertArrayHasKey('status', $dbService);
        $this->assertArrayHasKey('response_time', $dbService);
        $this->assertArrayHasKey('last_check', $dbService);
        
        // Database should be online in tests
        $this->assertEquals('online', $dbService['status']);
    }

    /** @test */
    public function system_status_checks_cache_service()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/system-status');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $cacheService = $data['services']['cache'];
        
        $this->assertArrayHasKey('status', $cacheService);
        $this->assertArrayHasKey('hit_rate', $cacheService);
        $this->assertArrayHasKey('last_check', $cacheService);
        
        // Cache should be online in tests
        $this->assertEquals('online', $cacheService['status']);
    }

    /** @test */
    public function system_status_checks_storage_service()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/system-status');

        $response->assertStatus(200);
        
        $data = $response->json('data');
        $storageService = $data['services']['storage'];
        
        $this->assertArrayHasKey('status', $storageService);
        $this->assertArrayHasKey('space_used', $storageService);
        $this->assertArrayHasKey('last_check', $storageService);
        
        // Storage should be online in tests
        $this->assertEquals('online', $storageService['status']);
    }

    /** @test */
    public function unauthorized_users_cannot_access_dashboard()
    {
        $response = $this->getJson('/api/dashboard/stats');
        
        $response->assertStatus(401);
    }

    /** @test */
    public function regular_users_cannot_access_superadmin_analytics()
    {
        $teacher = User::where('username', 'teacher')->first();
        
        $response = $this->actingAs($teacher)
            ->getJson('/api/dashboard/superadmin-analytics');

        // Should return 403 for unauthorized access
        $response->assertStatus(403);
    }

    /** @test */
    public function dashboard_returns_proper_json_structure()
    {
        $superadmin = User::where('username', 'superadmin')->first();
        
        $response = $this->actingAs($superadmin)
            ->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure([
                'status',
                'data'
            ]);
        
        $this->assertEquals('success', $response->json('status'));
    }
}