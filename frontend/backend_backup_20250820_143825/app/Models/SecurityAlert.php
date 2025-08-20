<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class SecurityAlert extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_session_id',
        'alert_type',
        'severity',
        'status',
        'title',
        'description',
        'alert_data',
        'evidence',
        'source_ip',
        'source_location',
        'source_user_agent',
        'affected_resource',
        'risk_score',
        'requires_immediate_action',
        'auto_generated',
        'assigned_to',
        'detected_at',
        'acknowledged_at',
        'resolved_at',
        'resolution_notes',
        'resolution_action',
        'notifications_sent',
        'escalation_level',
        'last_escalated_at',
    ];

    protected $casts = [
        'alert_data' => 'array',
        'evidence' => 'array',
        'requires_immediate_action' => 'boolean',
        'auto_generated' => 'boolean',
        'detected_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
        'notifications_sent' => 'array',
        'last_escalated_at' => 'datetime',
    ];

    const ALERT_TYPES = [
        'failed_login' => 'Failed Login Attempt',
        'account_lockout' => 'Account Lockout',
        'suspicious_activity' => 'Suspicious Activity',
        'session_hijacking' => 'Potential Session Hijacking',
        'multiple_devices' => 'Multiple Device Access',
        'geographic_anomaly' => 'Geographic Anomaly',
        'brute_force_attack' => 'Brute Force Attack',
        'privilege_escalation' => 'Privilege Escalation Attempt',
        'unauthorized_access' => 'Unauthorized Access Attempt',
        'data_breach_attempt' => 'Data Breach Attempt',
        'system_intrusion' => 'System Intrusion',
    ];

    const SEVERITIES = [
        'low' => 'Low Priority',
        'medium' => 'Medium Priority',
        'high' => 'High Priority',
        'critical' => 'Critical Priority',
    ];

    const STATUSES = [
        'open' => 'Open',
        'investigating' => 'Under Investigation',
        'resolved' => 'Resolved',
        'false_positive' => 'False Positive',
    ];

    const RESOLUTION_ACTIONS = [
        'no_action' => 'No Action Required',
        'user_notified' => 'User Notified',
        'account_locked' => 'Account Locked',
        'session_terminated' => 'Session Terminated',
        'access_restricted' => 'Access Restricted',
        'password_reset_forced' => 'Password Reset Forced',
        'security_review_required' => 'Security Review Required',
    ];

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Session relationship
     */
    public function userSession(): BelongsTo
    {
        return $this->belongsTo(UserSession::class);
    }

    /**
     * Assigned to user relationship
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Scope: Open alerts
     */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope: Critical alerts
     */
    public function scopeCritical(Builder $query): Builder
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Scope: High priority alerts
     */
    public function scopeHighPriority(Builder $query): Builder
    {
        return $query->whereIn('severity', ['high', 'critical']);
    }

    /**
     * Scope: Requires immediate action
     */
    public function scopeRequiresAction(Builder $query): Builder
    {
        return $query->where('requires_immediate_action', true);
    }

    /**
     * Scope: By alert type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('alert_type', $type);
    }

    /**
     * Scope: Recent alerts
     */
    public function scopeRecent(Builder $query, int $hours = 24): Builder
    {
        return $query->where('detected_at', '>=', now()->subHours($hours));
    }

    /**
     * Scope: Unassigned alerts
     */
    public function scopeUnassigned(Builder $query): Builder
    {
        return $query->whereNull('assigned_to');
    }

    /**
     * Get alert type label
     */
    public function getAlertTypeLabelAttribute(): string
    {
        return self::ALERT_TYPES[$this->alert_type] ?? $this->alert_type;
    }

    /**
     * Get severity label
     */
    public function getSeverityLabelAttribute(): string
    {
        return self::SEVERITIES[$this->severity] ?? $this->severity;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Get resolution action label
     */
    public function getResolutionActionLabelAttribute(): string
    {
        return self::RESOLUTION_ACTIONS[$this->resolution_action] ?? $this->resolution_action;
    }

    /**
     * Check if alert is resolved
     */
    public function isResolved(): bool
    {
        return in_array($this->status, ['resolved', 'false_positive']);
    }

    /**
     * Check if alert is overdue
     */
    public function isOverdue(): bool
    {
        if ($this->isResolved()) {
            return false;
        }

        $maxHours = match($this->severity) {
            'critical' => 1,
            'high' => 4,
            'medium' => 24,
            'low' => 72,
            default => 24,
        };

        return $this->detected_at->diffInHours(now()) > $maxHours;
    }

    /**
     * Acknowledge alert
     */
    public function acknowledge(User $user): bool
    {
        return $this->update([
            'status' => 'investigating',
            'acknowledged_at' => now(),
            'assigned_to' => $user->id,
        ]);
    }

    /**
     * Resolve alert
     */
    public function resolve(string $action, string $notes = null): bool
    {
        return $this->update([
            'status' => 'resolved',
            'resolution_action' => $action,
            'resolution_notes' => $notes,
            'resolved_at' => now(),
        ]);
    }

    /**
     * Mark as false positive
     */
    public function markAsFalsePositive(string $reason = null): bool
    {
        return $this->update([
            'status' => 'false_positive',
            'resolution_notes' => $reason ?? 'Marked as false positive',
            'resolved_at' => now(),
        ]);
    }

    /**
     * Escalate alert
     */
    public function escalate(): bool
    {
        $newLevel = $this->escalation_level + 1;
        
        // Escalate severity if needed
        $newSeverity = $this->severity;
        if ($newLevel >= 2 && $this->severity === 'low') {
            $newSeverity = 'medium';
        } elseif ($newLevel >= 3 && $this->severity === 'medium') {
            $newSeverity = 'high';
        }

        return $this->update([
            'escalation_level' => $newLevel,
            'severity' => $newSeverity,
            'last_escalated_at' => now(),
            'requires_immediate_action' => $newLevel >= 2,
        ]);
    }

    /**
     * Create security alert
     */
    public static function createAlert(array $data): self
    {
        // Auto-determine severity if not provided
        if (!isset($data['severity'])) {
            $data['severity'] = self::determineSeverity($data);
        }

        // Auto-determine if immediate action required
        if (!isset($data['requires_immediate_action'])) {
            $data['requires_immediate_action'] = in_array($data['severity'], ['high', 'critical']) ||
                                                in_array($data['alert_type'], [
                                                    'session_hijacking',
                                                    'brute_force_attack',
                                                    'data_breach_attempt',
                                                    'system_intrusion'
                                                ]);
        }

        $alert = self::create(array_merge([
            'detected_at' => now(),
            'auto_generated' => true,
            'status' => 'open',
            'escalation_level' => 0,
        ], $data));

        // Auto-assign critical alerts to administrators
        if ($data['severity'] === 'critical') {
            $alert->autoAssignToAdmin();
        }

        return $alert;
    }

    /**
     * Determine alert severity based on data
     */
    protected static function determineSeverity(array $data): string
    {
        $riskScore = $data['risk_score'] ?? 50;
        $alertType = $data['alert_type'] ?? '';

        // Critical alert types
        if (in_array($alertType, ['session_hijacking', 'data_breach_attempt', 'system_intrusion'])) {
            return 'critical';
        }

        // High risk alert types
        if (in_array($alertType, ['brute_force_attack', 'privilege_escalation', 'unauthorized_access'])) {
            return 'high';
        }

        // Risk score based severity
        if ($riskScore >= 80) return 'critical';
        if ($riskScore >= 60) return 'high';
        if ($riskScore >= 40) return 'medium';
        
        return 'low';
    }

    /**
     * Auto-assign to administrator
     */
    protected function autoAssignToAdmin(): void
    {
        $admin = User::role(['superadmin', 'regionadmin'])
                    ->where('is_active', true)
                    ->first();

        if ($admin) {
            $this->update(['assigned_to' => $admin->id]);
        }
    }

    /**
     * Get time since detection
     */
    public function getTimeSinceDetectionAttribute(): string
    {
        return $this->detected_at->diffForHumans();
    }

    /**
     * Get response time (time to acknowledge)
     */
    public function getResponseTimeAttribute(): ?int
    {
        if (!$this->acknowledged_at) {
            return null;
        }

        return $this->detected_at->diffInMinutes($this->acknowledged_at);
    }

    /**
     * Get resolution time
     */
    public function getResolutionTimeAttribute(): ?int
    {
        if (!$this->resolved_at) {
            return null;
        }

        return $this->detected_at->diffInMinutes($this->resolved_at);
    }

    /**
     * Get alert statistics
     */
    public static function getStatistics(int $days = 30): array
    {
        $alerts = self::where('detected_at', '>=', now()->subDays($days));

        return [
            'total_alerts' => $alerts->count(),
            'open_alerts' => $alerts->where('status', 'open')->count(),
            'critical_alerts' => $alerts->where('severity', 'critical')->count(),
            'resolved_alerts' => $alerts->where('status', 'resolved')->count(),
            'false_positives' => $alerts->where('status', 'false_positive')->count(),
            'average_response_time' => $alerts->whereNotNull('acknowledged_at')->avg('response_time'),
            'average_resolution_time' => $alerts->whereNotNull('resolved_at')->avg('resolution_time'),
            'alerts_by_type' => $alerts->selectRaw('alert_type, COUNT(*) as count')
                                      ->groupBy('alert_type')
                                      ->pluck('count', 'alert_type')
                                      ->toArray(),
            'alerts_by_severity' => $alerts->selectRaw('severity, COUNT(*) as count')
                                           ->groupBy('severity')
                                           ->pluck('count', 'severity')
                                           ->toArray(),
            'overdue_alerts' => self::getOverdueAlerts()->count(),
            'escalated_alerts' => $alerts->where('escalation_level', '>', 0)->count(),
        ];
    }

    /**
     * Get overdue alerts
     */
    public static function getOverdueAlerts(): Builder
    {
        return self::open()->where(function ($query) {
            $query->where('severity', 'critical')
                  ->where('detected_at', '<=', now()->subHour())
                  ->orWhere(function ($q) {
                      $q->where('severity', 'high')
                        ->where('detected_at', '<=', now()->subHours(4));
                  })
                  ->orWhere(function ($q) {
                      $q->where('severity', 'medium')
                        ->where('detected_at', '<=', now()->subDay());
                  })
                  ->orWhere(function ($q) {
                      $q->where('severity', 'low')
                        ->where('detected_at', '<=', now()->subDays(3));
                  });
        });
    }

    /**
     * Process automatic escalation
     */
    public static function processAutoEscalation(): int
    {
        $overdueAlerts = self::getOverdueAlerts()->get();
        $escalatedCount = 0;

        foreach ($overdueAlerts as $alert) {
            if ($alert->escalate()) {
                $escalatedCount++;
            }
        }

        return $escalatedCount;
    }
}