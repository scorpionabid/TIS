<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DataApprovalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'workflow_id',
        'institution_id',
        'approvalable_type',
        'approvalable_id',
        'submitted_by',
        'submitted_at',
        'current_status',
        'current_approval_level',
        'submission_notes',
        'request_metadata',
        'deadline',
        'completed_at',
    ];

    protected $casts = [
        'request_metadata' => 'array',
        'submitted_at' => 'datetime',
        'deadline' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the workflow for this approval request
     */
    public function workflow(): BelongsTo
    {
        return $this->belongsTo(ApprovalWorkflow::class, 'workflow_id');
    }

    /**
     * Get the institution this request belongs to
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who submitted this request
     */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * Get the approvable entity (polymorphic)
     */
    public function approvalable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get all approval actions for this request
     */
    public function approvalActions(): HasMany
    {
        return $this->hasMany(ApprovalAction::class, 'approval_request_id');
    }

    /**
     * Get notifications for this request
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(ApprovalNotification::class, 'approval_request_id');
    }

    /**
     * Scope for pending requests
     */
    public function scopePending($query)
    {
        return $query->where('current_status', 'pending');
    }

    /**
     * Scope for in progress requests
     */
    public function scopeInProgress($query)
    {
        return $query->where('current_status', 'in_progress');
    }

    /**
     * Scope for approved requests
     */
    public function scopeApproved($query)
    {
        return $query->where('current_status', 'approved');
    }

    /**
     * Scope for rejected requests
     */
    public function scopeRejected($query)
    {
        return $query->where('current_status', 'rejected');
    }

    /**
     * Scope for overdue requests
     */
    public function scopeOverdue($query)
    {
        return $query->where('deadline', '<', now())
                    ->whereIn('current_status', ['pending', 'in_progress']);
    }

    /**
     * Check if this request is overdue
     */
    public function isOverdue(): bool
    {
        return $this->deadline && 
               $this->deadline->isPast() && 
               in_array($this->current_status, ['pending', 'in_progress']);
    }

    /**
     * Check if this request can be approved by a specific user
     */
    public function canBeApprovedBy(User $user): bool
    {
        $workflow = $this->workflow;
        $currentStep = collect($workflow->approval_chain)
            ->firstWhere('level', $this->current_approval_level);

        if (!$currentStep) {
            return false;
        }

        // Check if user has the required role for current approval level
        return $user->hasRole($currentStep['role']);
    }

    /**
     * Get the current approval step details
     */
    public function getCurrentApprovalStep(): ?array
    {
        return collect($this->workflow->approval_chain)
            ->firstWhere('level', $this->current_approval_level);
    }

    /**
     * Get approval progress percentage
     */
    public function getProgressPercentage(): int
    {
        $totalLevels = count($this->workflow->approval_chain);
        
        if ($this->current_status === 'approved') {
            return 100;
        }
        
        if ($this->current_status === 'rejected') {
            return 0;
        }

        return (int) (($this->current_approval_level / $totalLevels) * 100);
    }

    /**
     * Get formatted status for display
     */
    public function getFormattedStatus(): string
    {
        return match($this->current_status) {
            'pending' => 'Gözləmədə',
            'in_progress' => 'İcra olunur',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'cancelled' => 'Ləğv edildi',
            default => ucfirst($this->current_status)
        };
    }
}