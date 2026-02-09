<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskChecklistItem extends Model
{
    use HasFactory, HasUser;

    protected $table = 'task_checklists';

    protected $fillable = [
        'task_id',
        'title',
        'is_completed',
        'position',
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'position' => 'integer',
        'completed_at' => 'datetime',
    ];

    /**
     * Task relationship
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * User who completed this item
     */
    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * Mark item as completed
     */
    public function markCompleted(int $userId): void
    {
        $this->update([
            'is_completed' => true,
            'completed_by' => $userId,
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark item as incomplete
     */
    public function markIncomplete(): void
    {
        $this->update([
            'is_completed' => false,
            'completed_by' => null,
            'completed_at' => null,
        ]);
    }

    /**
     * Toggle completion status
     */
    public function toggleCompletion(int $userId): void
    {
        if ($this->is_completed) {
            $this->markIncomplete();
        } else {
            $this->markCompleted($userId);
        }
    }
}
