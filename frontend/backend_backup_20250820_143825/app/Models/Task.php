<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'category',
        'priority',
        'status',
        'progress',
        'deadline',
        'started_at',
        'completed_at',
        'created_by',
        'assigned_to',
        'assigned_institution_id',
        'target_institutions',
        'target_departments',
        'target_roles',
        'target_scope',
        'notes',
        'completion_notes',
        'attachments',
        'requires_approval',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'approved_at' => 'datetime',
        'target_institutions' => 'array',
        'target_departments' => 'array',
        'target_roles' => 'array',
        'attachments' => 'array',
        'requires_approval' => 'boolean',
        'progress' => 'integer',
    ];

    // Constants for enums - Updated to English for consistency
    const CATEGORIES = [
        'report' => 'Report Preparation',
        'maintenance' => 'Maintenance and Infrastructure',
        'event' => 'Event Organization and Coordination',
        'audit' => 'Audit and Control Tasks',
        'instruction' => 'Instructions and Methodical Materials',
        'other' => 'Other Tasks',
    ];

    const PRIORITIES = [
        'low' => 'Low',
        'medium' => 'Medium',
        'high' => 'High',
        'urgent' => 'Urgent',
    ];

    const STATUSES = [
        'pending' => 'Gözləyir',
        'in_progress' => 'İcradadır',
        'review' => 'Yoxlanılır',
        'completed' => 'Tamamlandı',
        'cancelled' => 'Ləğv edildi',
    ];

    const TARGET_SCOPES = [
        'specific' => 'Xüsusi seçim',
        'regional' => 'Regional',
        'sectoral' => 'Sektoral',
        'all' => 'Hamısı',
    ];

    /**
     * Task creator relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Task assignee relationship
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Assigned institution relationship
     */
    public function assignedInstitution(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'assigned_institution_id');
    }

    /**
     * Task approver relationship
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Task comments relationship
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    /**
     * Task progress logs relationship
     */
    public function progressLogs(): HasMany
    {
        return $this->hasMany(TaskProgressLog::class);
    }

    /**
     * Task notifications relationship
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(TaskNotification::class);
    }

    /**
     * Task assignments relationship
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class);
    }

    /**
     * Task dependencies (tasks this task depends on)
     */
    public function dependencies(): HasMany
    {
        return $this->hasMany(TaskDependency::class);
    }

    /**
     * Tasks that depend on this task
     */
    public function dependents(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'depends_on_task_id');
    }

    /**
     * Scope: Filter by status
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by priority
     */
    public function scopeByPriority(Builder $query, string $priority): Builder
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope: Filter by category
     */
    public function scopeByCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope: Filter by assigned user
     */
    public function scopeAssignedTo(Builder $query, int $userId): Builder
    {
        return $query->where('assigned_to', $userId);
    }

    /**
     * Scope: Filter by creator
     */
    public function scopeCreatedBy(Builder $query, int $userId): Builder
    {
        return $query->where('created_by', $userId);
    }

    /**
     * Scope: Filter by deadline approaching (within days)
     */
    public function scopeDeadlineApproaching(Builder $query, int $days = 3): Builder
    {
        return $query->where('deadline', '<=', now()->addDays($days))
                    ->where('status', '!=', 'completed')
                    ->where('status', '!=', 'cancelled');
    }

    /**
     * Scope: Filter overdue tasks
     */
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('deadline', '<', now())
                    ->where('status', '!=', 'completed')
                    ->where('status', '!=', 'cancelled');
    }

    /**
     * Scope: Filter by institution access
     */
    public function scopeForInstitution(Builder $query, int $institutionId): Builder
    {
        return $query->where(function ($q) use ($institutionId) {
            $q->where('assigned_institution_id', $institutionId)
              ->orWhereJsonContains('target_institutions', $institutionId)
              ->orWhere('target_scope', 'all');
        });
    }

    /**
     * Check if task is overdue
     */
    public function isOverdue(): bool
    {
        return $this->deadline && 
               $this->deadline < now() && 
               !in_array($this->status, ['completed', 'cancelled']);
    }

    /**
     * Check if deadline is approaching (within 3 days)
     */
    public function isDeadlineApproaching(int $days = 3): bool
    {
        return $this->deadline && 
               $this->deadline <= now()->addDays($days) && 
               !in_array($this->status, ['completed', 'cancelled']);
    }

    /**
     * Get category label
     */
    public function getCategoryLabelAttribute(): string
    {
        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    /**
     * Get priority label
     */
    public function getPriorityLabelAttribute(): string
    {
        return self::PRIORITIES[$this->priority] ?? $this->priority;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * HIERARCHICAL AUTHORITY METHODS
     */

    /**
     * Check if user can create tasks for given target institutions
     */
    public static function canCreateTaskForTargets(User $user, array $targetInstitutionIds): bool
    {
        $userRole = $user->roles->first();
        if (!$userRole) return false;

        $userInstitution = $user->institution;
        if (!$userInstitution) return false;

        foreach ($targetInstitutionIds as $targetId) {
            if (!self::canUserTargetInstitution($user, $userRole, $targetId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if user can target specific institution based on hierarchical authority
     */
    private static function canUserTargetInstitution(User $user, $userRole, int $targetInstitutionId): bool
    {
        $userInstitution = $user->institution;
        $targetInstitution = Institution::find($targetInstitutionId);
        
        if (!$targetInstitution) return false;

        // SuperAdmin can target anyone
        if ($userRole->name === 'superadmin') return true;

        // RegionAdmin can target own region and below
        if ($userRole->name === 'regionadmin') {
            return self::isInstitutionInRegionalHierarchy($userInstitution, $targetInstitution);
        }

        // SektorAdmin can target own sector and below
        if ($userRole->name === 'sektoradmin') {
            return self::isInstitutionInSectorHierarchy($userInstitution, $targetInstitution);
        }

        // RegionOperator can target schools in their region
        if ($userRole->name === 'regionoperator') {
            return self::isInstitutionInRegionalHierarchy($userInstitution, $targetInstitution) && 
                   $targetInstitution->type === 'school';
        }

        // SektorOperator can target schools in their sector
        if ($userRole->name === 'sektoroperator') {
            return self::isInstitutionInSectorHierarchy($userInstitution, $targetInstitution) && 
                   $targetInstitution->type === 'school';
        }

        // School-level roles can only target their own institution
        if (in_array($userRole->name, ['schooladmin', 'deputy', 'teacher'])) {
            return $userInstitution->id === $targetInstitution->id;
        }

        return false;
    }

    /**
     * Check if target institution is within user's regional hierarchy
     */
    private static function isInstitutionInRegionalHierarchy(Institution $userInstitution, Institution $targetInstitution): bool
    {
        // If user is at region level
        if ($userInstitution->type === 'region') {
            // Target must be in same region or be the region itself
            return $targetInstitution->region_code === $userInstitution->region_code;
        }

        // If user is at sector level, get their region and check
        if ($userInstitution->type === 'sektor') {
            $userRegion = $userInstitution->parent;
            return $userRegion && $targetInstitution->region_code === $userRegion->region_code;
        }

        return false;
    }

    /**
     * Check if target institution is within user's sector hierarchy
     */
    private static function isInstitutionInSectorHierarchy(Institution $userInstitution, Institution $targetInstitution): bool
    {
        // If user is at sector level
        if ($userInstitution->type === 'sektor') {
            // Target must be within this sector (schools under this sector)
            return $targetInstitution->parent_id === $userInstitution->id ||
                   $targetInstitution->id === $userInstitution->id;
        }

        return false;
    }

    /**
     * Get allowed target roles for a user
     */
    public static function getAllowedTargetRoles(User $user): array
    {
        $userRole = $user->roles->first();
        if (!$userRole) return [];

        $allowedRoles = [
            'superadmin' => ['regionadmin', 'regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin', 'deputy', 'teacher'],
            'regionadmin' => ['regionoperator', 'sektoradmin', 'sektoroperator', 'schooladmin', 'deputy', 'teacher'],
            'regionoperator' => ['schooladmin', 'deputy', 'teacher'],
            'sektoradmin' => ['sektoroperator', 'schooladmin', 'deputy', 'teacher'],
            'sektoroperator' => ['schooladmin', 'deputy', 'teacher'],
            'schooladmin' => ['deputy', 'teacher'],
            'deputy' => ['teacher'],
        ];

        return $allowedRoles[$userRole->name] ?? [];
    }

    /**
     * Get institutions user can create tasks for
     */
    public static function getUserTargetableInstitutions(User $user): array
    {
        $userRole = $user->roles->first();
        if (!$userRole) return [];

        $userInstitution = $user->institution;
        if (!$userInstitution) return [];

        // SuperAdmin can target all active institutions
        if ($userRole->name === 'superadmin') {
            return Institution::where('is_active', true)->pluck('id')->toArray();
        }

        // RegionAdmin can target all institutions in their region
        if ($userRole->name === 'regionadmin') {
            return Institution::where('region_code', $userInstitution->region_code)
                             ->where('is_active', true)
                             ->pluck('id')->toArray();
        }

        // SektorAdmin can target their sector and schools under it
        if ($userRole->name === 'sektoradmin') {
            return Institution::where(function($q) use ($userInstitution) {
                $q->where('id', $userInstitution->id)
                  ->orWhere('parent_id', $userInstitution->id);
            })->where('is_active', true)->pluck('id')->toArray();
        }

        // Operators can target schools
        if (in_array($userRole->name, ['regionoperator', 'sektoroperator'])) {
            $query = Institution::where('type', 'school')->where('is_active', true);
            
            if ($userRole->name === 'regionoperator') {
                $query->where('region_code', $userInstitution->region_code);
            } else {
                $userSector = $userInstitution->type === 'sektor' ? $userInstitution : $userInstitution->parent;
                if ($userSector) {
                    $query->where('parent_id', $userSector->id);
                }
            }
            
            return $query->pluck('id')->toArray();
        }

        // School-level roles can only target their own institution
        if (in_array($userRole->name, ['schooladmin', 'deputy', 'teacher'])) {
            return [$userInstitution->id];
        }

        return [];
    }

    /**
     * Auto-set started_at when status changes to in_progress
     */
    protected static function booted()
    {
        static::updating(function ($task) {
            if ($task->isDirty('status')) {
                if ($task->status === 'in_progress' && !$task->started_at) {
                    $task->started_at = now();
                } elseif ($task->status === 'completed' && !$task->completed_at) {
                    $task->completed_at = now();
                    $task->progress = 100;
                }
            }
        });
    }
}