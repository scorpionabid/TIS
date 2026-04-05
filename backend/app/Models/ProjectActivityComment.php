<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectActivityComment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_activity_id',
        'user_id',
        'comment',
        'type',
        'attachments',
    ];

    protected $casts = [
        'attachments' => 'array',
    ];

    /**
     * Get the activity that owns the comment.
     */
    public function activity(): BelongsTo
    {
        return $this->belongsTo(ProjectActivity::class, 'project_activity_id');
    }

    /**
     * Get the user that wrote the comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
