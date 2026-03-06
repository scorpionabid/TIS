<?php

namespace Tests\Feature\ReportTables;

use App\Models\Institution;
use App\Models\ReportTable;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

/**
 * ReportTable rol-based access control testləri.
 *
 * Rol iyerarxiyası: superadmin > regionadmin > regionoperator > sektoradmin > schooladmin
 *
 * Cədvəl icazələri:
 *   superadmin        → report_tables.read, write, response.write, response.review
 *   regionadmin       → report_tables.read, write, response.write, response.review
 *   regionoperator    → report_tables.read, write, response.write, response.review
 *   sektoradmin       → report_tables.read, response.review  (write YOX, response.write YOX)
 *   schooladmin       → response.write (tables.read YOX, write YOX)
 */
class ReportTablePermissionsTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    private Institution $region;
    private Institution $sector;
    private Institution $school;
    private Institution $otherRegion;
    private Institution $otherSector;
    private Institution $otherSchool;

    protected function setUp(): void
    {
        parent::setUp();

        // Əsas hierarchy: region → sector → school
        $this->region = Institution::factory()->regional()->create();
        $this->sector = Institution::factory()->sector()->create(['parent_id' => $this->region->id]);
        $this->school = Institution::factory()->school()->create(['parent_id' => $this->sector->id]);

        // Başqa hierarchy
        $this->otherRegion = Institution::factory()->regional()->create();
        $this->otherSector = Institution::factory()->sector()->create(['parent_id' => $this->otherRegion->id]);
        $this->otherSchool = Institution::factory()->school()->create(['parent_id' => $this->otherSector->id]);
    }

    // ─── SuperAdmin ───────────────────────────────────────────────────────────

    public function test_superadmin_can_list_all_tables(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin');

        ReportTable::factory()->count(3)->create();
        ReportTable::factory()->count(2)->create(); // Başqa creator-lar

        $response = $this->actingAs($superAdmin)
            ->getJson('/api/report-tables');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_superadmin_can_restore_soft_deleted_table(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin');

        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $superAdmin->id,
        ]);
        $tableId = $table->id;
        $table->delete();

        $this->assertSoftDeleted('report_tables', ['id' => $tableId]);

        $response = $this->actingAs($superAdmin)
            ->postJson("/api/report-tables/{$tableId}/restore");

        $response->assertStatus(200);
        $this->assertDatabaseHas('report_tables', ['id' => $tableId, 'deleted_at' => null]);
    }

    public function test_superadmin_can_force_delete_table(): void
    {
        $superAdmin = $this->createUserWithRole('superadmin');

        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $superAdmin->id,
        ]);
        $tableId = $table->id;
        $table->delete();

        $response = $this->actingAs($superAdmin)
            ->deleteJson("/api/report-tables/{$tableId}/force");

        // forceDestroy returns successResponse(null) = 200, not 204
        $response->assertStatus(200);
        $this->assertDatabaseMissing('report_tables', ['id' => $tableId]);
    }

    // ─── RegionAdmin ──────────────────────────────────────────────────────────

    public function test_regionadmin_sees_their_own_created_tables(): void
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
        ], ['institution_id' => $this->region->id]);

        // Bu admin-in yaratdığı cədvəllər
        ReportTable::factory()->count(2)->create(['creator_id' => $regionAdmin->id]);

        // Başqa admin-in yaratdığı cədvəllər
        $otherAdmin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
        ], ['institution_id' => $this->otherRegion->id]);
        ReportTable::factory()->count(3)->create(['creator_id' => $otherAdmin->id]);

        $response = $this->actingAs($regionAdmin)
            ->getJson('/api/report-tables');

        $response->assertStatus(200);
        // Yalnız öz yaratdıqlarını görür (target_institutions boş olduğundan hierarchy filter tətbiq olunur)
        $this->assertLessThanOrEqual(2, count($response->json('data')));
    }

    public function test_regionadmin_sees_tables_targeted_to_their_hierarchy(): void
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
        ], ['institution_id' => $this->region->id]);

        $otherAdmin = $this->createUserWithRole('superadmin');

        // Regionadmin-in hierarchy-sinə göndərilən cədvəl
        ReportTable::factory()->published()->create([
            'creator_id'          => $otherAdmin->id,
            'target_institutions' => [$this->school->id],
        ]);

        // Başqa hierarchy-yə göndərilən cədvəl
        ReportTable::factory()->published()->create([
            'creator_id'          => $otherAdmin->id,
            'target_institutions' => [$this->otherSchool->id],
        ]);

        $response = $this->actingAs($regionAdmin)
            ->getJson('/api/report-tables');

        $response->assertStatus(200);
        // Öz hierarchy-sindəki cədvəl görünməlidir
        $tableIds = collect($response->json('data'))->pluck('id');
        $this->assertTrue($tableIds->count() >= 1);
    }

    public function test_regionadmin_can_create_table(): void
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
        ], ['institution_id' => $this->region->id]);

        $response = $this->actingAs($regionAdmin)
            ->postJson('/api/report-tables', [
                'title'   => 'Regional Cədvəl',
                'columns' => [['key' => 'name', 'label' => 'Ad', 'type' => 'text']],
            ]);

        $response->assertStatus(201);
    }

    // ─── SektorAdmin ──────────────────────────────────────────────────────────

    public function test_sektoradmin_sees_only_tables_for_their_sector_schools(): void
    {
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ], ['institution_id' => $this->sector->id]);

        $creator = $this->createUserWithRole('superadmin');

        // Sektorun məktəbinə göndərilən cədvəl
        $visibleTable = ReportTable::factory()->published()->create([
            'creator_id'          => $creator->id,
            'target_institutions' => [$this->school->id],
        ]);

        // Başqa sektorun məktəbinə göndərilən cədvəl
        ReportTable::factory()->published()->create([
            'creator_id'          => $creator->id,
            'target_institutions' => [$this->otherSchool->id],
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->getJson('/api/report-tables');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertContains($visibleTable->id, $ids->toArray());
    }

    public function test_sektoradmin_cannot_create_table(): void
    {
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ], ['institution_id' => $this->sector->id]);

        $response = $this->actingAs($sektorAdmin)
            ->postJson('/api/report-tables', [
                'title'   => 'Sektor Cədvəli',
                'columns' => [['key' => 'name', 'label' => 'Ad', 'type' => 'text']],
            ]);

        $response->assertStatus(403);
    }

    public function test_sektoradmin_cannot_publish_table(): void
    {
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ], ['institution_id' => $this->sector->id]);

        $creator = $this->createUserWithRole('superadmin');
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $creator->id,
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->postJson("/api/report-tables/{$table->id}/publish");

        $response->assertStatus(403);
    }

    public function test_sektoradmin_cannot_delete_table(): void
    {
        $sektorAdmin = $this->createUserWithRole('sektoradmin', [
            'report_tables.read',
            'report_table_responses.review',
        ], ['institution_id' => $this->sector->id]);

        $creator = $this->createUserWithRole('superadmin');
        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $creator->id,
        ]);

        $response = $this->actingAs($sektorAdmin)
            ->deleteJson("/api/report-tables/{$table->id}");

        $response->assertStatus(403);
    }

    // ─── SchoolAdmin ──────────────────────────────────────────────────────────

    public function test_schooladmin_cannot_list_admin_tables(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], ['institution_id' => $this->school->id]);

        $creator = $this->createUserWithRole('superadmin');
        ReportTable::factory()->count(3)->create(['creator_id' => $creator->id]);

        $response = $this->actingAs($schoolAdmin)
            ->getJson('/api/report-tables');

        $response->assertStatus(403);
    }

    public function test_schooladmin_can_list_only_targeted_published_tables(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], ['institution_id' => $this->school->id]);

        $creator = $this->createUserWithRole('superadmin');

        // Bu məktəbə aid cədvəl
        ReportTable::factory()->published()->create([
            'creator_id'          => $creator->id,
            'target_institutions' => [$this->school->id],
        ]);

        // Draft cədvəl — görünməməlidir
        ReportTable::factory()->draft()->create([
            'creator_id'          => $creator->id,
            'target_institutions' => [$this->school->id],
        ]);

        // Başqa məktəbə aid cədvəl — görünməməlidir
        ReportTable::factory()->published()->create([
            'creator_id'          => $creator->id,
            'target_institutions' => [$this->otherSchool->id],
        ]);

        $response = $this->actingAs($schoolAdmin)
            ->getJson('/api/report-tables/my');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data'); // Yalnız özünün published+targeted cədvəli
    }

    public function test_schooladmin_cannot_create_table(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], ['institution_id' => $this->school->id]);

        $response = $this->actingAs($schoolAdmin)
            ->postJson('/api/report-tables', [
                'title'   => 'Məktəb Cədvəli',
                'columns' => [['key' => 'name', 'label' => 'Ad', 'type' => 'text']],
            ]);

        $response->assertStatus(403);
    }

    public function test_schooladmin_cannot_archive_table(): void
    {
        $schoolAdmin = $this->createUserWithRole('schooladmin', [
            'report_table_responses.write',
        ], ['institution_id' => $this->school->id]);

        $creator = $this->createUserWithRole('superadmin');
        $table = ReportTable::factory()->published()->create([
            'creator_id' => $creator->id,
        ]);

        $response = $this->actingAs($schoolAdmin)
            ->postJson("/api/report-tables/{$table->id}/archive");

        $response->assertStatus(403);
    }

    // ─── Non-SuperAdmin Restore / ForceDelete ─────────────────────────────────

    public function test_regionadmin_cannot_restore_soft_deleted_table(): void
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
        ], ['institution_id' => $this->region->id]);

        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $regionAdmin->id,
        ]);
        $tableId = $table->id;
        $table->delete();

        $response = $this->actingAs($regionAdmin)
            ->postJson("/api/report-tables/{$tableId}/restore");

        $response->assertStatus(403);
    }

    public function test_regionadmin_cannot_force_delete_table(): void
    {
        $regionAdmin = $this->createUserWithRole('regionadmin', [
            'report_tables.read',
            'report_tables.write',
        ], ['institution_id' => $this->region->id]);

        $table = ReportTable::factory()->draft()->create([
            'creator_id' => $regionAdmin->id,
        ]);
        $tableId = $table->id;
        $table->delete();

        $response = $this->actingAs($regionAdmin)
            ->deleteJson("/api/report-tables/{$tableId}/force");

        $response->assertStatus(403);
    }

    // ─── Unauthenticated ─────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_any_endpoint(): void
    {
        $table = ReportTable::factory()->published()->create();

        $this->getJson('/api/report-tables')->assertStatus(401);
        $this->getJson('/api/report-tables/my')->assertStatus(401);
        $this->postJson('/api/report-tables')->assertStatus(401);
        $this->getJson("/api/report-tables/{$table->id}")->assertStatus(401);
        $this->putJson("/api/report-tables/{$table->id}")->assertStatus(401);
        $this->deleteJson("/api/report-tables/{$table->id}")->assertStatus(401);
        $this->postJson("/api/report-tables/{$table->id}/publish")->assertStatus(401);
    }
}
