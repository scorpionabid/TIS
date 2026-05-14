<?php

namespace App\Mail;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskDeadlineReminder extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public Task $task;

    public User $user;

    public int $daysRemaining;

    /**
     * Create a new message instance.
     */
    public function __construct(Task $task, User $user, int $daysRemaining)
    {
        $this->task = $task;
        $this->user = $user;
        $this->daysRemaining = $daysRemaining;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->daysRemaining === 0
            ? "[Təcili] Tapşırıq bu gün bitir: {$this->task->title}"
            : "[Xatırlatma] Tapşırıq {$this->daysRemaining} gün sonra bitir: {$this->task->title}";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.tasks.deadline-reminder',
            with: [
                'task' => $this->task,
                'user' => $this->user,
                'daysRemaining' => $this->daysRemaining,
                'deadlineDate' => $this->task->deadline?->format('d.m.Y'),
                'deadlineTime' => $this->task->deadline_time,
                'priorityLabel' => Task::PRIORITIES[$this->task->priority] ?? $this->task->priority,
                'categoryLabel' => Task::CATEGORIES[$this->task->category] ?? $this->task->category,
                'appUrl' => config('app.frontend_url', config('app.url')),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
