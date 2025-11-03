<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegionOperatorPermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'can_manage_surveys',
        'can_manage_tasks',
        'can_manage_documents',
        'can_manage_folders',
        'can_manage_links',
    ];

    protected $casts = [
        'can_manage_surveys' => 'boolean',
        'can_manage_tasks' => 'boolean',
        'can_manage_documents' => 'boolean',
        'can_manage_folders' => 'boolean',
        'can_manage_links' => 'boolean',
    ];

    /**
     * User relationship.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

