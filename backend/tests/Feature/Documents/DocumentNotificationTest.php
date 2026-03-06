<?php

namespace Tests\Feature\Documents;

use App\Models\Document;
use App\Models\Institution;
use App\Services\NotificationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class DocumentNotificationTest extends TestCase
{
    use SeedsDefaultRolesAndPermissions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_document_upload_notifies_accessible_institution_users(): void
    {
        Storage::fake('local');

        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $creator = $this->createUserWithRole('regionadmin', ['documents.create'], [
            'institution_id' => $region->id,
        ]);

        $targetUser = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $school->id,
        ]);

        $notificationService = Mockery::mock(NotificationService::class);
        $notificationService->shouldReceive('sendDocumentNotification')
            ->once()
            ->with(
                Mockery::type(Document::class),
                'uploaded',
                Mockery::on(fn ($users) => $users === [$targetUser->id]),
                Mockery::on(fn ($data) => $data['document_title'] === 'Policy Doc')
            )
            ->andReturn([]);
        $this->app->instance(NotificationService::class, $notificationService);

        $response = $this->actingAs($creator, 'sanctum')->postJson('/api/documents', [
            'title' => 'Policy Doc',
            'description' => 'Regional policy update',
            'accessible_institutions' => [$school->id],
            'file' => UploadedFile::fake()->create('policy.pdf', 200, 'application/pdf'),
        ]);

        $response->assertCreated();
    }

    public function test_document_update_notifies_accessible_institution_users(): void
    {
        $region = Institution::factory()->regional()->create();
        $school = Institution::factory()->school()->create(['parent_id' => $region->id]);

        $editor = $this->createUserWithRole('regionadmin', ['documents.update'], [
            'institution_id' => $region->id,
        ]);

        $targetUser = $this->createUserWithRole('schooladmin', [], [
            'institution_id' => $school->id,
        ]);

        $document = Document::factory()->for($editor, 'uploader')->create([
            'institution_id' => $editor->institution_id,
            'title' => 'Guideline',
            'accessible_institutions' => [$school->id],
        ]);

        $notificationService = Mockery::mock(NotificationService::class);
        $notificationService->shouldReceive('sendDocumentNotification')
            ->once()
            ->with(
                Mockery::on(fn ($doc) => $doc->id === $document->id),
                'updated',
                Mockery::on(fn ($users) => in_array($targetUser->id, $users)),
                Mockery::on(fn ($data) => $data['document_title'] === 'Updated Guideline')
            )
            ->andReturn([]);
        $this->app->instance(NotificationService::class, $notificationService);

        $response = $this->actingAs($editor, 'sanctum')->putJson("/api/documents/{$document->id}", [
            'title' => 'Updated Guideline',
        ]);

        $response->assertOk();
    }
}
