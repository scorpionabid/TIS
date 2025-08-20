<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryTransaction extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'item_id',
        'user_id',
        'transaction_type',
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

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'approved_at' => 'datetime',
            'quantity' => 'integer',
            'previous_quantity' => 'integer',
            'new_quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    /**
     * Relationships
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
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

    /**
     * Scopes
     */
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

    public function scopeIncoming($query)
    {
        return $query->whereIn('transaction_type', ['purchase', 'donation', 'return', 'adjustment_increase']);
    }

    public function scopeOutgoing($query)
    {
        return $query->whereIn('transaction_type', ['assignment', 'disposal', 'sale', 'adjustment_decrease']);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('transaction_date', now()->toDateString());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('transaction_date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('transaction_date', now()->month)
                    ->whereYear('transaction_date', now()->year);
    }

    /**
     * Accessors & Mutators
     */
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
        ];
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

    public function getTransactionDirectionAttribute(): string
    {
        $incomingTypes = ['purchase', 'donation', 'return', 'adjustment_increase'];
        $outgoingTypes = ['assignment', 'disposal', 'sale', 'adjustment_decrease'];

        if (in_array($this->transaction_type, $incomingTypes)) {
            return 'incoming';
        } elseif (in_array($this->transaction_type, $outgoingTypes)) {
            return 'outgoing';
        } else {
            return 'neutral';
        }
    }

    public function getFormattedAmountAttribute(): string
    {
        if (!$this->total_amount) {
            return 'Məlum deyil';
        }

        return number_format($this->total_amount, 2) . ' AZN';
    }

    /**
     * Helper Methods
     */
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

    public function isIncoming(): bool
    {
        return $this->transaction_direction === 'incoming';
    }

    public function isOutgoing(): bool
    {
        return $this->transaction_direction === 'outgoing';
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

    public function reject($reason = null): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        $metadata = $this->metadata ?? [];
        $metadata['rejection_reason'] = $reason;

        return $this->update([
            'status' => 'rejected',
            'metadata' => $metadata,
        ]);
    }

    public function complete(): bool
    {
        if ($this->status !== 'approved') {
            return false;
        }

        return $this->update([
            'status' => 'completed',
        ]);
    }

    public function cancel($reason = null): bool
    {
        if (in_array($this->status, ['completed', 'cancelled'])) {
            return false;
        }

        $metadata = $this->metadata ?? [];
        $metadata['cancellation_reason'] = $reason;

        return $this->update([
            'status' => 'cancelled',
            'metadata' => $metadata,
        ]);
    }

    public function calculateTotalAmount(): float
    {
        if (!$this->unit_price || !$this->quantity) {
            return 0;
        }

        return $this->unit_price * $this->quantity;
    }

    public function updateItemQuantity(): bool
    {
        if (!$this->isApproved() || !$this->item->is_consumable) {
            return false;
        }

        $newQuantity = match($this->transaction_direction) {
            'incoming' => $this->item->stock_quantity + $this->quantity,
            'outgoing' => $this->item->stock_quantity - $this->quantity,
            default => $this->item->stock_quantity
        };

        return $this->item->update([
            'stock_quantity' => max(0, $newQuantity),
        ]);
    }

    public static function createPurchase($itemId, $quantity, $unitPrice, $supplier, $invoiceNumber = null, $userId = null): self
    {
        $item = InventoryItem::find($itemId);
        
        return self::create([
            'item_id' => $itemId,
            'user_id' => $userId ?: auth()->id(),
            'transaction_type' => 'purchase',
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total_amount' => $quantity * $unitPrice,
            'previous_quantity' => $item->stock_quantity ?? 0,
            'new_quantity' => ($item->stock_quantity ?? 0) + $quantity,
            'supplier' => $supplier,
            'invoice_number' => $invoiceNumber,
            'transaction_date' => now(),
            'status' => 'pending',
            'description' => "Satın alma: {$quantity} ədəd {$item->name}",
        ]);
    }

    public static function createAssignment($itemId, $assignedTo, $assignedFrom = null, $userId = null): self
    {
        $item = InventoryItem::find($itemId);
        $assignedUser = User::find($assignedTo);
        
        return self::create([
            'item_id' => $itemId,
            'user_id' => $userId ?: auth()->id(),
            'transaction_type' => 'assignment',
            'quantity' => 1,
            'assigned_to' => $assignedTo,
            'assigned_from' => $assignedFrom,
            'transaction_date' => now(),
            'status' => 'pending',
            'description' => "Tapşırılma: {$item->name} -> {$assignedUser->username}",
        ]);
    }

    public static function createReturn($itemId, $returnedFrom, $userId = null): self
    {
        $item = InventoryItem::find($itemId);
        $returnedUser = User::find($returnedFrom);
        
        return self::create([
            'item_id' => $itemId,
            'user_id' => $userId ?: auth()->id(),
            'transaction_type' => 'return',
            'quantity' => 1,
            'assigned_from' => $returnedFrom,
            'transaction_date' => now(),
            'status' => 'pending',
            'description' => "Geri qaytarılma: {$item->name} <- {$returnedUser->username}",
        ]);
    }

    public static function createStockAdjustment($itemId, $newQuantity, $reason, $userId = null): self
    {
        $item = InventoryItem::find($itemId);
        $difference = $newQuantity - ($item->stock_quantity ?? 0);
        $type = $difference > 0 ? 'adjustment_increase' : 'adjustment_decrease';
        
        return self::create([
            'item_id' => $itemId,
            'user_id' => $userId ?: auth()->id(),
            'transaction_type' => $type,
            'quantity' => abs($difference),
            'previous_quantity' => $item->stock_quantity ?? 0,
            'new_quantity' => $newQuantity,
            'transaction_date' => now(),
            'status' => 'pending',
            'description' => "Stok düzəlişi: {$reason}",
            'notes' => $reason,
        ]);
    }

    public function getTransactionSummary(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->transaction_type,
            'type_label' => $this->transaction_type_label,
            'direction' => $this->transaction_direction,
            'quantity' => $this->quantity,
            'amount' => $this->formatted_amount,
            'date' => $this->transaction_date,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'description' => $this->description,
            'item' => [
                'id' => $this->item->id,
                'name' => $this->item->name,
                'category' => $this->item->category_label,
            ],
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->profile 
                    ? "{$this->user->profile->first_name} {$this->user->profile->last_name}"
                    : $this->user->username,
            ],
        ];
    }
}