<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'maintenance_record_id',
        'user_id',
        'transaction_type',
        'condition_on_return',
        'quantity',
        'unit_price',
        'total_amount',
        'previous_quantity',
        'new_quantity',
        'assigned_to',
        'assigned_from',
        'transaction_date',
        'reference_number',
        'supplier',
        'invoice_number',
        'location_from',
        'location_to',
        'description',
        'notes',
        'approved_by',
        'approved_at',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'approved_at' => 'datetime',
            'maintenance_record_id' => 'integer',
            'quantity' => 'integer',
            'previous_quantity' => 'integer',
            'new_quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }

    public function maintenanceRecord(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRecord::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedFromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_from');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeByItem($query, $itemId)
    {
        return $query->where('item_id', $itemId);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function getTransactionTypeLabelAttribute(): string
    {
        return match($this->transaction_type) {
            'purchase' => 'Satın alma',
            'assignment' => 'Tapşırılma',
            'return' => 'Geri qaytarılma',
            'disposal' => 'İmha',
            'transfer' => 'Transfer',
            'maintenance' => 'Təmir',
            'donation' => 'Bağışlama',
            'sale' => 'Satış',
            'adjustment_increase' => 'Artırılma',
            'adjustment_decrease' => 'Azaldılma',
            'lost' => 'İtirim',
            'damaged' => 'Zədələnmə',
            default => 'Naməlum'
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Gözləyir',
            'approved' => 'Təsdiqlənib',
            'rejected' => 'Rədd edilib',
            'completed' => 'Tamamlanıb',
            'cancelled' => 'Ləğv edilib',
            default => 'Naməlum'
        };
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function approve($approverId): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        return $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);
    }

    public function complete(): bool
    {
        if ($this->status !== 'approved') {
            return false;
        }

        return $this->update(['status' => 'completed']);
    }
}
