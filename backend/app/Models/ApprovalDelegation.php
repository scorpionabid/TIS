<?php

namespace App\Models;

use App\Models\Traits\HasInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalDelegation extends Model
{
    use HasFactory, HasInstitution;

    protected $fillable = [
        'approval_request_id',
        'delegator_id',
        'delegate_id',
        'delegation_reason',
        'include_comment',
        'status',
        'delegation_expires_at',
        'responded_at',
        'response_comment',
    ];

    protected $casts = [
        'delegation_expires_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    /**
     * Get the approval request this delegation is for
     */
    public function approvalRequest(): BelongsTo
    {
        return $this->belongsTo(DataApprovalRequest::class, 'approval_request_id');
    }

    /**
     * Get the user who delegated the approval
     */
    public function delegator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegator_id');
    }

    /**
     * Get the user who received the delegation
     */
    public function delegate(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegate_id');
    }

    /**
     * Scope to get pending delegations
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending')
            ->where(function ($q) {
                $q->whereNull('delegation_expires_at')
                    ->orWhere('delegation_expires_at', '>', now());
            });
    }

    /**
     * Scope to get active delegations (pending and not expired)
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'pending')
            ->where(function ($q) {
                $q->whereNull('delegation_expires_at')
                    ->orWhere('delegation_expires_at', '>', now());
            });
    }

    /**
     * Scope to get expired delegations
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'pending')
            ->whereNotNull('delegation_expires_at')
            ->where('delegation_expires_at', '<=', now());
    }

    /**
     * Scope to get delegations for a specific user
     */
    public function scopeForDelegate($query, $userId)
    {
        return $query->where('delegate_id', $userId);
    }

    /**
     * Scope to get delegations by a specific user
     */
    public function scopeByDelegator($query, $userId)
    {
        return $query->where('delegator_id', $userId);
    }

    /**
     * Check if this delegation is expired
     */
    public function isExpired(): bool
    {
        return $this->delegation_expires_at &&
               $this->delegation_expires_at <= now() &&
               $this->status === 'pending';
    }

    /**
     * Check if this delegation is still active
     */
    public function isActive(): bool
    {
        return $this->status === 'pending' && ! $this->isExpired();
    }

    /**
     * Accept the delegation
     */
    public function accept($comment = null): bool
    {
        if (! $this->isActive()) {
            return false;
        }

        return $this->update([
            'status' => 'accepted',
            'responded_at' => now(),
            'response_comment' => $comment,
        ]);
    }

    /**
     * Decline the delegation
     */
    public function decline($comment = null): bool
    {
        if (! $this->isActive()) {
            return false;
        }

        return $this->update([
            'status' => 'declined',
            'responded_at' => now(),
            'response_comment' => $comment,
        ]);
    }

    /**
     * Mark delegation as expired
     */
    public function markExpired(): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        return $this->update([
            'status' => 'expired',
            'responded_at' => now(),
        ]);
    }
}
