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
        'institution_id',
        'action',
        'ip_address',
        'user_agent',
        'metadata',
        'accessed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'accessed_at' => 'datetime',
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
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Scope: Filter by action type
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Recent accesses
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('accessed_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: Downloads only
     */
    public function scopeDownloads($query)
    {
        return $query->where('action', 'download');
    }

    /**
     * Scope: Views only
     */
    public function scopeViews($query)
    {
        return $query->where('action', 'view');
    }

    /**
     * Log document access
     */
    public static function logAccess($documentId, $userId, $action, $request = null)
    {
        return self::create([
            'document_id' => $documentId,
            'user_id' => $userId,
            'institution_id' => auth()->user()?->institution_id,
            'action' => $action,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'accessed_at' => now(),
        ]);
    }
}