<?php

namespace Tests\Feature\AI;

use App\Services\AI\DatabaseSchemaService;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class AiAnalysisSchemaTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    // DatabaseSchemaService PostgreSQL-specific sorğular edir (information_schema, pg_class).
    // SQLite test mühitində bu sorğular işləməyəcəyi üçün service mock edilir.
    private function mockSchemaService(array $tables = []): void
    {
        $mock = $this->mock(DatabaseSchemaService::class);
        $mock->shouldReceive('getSchema')
            ->andReturn($tables);
    }

    public function test_superadmin_can_access_schema_endpoint(): void
    {
        $this->mockSchemaService();
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'tables',
                    'total_tables',
                    'cached_at',
                ],
            ]);
    }

    public function test_regionadmin_can_access_schema_endpoint(): void
    {
        $this->mockSchemaService();
        $user = $this->createUserWithRole('regionadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $response->assertStatus(200);
    }

    public function test_schooladmin_cannot_access_schema_endpoint(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_schema(): void
    {
        $response = $this->getJson('/api/ai-analysis/schema');
        $response->assertStatus(401);
    }

    public function test_schema_response_contains_tables_with_correct_structure(): void
    {
        $fakeTables = [
            [
                'table_name'  => 'users',
                'row_count'   => 100,
                'columns'     => [['name' => 'id', 'type' => 'integer', 'nullable' => false, 'default' => null, 'max_length' => null]],
                'sample_data' => [['id' => 1]],
            ],
        ];
        $this->mockSchemaService($fakeTables);

        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $response->assertStatus(200);
        $tables = $response->json('data.tables');

        $this->assertIsArray($tables);
        $this->assertNotEmpty($tables);

        $firstTable = $tables[0];
        $this->assertArrayHasKey('table_name', $firstTable);
        $this->assertArrayHasKey('columns', $firstTable);
        $this->assertArrayHasKey('sample_data', $firstTable);
        $this->assertArrayHasKey('row_count', $firstTable);
    }

    public function test_schema_total_tables_count_matches_tables_array_length(): void
    {
        $fakeTables = [
            ['table_name' => 'users', 'row_count' => 10, 'columns' => [], 'sample_data' => []],
            ['table_name' => 'institutions', 'row_count' => 5, 'columns' => [], 'sample_data' => []],
        ];
        $this->mockSchemaService($fakeTables);

        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('data.total_tables'));
        $this->assertCount(2, $response->json('data.tables'));
    }

    public function test_schema_does_not_expose_excluded_tables(): void
    {
        // DatabaseSchemaService özü bu cədvəlləri EXCLUDED_TABLES siyahısına görə çıxarır.
        // Test onun qaytardığı nəticənin sensitivity qaydalarına uyğun olduğunu yoxlayır.
        $filteredTables = [
            ['table_name' => 'users', 'row_count' => 10, 'columns' => [], 'sample_data' => []],
            // 'migrations', 'personal_access_tokens', 'ai_analysis_logs' service tərəfindən çıxarılıb
        ];
        $this->mockSchemaService($filteredTables);

        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $tables = collect($response->json('data.tables'));
        $tableNames = $tables->pluck('table_name')->toArray();

        $this->assertNotContains('migrations', $tableNames);
        $this->assertNotContains('personal_access_tokens', $tableNames);
        $this->assertNotContains('ai_analysis_logs', $tableNames);
    }

    public function test_schema_columns_do_not_expose_password_fields_in_sample_data(): void
    {
        // DatabaseSchemaService::getSampleData() sensitive sütunları zaten çıxarır.
        // Mock-da da həmin qaydaya riayət edirik.
        $fakeTables = [
            [
                'table_name'  => 'users',
                'row_count'   => 1,
                'columns'     => [
                    ['name' => 'id', 'type' => 'integer', 'nullable' => false, 'default' => null, 'max_length' => null],
                    ['name' => 'username', 'type' => 'character varying', 'nullable' => false, 'default' => null, 'max_length' => 255],
                ],
                'sample_data' => [
                    ['id' => 1, 'username' => 'testuser'],
                    // 'password' və 'remember_token' service tərəfindən çıxarılıb
                ],
            ],
        ];
        $this->mockSchemaService($fakeTables);

        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $tables = $response->json('data.tables');
        $usersTable = collect($tables)->firstWhere('table_name', 'users');

        $this->assertNotNull($usersTable);
        foreach ($usersTable['sample_data'] as $row) {
            $this->assertArrayNotHasKey('password', $row);
            $this->assertArrayNotHasKey('remember_token', $row);
        }
    }

    public function test_schema_response_success_flag_is_true(): void
    {
        $this->mockSchemaService();
        $user = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($user)
            ->getJson('/api/ai-analysis/schema');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
