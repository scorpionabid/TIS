<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'institution_id',
        'assigned_to',
        'category',
        'subcategory',
        'name',
        'description',
        'brand',
        'model',
        'serial_number',
        'asset_tag',
        'purchase_date',
        'purchase_price',
        'vendor',
        'warranty_expiry',
        'condition',
        'status',
        'location',
        'room_id',
        'specifications',
        'accessories',
        'maintenance_schedule',
        'last_maintenance_date',
        'next_maintenance_date',
        'depreciation_rate',
        'current_value',
        'is_consumable',
        'stock_quantity',
        'min_stock_level',
        'max_stock_level',
        'unit_of_measure',
        'barcode',
        'qr_code',
        'notes',
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
            'purchase_date' => 'date',
            'warranty_expiry' => 'date',
            'last_maintenance_date' => 'date',
            'next_maintenance_date' => 'date',
            'purchase_price' => 'decimal:2',
            'current_value' => 'decimal:2',
            'depreciation_rate' => 'decimal:2',
            'stock_quantity' => 'integer',
            'min_stock_level' => 'integer',
            'max_stock_level' => 'integer',
            'is_consumable' => 'boolean',
            'specifications' => 'array',
            'accessories' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Relationships
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'item_id');
    }

    public function maintenanceRecords(): HasMany
    {
        return $this->hasMany(MaintenanceRecord::class, 'item_id');
    }

    /**
     * Scopes
     */
    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCondition($query, $condition)
    {
        return $query->where('condition', $condition);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeInUse($query)
    {
        return $query->where('status', 'in_use');
    }

    public function scopeNeedsMaintenance($query)
    {
        return $query->where('next_maintenance_date', '<=', now()->toDateString());
    }

    public function scopeLowStock($query)
    {
        return $query->where('is_consumable', true)
                    ->whereColumn('stock_quantity', '<=', 'min_stock_level');
    }

    public function scopeWarrantyExpiring($query, $days = 30)
    {
        return $query->whereBetween('warranty_expiry', [
            now()->toDateString(),
            now()->addDays($days)->toDateString()
        ]);
    }

    /**
     * Accessors & Mutators
     */
    public function getCategoryLabelAttribute(): string
    {
        return match($this->category) {
            'electronics' => 'Elektronika',
            'furniture' => 'Mebel',
            'books' => 'Kitablar',
            'equipment' => 'Avadanlıq',
            'supplies' => 'Ləvazimat',
            'vehicles' => 'Nəqliyyat',
            'sports' => 'İdman',
            'laboratory' => 'Laboratoriya',
            'medical' => 'Tibbi',
            'safety' => 'Təhlükəsizlik',
            'cleaning' => 'Təmizlik',
            'stationery' => 'Qırtasiyyə',
            'tools' => 'Alətlər',
            'software' => 'Proqram',
            'other' => 'Digər',
            default => 'Naməlum'
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'available' => 'Mövcud',
            'in_use' => 'İstifadədə',
            'maintenance' => 'Təmirdə',
            'repair' => 'Təmirə ehtiyac',
            'retired' => 'İstifadədan çıxarılıb',
            'lost' => 'İtirilmişdir',
            'damaged' => 'Zədələnmişdir',
            'reserved' => 'Rezerv edilmişdir',
            default => 'Naməlum'
        };
    }

    public function getConditionLabelAttribute(): string
    {
        return match($this->condition) {
            'new' => 'Yeni',
            'excellent' => 'Əla',
            'good' => 'Yaxşı',
            'fair' => 'Orta',
            'poor' => 'Pis',
            'damaged' => 'Zədələnmiş',
            default => 'Qiymətləndirilməyib'
        };
    }

    public function getMaintenanceStatusAttribute(): string
    {
        if (!$this->next_maintenance_date) {
            return 'Planlaşdırılmayıb';
        }

        $daysUntilMaintenance = now()->diffInDays($this->next_maintenance_date, false);

        if ($daysUntilMaintenance < 0) {
            return 'Gecikmiş';
        } elseif ($daysUntilMaintenance <= 7) {
            return 'Yaxında';
        } else {
            return 'Planlaşdırılıb';
        }
    }

    public function getWarrantyStatusAttribute(): string
    {
        if (!$this->warranty_expiry) {
            return 'Məlum deyil';
        }

        if ($this->warranty_expiry->isPast()) {
            return 'Bitib';
        }

        $daysUntilExpiry = now()->diffInDays($this->warranty_expiry);
        
        if ($daysUntilExpiry <= 30) {
            return 'Bitir';
        } else {
            return 'Aktiv';
        }
    }

    public function getStockStatusAttribute(): string
    {
        if (!$this->is_consumable) {
            return 'Tətbiq edilmir';
        }

        if ($this->stock_quantity <= $this->min_stock_level) {
            return 'Az';
        } elseif ($this->stock_quantity >= $this->max_stock_level) {
            return 'Çox';
        } else {
            return 'Normal';
        }
    }

    /**
     * Helper Methods
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    public function isInUse(): bool
    {
        return $this->status === 'in_use';
    }

    public function needsMaintenance(): bool
    {
        return $this->next_maintenance_date && 
               $this->next_maintenance_date->isPast();
    }

    public function isWarrantyExpiring($days = 30): bool
    {
        return $this->warranty_expiry && 
               $this->warranty_expiry->isBetween(now(), now()->addDays($days));
    }

    public function isLowStock(): bool
    {
        return $this->is_consumable && 
               $this->stock_quantity <= $this->min_stock_level;
    }

    public function assignTo($userId): bool
    {
        return $this->update([
            'assigned_to' => $userId,
            'status' => 'in_use',
        ]);
    }

    public function unassign(): bool
    {
        return $this->update([
            'assigned_to' => null,
            'status' => 'available',
        ]);
    }

    public function markAsDamaged($notes = null): bool
    {
        return $this->update([
            'status' => 'damaged',
            'condition' => 'damaged',
            'notes' => $notes ?: $this->notes,
        ]);
    }

    public function sendForMaintenance($scheduledDate = null): bool
    {
        return $this->update([
            'status' => 'maintenance',
            'next_maintenance_date' => $scheduledDate ?: now()->addDays(1),
        ]);
    }

    public function completeMainternance($condition = 'good'): bool
    {
        return $this->update([
            'status' => 'available',
            'condition' => $condition,
            'last_maintenance_date' => now(),
            'next_maintenance_date' => $this->calculateNextMaintenanceDate(),
        ]);
    }

    public function retire(): bool
    {
        return $this->update([
            'status' => 'retired',
            'assigned_to' => null,
        ]);
    }

    public function updateStock($quantity, $operation = 'add'): bool
    {
        if (!$this->is_consumable) {
            return false;
        }

        $newQuantity = $operation === 'add' ? 
            $this->stock_quantity + $quantity : 
            $this->stock_quantity - $quantity;

        return $this->update([
            'stock_quantity' => max(0, $newQuantity),
        ]);
    }

    public function calculateDepreciatedValue(): float
    {
        if (!$this->purchase_price || !$this->purchase_date || !$this->depreciation_rate) {
            return $this->current_value ?: 0;
        }

        $monthsSincePurchase = $this->purchase_date->diffInMonths(now());
        $monthlyDepreciation = ($this->purchase_price * $this->depreciation_rate) / 12;
        $depreciatedAmount = $monthlyDepreciation * $monthsSincePurchase;
        
        return max(0, $this->purchase_price - $depreciatedAmount);
    }

    private function calculateNextMaintenanceDate()
    {
        $schedule = $this->maintenance_schedule;
        
        if (!$schedule || !is_array($schedule) || !isset($schedule['frequency'])) {
            return null;
        }

        $frequency = $schedule['frequency'];
        $interval = $schedule['interval'] ?? 1;

        return match($frequency) {
            'daily' => now()->addDays($interval),
            'weekly' => now()->addWeeks($interval),
            'monthly' => now()->addMonths($interval),
            'quarterly' => now()->addMonths($interval * 3),
            'yearly' => now()->addYears($interval),
            default => null
        };
    }

    public function getUsageHistory(): array
    {
        $transactions = $this->transactions()
            ->where('transaction_type', 'assignment')
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return $transactions->map(function ($transaction) {
            return [
                'user' => $transaction->user ? [
                    'id' => $transaction->user->id,
                    'name' => $transaction->user->profile 
                        ? "{$transaction->user->profile->first_name} {$transaction->user->profile->last_name}"
                        : $transaction->user->username,
                ] : null,
                'date' => $transaction->created_at,
                'action' => $transaction->description,
            ];
        })->toArray();
    }

    public function getMaintenanceHistory(): array
    {
        $records = $this->maintenanceRecords()
            ->with('technician')
            ->orderBy('maintenance_date', 'desc')
            ->limit(5)
            ->get();

        return $records->map(function ($record) {
            return [
                'id' => $record->id,
                'type' => $record->maintenance_type,
                'date' => $record->maintenance_date,
                'technician' => $record->technician ? [
                    'id' => $record->technician->id,
                    'name' => $record->technician->profile 
                        ? "{$record->technician->profile->first_name} {$record->technician->profile->last_name}"
                        : $record->technician->username,
                ] : null,
                'description' => $record->description,
                'status' => $record->status,
                'cost' => $record->cost,
            ];
        })->toArray();
    }
}