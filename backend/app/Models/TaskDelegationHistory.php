<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskDelegationHistory extends Model
{
    use HasFactory, HasUser;

    protected $table = 'task_delegation_history';

    protected $fillable = [
        'task_id',
        'assignment_id',
        'delegated_from_user_id',
        'delegated_to_user_id',
        'delegated_by_user_id',
        'delegation_reason',
        'delegated_at',
        'delegation_metadata',
    ];

    protected $casts = [
        'delegated_at' => 'datetime',
        'delegation_metadata' => 'array',
    ];

    protected $with = ['fromUser', 'toUser'];

    /**
     * Task relationship
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Task assignment relationship
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TaskAssignment::class);
    }

    /**
     * User who delegated FROM (previous assignee)
     */
    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_from_user_id');
    }

    /**
     * User who delegated TO (new assignee)
     */
    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_to_user_id');
    }

    /**
     * User who performed the delegation action
     */
    public function delegatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_by_user_id');
    }
}
