<?php

namespace App\Notifications;

use App\Models\TaskComment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserMentionedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected TaskComment $comment;

    /**
     * Create a new notification instance.
     */
    public function __construct(TaskComment $comment)
    {
        $this->comment = $comment;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $task = $this->comment->task;
        $author = $this->comment->user;
        $appUrl = config('app.frontend_url', config('app.url'));

        return (new MailMessage)
            ->subject("Siz tapşırıq şərhində qeyd edildiniz: {$task->title}")
            ->greeting("Salam {$notifiable->name}!")
            ->line("{$author->name} sizi aşağıdakı tapşırığın şərhində qeyd etdi:")
            ->line("\"{$task->title}\"")
            ->line('Şərh:')
            ->line("\"{$this->comment->comment}\"")
            ->action('Tapşırığa keç', "{$appUrl}/tasks?task={$task->id}")
            ->line('Bu bildiriş avtomatik olaraq ATİS sistemindən göndərilib.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'mention',
            'comment_id' => $this->comment->id,
            'task_id' => $this->comment->task_id,
            'task_title' => $this->comment->task->title ?? null,
            'author_id' => $this->comment->user_id,
            'author_name' => $this->comment->user->name ?? null,
            'comment_preview' => \Str::limit($this->comment->comment, 100),
            'created_at' => $this->comment->created_at->toISOString(),
        ];
    }

    /**
     * Get the notification's database type.
     */
    public function databaseType(object $notifiable): string
    {
        return 'task_mention';
    }
}
