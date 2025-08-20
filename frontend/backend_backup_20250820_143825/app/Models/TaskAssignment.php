<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'institution_id',
        'department_id',
        'assigned_role',
        'assigned_user_id',
        'assignment_status',
        'assignment_notes',
        'assigned_at',
        'accepted_at',
        'completed_at',
        'completion_data',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
        'completion_data' => 'array',
    ];

    /**
     * Task relationship
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Department relationship
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Assigned user relationship
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * Scope: Filter by status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('assignment_status', $status);
    }

    /**
     * Scope: Filter by role
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('assigned_role', $role);
    }

    /**
     * Scope: Filter by institution
     */
    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Check if assignment is overdue
     */
    public function isOverdue(): bool
    {
        return $this->task && 
               $this->task->deadline && 
               $this->task->deadline < now() && 
               !in_array($this->assignment_status, ['completed']);
    }

    /**
     * Auto-set timestamps when status changes
     */
    protected static function booted()
    {
        static::updating(function ($assignment) {
            if ($assignment->isDirty('assignment_status')) {
                if ($assignment->assignment_status === 'accepted' && !$assignment->accepted_at) {
                    $assignment->accepted_at = now();
                } elseif ($assignment->assignment_status === 'completed' && !$assignment->completed_at) {
                    $assignment->completed_at = now();
                }
            }
        });
    }
}