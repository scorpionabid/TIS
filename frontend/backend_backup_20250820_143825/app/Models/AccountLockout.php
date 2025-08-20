<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class AccountLockout extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'lockout_type',
        'lockout_level',
        'trigger_ip',
        'trigger_user_agent',
        'trigger_data',
        'failed_attempts_count',
        'locked_at',
        'unlock_at',
        'unlocked_at',
        'status',
        'unlock_method',
        'locked_by',
        'unlocked_by',
        'admin_notes',
        'unlock_reason',
        'escalated_to_admin',
        'user_notified',
        'notification_history',
        'risk_score',
        'requires_manual_review',
        'lockout_duration_minutes',
        'actual_duration_minutes',
    ];

    protected $casts = [
        'trigger_data' => 'array',
        'locked_at' => 'datetime',
        'unlock_at' => 'datetime',
        'unlocked_at' => 'datetime',
        'escalated_to_admin' => 'boolean',
        'user_notified' => 'boolean',
        'notification_history' => 'array',
        'requires_manual_review' => 'boolean',
    ];

    const LOCKOUT_TYPES = [
        'failed_attempts' => 'Failed Login Attempts',
        'suspicious_activity' => 'Suspicious Activity',
        'admin_action' => 'Administrative Action',
        'security_breach' => 'Security Breach',
        'multiple_devices' => 'Multiple Device Limit',
        'geographic_anomaly' => 'Geographic Anomaly',
        'brute_force_protection' => 'Brute Force Protection',
    ];

    const LOCKOUT_LEVELS = [
        'temporary' => 'Temporary (Auto-unlock)',
        'extended' => 'Extended (Auto-unlock)',
        'manual' => 'Manual (Admin unlock required)',
        'permanent' => 'Permanent (Investigation required)',
    ];

    const UNLOCK_METHODS = [
        'automatic' => 'Automatic Time Expiry',
        'admin_unlock' => 'Admin Unlock',
        'user_verification' => 'User Verification',
        'time_expiry' => 'Time Expiry',
        'security_clearance' => 'Security Clearance',
    ];

    // Progressive lockout durations (in minutes)
    const LOCKOUT_DURATIONS = [
        1 => 5,      // 5 minutes for first lockout
        2 => 15,     // 15 minutes for second lockout  
        3 => 30,     // 30 minutes for third lockout
        4 => 60,     // 1 hour for fourth lockout
        5 => 240,    // 4 hours for fifth lockout
        'default' => 480, // 8 hours for subsequent lockouts
    ];

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Locked by user relationship
     */
    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    /**
     * Unlocked by user relationship
     */
    public function unlockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'unlocked_by');
    }

    /**
     * Scope: Active lockouts
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereNull('unlock_at')
                          ->orWhere('unlock_at', '>', now());
                    });
    }

    /**
     * Scope: Expired lockouts
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->whereNotNull('unlock_at')
                    ->where('unlock_at', '<=', now());
    }

    /**
     * Scope: Manual review required
     */
    public function scopeRequiresReview(Builder $query): Builder
    {
        return $query->where('requires_manual_review', true)
                    ->where('status', 'active');
    }

    /**
     * Scope: By lockout type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('lockout_type', $type);
    }

    /**
     * Get lockout type label
     */
    public function getLockoutTypeLabelAttribute(): string
    {
        return self::LOCKOUT_TYPES[$this->lockout_type] ?? $this->lockout_type;
    }

    /**
     * Get lockout level label
     */
    public function getLockoutLevelLabelAttribute(): string
    {
        return self::LOCKOUT_LEVELS[$this->lockout_level] ?? $this->lockout_level;
    }

    /**
     * Get unlock method label
     */
    public function getUnlockMethodLabelAttribute(): string
    {
        return self::UNLOCK_METHODS[$this->unlock_method] ?? $this->unlock_method;
    }

    /**
     * Check if lockout is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && 
               (!$this->unlock_at || $this->unlock_at->isFuture());
    }

    /**
     * Check if lockout is expired
     */
    public function isExpired(): bool
    {
        return $this->unlock_at && $this->unlock_at->isPast() && $this->status === 'active';
    }

    /**
     * Get remaining time
     */
    public function getRemainingTimeAttribute(): ?int
    {
        if (!$this->isActive() || !$this->unlock_at) {
            return null;
        }

        return max(0, now()->diffInMinutes($this->unlock_at, false));
    }

    /**
     * Get formatted remaining time
     */
    public function getFormattedRemainingTimeAttribute(): string
    {
        $remaining = $this->remaining_time;
        
        if ($remaining === null) {
            return 'N/A';
        }

        if ($remaining === 0) {
            return 'Expired';
        }

        $hours = intval($remaining / 60);
        $minutes = $remaining % 60;

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }

    /**
     * Unlock account
     */
    public function unlock(string $method = 'automatic', ?User $unlockedBy = null, string $reason = null): bool
    {
        $actualDuration = $this->locked_at->diffInMinutes(now());

        $result = $this->update([
            'status' => 'unlocked',
            'unlock_method' => $method,
            'unlocked_at' => now(),
            'unlocked_by' => $unlockedBy?->id,
            'unlock_reason' => $reason,
            'actual_duration_minutes' => $actualDuration,
        ]);

        if ($result) {
            // Create security alert for manual unlocks
            if ($method === 'admin_unlock' && $unlockedBy) {
                SecurityAlert::createAlert([
                    'user_id' => $this->user_id,
                    'alert_type' => 'account_lockout',
                    'severity' => 'medium',
                    'title' => 'Account Manually Unlocked',
                    'description' => "Account was manually unlocked by {$unlockedBy->first_name} {$unlockedBy->last_name}",
                    'alert_data' => [
                        'lockout_id' => $this->id,
                        'lockout_type' => $this->lockout_type,
                        'unlock_reason' => $reason,
                        'locked_duration_minutes' => $actualDuration,
                    ],
                    'risk_score' => 30,
                ]);
            }
        }

        return $result;
    }

    /**
     * Create account lockout
     */
    public static function createLockout(
        User $user,
        string $type,
        array $triggerData = [],
        ?User $lockedBy = null
    ): self {
        // Calculate lockout duration and level
        $recentLockouts = self::where('user_id', $user->id)
                              ->where('locked_at', '>=', now()->subDays(7))
                              ->count();

        $level = self::determineLockoutLevel($type, $recentLockouts, $triggerData);
        $duration = self::calculateLockoutDuration($recentLockouts + 1, $type);

        $lockout = self::create([
            'user_id' => $user->id,
            'lockout_type' => $type,
            'lockout_level' => $level,
            'trigger_ip' => request()->ip(),
            'trigger_user_agent' => request()->header('User-Agent'),
            'trigger_data' => $triggerData,
            'failed_attempts_count' => $triggerData['failed_attempts'] ?? 0,
            'locked_at' => now(),
            'unlock_at' => $level === 'manual' ? null : now()->addMinutes($duration),
            'status' => 'active',
            'locked_by' => $lockedBy?->id,
            'escalated_to_admin' => in_array($level, ['manual', 'permanent']),
            'user_notified' => false,
            'risk_score' => self::calculateRiskScore($type, $triggerData),
            'requires_manual_review' => in_array($type, ['security_breach', 'suspicious_activity']),
            'lockout_duration_minutes' => $level === 'manual' ? null : $duration,
        ]);

        // Create security alert
        SecurityAlert::createAlert([
            'user_id' => $user->id,
            'alert_type' => 'account_lockout',
            'severity' => $level === 'permanent' ? 'critical' : 
                         ($level === 'manual' ? 'high' : 'medium'),
            'title' => 'Account Locked',
            'description' => "Account locked due to {$type}",
            'alert_data' => [
                'lockout_id' => $lockout->id,
                'lockout_type' => $type,
                'lockout_level' => $level,
                'duration_minutes' => $duration,
                'trigger_data' => $triggerData,
            ],
            'source_ip' => request()->ip(),
            'risk_score' => $lockout->risk_score,
            'requires_immediate_action' => in_array($level, ['manual', 'permanent']),
        ]);

        return $lockout;
    }

    /**
     * Determine lockout level
     */
    protected static function determineLockoutLevel(string $type, int $recentLockouts, array $triggerData): string
    {
        // Permanent lockout for severe security breaches
        if ($type === 'security_breach' || 
            ($triggerData['risk_score'] ?? 0) >= 90) {
            return 'permanent';
        }

        // Manual lockout for suspicious activity or admin actions
        if (in_array($type, ['suspicious_activity', 'admin_action']) ||
            $recentLockouts >= 3) {
            return 'manual';
        }

        // Extended lockout for repeated failures
        if ($recentLockouts >= 2 || 
            ($triggerData['failed_attempts'] ?? 0) >= 10) {
            return 'extended';
        }

        return 'temporary';
    }

    /**
     * Calculate lockout duration
     */
    protected static function calculateLockoutDuration(int $lockoutCount, string $type): int
    {
        // Special durations for specific types
        if ($type === 'brute_force_protection') {
            return min(480, $lockoutCount * 30); // Up to 8 hours
        }

        if ($type === 'multiple_devices') {
            return 60; // Fixed 1 hour for device limit
        }

        // Progressive duration based on lockout count
        return self::LOCKOUT_DURATIONS[$lockoutCount] ?? self::LOCKOUT_DURATIONS['default'];
    }

    /**
     * Calculate risk score
     */
    protected static function calculateRiskScore(string $type, array $triggerData): int
    {
        $baseScores = [
            'failed_attempts' => 30,
            'suspicious_activity' => 60,
            'admin_action' => 20,
            'security_breach' => 90,
            'multiple_devices' => 40,
            'geographic_anomaly' => 50,
            'brute_force_protection' => 70,
        ];

        $score = $baseScores[$type] ?? 40;

        // Adjust based on trigger data
        if (isset($triggerData['failed_attempts'])) {
            $score += min(30, $triggerData['failed_attempts'] * 3);
        }

        if (isset($triggerData['risk_score'])) {
            $score = max($score, $triggerData['risk_score']);
        }

        return min(100, $score);
    }

    /**
     * Check if user is currently locked
     */
    public static function isUserLocked(User $user): bool
    {
        return self::where('user_id', $user->id)
                  ->active()
                  ->exists();
    }

    /**
     * Get user's active lockout
     */
    public static function getUserActiveLockout(User $user): ?self
    {
        return self::where('user_id', $user->id)
                  ->active()
                  ->latest('locked_at')
                  ->first();
    }

    /**
     * Process automatic unlocks
     */
    public static function processAutoUnlocks(): int
    {
        $expiredLockouts = self::expired()->get();
        $unlockedCount = 0;

        foreach ($expiredLockouts as $lockout) {
            if ($lockout->unlock('time_expiry', null, 'Automatic unlock due to time expiry')) {
                $unlockedCount++;
            }
        }

        return $unlockedCount;
    }

    /**
     * Get lockout statistics
     */
    public static function getStatistics(int $days = 30): array
    {
        $lockouts = self::where('locked_at', '>=', now()->subDays($days));

        return [
            'total_lockouts' => $lockouts->count(),
            'active_lockouts' => self::active()->count(),
            'manual_review_required' => self::requiresReview()->count(),
            'lockouts_by_type' => $lockouts->selectRaw('lockout_type, COUNT(*) as count')
                                          ->groupBy('lockout_type')
                                          ->pluck('count', 'lockout_type')
                                          ->toArray(),
            'lockouts_by_level' => $lockouts->selectRaw('lockout_level, COUNT(*) as count')
                                           ->groupBy('lockout_level')
                                           ->pluck('count', 'lockout_level')
                                           ->toArray(),
            'average_duration' => $lockouts->whereNotNull('actual_duration_minutes')
                                          ->avg('actual_duration_minutes'),
            'unlock_methods' => $lockouts->whereNotNull('unlock_method')
                                        ->selectRaw('unlock_method, COUNT(*) as count')
                                        ->groupBy('unlock_method')
                                        ->pluck('count', 'unlock_method')
                                        ->toArray(),
            'escalated_lockouts' => $lockouts->where('escalated_to_admin', true)->count(),
        ];
    }

    /**
     * Add notification to history
     */
    public function addNotification(string $type, array $data = []): void
    {
        $history = $this->notification_history ?? [];
        $history[] = [
            'type' => $type,
            'sent_at' => now()->toISOString(),
            'data' => $data,
        ];

        $this->update([
            'notification_history' => $history,
            'user_notified' => true,
        ]);
    }

    /**
     * Get user lockout history
     */
    public static function getUserHistory(User $user, int $days = 90): array
    {
        $lockouts = self::where('user_id', $user->id)
                       ->where('locked_at', '>=', now()->subDays($days))
                       ->orderBy('locked_at', 'desc')
                       ->get();

        return [
            'total_lockouts' => $lockouts->count(),
            'recent_lockouts' => $lockouts->take(10),
            'lockout_frequency' => $lockouts->count() / max(1, $days / 7), // per week
            'most_common_type' => $lockouts->groupBy('lockout_type')
                                          ->map->count()
                                          ->sortDesc()
                                          ->keys()
                                          ->first(),
            'total_locked_time' => $lockouts->sum('actual_duration_minutes'),
            'average_lockout_duration' => $lockouts->whereNotNull('actual_duration_minutes')
                                                  ->avg('actual_duration_minutes'),
        ];
    }
}