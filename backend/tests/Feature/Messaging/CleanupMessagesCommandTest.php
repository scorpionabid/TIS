<?php

declare(strict_types=1);

namespace Tests\Feature\Messaging;

use App\Models\Message;
use App\Models\MessageRecipient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\SeedsDefaultRolesAndPermissions;
use Tests\TestCase;

class CleanupMessagesCommandTest extends TestCase
{
    use RefreshDatabase, SeedsDefaultRolesAndPermissions;

    public function test_cleanup_soft_deletes_expired_read_recipients(): void
    {
        $sender = $this->createUserWithRole('regionadmin');
        $recipient = $this->createUserWithRole('schooladmin');

        $message = Message::create(['sender_id' => $sender->id, 'body' => 'Oxunmuş, müddəti keçmiş']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'is_read' => true,
            'read_at' => now()->subDay()->subMinute(),
            'expires_at' => now()->subMinute(), // müddəti keçmiş
        ]);

        $this->artisan('messages:cleanup')->assertExitCode(0);

        $this->assertSoftDeleted('message_recipients', [
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
        ]);
    }

    public function test_cleanup_does_not_delete_unread_within_five_days(): void
    {
        $sender = $this->createUserWithRole('regionadmin');
        $recipient = $this->createUserWithRole('schooladmin');

        $message = Message::create(['sender_id' => $sender->id, 'body' => '3 günlük oxunmamış mesaj']);
        \Illuminate\Support\Facades\DB::table('messages')
            ->where('id', $message->id)
            ->update(['created_at' => now()->subDays(3)]);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'is_read' => false,
        ]);

        $this->artisan('messages:cleanup')->assertExitCode(0);

        // Silinməməlidir
        $this->assertDatabaseHas('message_recipients', [
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'deleted_at' => null,
        ]);
    }

    public function test_cleanup_soft_deletes_unread_recipients_after_five_days(): void
    {
        $sender = $this->createUserWithRole('regionadmin');
        $recipient = $this->createUserWithRole('schooladmin');

        $message = Message::create(['sender_id' => $sender->id, 'body' => '6 günlük oxunmamış']);
        // created_at timestamps-ı bypass edərək köhnə tarix set edirik
        \Illuminate\Support\Facades\DB::table('messages')
            ->where('id', $message->id)
            ->update(['created_at' => now()->subDays(6)]);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'is_read' => false,
        ]);

        $this->artisan('messages:cleanup')->assertExitCode(0);

        $this->assertSoftDeleted('message_recipients', [
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
        ]);
    }

    public function test_cleanup_does_not_delete_unexpired_read_recipients(): void
    {
        $sender = $this->createUserWithRole('regionadmin');
        $recipient = $this->createUserWithRole('schooladmin');

        $message = Message::create(['sender_id' => $sender->id, 'body' => 'Yeni oxunmuş']);
        MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'is_read' => true,
            'read_at' => now(),
            'expires_at' => now()->addDay(), // hələ vaxtı çatmayıb
        ]);

        $this->artisan('messages:cleanup')->assertExitCode(0);

        // Silinməməlidir
        $this->assertDatabaseHas('message_recipients', [
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'deleted_at' => null,
        ]);
    }

    public function test_cleanup_hard_deletes_orphan_messages(): void
    {
        $sender = $this->createUserWithRole('regionadmin');
        $recipient = $this->createUserWithRole('schooladmin');

        $message = Message::create(['sender_id' => $sender->id, 'body' => 'Orphan mesaj']);
        $recipientRecord = MessageRecipient::create([
            'message_id' => $message->id,
            'recipient_id' => $recipient->id,
            'is_read' => true,
            'expires_at' => now()->subMinute(),
        ]);

        // Göndərən tərəfindən silinmiş + recipient də soft-deleted
        $message->delete();           // soft delete messages
        $recipientRecord->delete();   // soft delete message_recipients

        $this->artisan('messages:cleanup')->assertExitCode(0);

        // Tam silinmiş olmalıdır (hard delete)
        $this->assertDatabaseMissing('messages', ['id' => $message->id]);
    }
}
