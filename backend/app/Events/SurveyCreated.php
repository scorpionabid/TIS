<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Survey;
use App\Models\User;

class SurveyCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $survey;
    public $creator;

    /**
     * Create a new event instance.
     */
    public function __construct(Survey $survey, User $creator)
    {
        $this->survey = $survey;
        $this->creator = $creator;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Survey-specific channel
        $channels[] = new PrivateChannel('survey.' . $this->survey->id);

        // Target institution channels
        if ($this->survey->target_institutions) {
            foreach ($this->survey->target_institutions as $institutionId) {
                $channels[] = new PrivateChannel('institution.' . $institutionId);
            }
        }

        // Target role channels
        if ($this->survey->target_roles) {
            foreach ($this->survey->target_roles as $roleName) {
                $channels[] = new PrivateChannel('role.' . $roleName);
            }
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'survey' => [
                'id' => $this->survey->id,
                'title' => $this->survey->title,
                'description' => $this->survey->description,
                'deadline' => $this->survey->deadline?->toISOString(),
                'status' => $this->survey->status,
                'category' => $this->survey->category,
                'frequency' => $this->survey->frequency,
                'target_institutions' => $this->survey->target_institutions,
                'target_roles' => $this->survey->target_roles,
            ],
            'creator' => [
                'id' => $this->creator->id,
                'username' => $this->creator->username,
                'name' => $this->creator->profile?->first_name . ' ' . $this->creator->profile?->last_name,
            ],
            'message' => "Yeni sorğu yaradıldı: {$this->survey->title}",
            'type' => 'survey_created',
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'survey.created';
    }
}
