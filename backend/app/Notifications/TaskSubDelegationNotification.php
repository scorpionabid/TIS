<?php

namespace App\Notifications;

use App\Models\TaskAssignment;
use App\Models\TaskSubDelegation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskSubDelegationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        private TaskSubDelegation|TaskAssignment $entity,
        private string $type, // 'delegated_to_you', 'delegation_accepted', 'delegation_completed', 'all_completed', 'task_completed', 'status_changed'
        private array $data = []
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return match($this->type) {
            'delegated_to_you' => $this->delegatedToYouMail($notifiable),
            'delegation_accepted' => $this->delegationAcceptedMail($notifiable),
            'delegation_completed' => $this->delegationCompletedMail($notifiable),
            'all_completed' => $this->allCompletedMail($notifiable),
            'task_completed' => $this->taskCompletedMail($notifiable),
            'status_changed' => $this->statusChangedMail($notifiable),
            default => $this->defaultMail($notifiable),
        };
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $baseData = [
            'type' => $this->type,
            'entity_type' => $this->entity instanceof TaskSubDelegation ? 'sub_delegation' : 'task_assignment',
            'entity_id' => $this->entity->id,
            'created_at' => now()->toISOString(),
        ];

        return match($this->type) {
            'delegated_to_you' => array_merge($baseData, [
                'title' => 'Yeni tapşırıq yönləndirildi',
                'message' => "'{$this->entity->task->title}' tapşırığı sizə yönləndirildi",
                'task_id' => $this->entity->task_id,
                'delegated_by' => [
                    'id' => $this->entity->delegatedByUser->id,
                    'name' => $this->entity->delegatedByUser->name,
                ],
                'deadline' => $this->entity->deadline?->format('Y-m-d H:i:s'),
                'notes' => $this->entity->delegation_notes,
            ]),
            
            'delegation_accepted' => array_merge($baseData, [
                'title' => 'Yönləndirmə qəbul edildi',
                'message' => "{$this->entity->delegatedToUser->name} '{$this->entity->task->title}' tapşırığını qəbul etdi",
                'task_id' => $this->entity->task_id,
                'delegated_to' => [
                    'id' => $this->entity->delegatedToUser->id,
                    'name' => $this->entity->delegatedToUser->name,
                ],
            ]),
            
            'delegation_completed' => array_merge($baseData, [
                'title' => 'Yönləndirmə tamamlandı',
                'message' => "{$this->entity->delegatedToUser->name} '{$this->entity->task->title}' tapşırığını tamamladı",
                'task_id' => $this->entity->task_id,
                'delegated_to' => [
                    'id' => $this->entity->delegatedToUser->id,
                    'name' => $this->entity->delegatedToUser->name,
                ],
                'completion_notes' => $this->entity->completion_notes,
            ]),
            
            'all_completed' => array_merge($baseData, [
                'title' => 'Bütün yönləndirmələr tamamlandı',
                'message' => "'{$this->entity->task->title}' tapşırığı üçün bütün yönləndirmələr tamamlandı",
                'task_id' => $this->entity->task_id,
                'total_delegations' => $this->entity->sub_delegation_count,
                'completed_count' => $this->entity->completed_sub_delegations,
            ]),
            
            'task_completed' => array_merge($baseData, [
                'title' => 'Tapşırıq tamamlandı',
                'message' => "'{$this->entity->task->title}' tapşırığı tamamlandı",
                'task_id' => $this->entity->task_id,
                'completed_by' => [
                    'id' => $this->entity->user->id,
                    'name' => $this->entity->user->name,
                ],
            ]),
            
            'status_changed' => array_merge($baseData, [
                'title' => 'Status dəyişdirildi',
                'message' => "'{$this->entity->task->title}' tapşırığının statusu dəyişdirildi: {$this->data['old_status']} → {$this->data['new_status']}",
                'task_id' => $this->entity->task_id,
                'old_status' => $this->data['old_status'] ?? '',
                'new_status' => $this->data['new_status'] ?? '',
            ]),
            
            default => $baseData,
        };
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'type' => $this->type,
            'data' => $this->toArray($notifiable),
            'read_at' => null,
            'created_at' => now()->toISOString(),
        ]);
    }

    /**
     * Mail templates
     */
    private function delegatedToYouMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Yeni Tapşırıq Yönləndirildi')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line("'{$this->entity->task->title}' tapşırığı sizə yönləndirilib.")
            ->line('**Yönləndirən:** ' . $this->entity->delegatedByUser->name)
            ->when($this->entity->deadline, fn($mail) => $mail->line('**Deadline:** ' . $this->entity->deadline->format('d.m.Y H:i')))
            ->when($this->entity->delegation_notes, fn($mail) => $mail->line('**Qeydlər:** ' . $this->entity->delegation_notes))
            ->action('Tapşırığa Bax', url('/tasks/' . $this->entity->task_id))
            ->line('Bu tapşırığa dərhal baxmağınız tövsiyə olunur.');
    }

    private function delegationAcceptedMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Yönləndirmə Qəbul Edildi')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line("{$this->entity->delegatedToUser->name} '{$this->entity->task->title}' tapşırığını qəbul edib.")
            ->action('Tapşırığa Bax', url('/tasks/' . $this->entity->task_id))
            ->line('Tapşırığın icrası başlayıb.');
    }

    private function delegationCompletedMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Yönləndirmə Tamamlandı')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line("{$this->entity->delegatedToUser->name} '{$this->entity->task->title}' tapşırığını tamamladı.")
            ->when($this->entity->completion_notes, fn($mail) => $mail->line('**Tamamlama qeydləri:** ' . $this->entity->completion_notes))
            ->action('Tapşırığa Bax', url('/tasks/' . $this->entity->task_id))
            ->line('Tamamlama nəticələrini yoxlaya bilərsiniz.');
    }

    private function allCompletedMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Bütün Yönləndirmələr Tamamlandı')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line("'{$this->entity->task->title}' tapşırığı üçün bütün yönləndirmələr tamamlandı.")
            ->line('**Ümumi yönləndirmələr:** ' . $this->entity->sub_delegation_count)
            ->line('**Tamamlananlar:** ' . $this->entity->completed_sub_delegations)
            ->action('Tapşırığa Bax', url('/tasks/' . $this->entity->task_id))
            ->line('Tapşırığı yoxlaya və tamamlaya bilərsiniz.');
    }

    private function taskCompletedMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Tapşırıq Tamamlandı')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line("'{$this->entity->task->title}' tapşırığı tamamlandı.")
            ->line('**Tamamlayan:** ' . $this->entity->user->name)
            ->action('Tapşırığa Bax', url('/tasks/' . $this->entity->task_id))
            ->line('Tamamlama nəticələrini yoxlaya bilərsiniz.');
    }

    private function statusChangedMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Status Dəyişdirildi')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line("'{$this->entity->task->title}' tapşırığının statusu dəyişdirildi.")
            ->line('**Əvvəlki status:** ' . ($this->data['old_status'] ?? 'N/A'))
            ->line('**Yeni status:** ' . ($this->data['new_status'] ?? 'N/A'))
            ->action('Tapşırığa Bax', url('/tasks/' . $this->entity->task_id))
            ->line('Ətraflı məlumat üçün tapşırığa baxın.');
    }

    private function defaultMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Tapşırıq Bildirişi')
            ->greeting('Hörmətli ' . $notifiable->name . ',')
            ->line('Tapşırıqla bağlı yeni bildirişiniz var.')
            ->action('Bütün Tapşırıqlar', url('/tasks'))
            ->line('Ətraflı məlumat üçün panelə daxil olun.');
    }
}
