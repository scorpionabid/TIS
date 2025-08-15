<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventResource extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'event_id',
        'resource_type',
        'resource_name',
        'description',
        'quantity_needed',
        'quantity_available',
        'unit',
        'cost_per_unit',
        'total_cost',
        'supplier',
        'contact_info',
        'status',
        'requested_by',
        'approved_by',
        'approved_at',
        'acquired_at',
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
            'quantity_needed' => 'integer',
            'quantity_available' => 'integer',
            'cost_per_unit' => 'decimal:2',
            'total_cost' => 'decimal:2',
            'approved_at' => 'datetime',
            'acquired_at' => 'datetime',
            'contact_info' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the event for this resource.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(SchoolEvent::class, 'event_id');
    }

    /**
     * Get the user who requested this resource.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * Get the user who approved this resource.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scopes
     */
    public function scopeByEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('resource_type', $type);
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

    public function scopeAcquired($query)
    {
        return $query->where('status', 'acquired');
    }

    /**
     * Accessors & Mutators
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Gözləmədə',
            'approved' => 'Təsdiqləndi',
            'acquired' => 'Əldə edildi',
            'rejected' => 'Rədd edildi',
            'unavailable' => 'Əlçatan deyil',
            default => 'Naməlum'
        };
    }

    public function getResourceTypeLabelAttribute(): string
    {
        return match($this->resource_type) {
            'equipment' => 'Avadanlıq',
            'material' => 'Material',
            'facility' => 'Təsis',
            'service' => 'Xidmət',
            'transport' => 'Nəqliyyat',
            'catering' => 'Yeməkxana',
            'decoration' => 'Bəzək',
            'security' => 'Təhlükəsizlik',
            'cleaning' => 'Təmizlik',
            'other' => 'Digər',
            default => 'Digər'
        };
    }

    public function getAvailabilityStatusAttribute(): string
    {
        if ($this->quantity_available >= $this->quantity_needed) {
            return 'sufficient';
        } elseif ($this->quantity_available > 0) {
            return 'partial';
        } else {
            return 'unavailable';
        }
    }

    /**
     * Helper Methods
     */
    public function approve($approverId): bool
    {
        return $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);
    }

    public function reject(): bool
    {
        return $this->update([
            'status' => 'rejected',
        ]);
    }

    public function markAsAcquired(): bool
    {
        return $this->update([
            'status' => 'acquired',
            'acquired_at' => now(),
        ]);
    }

    public function calculateTotalCost(): void
    {
        if ($this->cost_per_unit && $this->quantity_needed) {
            $this->total_cost = $this->cost_per_unit * $this->quantity_needed;
            $this->save();
        }
    }

    public function isAvailable(): bool
    {
        return $this->quantity_available >= $this->quantity_needed;
    }

    public function isPartiallyAvailable(): bool
    {
        return $this->quantity_available > 0 && $this->quantity_available < $this->quantity_needed;
    }

    public function getShortageQuantity(): int
    {
        return max(0, $this->quantity_needed - $this->quantity_available);
    }
}