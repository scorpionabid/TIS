<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Notification;
use App\Models\User;

class NotificationSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;
    public $user;

    /**
     * Create a new event instance.
     */
    public function __construct(Notification $notification, User $user)
    {
        $this->notification = $notification;
        $this->user = $user;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            // User-specific private channel
            new PrivateChannel('App.Models.User.' . $this->user->id),
        ];

        // Add institution channel if applicable
        if ($this->user->institution_id) {
            $channels[] = new PrivateChannel('institution.' . $this->user->institution_id);
        }

        // Add role-based channel
        if ($this->user->roles->isNotEmpty()) {
            $channels[] = new PrivateChannel('role.' . $this->user->roles->first()->name);
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'notification' => [
                'id' => $this->notification->id,
                'title' => $this->notification->title,
                'message' => $this->notification->message,
                'type' => $this->notification->type,
                'data' => $this->notification->data,
                'priority' => $this->notification->priority ?? 'medium',
                'is_read' => false,
                'created_at' => $this->notification->created_at->toISOString(),
            ],
            'user' => [
                'id' => $this->user->id,
                'username' => $this->user->username,
            ],
            'unread_count' => $this->user->receivedNotifications()->where('is_read', false)->count(),
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.sent';
    }
}
