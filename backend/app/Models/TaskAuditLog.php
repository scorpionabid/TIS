<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskAuditLog extends Model
{
    use HasFactory, HasUser;

    public $timestamps = false;

    protected $fillable = [
        'task_id',
        'user_id',
        'action',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Boot method to auto-set created_at
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->created_at) {
                $model->created_at = now();
            }
        });
    }

    /**
     * Get the task that was audited
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get formatted action label
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'created' => 'Yaradıldı',
            'updated' => 'Yeniləndi',
            'deleted' => 'Silindi',
            'status_changed' => 'Status dəyişdi',
            'delegated' => 'Yönləndirildi',
            'approved' => 'Təsdiqləndi',
            'rejected' => 'Rədd edildi',
            'submitted_for_approval' => 'Təsdiq üçün göndərildi',
            'assignment_updated' => 'Təyinat yeniləndi',
            default => $this->action,
        };
    }

    /**
     * Get changes summary
     */
    public function getChangesSummary(): array
    {
        if (! $this->old_values || ! $this->new_values) {
            return [];
        }

        $changes = [];
        $oldValues = $this->old_values;
        $newValues = $this->new_values;

        foreach ($newValues as $key => $newValue) {
            if (! isset($oldValues[$key]) || $oldValues[$key] !== $newValue) {
                $changes[$key] = [
                    'old' => $oldValues[$key] ?? null,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }
}
