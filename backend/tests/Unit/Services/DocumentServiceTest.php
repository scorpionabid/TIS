<?php

namespace Tests\Unit\Services;

use App\Models\Document;
use App\Models\Institution;
use App\Models\User;
use App\Models\UserStorageQuota;
use App\Services\DocumentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentServiceTest extends TestCase
{
    use RefreshDatabase;

    private DocumentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(DocumentService::class);
        Storage::fake('local');
    }

    public function test_create_document_success()
    {
        $user = User::factory()->create();
        $institution = Institution::factory()->create();
        $user->update(['institution_id' => $institution->id]);
        $this->actingAs($user);

        // 1KB file = 1024 bytes
        $file = UploadedFile::fake()->create('test.pdf', 1, 'application/pdf');

        $data = [
            'title' => 'Test Document',
            'description' => 'Description',
            'category' => 'reports',
            'access_level' => 'institution',
        ];

        $document = $this->service->createDocument($data, $file);

        $this->assertInstanceOf(Document::class, $document);
        $this->assertDatabaseHas('documents', [
            'title' => 'Test Document',
            'uploaded_by' => $user->id,
            'file_size' => 1024,
        ]);

        // Check if file is stored
        Storage::disk('local')->assertExists($document->file_path);

        // Check if quota is updated
        $quota = UserStorageQuota::where('user_id', $user->id)->first();
        $this->assertEquals(1024, $quota->current_usage);
        $this->assertEquals(1, $quota->file_count);
    }

    public function test_create_document_fails_if_quota_exceeded()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Set quota to 10KB (10240 bytes)
        $quota = UserStorageQuota::getOrCreateForUser($user);
        $quota->update(['monthly_quota' => 10240]);
        // Simulate usage 10KB
        $quota->update(['current_usage' => 10240]);

        // Try to upload 1KB
        $file = UploadedFile::fake()->create('test.pdf', 1, 'application/pdf');

        $data = [
            'title' => 'Test Document',
            'category' => 'reports',
        ];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Yüklənən fayl ölçüsü aylıq kvotanızı aşır.');

        $this->service->createDocument($data, $file);
    }

    public function test_delete_document_restores_quota()
    {
        $user = User::factory()->create();
        $institution = Institution::factory()->create();
        $user->update(['institution_id' => $institution->id]);
        $this->actingAs($user);

        // Ensure quota exists
        UserStorageQuota::getOrCreateForUser($user);

        // 1KB file
        $file = UploadedFile::fake()->create('test.pdf', 1, 'application/pdf');
        $document = $this->service->createDocument(['title' => 'Doc'], $file);

        // Initial check
        $quota = UserStorageQuota::where('user_id', $user->id)->first();
        $this->assertEquals(1024, $quota->current_usage);

        // Delete
        $this->service->deleteDocument($document);

        // Post-delete check
        $quota->refresh();
        $this->assertEquals(0, $quota->current_usage);
        $this->assertSoftDeleted($document);

        // File should be deleted from storage
        Storage::disk('local')->assertMissing($document->file_path);
    }
}
