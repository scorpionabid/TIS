<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LinkAccessLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'link_share_id',
        'user_id',
        'ip_address',
        'user_agent',
        'referrer',
    ];

    /**
     * Link share relationship
     */
    public function linkShare(): BelongsTo
    {
        return $this->belongsTo(LinkShare::class);
    }

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: Recent accesses
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: By user
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Anonymous accesses
     */
    public function scopeAnonymous($query)
    {
        return $query->whereNull('user_id');
    }
}