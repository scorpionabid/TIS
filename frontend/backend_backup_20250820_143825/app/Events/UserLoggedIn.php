<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\User;

class UserLoggedIn implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $sessionInfo;

    /**
     * Create a new event instance.
     */
    public function __construct(User $user, array $sessionInfo = [])
    {
        $this->user = $user;
        $this->sessionInfo = $sessionInfo;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Institution channel - notify other users in same institution
        if ($this->user->institution_id) {
            $channels[] = new PrivateChannel('institution.' . $this->user->institution_id);
        }

        // Role-based channel - notify users with same role
        if ($this->user->roles->isNotEmpty()) {
            $channels[] = new PrivateChannel('role.' . $this->user->roles->first()->name);
        }

        // System announcements channel (SuperAdmin only)
        if ($this->user->hasRole('superadmin')) {
            $channels[] = new PrivateChannel('system.announcements');
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'user' => [
                'id' => $this->user->id,
                'username' => $this->user->username,
                'name' => $this->user->profile?->first_name . ' ' . $this->user->profile?->last_name,
                'role' => $this->user->roles->first()?->name,
                'institution_id' => $this->user->institution_id,
            ],
            'session' => $this->sessionInfo,
            'message' => "{$this->user->username} sisteme daxil oldu",
            'type' => 'user_logged_in',
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'user.logged_in';
    }
}
