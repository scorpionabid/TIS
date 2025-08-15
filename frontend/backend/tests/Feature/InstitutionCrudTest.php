<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class InstitutionCrudTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test user with admin role for API testing
        $this->testUser = User::factory()->create([
            'username' => 'testadmin',
            'email' => 'admin@test.com',
            'is_active' => true,
        ]);

        // Create auth token for API testing
        $this->token = $this->testUser->createToken('test-token')->plainTextToken;
    }

    /**
     * Test institution creation via API
     *
     * @return void
     */
    public function test_can_create_institution_via_api()
    {
        $institutionData = [
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
            'address' => 'Test ünvanı',
            'phone' => '+994501234567',
            'email' => 'test@school.edu.az',
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/institutions', $institutionData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'institution' => [
                        'id',
                        'name',
                        'level',
                        'type',
                        'is_active',
                        'created_at',
                        'updated_at'
                    ]
                ]);

        $this->assertDatabaseHas('institutions', [
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);
    }

    /**
     * Test institution creation validation
     *
     * @return void
     */
    public function test_institution_creation_validation()
    {
        // Test empty data
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/institutions', []);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name', 'level', 'type']);

        // Test invalid level
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/institutions', [
            'name' => 'Test Institution',
            'level' => 10, // Invalid level
            'type' => 'school',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['level']);

        // Test invalid type
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson('/api/institutions', [
            'name' => 'Test Institution',
            'level' => 4,
            'type' => 'invalid_type',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['type']);
    }

    /**
     * Test institution retrieval via API
     *
     * @return void
     */
    public function test_can_retrieve_institutions_via_api()
    {
        // Create test institutions with different levels
        Institution::factory()->create([
            'name' => 'Təhsil Nazirliyi',
            'level' => 1,
            'type' => 'ministry',
        ]);

        Institution::factory()->create([
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'level' => 2,
            'type' => 'region',
        ]);

        Institution::factory()->create([
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/institutions');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'level',
                            'type',
                            'is_active',
                            'created_at',
                            'updated_at'
                        ]
                    ],
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total',
                        'last_page'
                    ]
                ]);

        $this->assertCount(3, $response->json('data'));
    }

    /**
     * Test single institution retrieval
     *
     * @return void
     */
    public function test_can_retrieve_single_institution()
    {
        $institution = Institution::factory()->create([
            'name' => 'Tək Məktəb',
            'level' => 4,
            'type' => 'school',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson("/api/institutions/{$institution->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'data' => [
                        'id' => $institution->id,
                        'name' => 'Tək Məktəb',
                        'level' => 4,
                        'type' => 'school',
                    ]
                ]);
    }

    /**
     * Test institution update via API
     *
     * @return void
     */
    public function test_can_update_institution_via_api()
    {
        $institution = Institution::factory()->create([
            'name' => 'Köhnə Ad',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);

        $updateData = [
            'name' => 'Yeni Ad',
            'is_active' => false,
            'address' => 'Yeni ünvan',
            'phone' => '+994501234567',
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->putJson("/api/institutions/{$institution->id}", $updateData);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Təssisət uğurla yeniləndi',
                    'data' => [
                        'id' => $institution->id,
                        'name' => 'Yeni Ad',
                        'is_active' => false,
                    ]
                ]);

        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'name' => 'Yeni Ad',
            'is_active' => false,
        ]);
    }

    /**
     * Test institution deletion via API
     *
     * @return void
     */
    public function test_can_delete_institution_via_api()
    {
        $institution = Institution::factory()->create([
            'name' => 'Silinəcək Məktəb',
            'level' => 4,
            'type' => 'school',
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->deleteJson("/api/institutions/{$institution->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Təssisət uğurla silindi'
                ]);

        $this->assertDatabaseMissing('institutions', [
            'id' => $institution->id,
        ]);
    }

    /**
     * Test institution search functionality
     *
     * @return void
     */
    public function test_can_search_institutions()
    {
        Institution::factory()->create([
            'name' => 'Bakı Məktəbi',
            'level' => 4,
            'type' => 'school',
        ]);

        Institution::factory()->create([
            'name' => 'Gəncə Məktəbi',
            'level' => 4,
            'type' => 'school',
        ]);

        // Search by name
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/institutions?search=Bakı');

        $response->assertStatus(200);
        $institutions = $response->json('data');
        
        $this->assertGreaterThanOrEqual(1, count($institutions));
        $this->assertStringContainsString('Bakı', $institutions[0]['name']);
    }

    /**
     * Test institution filtering by level
     *
     * @return void
     */
    public function test_can_filter_institutions_by_level()
    {
        Institution::factory()->create([
            'name' => 'Nazirlik',
            'level' => 1,
            'type' => 'ministry',
        ]);

        Institution::factory()->create([
            'name' => 'İdarə',
            'level' => 2,
            'type' => 'region',
        ]);

        Institution::factory()->create([
            'name' => 'Məktəb',
            'level' => 4,
            'type' => 'school',
        ]);

        // Filter by level 4 (schools)
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/institutions?level=4');

        $response->assertStatus(200);
        $institutions = $response->json('data');
        
        $this->assertCount(1, $institutions);
        $this->assertEquals(4, $institutions[0]['level']);
        $this->assertEquals('school', $institutions[0]['type']);
    }

    /**
     * Test institution filtering by type
     *
     * @return void
     */
    public function test_can_filter_institutions_by_type()
    {
        Institution::factory()->create([
            'name' => 'Birinci Məktəb',
            'level' => 4,
            'type' => 'school',
        ]);

        Institution::factory()->create([
            'name' => 'İkinci Məktəb',
            'level' => 4,
            'type' => 'school',
        ]);

        Institution::factory()->create([
            'name' => 'Regional İdarə',
            'level' => 2,
            'type' => 'region',
        ]);

        // Filter by type school
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/institutions?type=school');

        $response->assertStatus(200);
        $institutions = $response->json('data');
        
        $this->assertCount(2, $institutions);
        foreach ($institutions as $institution) {
            $this->assertEquals('school', $institution['type']);
        }
    }

    /**
     * Test institution hierarchy relationships
     *
     * @return void
     */
    public function test_institution_hierarchy_relationships()
    {
        $ministry = Institution::factory()->create([
            'name' => 'Təhsil Nazirliyi',
            'level' => 1,
            'type' => 'ministry',
            'parent_id' => null,
        ]);

        $region = Institution::factory()->create([
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'level' => 2,
            'type' => 'region',
            'parent_id' => $ministry->id,
        ]);

        $school = Institution::factory()->create([
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
            'parent_id' => $region->id,
        ]);

        // Test hierarchy endpoint
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/institutions/hierarchy');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'level',
                            'type',
                            'children_count',
                            'children' => [
                                '*' => [
                                    'id',
                                    'name',
                                    'level',
                                    'type'
                                ]
                            ]
                        ]
                    ]
                ]);
    }

    /**
     * Test institution status toggle
     *
     * @return void
     */
    public function test_can_toggle_institution_status()
    {
        $institution = Institution::factory()->create([
            'name' => 'Status Test Məktəbi',
            'level' => 4,
            'type' => 'school',
            'is_active' => true,
        ]);

        // Deactivate institution
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson("/api/institutions/{$institution->id}/toggle-status");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Təssisət statusu dəyişdirildi',
                    'data' => [
                        'is_active' => false
                    ]
                ]);

        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'is_active' => false,
        ]);

        // Reactivate institution
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->postJson("/api/institutions/{$institution->id}/toggle-status");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Təssisət statusu dəyişdirildi',
                    'data' => [
                        'is_active' => true
                    ]
                ]);

        $this->assertDatabaseHas('institutions', [
            'id' => $institution->id,
            'is_active' => true,
        ]);
    }

    /**
     * Test institution statistics
     *
     * @return void
     */
    public function test_institution_statistics()
    {
        // Create institutions at different levels
        Institution::factory()->create(['level' => 1, 'type' => 'ministry']);
        Institution::factory()->count(5)->create(['level' => 2, 'type' => 'region']);
        Institution::factory()->count(15)->create(['level' => 3, 'type' => 'sector']);
        Institution::factory()->count(100)->create(['level' => 4, 'type' => 'school']);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
        ])->getJson('/api/institutions/statistics');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'total_institutions',
                        'by_level' => [
                            '1',
                            '2',
                            '3',
                            '4'
                        ],
                        'by_type' => [
                            'ministry',
                            'region',
                            'sector',
                            'school'
                        ],
                        'active_count',
                        'inactive_count'
                    ]
                ]);

        $stats = $response->json('data');
        $this->assertEquals(121, $stats['total_institutions']);
        $this->assertEquals(1, $stats['by_level']['1']);
        $this->assertEquals(5, $stats['by_level']['2']);
        $this->assertEquals(15, $stats['by_level']['3']);
        $this->assertEquals(100, $stats['by_level']['4']);
    }

    /**
     * Test unauthorized access
     *
     * @return void
     */
    public function test_unauthorized_access_denied()
    {
        // Test without token
        $response = $this->postJson('/api/institutions', [
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
        ]);

        $response->assertStatus(401);

        // Test with invalid token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer invalid-token',
            'Accept' => 'application/json',
        ])->postJson('/api/institutions', [
            'name' => 'Test Məktəbi',
            'level' => 4,
            'type' => 'school',
        ]);

        $response->assertStatus(401);
    }
}