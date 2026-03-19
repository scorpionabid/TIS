<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sender_id',
        'parent_id',
        'body',
    ];

    /**
     * The user who sent this message.
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * The parent message this is a reply to (nullable).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'parent_id');
    }

    /**
     * All direct replies to this message.
     */
    public function replies(): HasMany
    {
        return $this->hasMany(Message::class, 'parent_id');
    }

    /**
     * Pivot records linking this message to its recipients.
     */
    public function messageRecipients(): HasMany
    {
        return $this->hasMany(MessageRecipient::class, 'message_id');
    }

    /**
     * All recipient users of this message (through message_recipients pivot).
     */
    public function recipientUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_recipients', 'message_id', 'recipient_id')
            ->withPivot('is_read', 'read_at', 'expires_at', 'deleted_at')
            ->withTimestamps();
    }

    /**
     * Scope: Exclude soft-deleted messages.
     *
     * Note: SoftDeletes already provides global scope; this named scope is
     * provided for explicit use in queries that bypass the global scope.
     */
    public function scopeNotDeleted(Builder $query): Builder
    {
        return $query->whereNull('messages.deleted_at');
    }
}
