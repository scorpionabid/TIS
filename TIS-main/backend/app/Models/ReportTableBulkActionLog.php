<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportTableBulkActionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'report_table_id',
        'action',
        'row_count',
        'successful_count',
        'failed_count',
        'details',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'details' => 'array',
        'row_count' => 'integer',
        'successful_count' => 'integer',
        'failed_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reportTable(): BelongsTo
    {
        return $this->belongsTo(ReportTable::class);
    }

    /**
     * Get action label in Azerbaijani
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'approve' => 'Təsdiqləndi',
            'reject' => 'Rədd edildi',
            'return' => 'Qaytarıldı',
            default => $this->action,
        };
    }
}
