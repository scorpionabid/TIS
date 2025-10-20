<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InstitutionCreationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RoleSeeder::class,
            \Database\Seeders\PermissionSeeder::class,
        ]);

        $this->superadmin = User::factory()->create([
            'is_active' => true,
        ]);

        $this->superadmin->assignRole('superadmin');
        $this->superadmin->givePermissionTo(
            Permission::where('guard_name', 'web')->pluck('name')->all()
        );

        Sanctum::actingAs($this->superadmin);
    }

    public function test_complete_institution_creation_workflow(): void
    {
        Log::info('=== Starting Institution Creation Test ===');

        // Ministry (level 1)
        $ministryData = [
            'name' => 'Azərbaycan Respublikası Təhsil Nazirliyi',
            'short_name' => 'TN',
            'type' => 'ministry',
            'level' => 1,
            'institution_code' => 'MIN-' . Str::upper(Str::random(6)),
            'region_code' => 'AZ-00',
            'is_active' => true,
            'established_date' => '1991-10-18',
        ];

        $this->postJson('/api/institutions', $ministryData)
            ->assertCreated()
            ->assertJsonFragment([
                'name' => $ministryData['name'],
                'type' => 'ministry',
                'level' => 1,
            ]);

        $ministry = Institution::where('institution_code', $ministryData['institution_code'])->firstOrFail();

        // Region (level 2)
        $regionData = [
            'name' => 'Bakı Şəhər Təhsil İdarəsi',
            'short_name' => 'BTİ',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'institution_code' => 'REG-' . Str::upper(Str::random(6)),
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '1995-01-15',
        ];

        $this->postJson('/api/institutions', $regionData)
            ->assertCreated()
            ->assertJsonFragment([
                'name' => $regionData['name'],
                'type' => 'region',
                'level' => 2,
            ]);

        $region = Institution::where('institution_code', $regionData['institution_code'])->firstOrFail();

        // Sector (level 3)
        $sectorData = [
            'name' => 'Ümumi Təhsil Sektoru',
            'short_name' => 'ÜTS',
            'type' => 'sektor',
            'level' => 3,
            'parent_id' => $region->id,
            'institution_code' => 'SEC-' . Str::upper(Str::random(6)),
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '2000-09-01',
        ];

        $this->postJson('/api/institutions', $sectorData)
            ->assertCreated()
            ->assertJsonFragment([
                'name' => $sectorData['name'],
                'type' => 'sektor',
                'level' => 3,
            ]);

        $sector = Institution::where('institution_code', $sectorData['institution_code'])->firstOrFail();

        // School (level 4)
        $schoolData = [
            'name' => '153 nömrəli tam orta məktəb',
            'short_name' => '153 Məktəb',
            'type' => 'school',
            'level' => 4,
            'parent_id' => $sector->id,
            'institution_code' => 'SCH-' . Str::upper(Str::random(6)),
            'region_code' => 'AZ-BA',
            'is_active' => true,
            'established_date' => '1965-09-01',
        ];

        $this->postJson('/api/institutions', $schoolData)
            ->assertCreated()
            ->assertJsonFragment([
                'name' => $schoolData['name'],
                'type' => 'school',
                'level' => 4,
            ]);

        // Validate hierarchy endpoint
        $hierarchyResponse = $this->getJson('/api/hierarchy');
        $hierarchyResponse->assertStatus(200)->assertJson(['success' => true]);

        $hierarchyData = $hierarchyResponse->json('data');
        $this->assertIsArray($hierarchyData);
        $this->assertGreaterThan(0, count($hierarchyData));

        $root = $hierarchyData[0];
        $this->assertEquals($ministry->id, $root['id']);
        $this->assertSame('ministry', $root['type']);
        $this->assertArrayHasKey('children', $root);
        $this->assertGreaterThan(0, count($root['children']));

        $regionNode = $root['children'][0];
        $this->assertEquals($region->id, $regionNode['id']);
        $this->assertSame('region', $regionNode['type']);
        $this->assertGreaterThan(0, count($regionNode['children']));

        $sectorNode = $regionNode['children'][0];
        $this->assertEquals($sector->id, $sectorNode['id']);
        $this->assertSame('sektor', $sectorNode['type']);
        $this->assertGreaterThan(0, count($sectorNode['children']));

        $schoolNode = $sectorNode['children'][0];
        $this->assertSame('school', $schoolNode['type']);

        Log::info('=== Institution Creation Test Completed Successfully ===');
    }

    public function test_institution_with_departments_creation(): void
    {
        Log::info('=== Starting Institution with Departments Test ===');

        $ministry = Institution::factory()->create([
            'name' => 'Test Ministry',
            'type' => 'ministry',
            'level' => 1,
            'parent_id' => null,
            'institution_code' => 'MIN-' . Str::upper(Str::random(5)),
            'region_code' => 'AZ-TM',
        ]);

        $regionPayload = [
            'name' => 'Test Regional Office',
            'short_name' => 'TRO',
            'type' => 'region',
            'level' => 2,
            'parent_id' => $ministry->id,
            'institution_code' => 'REG-' . Str::upper(Str::random(6)),
            'region_code' => 'AZ-TR',
            'is_active' => true,
        ];

        $this->postJson('/api/institutions', $regionPayload)->assertCreated();

        $region = Institution::where('institution_code', $regionPayload['institution_code'])->firstOrFail();

        $departmentPayload = [
            'name' => 'Maliyyə Şöbəsi',
            'short_name' => 'MS',
            'department_type' => 'maliyyə',
            'institution_id' => $region->id,
            'is_active' => true,
        ];

        $this->postJson('/api/departments', $departmentPayload)
            ->assertCreated()
            ->assertJsonFragment([
                'name' => 'Maliyyə Şöbəsi',
                'institution_id' => $region->id,
            ]);

        $hierarchyResponse = $this->getJson('/api/hierarchy');
        $hierarchyResponse->assertStatus(200)->assertJson(['success' => true]);

        $hierarchyData = $hierarchyResponse->json('data');
        $root = collect($hierarchyData)->firstWhere('id', $ministry->id);
        $this->assertNotNull($root);

        $regionNode = collect($root['children'])->firstWhere('id', $region->id);
        $this->assertNotNull($regionNode);

        $departmentNodes = collect($regionNode['children'] ?? [])
            ->where('type', 'department')
            ->values();

        $this->assertCount(1, $departmentNodes);
        $this->assertEquals('Maliyyə Şöbəsi', $departmentNodes->first()['name']);

        Log::info('=== Institution with Departments Test Completed Successfully ===');
    }
}
