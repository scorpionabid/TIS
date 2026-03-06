<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaskSubDelegation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'task_id',
        'parent_assignment_id',
        'delegated_to_user_id',
        'delegated_to_institution_id',
        'delegated_by_user_id',
        'status',
        'progress',
        'deadline',
        'delegation_notes',
        'completion_notes',
        'completion_data',
        'accepted_at',
        'started_at',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'completion_data' => 'array',
        'deadline' => 'datetime',
        'accepted_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'progress' => 'integer',
    ];

    /**
     * Get the task that owns the sub-delegation
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the parent assignment that owns the sub-delegation
     */
    public function parentAssignment(): BelongsTo
    {
        return $this->belongsTo(TaskAssignment::class, 'parent_assignment_id');
    }

    /**
     * Get the user who was delegated to
     */
    public function delegatedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_to_user_id');
    }

    /**
     * Get the user who delegated the task
     */
    public function delegatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_by_user_id');
    }

    /**
     * Get the institution where the task was delegated to
     */
    public function delegatedToInstitution(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'delegated_to_institution_id');
    }

    /**
     * Scope a query to only include active delegations (not cancelled)
     */
    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'cancelled');
    }

    /**
     * Scope a query to only include pending delegations
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include in-progress delegations
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    /**
     * Scope a query to only include completed delegations
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Check if delegation is overdue
     */
    public function isOverdue(): bool
    {
        return $this->deadline && 
               $this->deadline->isPast() && 
               !in_array($this->status, ['completed', 'cancelled']);
    }

    /**
     * Get status color for UI
     */
    public function getStatusColor(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'accepted' => 'blue',
            'in_progress' => 'indigo',
            'completed' => 'green',
            'cancelled' => 'red',
            default => 'gray'
        };
    }

    /**
     * Get status label in Azerbaijani
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            'pending' => 'Gözləyir',
            'accepted' => 'Qəbul edildi',
            'in_progress' => 'İcrada',
            'completed' => 'Tamamlandı',
            'cancelled' => 'Ləğv edildi',
            default => 'Bilinmir'
        };
    }
}
