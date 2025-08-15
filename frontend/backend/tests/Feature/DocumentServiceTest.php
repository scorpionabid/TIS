<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Document;
use App\Models\Institution;
use App\Services\DocumentService;
use App\Services\DocumentDownloadService;
use App\Services\DocumentSharingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

class DocumentServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $documentService;
    protected $downloadService;
    protected $sharingService;
    protected $user;
    protected $institution;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create services
        $this->documentService = app(DocumentService::class);
        $this->downloadService = app(DocumentDownloadService::class);
        $this->sharingService = app(DocumentSharingService::class);
        
        // Create test data
        $this->institution = Institution::factory()->create([
            'name' => 'Test Institution',
            'type' => 'school',
            'is_active' => true
        ]);
        
        // Create roles
        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'regionadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'schooladmin', 'guard_name' => 'sanctum']);
        
        $this->user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'is_active' => true
        ]);
        
        $this->user->assignRole('schooladmin');
        
        // Mock storage
        Storage::fake('local');
        
        $this->actingAs($this->user, 'sanctum');
    }

    /** @test */
    public function it_can_create_document_with_file_upload()
    {
        $file = UploadedFile::fake()->create('test.pdf', 100, 'application/pdf');
        
        $documentData = [
            'title' => 'Test Document',
            'description' => 'Test Description',
            'category' => 'telimat',
            'access_level' => 'institution',
            'is_public' => false,
            'is_downloadable' => true,
            'is_viewable_online' => true
        ];

        $document = $this->documentService->createDocument($documentData, $file);

        $this->assertInstanceOf(Document::class, $document);
        $this->assertEquals('Test Document', $document->title);
        $this->assertEquals($this->user->id, $document->uploaded_by);
        $this->assertEquals($this->institution->id, $document->institution_id);
        $this->assertEquals('test.pdf', $document->original_filename);
        
        // Verify file was stored
        Storage::disk('local')->assertExists($document->file_path);
    }

    /** @test */
    public function it_can_filter_and_search_documents()
    {
        // Create test documents
        Document::factory()->count(5)->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id,
            'category' => 'telimat',
            'status' => 'active'
        ]);
        
        Document::factory()->count(3)->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id,
            'category' => 'hesabat',
            'status' => 'active'
        ]);

        $request = new \Illuminate\Http\Request([
            'category' => 'telimat',
            'per_page' => 10
        ]);

        $result = $this->documentService->getDocuments($request);

        $this->assertEquals(5, $result->total());
        $this->assertTrue($result->items()[0]->category === 'telimat');
    }

    /** @test */
    public function it_can_update_document()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id,
            'title' => 'Original Title'
        ]);

        $updateData = [
            'title' => 'Updated Title',
            'description' => 'Updated Description'
        ];

        $updatedDocument = $this->documentService->updateDocument($document, $updateData);

        $this->assertEquals('Updated Title', $updatedDocument->title);
        $this->assertEquals('Updated Description', $updatedDocument->description);
    }

    /** @test */
    public function it_prevents_unauthorized_document_modification()
    {
        $otherUser = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);
        
        $document = Document::factory()->create([
            'uploaded_by' => $otherUser->id,
            'institution_id' => $this->institution->id
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Bu sənədi dəyişdirmək icazəniz yoxdur.');

        $this->documentService->updateDocument($document, ['title' => 'Hacked Title']);
    }

    /** @test */
    public function it_can_share_document_with_users()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        $targetUser = User::factory()->create([
            'institution_id' => $this->institution->id
        ]);

        $shareData = [
            'user_ids' => [$targetUser->id],
            'share_type' => 'view',
            'message' => 'Test share message',
            'allow_download' => true,
            'allow_reshare' => false
        ];

        $share = $this->sharingService->shareDocument($document, $shareData);

        $this->assertNotNull($share);
        $this->assertEquals($document->id, $share->document_id);
        $this->assertEquals($this->user->id, $share->shared_by);
        $this->assertContains($targetUser->id, $share->shared_with_users);
    }

    /** @test */
    public function it_can_create_public_link()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        $linkData = [
            'expires_at' => now()->addDays(7),
            'allow_download' => false,
            'max_downloads' => 10
        ];

        $share = $this->sharingService->createPublicLink($document, $linkData);

        $this->assertNotNull($share);
        $this->assertEquals('public_link', $share->share_type);
        $this->assertNotNull($share->public_token);
        $this->assertEquals(10, $share->max_downloads);
    }

    /** @test */
    public function it_can_access_document_via_public_link()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        $share = $this->sharingService->createPublicLink($document, [
            'expires_at' => now()->addDays(7),
            'allow_download' => true
        ]);

        $accessedDocument = $this->sharingService->accessViaPublicLink($share->public_token);

        $this->assertEquals($document->id, $accessedDocument->id);
        
        // Check that access count increased
        $share->refresh();
        $this->assertEquals(1, $share->access_count);
    }

    /** @test */
    public function it_prevents_access_to_expired_public_link()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        $share = $this->sharingService->createPublicLink($document, [
            'expires_at' => now()->subDays(1) // Expired
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Linkin vaxtı keçmişdir.');

        $this->sharingService->accessViaPublicLink($share->public_token);
    }

    /** @test */
    public function it_can_get_download_statistics()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        // Simulate some downloads
        \App\Models\DocumentDownload::factory()->count(5)->create([
            'document_id' => $document->id,
            'user_id' => $this->user->id
        ]);

        $stats = $this->downloadService->getDownloadStatistics($document);

        $this->assertEquals(5, $stats['total_downloads']);
        $this->assertEquals(1, $stats['unique_downloaders']);
        $this->assertArrayHasKey('recent_downloads', $stats);
        $this->assertArrayHasKey('downloads_by_month', $stats);
    }

    /** @test */
    public function it_can_get_sharing_statistics()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        // Create some shares
        \App\Models\DocumentShare::factory()->count(3)->create([
            'document_id' => $document->id,
            'shared_by' => $this->user->id,
            'is_active' => true
        ]);

        \App\Models\DocumentShare::factory()->create([
            'document_id' => $document->id,
            'shared_by' => $this->user->id,
            'share_type' => 'public_link',
            'is_active' => true
        ]);

        $stats = $this->sharingService->getShareStatistics($document);

        $this->assertEquals(4, $stats['total_shares']);
        $this->assertEquals(4, $stats['active_shares']);
        $this->assertEquals(1, $stats['public_links']);
        $this->assertEquals(3, $stats['private_shares']);
    }

    /** @test */
    public function it_logs_document_access()
    {
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $this->institution->id
        ]);

        $this->documentService->logAccess($document, 'view');

        $this->assertDatabaseHas('document_access_logs', [
            'document_id' => $document->id,
            'user_id' => $this->user->id,
            'action' => 'view'
        ]);
    }

    /** @test */
    public function superadmin_can_access_all_documents()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');
        
        $this->actingAs($superadmin, 'sanctum');

        $otherInstitution = Institution::factory()->create();
        $document = Document::factory()->create([
            'uploaded_by' => $this->user->id,
            'institution_id' => $otherInstitution->id,
            'access_level' => 'institution'
        ]);

        $updateData = ['title' => 'SuperAdmin Updated'];
        $updatedDocument = $this->documentService->updateDocument($document, $updateData);

        $this->assertEquals('SuperAdmin Updated', $updatedDocument->title);
    }
}