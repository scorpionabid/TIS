<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentAccessLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'user_id',
        'share_id',
        'access_type',
        'ip_address',
        'user_agent',
        'referrer',
        'access_metadata',
    ];

    protected $casts = [
        'access_metadata' => 'array',
    ];

    /**
     * Document relationship
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Document share relationship
     */
    public function share(): BelongsTo
    {
        return $this->belongsTo(DocumentShare::class);
    }

    /**
     * Scope: Filter by access type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('access_type', $type);
    }

    /**
     * Scope: Recent accesses
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: Downloads only
     */
    public function scopeDownloads($query)
    {
        return $query->where('access_type', 'download');
    }

    /**
     * Scope: Views only
     */
    public function scopeViews($query)
    {
        return $query->where('access_type', 'view');
    }
}