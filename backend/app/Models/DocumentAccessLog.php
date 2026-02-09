<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use App\Models\Traits\HasInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentAccessLog extends Model
{
    use HasFactory, HasUser, HasInstitution;

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
        return $query->where('access_type', $action);
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

    /**
     * Log document access
     */
    public static function logAccess($documentId, $userId, $action, $request = null)
    {
        return self::create([
            'document_id' => $documentId,
            'user_id' => $userId,
            'share_id' => null,
            'access_type' => $action,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'referrer' => $request?->headers->get('referer'),
        ]);
    }
}
