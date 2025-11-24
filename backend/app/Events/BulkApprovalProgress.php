<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BulkApprovalProgress implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $jobId;

    public int $userId;

    public int $processed;

    public int $total;

    public int $successful;

    public int $failed;

    public float $percentage;

    public array $metadata;

    /**
     * Create a new event instance
     */
    public function __construct(
        string $jobId,
        int $userId,
        int $processed,
        int $total,
        int $successful,
        int $failed,
        array $metadata = []
    ) {
        $this->jobId = $jobId;
        $this->userId = $userId;
        $this->processed = $processed;
        $this->total = $total;
        $this->successful = $successful;
        $this->failed = $failed;
        $this->percentage = $total > 0 ? round(($processed / $total) * 100, 2) : 0;
        $this->metadata = array_merge([
            'timestamp' => now()->toISOString(),
            'remaining' => max(0, $total - $processed),
        ], $metadata);
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
            'progress' => [
                'processed' => $this->processed,
                'total' => $this->total,
                'successful' => $this->successful,
                'failed' => $this->failed,
                'percentage' => $this->percentage,
                'remaining' => $this->metadata['remaining'],
            ],
            'metadata' => $this->metadata,
            'status' => 'in_progress',
        ];
    }

    /**
     * Get the broadcast event name
     */
    public function broadcastAs(): string
    {
        return 'bulk-approval-progress';
    }
}
