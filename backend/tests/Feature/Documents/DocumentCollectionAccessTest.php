<?php

namespace Tests\Feature\Documents;

use App\Models\Document;
use App\Models\DocumentCollection;
use App\Models\Institution;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class DocumentCollectionAccessTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function seedFolderWithDocuments(): array
    {
        $region = Institution::factory()->regional()->create();
        $schoolA = Institution::factory()->school()->create(['parent_id' => $region->id]);
        $schoolB = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $superadmin = $this->createUserWithRole('superadmin', [
            'documents.read',
        ], [
            'institution_id' => $region->id,
        ]);

        $folder = DocumentCollection::create([
            'name' => 'Shared Reports',
            'collection_type' => 'folder',
            'scope' => DocumentCollection::SCOPE_REGIONAL,
            'folder_key' => 'shared_reports',
            'owner_institution_id' => $region->id,
            'owner_institution_level' => $region->level,
            'institution_id' => $region->id,
            'created_by' => $superadmin->id,
            'allow_school_upload' => true,
        ]);

        $docA = Document::factory()->create([
            'institution_id' => $schoolA->id,
            'uploaded_by' => $superadmin->id,
        ]);

        $docB = Document::factory()->create([
            'institution_id' => $schoolB->id,
            'uploaded_by' => $superadmin->id,
        ]);

        $folder->documents()->attach($docA->id, [
            'added_by' => $superadmin->id,
            'sort_order' => 1,
        ]);
        $folder->documents()->attach($docB->id, [
            'added_by' => $superadmin->id,
            'sort_order' => 2,
        ]);

        return [$folder, $superadmin, $schoolA, $schoolB];
    }

    public function test_superadmin_can_view_folder_with_grouped_documents(): void
    {
        [$folder, $superadmin] = $this->seedFolderWithDocuments();

        $response = $this->actingAs($superadmin, 'sanctum')
            ->getJson("/api/document-collections/{$folder->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'folder' => ['id', 'name'],
                    'institutions',
                ],
                'meta' => [
                    'total_institutions',
                    'total_documents',
                ],
            ]);

        $response->assertJsonPath('meta.total_institutions', 2);
        $response->assertJsonPath('meta.total_documents', 2);
    }

    public function test_school_admin_sees_only_their_institution_documents(): void
    {
        [$folder, $superadmin, $schoolA, $schoolB] = $this->seedFolderWithDocuments();

        $schoolAdmin = $this->createUserWithRole('schooladmin', [
            'documents.read',
        ], [
            'institution_id' => $schoolA->id,
        ]);

        $response = $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson("/api/document-collections/{$folder->id}");

        $response->assertOk()
            ->assertJsonPath('meta.total_documents', 1)
            ->assertJsonPath('data.institutions.0.institution_id', $schoolA->id);
    }

    public function test_index_returns_accessible_folders_based_on_role(): void
    {
        [$folder, $superadmin, $schoolA] = $this->seedFolderWithDocuments();

        $foldersResponse = $this->actingAs($superadmin, 'sanctum')
            ->getJson('/api/document-collections');

        $foldersResponse->assertOk()
            ->assertJsonPath('data.0.id', $folder->id);

        $schoolAdmin = $this->createUserWithRole('schooladmin', [
            'documents.read',
        ], [
            'institution_id' => $schoolA->id,
        ]);

        $schoolFoldersResponse = $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/document-collections');

        $schoolFoldersResponse->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
