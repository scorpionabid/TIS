<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class ApprovalDelegate extends Model
{
    use HasFactory;

    protected $fillable = [
        'delegator_id',
        'delegate_id',
        'institution_id',
        'delegation_scope',
        'valid_from',
        'valid_until',
        'status',
        'delegation_reason',
        'limitations',
    ];

    protected $casts = [
        'limitations' => 'array',
        'valid_from' => 'date',
        'valid_until' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who is delegating authority
     */
    public function delegator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegator_id');
    }

    /**
     * Get the user who receives delegated authority
     */
    public function delegate(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegate_id');
    }

    /**
     * Get the institution this delegation applies to
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Scope for active delegations
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->where('valid_from', '<=', now())
                    ->where('valid_until', '>=', now());
    }

    /**
     * Scope for expired delegations
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'active')
                    ->where('valid_until', '<', now());
    }

    /**
     * Scope for specific delegate user
     */
    public function scopeForDelegate($query, int $userId)
    {
        return $query->where('delegate_id', $userId);
    }

    /**
     * Scope for specific delegator user
     */
    public function scopeForDelegator($query, int $userId)
    {
        return $query->where('delegator_id', $userId);
    }

    /**
     * Check if delegation is currently valid
     */
    public function isValid(): bool
    {
        return $this->status === 'active' &&
               $this->valid_from <= now() &&
               $this->valid_until >= now();
    }

    /**
     * Check if delegation is expired
     */
    public function isExpired(): bool
    {
        return $this->valid_until < now();
    }

    /**
     * Check if delegation covers a specific scope
     */
    public function coversScope(string $scope): bool
    {
        if ($this->delegation_scope === 'all') {
            return true;
        }

        return $this->delegation_scope === $scope;
    }

    /**
     * Revoke this delegation
     */
    public function revoke(string $reason = null): void
    {
        $this->update([
            'status' => 'revoked',
            'delegation_reason' => $reason ?: $this->delegation_reason,
        ]);
    }

    /**
     * Suspend this delegation
     */
    public function suspend(string $reason = null): void
    {
        $this->update([
            'status' => 'suspended',
            'delegation_reason' => $reason ?: $this->delegation_reason,
        ]);
    }

    /**
     * Reactivate this delegation
     */
    public function reactivate(): void
    {
        if (!$this->isExpired()) {
            $this->update(['status' => 'active']);
        }
    }

    /**
     * Get formatted delegation scope
     */
    public function getFormattedScope(): string
    {
        return match($this->delegation_scope) {
            'all' => 'Bütün əməliyyatlar',
            'attendance_only' => 'Yalnız davamiyyət',
            'schedules_only' => 'Yalnız cədvəllər',
            'emergency_only' => 'Yalnız təcili hallar',
            'surveys_only' => 'Yalnız sorğular',
            'documents_only' => 'Yalnız sənədlər',
            default => ucfirst(str_replace('_', ' ', $this->delegation_scope))
        };
    }

    /**
     * Get delegation status badge color
     */
    public function getStatusColor(): string
    {
        return match($this->status) {
            'active' => 'success',
            'expired' => 'secondary',
            'revoked' => 'destructive',
            'suspended' => 'warning',
            default => 'secondary'
        };
    }

    /**
     * Get remaining days
     */
    public function getRemainingDays(): int
    {
        if ($this->isExpired()) {
            return 0;
        }

        return now()->diffInDays($this->valid_until);
    }

    /**
     * Get formatted status
     */
    public function getFormattedStatus(): string
    {
        return match($this->status) {
            'active' => 'Aktiv',
            'expired' => 'Müddəti bitib',
            'revoked' => 'Ləğv edilib',
            'suspended' => 'Dayandırılıb',
            default => ucfirst($this->status)
        };
    }
}