<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectActivity extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'parent_id',
        'user_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'planned_hours',
        'actual_hours',
        'budget',
        'priority',
        'status',
        'category',
        'notes',
        'goal_contribution_percentage',
        'goal_target',
        'expected_outcome',
        'kpi_metrics',
        'risks',
        'location_platform',
        'monitoring_mechanism',
        'order_index',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'planned_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'budget' => 'decimal:2',
        'goal_contribution_percentage' => 'decimal:2',
        'metadata' => 'array',
    ];

    /**
     * Get the project.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the parent activity (dependency).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProjectActivity::class, 'parent_id');
    }

    /**
     * Get the sub-activities.
     */
    public function subActivities(): HasMany
    {
        return $this->hasMany(ProjectActivity::class, 'parent_id');
    }

    /**
     * Get the activity history logs.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(ProjectActivityLog::class, 'activity_id');
    }

    /**
     * Get the activity attachments.
     */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Upload::class, 'entity');
    }

    /**
     * Get the employee assigned to this activity.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the employees assigned to this activity.
     */
    public function assignedEmployees()
    {
        return $this->belongsToMany(User::class, 'project_activity_user', 'project_activity_id', 'user_id')
                    ->withPivot('assigned_at')
                    ->withTimestamps();
    }

    /**
     * Get the comments for the activity.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(ProjectActivityComment::class);
    }
}
