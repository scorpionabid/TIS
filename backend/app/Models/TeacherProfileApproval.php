<?php

namespace App\Models;

use App\Models\Traits\HasApprover;
use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherProfileApproval extends Model
{
    use HasFactory, HasUser, HasApprover;

    protected $fillable = [
        'user_id',
        'model_type',
        'model_id',
        'old_data',
        'new_data',
        'status',
        'rejection_reason',
        'approved_by',
        'approved_at'
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
        'approved_at' => 'datetime',
    ];

    /**
     * Approval statuses
     */
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * Model types
     */
    const MODEL_TEACHER_PROFILE = 'TeacherProfile';
    const MODEL_TEACHER_ACHIEVEMENT = 'TeacherAchievement';
    const MODEL_TEACHER_CERTIFICATE = 'TeacherCertificate';

    /**
     * Get the user that owns the approval request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the admin who approved/rejected the request.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the related model.
     */
    public function model()
    {
        return $this->morphTo();
    }

    /**
     * Scope to get pending approvals.
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to get approved requests.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    /**
     * Scope to get rejected requests.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    /**
     * Scope to get approvals by model type.
     */
    public function scopeByModelType($query, $modelType)
    {
        return $query->where('model_type', $modelType);
    }

    /**
     * Scope to get recent approvals.
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Check if approval is pending.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if approval is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Check if approval is rejected.
     */
    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    /**
     * Approve the request.
     */
    public function approve(int $approvedBy): void
    {
        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_by' => $approvedBy,
            'approved_at' => now()
        ]);
    }

    /**
     * Reject the request.
     */
    public function reject(int $approvedBy, string $reason): void
    {
        $this->update([
            'status' => self::STATUS_REJECTED,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
            'rejection_reason' => $reason
        ]);
    }

    /**
     * Get status display name.
     */
    public function getStatusDisplayNameAttribute(): string
    {
        switch ($this->status) {
            case self::STATUS_PENDING:
                return 'Gözləyir';
            case self::STATUS_APPROVED:
                return 'Təsdiqləndi';
            case self::STATUS_REJECTED:
                return 'Rədd edildi';
            default:
                return 'Məlum deyil';
        }
    }

    /**
     * Get status color.
     */
    public function getStatusColorAttribute(): string
    {
        switch ($this->status) {
            case self::STATUS_PENDING:
                return 'yellow';
            case self::STATUS_APPROVED:
                return 'green';
            case self::STATUS_REJECTED:
                return 'red';
            default:
                return 'gray';
        }
    }

    /**
     * Get model type display name.
     */
    public function getModelTypeDisplayNameAttribute(): string
    {
        switch ($this->model_type) {
            case self::MODEL_TEACHER_PROFILE:
                return 'Profil Məlumatları';
            case self::MODEL_TEACHER_ACHIEVEMENT:
                return 'Nailiyyət';
            case self::MODEL_TEACHER_CERTIFICATE:
                return 'Sertifikat';
            default:
                return 'Digər';
        }
    }
}
