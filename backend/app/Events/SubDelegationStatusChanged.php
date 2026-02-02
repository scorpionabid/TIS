<?php

namespace App\Events;

use App\Models\TaskSubDelegation;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SubDelegationStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public TaskSubDelegation $delegation,
        public string $oldStatus,
        public string $newStatus,
        public User $changedBy
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.' . $this->delegation->parentAssignment->user_id),
            new PrivateChannel('task.' . $this->delegation->task_id),
            // Also notify the user who was delegated to
            new PrivateChannel('App.Models.User.' . $this->delegation->delegated_to_user_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'sub-delegation.status-changed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'delegation_id' => $this->delegation->id,
            'task_id' => $this->delegation->task_id,
            'parent_assignment_id' => $this->delegation->parent_assignment_id,
            'delegated_to_user_id' => $this->delegation->delegated_to_user_id,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'changed_by' => [
                'id' => $this->changedBy->id,
                'name' => $this->changedBy->name,
                'email' => $this->changedBy->email,
            ],
            'delegation' => [
                'id' => $this->delegation->id,
                'status' => $this->delegation->status,
                'progress' => $this->delegation->progress,
                'deadline' => $this->delegation->deadline?->format('Y-m-d H:i:s'),
                'delegatedToUser' => [
                    'id' => $this->delegation->delegatedToUser->id,
                    'name' => $this->delegation->delegatedToUser->name,
                    'email' => $this->delegation->delegatedToUser->email,
                ],
                'parentAssignment' => [
                    'id' => $this->delegation->parentAssignment->id,
                    'user_id' => $this->delegation->parentAssignment->user_id,
                ],
            ],
            'timestamp' => now()->toISOString(),
        ];
    }
}
