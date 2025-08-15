<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Task;
use App\Models\User;

class TaskAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $task;
    public $assignedUser;
    public $assignedBy;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task, User $assignedUser, User $assignedBy)
    {
        $this->task = $task;
        $this->assignedUser = $assignedUser;
        $this->assignedBy = $assignedBy;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            // Private channel for assigned user
            new PrivateChannel('App.Models.User.' . $this->assignedUser->id),
            // Task-specific channel
            new PrivateChannel('task.' . $this->task->id),
            // Institution channel
            new PrivateChannel('institution.' . $this->assignedUser->institution_id),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'task' => [
                'id' => $this->task->id,
                'title' => $this->task->title,
                'description' => $this->task->description,
                'priority' => $this->task->priority,
                'deadline' => $this->task->deadline?->toISOString(),
                'status' => $this->task->status,
            ],
            'assigned_user' => [
                'id' => $this->assignedUser->id,
                'username' => $this->assignedUser->username,
                'name' => $this->assignedUser->profile?->first_name . ' ' . $this->assignedUser->profile?->last_name,
            ],
            'assigned_by' => [
                'id' => $this->assignedBy->id,
                'username' => $this->assignedBy->username,
                'name' => $this->assignedBy->profile?->first_name . ' ' . $this->assignedBy->profile?->last_name,
            ],
            'message' => "Sizə yeni tapşırıq təyin edildi: {$this->task->title}",
            'type' => 'task_assigned',
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'task.assigned';
    }
}
