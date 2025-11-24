<?php

namespace Tests\Feature\Documents;

use App\Models\Document;
use App\Models\DocumentCollection;
use App\Models\Institution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class DocumentCollectionManagementTest extends TestCase
{
    use RefreshDatabase;
    use SeedsDefaultRolesAndPermissions;

    protected function createFolderWithCreator(): array
    {
        $region = Institution::factory()->regional()->create();

        $superadmin = $this->createUserWithRole('superadmin', [
            'documents.read',
            'documents.update',
            'documents.delete',
        ], [
            'institution_id' => $region->id,
        ]);

        $folder = DocumentCollection::create([
            'name' => 'Regional Reports',
            'description' => 'Initial description',
            'collection_type' => 'folder',
            'scope' => DocumentCollection::SCOPE_REGIONAL,
            'folder_key' => 'reports',
            'owner_institution_id' => $region->id,
            'owner_institution_level' => $region->level,
            'institution_id' => $region->id,
            'created_by' => $superadmin->id,
            'allow_school_upload' => true,
            'is_locked' => false,
        ]);

        return [$folder, $superadmin, $region];
    }

    public function test_superadmin_can_update_folder_and_logs_action(): void
    {
        [$folder, $user] = $this->createFolderWithCreator();

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/document-collections/{$folder->id}", [
                'name' => 'Updated Folder Name',
                'description' => 'Updated description',
                'allow_school_upload' => false,
                'reason' => 'Renaming for clarity',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Updated Folder Name')
            ->assertJsonPath('data.allow_school_upload', false);

        $folder->refresh();
        $this->assertEquals('Updated Folder Name', $folder->name);
        $this->assertEquals('Updated description', $folder->description);
        $this->assertFalse($folder->allow_school_upload);

        $this->assertDatabaseHas('folder_audit_logs', [
            'folder_id' => $folder->id,
            'user_id' => $user->id,
            'action' => 'renamed',
            'reason' => 'Renaming for clarity',
        ]);
    }

    public function test_deleting_folder_soft_deletes_cascade_documents(): void
    {
        [$folder, $user, $region] = $this->createFolderWithCreator();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $document = Document::factory()->create([
            'institution_id' => $school->id,
            'uploaded_by' => $user->id,
            'cascade_deletable' => true,
        ]);

        $folder->documents()->attach($document->id, [
            'added_by' => $user->id,
            'sort_order' => 1,
        ]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/document-collections/{$folder->id}", [
                'reason' => 'Cleanup',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('document_collections', ['id' => $folder->id]);
        $this->assertSoftDeleted('documents', ['id' => $document->id]);

        $this->assertDatabaseHas('folder_audit_logs', [
            'folder_id' => $folder->id,
            'user_id' => $user->id,
            'action' => 'deleted',
        ]);
    }
}
