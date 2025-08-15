<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceRecord extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'item_id',
        'technician_id',
        'scheduled_by',
        'maintenance_type',
        'maintenance_date',
        'scheduled_date',
        'completion_date',
        'description',
        'work_performed',
        'parts_used',
        'labor_hours',
        'cost',
        'parts_cost',
        'labor_cost',
        'vendor',
        'invoice_number',
        'warranty_extended',
        'warranty_extension_date',
        'condition_before',
        'condition_after',
        'issues_found',
        'recommendations',
        'next_maintenance_date',
        'status',
        'priority',
        'notes',
        'attachments',
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
            'maintenance_date' => 'date',
            'scheduled_date' => 'date',
            'completion_date' => 'date',
            'warranty_extension_date' => 'date',
            'next_maintenance_date' => 'date',
            'labor_hours' => 'decimal:2',
            'cost' => 'decimal:2',
            'parts_cost' => 'decimal:2',
            'labor_cost' => 'decimal:2',
            'warranty_extended' => 'boolean',
            'parts_used' => 'array',
            'issues_found' => 'array',
            'recommendations' => 'array',
            'attachments' => 'array',
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

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function scheduler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }

    /**
     * Scopes
     */
    public function scopeByItem($query, $itemId)
    {
        return $query->where('item_id', $itemId);
    }

    public function scopeByTechnician($query, $technicianId)
    {
        return $query->where('technician_id', $technicianId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('maintenance_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeOverdue($query)
    {
        return $query->where('scheduled_date', '<', now()->toDateString())
                    ->whereIn('status', ['scheduled', 'in_progress']);
    }

    public function scopeUpcoming($query, $days = 7)
    {
        return $query->whereBetween('scheduled_date', [
            now()->toDateString(),
            now()->addDays($days)->toDateString()
        ])->where('status', 'scheduled');
    }

    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', ['high', 'urgent']);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('maintenance_date', now()->month)
                    ->whereYear('maintenance_date', now()->year);
    }

    /**
     * Accessors & Mutators
     */
    public function getMaintenanceTypeLabelAttribute(): string
    {
        return match($this->maintenance_type) {
            'preventive' => 'Profilaktik',
            'corrective' => 'Düzəldici',
            'emergency' => 'Təcili',
            'inspection' => 'Yoxlama',
            'calibration' => 'Kalibrləmə',
            'cleaning' => 'Təmizlik',
            'replacement' => 'Dəyişdirmə',
            'upgrade' => 'Yeniləmə',
            'repair' => 'Təmir',
            'overhaul' => 'Əsaslı təmir',
            default => 'Ümumi'
        ];
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'scheduled' => 'Planlaşdırılıb',
            'in_progress' => 'Davam edir',
            'completed' => 'Tamamlanıb',
            'cancelled' => 'Ləğv edilib',
            'postponed' => 'Təxirə salınıb',
            'on_hold' => 'Dayandırılıb',
            default => 'Naməlum'
        ];
    }

    public function getPriorityLabelAttribute(): string
    {
        return match($this->priority) {
            'low' => 'Aşağı',
            'medium' => 'Orta',
            'high' => 'Yüksək',
            'urgent' => 'Təcili',
            'critical' => 'Kritik',
            default => 'Orta'
        };
    }

    public function getDurationAttribute(): ?int
    {
        if (!$this->maintenance_date || !$this->completion_date) {
            return null;
        }

        return $this->maintenance_date->diffInDays($this->completion_date);
    }

    public function getTotalCostAttribute(): float
    {
        return ($this->parts_cost ?? 0) + ($this->labor_cost ?? 0);
    }

    public function getFormattedCostAttribute(): string
    {
        if (!$this->total_cost) {
            return 'Məlum deyil';
        }

        return number_format($this->total_cost, 2) . ' AZN';
    }

    public function getMaintenanceStatusAttribute(): string
    {
        if ($this->status === 'completed') {
            return 'Tamamlanıb';
        }

        if (!$this->scheduled_date) {
            return 'Planlaşdırılmayıb';
        }

        $daysUntilMaintenance = now()->diffInDays($this->scheduled_date, false);

        if ($daysUntilMaintenance < 0) {
            return 'Gecikmiş';
        } elseif ($daysUntilMaintenance === 0) {
            return 'Bu gün';
        } elseif ($daysUntilMaintenance <= 3) {
            return 'Yaxında';
        } else {
            return 'Planlaşdırılıb';
        }
    }

    /**
     * Helper Methods
     */
    public function isScheduled(): bool
    {
        return $this->status === 'scheduled';
    }

    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isOverdue(): bool
    {
        return $this->scheduled_date && 
               $this->scheduled_date->isPast() && 
               !$this->isCompleted();
    }

    public function isUpcoming($days = 7): bool
    {
        return $this->scheduled_date && 
               $this->scheduled_date->isBetween(now(), now()->addDays($days)) &&
               $this->isScheduled();
    }

    public function isHighPriority(): bool
    {
        return in_array($this->priority, ['high', 'urgent', 'critical']);
    }

    public function start($technicianId = null): bool
    {
        if ($this->status !== 'scheduled') {
            return false;
        }

        $updateData = [
            'status' => 'in_progress',
            'maintenance_date' => now(),
        ];

        if ($technicianId) {
            $updateData['technician_id'] = $technicianId;
        }

        return $this->update($updateData);
    }

    public function complete($workPerformed, $conditionAfter = 'good', $nextMaintenanceDate = null): bool
    {
        if (!in_array($this->status, ['scheduled', 'in_progress'])) {
            return false;
        }

        $updateData = [
            'status' => 'completed',
            'completion_date' => now(),
            'work_performed' => $workPerformed,
            'condition_after' => $conditionAfter,
        ];

        if ($nextMaintenanceDate) {
            $updateData['next_maintenance_date'] = $nextMaintenanceDate;
        }

        $result = $this->update($updateData);

        // Update item condition and maintenance dates
        if ($result && $this->item) {
            $this->item->update([
                'condition' => $conditionAfter,
                'last_maintenance_date' => now(),
                'next_maintenance_date' => $nextMaintenanceDate,
                'status' => 'available', // Make item available after maintenance
            ]);
        }

        return $result;
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

    public function postpone($newDate, $reason = null): bool
    {
        if ($this->status !== 'scheduled') {
            return false;
        }

        $metadata = $this->metadata ?? [];
        $metadata['postponement_reason'] = $reason;
        $metadata['original_date'] = $this->scheduled_date;

        return $this->update([
            'status' => 'postponed',
            'scheduled_date' => $newDate,
            'metadata' => $metadata,
        ]);
    }

    public function reschedule($newDate): bool
    {
        if (in_array($this->status, ['completed', 'cancelled'])) {
            return false;
        }

        return $this->update([
            'scheduled_date' => $newDate,
            'status' => 'scheduled',
        ]);
    }

    public function addPart($partName, $quantity, $cost = null): void
    {
        $parts = $this->parts_used ?? [];
        $parts[] = [
            'name' => $partName,
            'quantity' => $quantity,
            'cost' => $cost,
            'added_at' => now()->toISOString(),
        ];

        $this->update(['parts_used' => $parts]);

        // Update parts cost
        if ($cost) {
            $currentPartsCost = $this->parts_cost ?? 0;
            $this->update(['parts_cost' => $currentPartsCost + ($cost * $quantity)]);
        }
    }

    public function addIssue($issue, $severity = 'medium'): void
    {
        $issues = $this->issues_found ?? [];
        $issues[] = [
            'description' => $issue,
            'severity' => $severity,
            'found_at' => now()->toISOString(),
        ];

        $this->update(['issues_found' => $issues]);
    }

    public function addRecommendation($recommendation, $priority = 'medium'): void
    {
        $recommendations = $this->recommendations ?? [];
        $recommendations[] = [
            'description' => $recommendation,
            'priority' => $priority,
            'added_at' => now()->toISOString(),
        ];

        $this->update(['recommendations' => $recommendations]);
    }

    public function calculateLaborCost($hourlyRate): void
    {
        if ($this->labor_hours && $hourlyRate) {
            $this->update(['labor_cost' => $this->labor_hours * $hourlyRate]);
        }
    }

    public function extendWarranty($extensionDate): bool
    {
        $result = $this->update([
            'warranty_extended' => true,
            'warranty_extension_date' => $extensionDate,
        ]);

        // Update item warranty
        if ($result && $this->item) {
            $this->item->update(['warranty_expiry' => $extensionDate]);
        }

        return $result;
    }

    public static function createScheduled($itemId, $maintenanceType, $scheduledDate, $scheduledBy, $priority = 'medium'): self
    {
        $item = InventoryItem::find($itemId);
        
        return self::create([
            'item_id' => $itemId,
            'scheduled_by' => $scheduledBy,
            'maintenance_type' => $maintenanceType,
            'scheduled_date' => $scheduledDate,
            'priority' => $priority,
            'status' => 'scheduled',
            'description' => "Planlaşdırılmış {$maintenanceType} təmiri: {$item->name}",
        ]);
    }

    public static function createEmergency($itemId, $description, $technicianId = null, $scheduledBy = null): self
    {
        $item = InventoryItem::find($itemId);
        
        return self::create([
            'item_id' => $itemId,
            'technician_id' => $technicianId,
            'scheduled_by' => $scheduledBy ?: auth()->id(),
            'maintenance_type' => 'emergency',
            'scheduled_date' => now(),
            'priority' => 'urgent',
            'status' => 'scheduled',
            'description' => "Təcili təmir: {$description}",
            'condition_before' => $item->condition,
        ]);
    }

    public function getMaintenanceSummary(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->maintenance_type,
            'type_label' => $this->maintenance_type_label,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'priority' => $this->priority,
            'priority_label' => $this->priority_label,
            'scheduled_date' => $this->scheduled_date,
            'completion_date' => $this->completion_date,
            'duration' => $this->duration,
            'cost' => $this->formatted_cost,
            'description' => $this->description,
            'maintenance_status' => $this->maintenance_status,
            'item' => [
                'id' => $this->item->id,
                'name' => $this->item->name,
                'category' => $this->item->category_label,
                'condition' => $this->item->condition_label,
            ],
            'technician' => $this->technician ? [
                'id' => $this->technician->id,
                'name' => $this->technician->profile 
                    ? "{$this->technician->profile->first_name} {$this->technician->profile->last_name}"
                    : $this->technician->username,
            ] : null,
            'issues_count' => count($this->issues_found ?? []),
            'parts_count' => count($this->parts_used ?? []),
            'recommendations_count' => count($this->recommendations ?? []),
        ];
    }
}