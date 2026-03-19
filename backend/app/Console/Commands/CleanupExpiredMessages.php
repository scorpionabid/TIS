<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Message;
use App\Models\MessageRecipient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupExpiredMessages extends Command
{
    protected $signature = 'messages:cleanup';

    protected $description = 'Müddəti keçmiş mesajları təmizlə (oxunmuş: 1 gün, oxunmamış: 5 gün)';

    public function handle(): int
    {
        $this->info('Mesaj təmizliyi başlanır...');

        // Step 1: Oxunmuş + expires_at keçmiş recipient qeydlərini soft-delete et
        // update() affected row count-u qaytarır — ayrıca count() sorğusu lazım deyil
        $readExpired = MessageRecipient::where('is_read', true)
            ->whereNull('deleted_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['deleted_at' => now()]);

        $this->info("Oxunmuş + müddəti keçmiş: {$readExpired} qeyd soft-delete edildi.");

        // Step 2: Oxunmamış + 5 gündən köhnə mesajların recipient qeydlərini soft-delete et
        $unreadExpired = MessageRecipient::where('is_read', false)
            ->whereNull('deleted_at')
            ->whereHas('message', fn ($q) => $q->where('created_at', '<', now()->subDays(5)))
            ->update(['deleted_at' => now()]);

        $this->info("Oxunmamış + 5 gündən köhnə: {$unreadExpired} qeyd soft-delete edildi.");

        // Step 3: Bütün recipient-ları silinmiş VƏ göndərən tərəfindən soft-deleted mesajları hard-delete et
        $orphanQuery = Message::onlyTrashed()
            ->whereDoesntHave('messageRecipients', fn ($q) => $q->whereNull('deleted_at'));

        $orphanMessages = $orphanQuery->count();
        $orphanQuery->forceDelete();

        $this->info("Orphan (tam silinmiş) mesajlar: {$orphanMessages} hard-delete edildi.");

        Log::info('messages:cleanup tamamlandı', [
            'read_expired'    => $readExpired,
            'unread_expired'  => $unreadExpired,
            'orphan_messages' => $orphanMessages,
        ]);

        return Command::SUCCESS;
    }
}
