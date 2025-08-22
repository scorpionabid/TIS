<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'approval_request_id',
        'approver_id',
        'approval_level',
        'action',
        'comments',
        'action_metadata',
        'action_taken_at',
        'delegated_to',
    ];

    protected $casts = [
        'action_metadata' => 'array',
        'action_taken_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the approval request this action belongs to
     */
    public function approvalRequest(): BelongsTo
    {
        return $this->belongsTo(DataApprovalRequest::class, 'approval_request_id');
    }

    /**
     * Get the user who performed this action
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    /**
     * Get the user this action was delegated to (if any)
     */
    public function delegatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_to');
    }

    /**
     * Scope for approved actions
     */
    public function scopeApproved($query)
    {
        return $query->where('action', 'approved');
    }

    /**
     * Scope for rejected actions
     */
    public function scopeRejected($query)
    {
        return $query->where('action', 'rejected');
    }

    /**
     * Scope for returned actions
     */
    public function scopeReturned($query)
    {
        return $query->where('action', 'returned');
    }

    /**
     * Scope for delegated actions
     */
    public function scopeDelegated($query)
    {
        return $query->where('action', 'delegated');
    }

    /**
     * Get formatted action for display
     */
    public function getFormattedAction(): string
    {
        return match($this->action) {
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'returned' => 'Geri qaytarıldı',
            'delegated' => 'Həvalə edildi',
            default => ucfirst($this->action)
        };
    }

    /**
     * Check if this action requires follow-up
     */
    public function requiresFollowUp(): bool
    {
        return in_array($this->action, ['returned', 'delegated']);
    }

    /**
     * Get action icon for UI
     */
    public function getActionIcon(): string
    {
        return match($this->action) {
            'approved' => 'check-circle',
            'rejected' => 'x-circle',
            'returned' => 'arrow-left',
            'delegated' => 'user-check',
            default => 'circle'
        };
    }

    /**
     * Get action color for UI
     */
    public function getActionColor(): string
    {
        return match($this->action) {
            'approved' => 'success',
            'rejected' => 'destructive',
            'returned' => 'warning',
            'delegated' => 'secondary',
            default => 'secondary'
        };
    }
}