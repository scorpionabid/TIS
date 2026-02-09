<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalAuditLog extends Model
{
    use HasFactory, HasUser;

    protected $fillable = [
        'approval_request_id',
        'user_id',
        'action',
        'comments',
        'metadata',
        'previous_state',
        'new_state',
        'ip_address',
        'user_agent',
        'delegation_id',
    ];

    protected $casts = [
        'metadata' => 'array',
        'previous_state' => 'array',
        'new_state' => 'array',
    ];

    /**
     * Get the approval request this log entry is for
     */
    public function approvalRequest(): BelongsTo
    {
        return $this->belongsTo(DataApprovalRequest::class, 'approval_request_id');
    }

    /**
     * Get the delegation associated with this log entry (if applicable)
     */
    public function delegation(): BelongsTo
    {
        return $this->belongsTo(ApprovalDelegation::class, 'delegation_id');
    }

    /**
     * Scope to get logs by action type
     */
    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get logs by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get recent logs
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope to get logs for approval actions (approved, rejected, returned)
     */
    public function scopeApprovalActions($query)
    {
        return $query->whereIn('action', ['approved', 'rejected', 'returned']);
    }

    /**
     * Scope to get logs for system actions (auto_approved, escalated, expired)
     */
    public function scopeSystemActions($query)
    {
        return $query->whereIn('action', ['auto_approved', 'escalated', 'expired']);
    }

    /**
     * Get a human-readable description of this action
     */
    public function getActionDescriptionAttribute(): string
    {
        $descriptions = [
            'created' => 'Təsdiq tələbi yaradıldı',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'returned' => 'Düzəliş üçün göndərildi',
            'delegated' => 'Həvalə edildi',
            'escalated' => 'Escalate edildi',
            'auto_approved' => 'Avtomatik təsdiqləndi',
            'expired' => 'Vaxtı bitdi',
        ];

        return $descriptions[$this->action] ?? $this->action;
    }

    /**
     * Check if this was a user action vs system action
     */
    public function isUserAction(): bool
    {
        return in_array($this->action, ['created', 'approved', 'rejected', 'returned', 'delegated']);
    }

    /**
     * Check if this was a system action
     */
    public function isSystemAction(): bool
    {
        return in_array($this->action, ['auto_approved', 'escalated', 'expired']);
    }

    /**
     * Get changes between previous and new state
     */
    public function getChanges(): array
    {
        if (! $this->previous_state || ! $this->new_state) {
            return [];
        }

        $changes = [];
        $previous = $this->previous_state;
        $new = $this->new_state;

        foreach ($new as $key => $newValue) {
            $oldValue = $previous[$key] ?? null;

            if ($oldValue !== $newValue) {
                $changes[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }

    /**
     * Create an audit log entry
     */
    public static function logAction(
        int $approvalRequestId,
        int $userId,
        string $action,
        ?string $comments = null,
        ?array $metadata = null,
        ?array $previousState = null,
        ?array $newState = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?int $delegationId = null
    ): self {
        return self::create([
            'approval_request_id' => $approvalRequestId,
            'user_id' => $userId,
            'action' => $action,
            'comments' => $comments,
            'metadata' => $metadata,
            'previous_state' => $previousState,
            'new_state' => $newState,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'delegation_id' => $delegationId,
        ]);
    }
}
