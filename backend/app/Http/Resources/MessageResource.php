<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray($request): array
    {
        $currentUserId = auth()->id();

        // Current user üçün is_read statusunu tap
        $recipientRecord = $this->messageRecipients
            ->firstWhere('recipient_id', $currentUserId);

        return [
            'id'         => $this->id,
            'sender'     => [
                'id'          => $this->sender->id,
                'name'        => $this->sender->name,
                'role'        => $this->sender->role?->name ?? '',
                'institution' => $this->sender->institution ? [
                    'id'   => $this->sender->institution->id,
                    'name' => $this->sender->institution->name,
                ] : null,
            ],
            'body'          => $this->body,
            'parent_id'     => $this->parent_id,
            'is_read'       => $recipientRecord?->is_read,
            'read_at'       => $recipientRecord?->read_at?->toISOString(),
            'replies_count' => $this->replies()->count(),
            'replies'       => $this->whenLoaded('replies', fn () => MessageResource::collection($this->replies)),
            'recipients'    => $this->whenLoaded('messageRecipients', function () {
                return $this->messageRecipients->map(fn ($r) => [
                    'id'      => $r->recipient->id ?? $r->recipient_id,
                    'name'    => $r->recipient?->name ?? '',
                    'is_read' => $r->is_read,
                    'read_at' => $r->read_at?->toISOString(),
                ]);
            }),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
