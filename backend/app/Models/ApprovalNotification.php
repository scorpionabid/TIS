<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'approval_request_id',
        'recipient_id',
        'notification_type',
        'title',
        'message',
        'status',
        'notification_metadata',
        'scheduled_for',
        'sent_at',
        'read_at',
    ];

    protected $casts = [
        'notification_metadata' => 'array',
        'scheduled_for' => 'datetime',
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the approval request this notification belongs to
     */
    public function approvalRequest(): BelongsTo
    {
        return $this->belongsTo(DataApprovalRequest::class, 'approval_request_id');
    }

    /**
     * Get the recipient user
     */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    /**
     * Scope for pending notifications
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for sent notifications
     */
    public function scopeSent($query)
    {
        return $query->where('status', 'sent');
    }

    /**
     * Scope for read notifications
     */
    public function scopeRead($query)
    {
        return $query->where('status', 'read');
    }

    /**
     * Scope for unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('status', '!=', 'read');
    }

    /**
     * Scope for scheduled notifications
     */
    public function scopeScheduled($query)
    {
        return $query->whereNotNull('scheduled_for')
                    ->where('scheduled_for', '<=', now())
                    ->where('status', 'pending');
    }

    /**
     * Mark notification as sent
     */
    public function markAsSent(): void
    {
        $this->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(): void
    {
        $this->update([
            'status' => 'read',
            'read_at' => now(),
        ]);
    }

    /**
     * Check if notification is overdue
     */
    public function isOverdue(): bool
    {
        return $this->scheduled_for && 
               $this->scheduled_for->isPast() && 
               $this->status === 'pending';
    }

    /**
     * Get formatted notification type
     */
    public function getFormattedType(): string
    {
        return match($this->notification_type) {
            'request_submitted' => 'Sorğu göndərildi',
            'approval_required' => 'Təsdiq tələb olunur',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'deadline_approaching' => 'Müddət yaxınlaşır',
            'overdue' => 'Müddət keçib',
            default => ucfirst(str_replace('_', ' ', $this->notification_type))
        };
    }

    /**
     * Get notification priority level
     */
    public function getPriority(): string
    {
        return match($this->notification_type) {
            'overdue' => 'high',
            'deadline_approaching' => 'medium',
            'approval_required' => 'medium',
            'rejected' => 'high',
            default => 'low'
        };
    }

    /**
     * Get notification icon for UI
     */
    public function getIcon(): string
    {
        return match($this->notification_type) {
            'request_submitted' => 'send',
            'approval_required' => 'clock',
            'approved' => 'check-circle',
            'rejected' => 'x-circle',
            'deadline_approaching' => 'alert-triangle',
            'overdue' => 'alert-circle',
            default => 'bell'
        };
    }
}