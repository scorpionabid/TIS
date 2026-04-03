<?php

declare(strict_types=1);

namespace Tests\Feature\Messaging;

use App\Models\Institution;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class MessageControllerTest extends TestCase
{
    use RefreshDatabase, SeedsDefaultRolesAndPermissions;

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * createUserWithRole yalnız Spatie assignRole edir, amma MessageController
     * User.role_id FK-nı istifadə edir. Bu helper hər ikisini set edir.
     */
    private function createUser(string $roleName, array $attrs = []): User
    {
        $user = $this->createUserWithRole($roleName, [], $attrs);

        // role_id FK-nı roles cədvəlindən tap və set et
        $role = Role::where('name', $roleName)->first();
        if ($role) {
            $user->role_id = $role->id;
            $user->save();
        }

        return $user;
    }

    /** region → sector → school iyerarxiyası qur */
    private function buildHierarchy(): array
    {
        $region = Institution::factory()->regional()->create();
        $sector = Institution::factory()->sector()->create(['parent_id' => $region->id]);
        $school = Institution::factory()->school()->create(['parent_id' => $sector->id]);

        $regionAdmin = $this->createUser('regionadmin', ['institution_id' => $region->id]);
        $schoolAdmin = $this->createUser('schooladmin', ['institution_id' => $school->id]);

        return compact('region', 'sector', 'school', 'regionAdmin', 'schoolAdmin');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_user_cannot_access_inbox(): void
    {
        $this->getJson('/api/messages')->assertUnauthorized();
    }

    public function test_unauthenticated_user_cannot_get_unread_count(): void
    {
        $this->getJson('/api/messages/unread-count')->assertUnauthorized();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Inbox
    // ─────────────────────────────────────────────────────────────────────────

    public function test_inbox_is_empty_for_new_user(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/messages')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta'])
            ->assertJsonCount(0, 'data');
    }

    public function test_inbox_shows_messages_addressed_to_current_user(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Test mesajı']);
        MessageRecipient::create(['message_id' => $message->id, 'recipient_id' => $schoolAdmin->id, 'is_read' => false]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages')
            ->assertOk()
            ->assertJsonPath('data.0.id', $message->id)
            ->assertJsonPath('data.0.body', 'Test mesajı');
    }

    public function test_inbox_does_not_show_soft_deleted_recipient_records(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Silinmiş mesaj']);
        $recipient = MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => false,
        ]);
        $recipient->delete(); // soft delete

        $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sent
    // ─────────────────────────────────────────────────────────────────────────

    public function test_sent_shows_messages_sent_by_current_user(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $schoolAdmin->id, 'body' => 'Göndərdim']);
        MessageRecipient::create(['message_id' => $message->id, 'recipient_id' => $regionAdmin->id, 'is_read' => false]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages/sent')
            ->assertOk()
            ->assertJsonPath('data.0.id', $message->id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Unread count
    // ─────────────────────────────────────────────────────────────────────────

    public function test_unread_count_is_zero_for_new_user(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/messages/unread-count')
            ->assertOk()
            ->assertJsonPath('count', 0);
    }

    public function test_unread_count_increments_for_each_unread_message(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        foreach (['Mesaj 1', 'Mesaj 2'] as $body) {
            $msg = Message::create(['sender_id' => $regionAdmin->id, 'body' => $body]);
            MessageRecipient::create(['message_id' => $msg->id, 'recipient_id' => $schoolAdmin->id, 'is_read' => false]);
        }

        $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages/unread-count')
            ->assertOk()
            ->assertJsonPath('count', 2);
    }

    public function test_read_messages_do_not_affect_unread_count(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $msg = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Oxunmuş']);
        MessageRecipient::create([
            'message_id' => $msg->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => true,
            'read_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages/unread-count')
            ->assertOk()
            ->assertJsonPath('count', 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Recipients
    // ─────────────────────────────────────────────────────────────────────────

    public function test_schooladmin_sees_regionadmin_as_available_recipient(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $response = $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages/recipients')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($regionAdmin->id, $ids);
    }

    public function test_schooladmin_sees_sektoradmin_as_available_recipient(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'sector' => $sector] = $this->buildHierarchy();

        $sektorAdmin = $this->createUser('sektoradmin', ['institution_id' => $sector->id]);

        $response = $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson('/api/messages/recipients')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($sektorAdmin->id, $ids);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Store (send message)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_schooladmin_can_send_message_to_authorized_recipient(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $this->actingAs($schoolAdmin, 'sanctum')
            ->postJson('/api/messages', [
                'body' => 'Salam, hesabatı göndərirəm.',
                'recipient_ids' => [$regionAdmin->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Salam, hesabatı göndərirəm.')
            ->assertJsonPath('data.sender.id', $schoolAdmin->id);

        $this->assertDatabaseHas('messages', [
            'body' => 'Salam, hesabatı göndərirəm.',
            'sender_id' => $schoolAdmin->id,
        ]);
        $this->assertDatabaseHas('message_recipients', [
            'recipient_id' => $regionAdmin->id,
        ]);
    }

    public function test_schooladmin_cannot_send_to_unauthorized_recipient(): void
    {
        ['schoolAdmin' => $schoolAdmin] = $this->buildHierarchy();

        // Tamamilə fərqli iyerarxiyada bir schoolAdmin — icazəsiz alıcı
        $otherSchool = $this->createUserWithRole('schooladmin');

        $this->actingAs($schoolAdmin, 'sanctum')
            ->postJson('/api/messages', [
                'body' => 'İcazəsiz mesaj.',
                'recipient_ids' => [$otherSchool->id],
            ])
            ->assertForbidden();
    }

    public function test_store_requires_body_field(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/messages', ['recipient_ids' => [1]])
            ->assertUnprocessable();
    }

    public function test_store_requires_at_least_one_recipient(): void
    {
        $user = $this->createUserWithRole('schooladmin');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/messages', ['body' => 'Test', 'recipient_ids' => []])
            ->assertUnprocessable();
    }

    public function test_can_send_message_to_multiple_recipients(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin, 'sector' => $sector] = $this->buildHierarchy();

        $sektorAdmin = $this->createUser('sektoradmin', ['institution_id' => $sector->id]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->postJson('/api/messages', [
                'body' => 'Hamınıza salam',
                'recipient_ids' => [$regionAdmin->id, $sektorAdmin->id],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('message_recipients', ['recipient_id' => $regionAdmin->id]);
        $this->assertDatabaseHas('message_recipients', ['recipient_id' => $sektorAdmin->id]);
    }

    public function test_can_reply_to_a_message_using_parent_id(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $original = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Sual var?']);
        MessageRecipient::create([
            'message_id' => $original->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => false,
        ]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->postJson('/api/messages', [
                'body' => 'Bəli, var.',
                'recipient_ids' => [$regionAdmin->id],
                'parent_id' => $original->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.parent_id', $original->id);

        $this->assertDatabaseHas('messages', ['parent_id' => $original->id, 'body' => 'Bəli, var.']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Show
    // ─────────────────────────────────────────────────────────────────────────

    public function test_recipient_can_view_message_thread(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Thread testi']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => false,
        ]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->getJson("/api/messages/{$message->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $message->id)
            ->assertJsonPath('data.body', 'Thread testi');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mark as read
    // ─────────────────────────────────────────────────────────────────────────

    public function test_recipient_can_mark_message_as_read(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Oxu bunu']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => false,
        ]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->postJson("/api/messages/{$message->id}/read")
            ->assertOk()
            ->assertJsonPath('success', true);

        $recipient = MessageRecipient::where('message_id', $message->id)
            ->where('recipient_id', $schoolAdmin->id)
            ->first();

        $this->assertTrue((bool) $recipient->is_read);
        $this->assertNotNull($recipient->read_at);
        $this->assertNotNull($recipient->expires_at);
    }

    public function test_marking_already_read_message_is_idempotent(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Artıq oxunmuş']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => true,
            'read_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->postJson("/api/messages/{$message->id}/read")
            ->assertOk();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Delete
    // ─────────────────────────────────────────────────────────────────────────

    public function test_sender_can_soft_delete_own_message(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $schoolAdmin->id, 'body' => 'Silmə mesajı']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $regionAdmin->id,
            'is_read' => false,
        ]);

        $this->actingAs($schoolAdmin, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('messages', ['id' => $message->id]);
    }

    public function test_non_sender_cannot_delete_message(): void
    {
        ['schoolAdmin' => $schoolAdmin, 'regionAdmin' => $regionAdmin] = $this->buildHierarchy();

        $message = Message::create(['sender_id' => $regionAdmin->id, 'body' => 'Bu sənin deyil']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $schoolAdmin->id,
            'is_read' => false,
        ]);

        // findOrFail fails — sender_id != schoolAdmin.id
        $this->actingAs($schoolAdmin, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}")
            ->assertNotFound();
    }
}
