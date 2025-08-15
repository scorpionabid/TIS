<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Carbon\Carbon;

class SchoolEvent extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'title',
        'description',
        'event_type',
        'event_category',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'location',
        'institution_id',
        'organizer_id',
        'max_participants',
        'registration_required',
        'registration_deadline',
        'status',
        'priority',
        'is_public',
        'is_recurring',
        'recurrence_pattern',
        'target_audience',
        'requirements',
        'materials_needed',
        'budget',
        'contact_person',
        'contact_info',
        'external_link',
        'tags',
        'metadata',
        'notes',
        'approved_by',
        'approved_at',
        'cancelled_reason',
        'cancelled_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
            'registration_deadline' => 'datetime',
            'approved_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'registration_required' => 'boolean',
            'is_public' => 'boolean',
            'is_recurring' => 'boolean',
            'budget' => 'decimal:2',
            'max_participants' => 'integer',
            'target_audience' => 'array',
            'requirements' => 'array',
            'materials_needed' => 'array',
            'tags' => 'array',
            'metadata' => 'array',
            'recurrence_pattern' => 'array',
            'contact_info' => 'array',
        ];
    }

    /**
     * Get the institution that owns this event.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Get the user who organized this event.
     */
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    /**
     * Get the user who approved this event.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get event registrations.
     */
    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class, 'event_id');
    }

    /**
     * Get active registrations.
     */
    public function activeRegistrations(): HasMany
    {
        return $this->registrations()->where('status', 'confirmed');
    }

    /**
     * Get participants (users) for this event.
     */
    public function participants()
    {
        return $this->belongsToMany(User::class, 'event_registrations', 'event_id', 'participant_id')
                    ->withPivot(['status', 'registered_at', 'attended', 'feedback'])
                    ->withTimestamps();
    }

    /**
     * Get event attendees.
     */
    public function attendees(): HasMany
    {
        return $this->registrations()->where('attended', true);
    }

    /**
     * Get event resources/requirements.
     */
    public function resources(): HasMany
    {
        return $this->hasMany(EventResource::class, 'event_id');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_date', '>=', now()->toDateString());
    }

    public function scopePast($query)
    {
        return $query->where('end_date', '<', now()->toDateString());
    }

    public function scopeToday($query)
    {
        return $query->whereDate('start_date', '<=', now())
                    ->whereDate('end_date', '>=', now());
    }

    public function scopeByInstitution($query, $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('event_type', $type);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('event_category', $category);
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function scopeRequiresRegistration($query)
    {
        return $query->where('registration_required', true);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'ILIKE', "%{$search}%")
              ->orWhere('description', 'ILIKE', "%{$search}%")
              ->orWhere('location', 'ILIKE', "%{$search}%");
        });
    }

    /**
     * Accessors & Mutators
     */
    public function getFullTitleAttribute(): string
    {
        return $this->title . ($this->location ? " ({$this->location})" : '');
    }

    public function getDurationAttribute(): string
    {
        if ($this->start_date->eq($this->end_date)) {
            // Same day event
            if ($this->start_time && $this->end_time) {
                return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
            }
            return $this->start_date->format('d.m.Y');
        } else {
            // Multi-day event
            return $this->start_date->format('d.m.Y') . ' - ' . $this->end_date->format('d.m.Y');
        }
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'draft' => 'Layihə',
            'pending' => 'Gözləmədə',
            'approved' => 'Təsdiqləndi',
            'active' => 'Aktiv',
            'completed' => 'Tamamlandı',
            'cancelled' => 'Ləğv edildi',
            default => 'Naməlum'
        };
    }

    public function getPriorityLabelAttribute(): string
    {
        return match($this->priority) {
            'low' => 'Aşağı',
            'medium' => 'Orta',
            'high' => 'Yüksək',
            'urgent' => 'Təcili',
            default => 'Orta'
        };
    }

    public function getCategoryLabelAttribute(): string
    {
        return match($this->event_category) {
            'academic' => 'Akademik',
            'administrative' => 'İnzibati',
            'cultural' => 'Mədəni',
            'sports' => 'İdman',
            'social' => 'Sosial',
            'meeting' => 'Görüş',
            'conference' => 'Konfrans',
            'workshop' => 'Seminar',
            'ceremony' => 'Mərasim',
            'competition' => 'Müsabiqə',
            'examination' => 'İmtahan',
            'other' => 'Digər',
            default => 'Digər'
        };
    }

    /**
     * Helper Methods
     */
    public function isUpcoming(): bool
    {
        return $this->start_date->isFuture();
    }

    public function isPast(): bool
    {
        return $this->end_date->isPast();
    }

    public function isToday(): bool
    {
        return $this->start_date->isToday() || 
               ($this->start_date->isPast() && $this->end_date->isFuture()) ||
               $this->end_date->isToday();
    }

    public function isActive(): bool
    {
        return $this->status === 'active' || $this->status === 'approved';
    }

    public function canRegister(): bool
    {
        if (!$this->registration_required) {
            return false;
        }

        if ($this->status !== 'approved' && $this->status !== 'active') {
            return false;
        }

        if ($this->registration_deadline && $this->registration_deadline->isPast()) {
            return false;
        }

        if ($this->max_participants && $this->activeRegistrations()->count() >= $this->max_participants) {
            return false;
        }

        return true;
    }

    public function getRemainingCapacity(): int
    {
        if (!$this->max_participants) {
            return 999; // Unlimited
        }

        return max(0, $this->max_participants - $this->activeRegistrations()->count());
    }

    public function getRegistrationRate(): float
    {
        if (!$this->max_participants) {
            return 0;
        }

        return round(($this->activeRegistrations()->count() / $this->max_participants) * 100, 2);
    }

    public function hasTag($tag): bool
    {
        return in_array($tag, $this->tags ?? []);
    }

    public function addTag($tag): void
    {
        $tags = $this->tags ?? [];
        if (!in_array($tag, $tags)) {
            $tags[] = $tag;
            $this->tags = $tags;
            $this->save();
        }
    }

    public function removeTag($tag): void
    {
        $tags = $this->tags ?? [];
        $key = array_search($tag, $tags);
        if ($key !== false) {
            unset($tags[$key]);
            $this->tags = array_values($tags);
            $this->save();
        }
    }

    public function approve($approverId): bool
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);

        return true;
    }

    public function cancel($reason = null): bool
    {
        $this->update([
            'status' => 'cancelled',
            'cancelled_reason' => $reason,
            'cancelled_at' => now(),
        ]);

        return true;
    }

    public function complete(): bool
    {
        $this->update([
            'status' => 'completed',
        ]);

        return true;
    }

    public function generateRecurringEvents($endDate = null): array
    {
        if (!$this->is_recurring || !$this->recurrence_pattern) {
            return [];
        }

        $events = [];
        $pattern = $this->recurrence_pattern;
        $currentDate = $this->start_date->copy();
        $endRecurrenceDate = $endDate ? Carbon::parse($endDate) : $currentDate->copy()->addYear();

        while ($currentDate->lte($endRecurrenceDate)) {
            switch ($pattern['type'] ?? 'daily') {
                case 'daily':
                    $currentDate->addDays($pattern['interval'] ?? 1);
                    break;
                case 'weekly':
                    $currentDate->addWeeks($pattern['interval'] ?? 1);
                    break;
                case 'monthly':
                    $currentDate->addMonths($pattern['interval'] ?? 1);
                    break;
                case 'yearly':
                    $currentDate->addYears($pattern['interval'] ?? 1);
                    break;
            }

            if ($currentDate->lte($endRecurrenceDate)) {
                $events[] = [
                    'title' => $this->title,
                    'description' => $this->description,
                    'event_type' => $this->event_type,
                    'event_category' => $this->event_category,
                    'start_date' => $currentDate->toDateString(),
                    'end_date' => $currentDate->copy()->addDays($this->end_date->diffInDays($this->start_date))->toDateString(),
                    'start_time' => $this->start_time,
                    'end_time' => $this->end_time,
                    'location' => $this->location,
                    'institution_id' => $this->institution_id,
                    'organizer_id' => $this->organizer_id,
                    'is_recurring' => false, // Generated events are not recurring
                    'status' => 'draft',
                ];
            }
        }

        return $events;
    }
}