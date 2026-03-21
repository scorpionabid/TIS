<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotificationDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  User  $user
     * @param  array  $groups  ['tasks' => [...], 'surveys' => [...], 'documents' => [...], 'system' => [...]]
     * @param  int  $totalCount
     */
    public function __construct(
        public readonly User $user,
        public readonly array $groups,
        public readonly int $totalCount,
        public readonly string $period = 'daily', // 'daily' | 'weekly'
    ) {}

    public function envelope(): Envelope
    {
        $periodLabel = $this->period === 'weekly' ? 'Həftəlik' : 'Gündəlik';

        return new Envelope(
            subject: "{$periodLabel} Bildiriş Xülasəsi — {$this->totalCount} yeni bildiriş",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.notification-digest',
            with: [
                'user'       => $this->user,
                'groups'     => $this->groups,
                'totalCount' => $this->totalCount,
                'period'     => $this->period,
                'appName'    => config('app.name'),
                'appUrl'     => config('app.url'),
            ],
        );
    }
}
