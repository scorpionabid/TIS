<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FolderAuditLog extends Model
{
    use HasUser;
    protected $fillable = [
        'folder_id',
        'user_id',
        'action',
        'old_data',
        'new_data',
        'reason',
        'ip_address',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the folder that owns the audit log
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(DocumentCollection::class, 'folder_id');
    }

    /**
     * Scope: Filter by action type
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Recent logs
     */
    public function scopeRecent($query, int $limit = 50)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }
}
