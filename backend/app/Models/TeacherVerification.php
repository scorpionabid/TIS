<?php

namespace App\Models;

use App\Models\Traits\HasApprover;
use App\Models\Traits\HasTeacher;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherVerification extends Model
{
    use HasFactory, HasTeacher, HasApprover;

    protected $fillable = [
        'teacher_id',
        'verified_by',
        'verification_status',
        'rejection_reason',
        'verified_data',
        'original_data',
        'verification_date',
    ];

    protected $casts = [
        'verified_data' => 'array',
        'original_data' => 'array',
        'verification_date' => 'datetime',
    ];

    /**
     * Get the teacher being verified
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get the sektoradmin who verified
     */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Scope for pending verifications
     */
    public function scopePending($query)
    {
        return $query->where('verification_status', 'pending');
    }

    /**
     * Scope for approved verifications
     */
    public function scopeApproved($query)
    {
        return $query->where('verification_status', 'approved');
    }

    /**
     * Scope for rejected verifications
     */
    public function scopeRejected($query)
    {
        return $query->where('verification_status', 'rejected');
    }
}
