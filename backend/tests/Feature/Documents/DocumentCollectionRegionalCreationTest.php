<?php

namespace Tests\Feature\Documents;

use App\Models\DocumentCollection;
use App\Models\FolderAuditLog;
use App\Models\Institution;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class DocumentCollectionRegionalCreationTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    public function test_superadmin_can_create_regional_folders_from_templates(): void
    {
        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create([
            'parent_id' => $region->id,
        ]);

        $superadmin = $this->createUserWithRole('superadmin', [
            'documents.create',
            'documents.read',
        ], [
            'institution_id' => $region->id,
        ]);

        $response = $this->actingAs($superadmin, 'sanctum')
            ->postJson('/api/document-collections/regional', [
                'institution_id' => $region->id,
                'target_institutions' => [$school->id],
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonCount(count(DocumentCollection::REGIONAL_TEMPLATES), 'data');

        $this->assertEquals(
            count(DocumentCollection::REGIONAL_TEMPLATES),
            DocumentCollection::query()->count()
        );

        $folder = DocumentCollection::first();
        $this->assertNotNull($folder);
        $this->assertEquals($region->id, $folder->owner_institution_id);
        $this->assertTrue($folder->targetInstitutions()->where('institution_id', $school->id)->exists());

        $this->assertDatabaseHas('folder_audit_logs', [
            'folder_id' => $folder->id,
            'action' => 'created',
            'user_id' => $superadmin->id,
        ]);

        $auditEntry = FolderAuditLog::where('folder_id', $folder->id)->first();
        $this->assertArrayHasKey('target_institutions_count', $auditEntry->new_data);
        $this->assertEquals(1, $auditEntry->new_data['target_institutions_count']);
    }
}
