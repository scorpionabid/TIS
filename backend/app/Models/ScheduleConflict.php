<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class ScheduleConflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'session_id',
        'conflict_type',
        'severity',
        'title',
        'description',
        'affected_entities',
        'source_entity_type',
        'source_entity_id',
        'target_entity_type',
        'target_entity_id',
        'day_of_week',
        'time_slot_id',
        'start_time',
        'end_time',
        'room_id',
        'detection_method',
        'detected_at',
        'detected_by',
        'status',
        'resolution_notes',
        'resolution_actions',
        'resolved_at',
        'resolved_by',
        'impact_score',
        'impact_analysis',
        'blocks_approval',
        'requires_notification',
        'suggested_solutions',
        'alternative_slots',
        'alternative_resources',
        'is_recurring',
        'recurrence_pattern',
        'recurrence_data',
        'violated_constraint',
        'constraint_data',
        'constraint_weight',
        'stakeholders',
        'notification_history',
        'last_notification_sent',
        'external_reference',
        'integration_data',
        'metadata',
        'administrative_notes',
        'conflict_history',
    ];

    protected $casts = [
        'affected_entities' => 'array',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'detected_at' => 'datetime',
        'resolution_actions' => 'array',
        'resolved_at' => 'datetime',
        'impact_analysis' => 'array',
        'blocks_approval' => 'boolean',
        'requires_notification' => 'boolean',
        'suggested_solutions' => 'array',
        'alternative_slots' => 'array',
        'alternative_resources' => 'array',
        'is_recurring' => 'boolean',
        'recurrence_data' => 'array',
        'constraint_weight' => 'decimal:2',
        'stakeholders' => 'array',
        'notification_history' => 'array',
        'last_notification_sent' => 'datetime',
        'integration_data' => 'array',
        'metadata' => 'array',
        'conflict_history' => 'array',
    ];

    const CONFLICT_TYPES = [
        'teacher' => 'Teacher Double-booking',
        'room' => 'Room Double-booking',
        'resource' => 'Resource Unavailability',
        'time' => 'Time Slot Conflicts',
        'capacity' => 'Room Capacity Exceeded',
        'prerequisite' => 'Missing Prerequisites',
        'preference' => 'Preference Violations',
        'policy' => 'Policy Violations',
        'custom' => 'Custom Conflict Type',
    ];

    const SEVERITIES = [
        'critical' => 'Critical - Must be resolved before approval',
        'high' => 'High - Should be resolved',
        'medium' => 'Medium - Should be reviewed',
        'low' => 'Low - Minor issue',
        'info' => 'Info - Informational only',
    ];

    const DETECTION_METHODS = [
        'automatic' => 'Auto-detected by system',
        'manual' => 'Manually reported',
        'validation' => 'Found during validation',
        'import' => 'Detected during import',
    ];

    const STATUSES = [
        'pending' => 'Newly detected',
        'acknowledged' => 'Acknowledged by user',
        'in_progress' => 'Being resolved',
        'resolved' => 'Resolved',
        'ignored' => 'Intentionally ignored',
        'escalated' => 'Escalated to higher authority',
    ];

    const DAYS_OF_WEEK = [
        'monday' => 'Monday',
        'tuesday' => 'Tuesday',
        'wednesday' => 'Wednesday',
        'thursday' => 'Thursday',
        'friday' => 'Friday',
        'saturday' => 'Saturday',
        'sunday' => 'Sunday',
    ];

    /**
     * Schedule relationship
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    /**
     * Session relationship
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ScheduleSession::class, 'session_id');
    }

    /**
     * Time slot relationship
     */
    public function timeSlot(): BelongsTo
    {
        return $this->belongsTo(TimeSlot::class);
    }

    /**
     * Room relationship
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Detected by user relationship
     */
    public function detectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'detected_by');
    }

    /**
     * Resolved by user relationship
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Scope: Active conflicts
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'acknowledged', 'in_progress']);
    }

    /**
     * Scope: Resolved conflicts
     */
    public function scopeResolved(Builder $query): Builder
    {
        return $query->where('status', 'resolved');
    }

    /**
     * Scope: Critical conflicts
     */
    public function scopeCritical(Builder $query): Builder
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Scope: Blocking conflicts
     */
    public function scopeBlocking(Builder $query): Builder
    {
        return $query->where('blocks_approval', true);
    }

    /**
     * Scope: By conflict type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('conflict_type', $type);
    }

    /**
     * Scope: By severity
     */
    public function scopeBySeverity(Builder $query, string $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope: Requires notification
     */
    public function scopeRequiresNotification(Builder $query): Builder
    {
        return $query->where('requires_notification', true);
    }

    /**
     * Scope: Recurring conflicts
     */
    public function scopeRecurring(Builder $query): Builder
    {
        return $query->where('is_recurring', true);
    }

    /**
     * Scope: For specific day
     */
    public function scopeForDay(Builder $query, string $dayOfWeek): Builder
    {
        return $query->where('day_of_week', $dayOfWeek);
    }

    /**
     * Scope: Detected in date range
     */
    public function scopeDetectedBetween(Builder $query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('detected_at', [$startDate, $endDate]);
    }

    /**
     * Get conflict type label
     */
    public function getConflictTypeLabelAttribute(): string
    {
        return self::CONFLICT_TYPES[$this->conflict_type] ?? $this->conflict_type;
    }

    /**
     * Get severity label
     */
    public function getSeverityLabelAttribute(): string
    {
        return self::SEVERITIES[$this->severity] ?? $this->severity;
    }

    /**
     * Get detection method label
     */
    public function getDetectionMethodLabelAttribute(): string
    {
        return self::DETECTION_METHODS[$this->detection_method] ?? $this->detection_method;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Get day of week label
     */
    public function getDayOfWeekLabelAttribute(): ?string
    {
        return $this->day_of_week ? (self::DAYS_OF_WEEK[$this->day_of_week] ?? ucfirst($this->day_of_week)) : null;
    }

    /**
     * Get formatted time range
     */
    public function getTimeRangeAttribute(): ?string
    {
        if (!$this->start_time || !$this->end_time) {
            return null;
        }
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    /**
     * Get severity priority (higher number = higher priority)
     */
    public function getSeverityPriorityAttribute(): int
    {
        return match($this->severity) {
            'critical' => 5,
            'high' => 4,
            'medium' => 3,
            'low' => 2,
            'info' => 1,
            default => 0,
        };
    }

    /**
     * Check if conflict is active
     */
    public function isActive(): bool
    {
        return in_array($this->status, ['pending', 'acknowledged', 'in_progress']);
    }

    /**
     * Check if conflict is resolved
     */
    public function isResolved(): bool
    {
        return $this->status === 'resolved';
    }

    /**
     * Check if conflict blocks approval
     */
    public function blocksApproval(): bool
    {
        return $this->blocks_approval && $this->isActive();
    }

    /**
     * Check if conflict can be resolved
     */
    public function canBeResolved(): bool
    {
        return in_array($this->status, ['pending', 'acknowledged', 'in_progress']);
    }

    /**
     * Check if conflict can be ignored
     */
    public function canBeIgnored(): bool
    {
        return in_array($this->status, ['pending', 'acknowledged']) && 
               !in_array($this->severity, ['critical']);
    }

    /**
     * Acknowledge conflict
     */
    public function acknowledge(User $user): bool
    {
        if ($this->status !== 'pending') {
            throw new \Exception('Only pending conflicts can be acknowledged');
        }

        $this->addToHistory('acknowledged', $user, 'Conflict acknowledged');

        return $this->update([
            'status' => 'acknowledged',
        ]);
    }

    /**
     * Start resolution process
     */
    public function startResolution(User $user, string $notes = null): bool
    {
        if (!in_array($this->status, ['pending', 'acknowledged'])) {
            throw new \Exception('Conflict cannot be resolved in current status');
        }

        $this->addToHistory('in_progress', $user, $notes ?? 'Resolution started');

        return $this->update([
            'status' => 'in_progress',
            'resolution_notes' => $notes,
        ]);
    }

    /**
     * Resolve conflict
     */
    public function resolve(User $user, array $resolutionData): bool
    {
        if (!$this->canBeResolved()) {
            throw new \Exception('Conflict cannot be resolved in current status');
        }

        $this->addToHistory('resolved', $user, $resolutionData['notes'] ?? 'Conflict resolved');

        return $this->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by' => $user->id,
            'resolution_notes' => $resolutionData['notes'] ?? null,
            'resolution_actions' => $resolutionData['actions'] ?? [],
        ]);
    }

    /**
     * Ignore conflict
     */
    public function ignore(User $user, string $reason): bool
    {
        if (!$this->canBeIgnored()) {
            throw new \Exception('Conflict cannot be ignored');
        }

        $this->addToHistory('ignored', $user, "Ignored: {$reason}");

        return $this->update([
            'status' => 'ignored',
            'resolution_notes' => $reason,
            'resolved_at' => now(),
            'resolved_by' => $user->id,
        ]);
    }

    /**
     * Escalate conflict
     */
    public function escalate(User $user, string $reason): bool
    {
        if (!in_array($this->status, ['pending', 'acknowledged', 'in_progress'])) {
            throw new \Exception('Conflict cannot be escalated in current status');
        }

        $this->addToHistory('escalated', $user, "Escalated: {$reason}");

        return $this->update([
            'status' => 'escalated',
            'administrative_notes' => ($this->administrative_notes ?? '') . "\nEscalated: {$reason}",
        ]);
    }

    /**
     * Get source entity
     */
    public function getSourceEntity(): ?Model
    {
        if (!$this->source_entity_type || !$this->source_entity_id) {
            return null;
        }

        return $this->getEntityByType($this->source_entity_type, $this->source_entity_id);
    }

    /**
     * Get target entity
     */
    public function getTargetEntity(): ?Model
    {
        if (!$this->target_entity_type || !$this->target_entity_id) {
            return null;
        }

        return $this->getEntityByType($this->target_entity_type, $this->target_entity_id);
    }

    /**
     * Get entity by type and ID
     */
    private function getEntityByType(string $type, int $id): ?Model
    {
        return match($type) {
            'teacher' => User::find($id),
            'room' => Room::find($id),
            'session' => ScheduleSession::find($id),
            'schedule' => Schedule::find($id),
            'subject' => Subject::find($id),
            'time_slot' => TimeSlot::find($id),
            default => null,
        };
    }

    /**
     * Generate suggested solutions
     */
    public function generateSuggestedSolutions(): array
    {
        $solutions = [];

        switch ($this->conflict_type) {
            case 'teacher':
                $solutions = $this->generateTeacherConflictSolutions();
                break;
            case 'room':
                $solutions = $this->generateRoomConflictSolutions();
                break;
            case 'resource':
                $solutions = $this->generateResourceConflictSolutions();
                break;
            case 'time':
                $solutions = $this->generateTimeConflictSolutions();
                break;
            case 'capacity':
                $solutions = $this->generateCapacityConflictSolutions();
                break;
            default:
                $solutions = $this->generateGenericSolutions();
                break;
        }

        $this->update(['suggested_solutions' => $solutions]);
        return $solutions;
    }

    /**
     * Generate teacher conflict solutions
     */
    private function generateTeacherConflictSolutions(): array
    {
        return [
            [
                'type' => 'reschedule',
                'title' => 'Reschedule one session',
                'description' => 'Move one of the conflicting sessions to a different time slot',
                'difficulty' => 'medium',
                'impact' => 'low',
            ],
            [
                'type' => 'substitute',
                'title' => 'Assign substitute teacher',
                'description' => 'Find a qualified substitute teacher for one session',
                'difficulty' => 'low',
                'impact' => 'medium',
            ],
            [
                'type' => 'combine',
                'title' => 'Combine sessions',
                'description' => 'If possible, combine similar sessions into one',
                'difficulty' => 'high',
                'impact' => 'high',
            ],
        ];
    }

    /**
     * Generate room conflict solutions
     */
    private function generateRoomConflictSolutions(): array
    {
        return [
            [
                'type' => 'alternative_room',
                'title' => 'Use alternative room',
                'description' => 'Find an available room with similar facilities',
                'difficulty' => 'low',
                'impact' => 'low',
            ],
            [
                'type' => 'reschedule',
                'title' => 'Reschedule session',
                'description' => 'Move session to a time when room is available',
                'difficulty' => 'medium',
                'impact' => 'medium',
            ],
            [
                'type' => 'virtual_session',
                'title' => 'Conduct virtual session',
                'description' => 'If applicable, conduct session online',
                'difficulty' => 'low',
                'impact' => 'medium',
            ],
        ];
    }

    /**
     * Generate resource conflict solutions
     */
    private function generateResourceConflictSolutions(): array
    {
        return [
            [
                'type' => 'alternative_resource',
                'title' => 'Use alternative resources',
                'description' => 'Find substitute resources or equipment',
                'difficulty' => 'medium',
                'impact' => 'low',
            ],
            [
                'type' => 'reschedule',
                'title' => 'Reschedule when resources available',
                'description' => 'Move session to when required resources are free',
                'difficulty' => 'medium',
                'impact' => 'medium',
            ],
            [
                'type' => 'modify_requirements',
                'title' => 'Modify resource requirements',
                'description' => 'Adapt session to work without specific resources',
                'difficulty' => 'high',
                'impact' => 'medium',
            ],
        ];
    }

    /**
     * Generate time conflict solutions
     */
    private function generateTimeConflictSolutions(): array
    {
        return [
            [
                'type' => 'adjust_time',
                'title' => 'Adjust session timing',
                'description' => 'Slightly modify start/end times to avoid overlap',
                'difficulty' => 'low',
                'impact' => 'low',
            ],
            [
                'type' => 'different_day',
                'title' => 'Move to different day',
                'description' => 'Schedule session on a different day of the week',
                'difficulty' => 'medium',
                'impact' => 'medium',
            ],
        ];
    }

    /**
     * Generate capacity conflict solutions
     */
    private function generateCapacityConflictSolutions(): array
    {
        return [
            [
                'type' => 'larger_room',
                'title' => 'Use larger room',
                'description' => 'Move session to a room with higher capacity',
                'difficulty' => 'low',
                'impact' => 'low',
            ],
            [
                'type' => 'split_session',
                'title' => 'Split into multiple sessions',
                'description' => 'Divide students into smaller groups',
                'difficulty' => 'high',
                'impact' => 'high',
            ],
        ];
    }

    /**
     * Generate generic solutions
     */
    private function generateGenericSolutions(): array
    {
        return [
            [
                'type' => 'manual_review',
                'title' => 'Manual review required',
                'description' => 'This conflict requires manual intervention',
                'difficulty' => 'high',
                'impact' => 'unknown',
            ],
        ];
    }

    /**
     * Calculate impact score
     */
    public function calculateImpactScore(): int
    {
        $score = 0;

        // Base score by severity
        $score += match($this->severity) {
            'critical' => 40,
            'high' => 30,
            'medium' => 20,
            'low' => 10,
            'info' => 5,
            default => 0,
        };

        // Add score by conflict type
        $score += match($this->conflict_type) {
            'teacher' => 30,
            'room' => 20,
            'resource' => 15,
            'time' => 25,
            'capacity' => 20,
            default => 10,
        };

        // Add score if blocks approval
        if ($this->blocks_approval) {
            $score += 20;
        }

        // Add score for recurring conflicts
        if ($this->is_recurring) {
            $score += 10;
        }

        // Cap at 100
        $score = min(100, $score);

        $this->update(['impact_score' => $score]);
        return $score;
    }

    /**
     * Add entry to conflict history
     */
    public function addToHistory(string $action, User $user, string $notes = null): void
    {
        $history = $this->conflict_history ?? [];
        
        $history[] = [
            'action' => $action,
            'timestamp' => now()->toISOString(),
            'user_id' => $user->id,
            'user_name' => $user->full_name,
            'notes' => $notes,
        ];

        $this->update(['conflict_history' => $history]);
    }

    /**
     * Send notifications to stakeholders
     */
    public function sendNotifications(): bool
    {
        if (!$this->requires_notification || empty($this->stakeholders)) {
            return true;
        }

        // This would integrate with the notification system
        // For now, just update the notification history
        $notificationHistory = $this->notification_history ?? [];
        
        $notificationHistory[] = [
            'sent_at' => now()->toISOString(),
            'recipients' => $this->stakeholders,
            'type' => 'conflict_notification',
            'severity' => $this->severity,
            'status' => 'sent',
        ];

        return $this->update([
            'notification_history' => $notificationHistory,
            'last_notification_sent' => now(),
        ]);
    }

    /**
     * Get conflict summary
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->conflict_type,
            'severity' => $this->severity,
            'status' => $this->status,
            'title' => $this->title,
            'description' => $this->description,
            'blocks_approval' => $this->blocks_approval,
            'impact_score' => $this->impact_score,
            'detected_at' => $this->detected_at,
            'is_active' => $this->isActive(),
            'time_context' => [
                'day_of_week' => $this->day_of_week_label,
                'time_range' => $this->time_range,
            ],
            'affected_entities_count' => count($this->affected_entities ?? []),
            'has_solutions' => !empty($this->suggested_solutions),
            'solution_count' => count($this->suggested_solutions ?? []),
        ];
    }

    /**
     * Create conflict from detection data
     */
    public static function createFromDetection(array $detectionData): self
    {
        $conflict = self::create($detectionData);
        
        // Calculate impact score
        $conflict->calculateImpactScore();
        
        // Generate suggested solutions
        $conflict->generateSuggestedSolutions();
        
        // Send notifications if required
        if ($conflict->requires_notification) {
            $conflict->sendNotifications();
        }
        
        return $conflict;
    }
}