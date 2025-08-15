<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskProgressLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'updated_by',
        'old_status',
        'new_status',
        'progress_percentage',
        'notes',
    ];

    protected $casts = [
        'progress_percentage' => 'integer',
    ];

    /**
     * Task relationship
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * User who made the update
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope: Filter by task
     */
    public function scopeForTask($query, int $taskId)
    {
        return $query->where('task_id', $taskId);
    }

    /**
     * Scope: Recent logs first
     */
    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}