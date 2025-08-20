<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityEvent extends Model
{
    use HasFactory;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'event_type',
        'severity',
        'user_id',
        'target_user_id',
        'ip_address',
        'location_data',
        'user_agent',
        'description',
        'event_data',
        'resolution',
        'resolution_notes',
        'resolved_by',
        'resolved_at',
        'institution_id',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'location_data' => 'array',
            'event_data' => 'array',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user who triggered the security event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the target user of the security event.
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Get the user who resolved the security event.
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Get the institution related to this security event.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Check if the event is resolved.
     */
    public function isResolved(): bool
    {
        return !is_null($this->resolution);
    }

    /**
     * Check if the event is critical.
     */
    public function isCritical(): bool
    {
        return $this->severity === 'critical';
    }

    /**
     * Check if the event is a warning.
     */
    public function isWarning(): bool
    {
        return $this->severity === 'warning';
    }

    /**
     * Check if the event is informational.
     */
    public function isInfo(): bool
    {
        return $this->severity === 'info';
    }

    /**
     * Resolve the security event.
     */
    public function resolve(string $resolution, string $notes = null, User $resolvedBy = null): void
    {
        $this->resolution = $resolution;
        $this->resolution_notes = $notes;
        $this->resolved_by = $resolvedBy?->id;
        $this->resolved_at = now();
        $this->save();
    }

    /**
     * Mark as false positive.
     */
    public function markAsFalsePositive(string $notes = null, User $resolvedBy = null): void
    {
        $this->resolve('false_positive', $notes, $resolvedBy);
    }

    /**
     * Mark as action taken.
     */
    public function markAsActionTaken(string $notes = null, User $resolvedBy = null): void
    {
        $this->resolve('action_taken', $notes, $resolvedBy);
    }

    /**
     * Escalate the event.
     */
    public function escalate(string $notes = null, User $resolvedBy = null): void
    {
        $this->resolve('escalated', $notes, $resolvedBy);
    }

    /**
     * Get severity color for UI.
     */
    public function getSeverityColorAttribute(): string
    {
        return match ($this->severity) {
            'critical' => 'red',
            'warning' => 'yellow',
            'info' => 'blue',
            default => 'gray',
        };
    }

    /**
     * Get resolution status color for UI.
     */
    public function getResolutionColorAttribute(): string
    {
        if (!$this->isResolved()) {
            return 'red';
        }

        return match ($this->resolution) {
            'resolved' => 'green',
            'false_positive' => 'gray',
            'action_taken' => 'blue',
            'escalated' => 'orange',
            'ignored' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Log a security event.
     */
    public static function logEvent(array $attributes): self
    {
        $attributes['created_at'] = now();
        
        if (!isset($attributes['ip_address'])) {
            $attributes['ip_address'] = request()->ip();
        }

        if (!isset($attributes['user_agent'])) {
            $attributes['user_agent'] = request()->userAgent();
        }

        return static::create($attributes);
    }

    /**
     * Scope to get events by type.
     */
    public function scopeByType($query, string $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope to get events by severity.
     */
    public function scopeBySeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope to get unresolved events.
     */
    public function scopeUnresolved($query)
    {
        return $query->whereNull('resolution');
    }

    /**
     * Scope to get resolved events.
     */
    public function scopeResolved($query)
    {
        return $query->whereNotNull('resolution');
    }

    /**
     * Scope to get critical events.
     */
    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Scope to get events by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get events by target user.
     */
    public function scopeByTargetUser($query, int $targetUserId)
    {
        return $query->where('target_user_id', $targetUserId);
    }

    /**
     * Scope to get events by institution.
     */
    public function scopeByInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }

    /**
     * Scope to get recent events.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}