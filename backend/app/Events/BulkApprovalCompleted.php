<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BulkApprovalCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $jobId;

    public int $userId;

    public array $result;

    /**
     * Create a new event instance
     */
    public function __construct(string $jobId, int $userId, array $result)
    {
        $this->jobId = $jobId;
        $this->userId = $userId;
        $this->result = $result;
    }

    /**
     * Get the channels the event should broadcast on
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->userId}.bulk-approval"),
            new PrivateChannel("bulk-approval.{$this->jobId}"),
        ];
    }

    /**
     * Get the data to broadcast
     */
    public function broadcastWith(): array
    {
        return [
            'job_id' => $this->jobId,
            'user_id' => $this->userId,
            'result' => $this->result,
            'status' => $this->result['successful'] > 0 ? 'completed' : 'failed',
            'summary' => [
                'successful' => $this->result['successful'],
                'failed' => $this->result['failed'],
                'total' => $this->result['total'],
                'success_rate' => $this->result['total'] > 0
                    ? round(($this->result['successful'] / $this->result['total']) * 100, 2)
                    : 0,
            ],
        ];
    }

    /**
     * Get the broadcast event name
     */
    public function broadcastAs(): string
    {
        return 'bulk-approval-completed';
    }
}
