<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskDependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'depends_on_task_id',
        'dependency_type',
    ];

    /**
     * Task that has the dependency
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Task that this task depends on
     */
    public function dependsOnTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'depends_on_task_id');
    }

    /**
     * Scope: Filter by dependency type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('dependency_type', $type);
    }

    /**
     * Scope: Blocking dependencies
     */
    public function scopeBlocking($query)
    {
        return $query->where('dependency_type', 'blocks');
    }

    /**
     * Scope: Required dependencies
     */
    public function scopeRequired($query)
    {
        return $query->where('dependency_type', 'requires');
    }

    /**
     * Check if dependency is satisfied
     */
    public function isSatisfied(): bool
    {
        $dependsOnTask = $this->dependsOnTask;
        
        if (!$dependsOnTask) {
            return true; // If dependency task doesn't exist, consider it satisfied
        }

        return $dependsOnTask->status === 'completed';
    }
}