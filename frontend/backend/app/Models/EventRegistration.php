<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRegistration extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'event_id',
        'participant_id',
        'status',
        'registered_at',
        'attended',
        'attendance_marked_at',
        'attendance_marked_by',
        'feedback',
        'rating',
        'notes',
        'registration_data',
        'confirmation_token',
        'confirmed_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
            'attended' => 'boolean',
            'attendance_marked_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'rating' => 'integer',
            'registration_data' => 'array',
        ];
    }

    /**
     * Get the event for this registration.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(SchoolEvent::class, 'event_id');
    }

    /**
     * Get the participant for this registration.
     */
    public function participant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant_id');
    }

    /**
     * Get the user who marked attendance.
     */
    public function attendanceMarker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attendance_marked_by');
    }

    /**
     * Scopes
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeAttended($query)
    {
        return $query->where('attended', true);
    }

    public function scopeByEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    public function scopeByParticipant($query, $participantId)
    {
        return $query->where('participant_id', $participantId);
    }

    /**
     * Accessors & Mutators
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Gözləmədə',
            'confirmed' => 'Təsdiqləndi',
            'waitlisted' => 'Gözləmə siyahısında',
            'cancelled' => 'Ləğv edildi',
            'rejected' => 'Rədd edildi',
            default => 'Naməlum'
        };
    }

    /**
     * Helper Methods
     */
    public function confirm(): bool
    {
        return $this->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
    }

    public function cancel($reason = null): bool
    {
        return $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }

    public function markAttendance($markerId, $attended = true): bool
    {
        return $this->update([
            'attended' => $attended,
            'attendance_marked_at' => now(),
            'attendance_marked_by' => $markerId,
        ]);
    }

    public function addFeedback($feedback, $rating = null): bool
    {
        return $this->update([
            'feedback' => $feedback,
            'rating' => $rating,
        ]);
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function hasAttended(): bool
    {
        return $this->attended === true;
    }
}