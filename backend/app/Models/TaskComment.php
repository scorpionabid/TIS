<?php

namespace App\Models;

use App\Models\Traits\HasUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskComment extends Model
{
    use HasFactory, HasUser;

    protected $fillable = [
        'task_id',
        'user_id',
        'comment',
        'attachments',
        'type',
    ];

    protected $casts = [
        'attachments' => 'array',
    ];

    // Constants for comment types
    const TYPES = [
        'comment' => 'Şərh',
        'status_change' => 'Status dəyişikliyi',
        'progress_update' => 'İrəliləyiş yeniləməsi',
        'system' => 'Sistem bildirişi',
    ];

    /**
     * Task relationship
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get type label
     */
    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }
}
