<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_device_id',
        'session_token',
        'session_id',
        'session_name',
        'session_type',
        'session_data',
        'started_at',
        'last_activity_at',
        'expires_at',
        'ip_address',
        'user_agent',
        'session_fingerprint',
        'security_context',
        'status',
        'is_suspicious',
        'security_score',
        'termination_reason',
        'terminated_at',
        'terminated_by',
    ];

    protected $casts = [
        'session_data' => 'array',
        'started_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'expires_at' => 'datetime',
        'security_context' => 'array',
        'is_suspicious' => 'boolean',
        'terminated_at' => 'datetime',
    ];

    const SESSION_TIMEOUT_HOURS = 8; // PRD requirement: 8-hour session timeout
    const ACTIVITY_TIMEOUT_MINUTES = 30; // Inactivity timeout
    const HIJACKING_DETECTION_THRESHOLD = 50; // Security score threshold

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Device relationship
     */
    public function device(): BelongsTo
    {
        return $this->belongsTo(UserDevice::class, 'user_device_id');
    }

    /**
     * Terminated by user relationship
     */
    public function terminatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'terminated_by');
    }

    /**
     * Session activities
     */
    public function activities(): HasMany
    {
        return $this->hasMany(SessionActivity::class);
    }

    /**
     * Scope: Active sessions
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->where('expires_at', '>', now());
    }

    /**
     * Scope: Expired sessions
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<=', now())
                    ->where('status', 'active');
    }

    /**
     * Scope: Suspicious sessions
     */
    public function scopeSuspicious(Builder $query): Builder
    {
        return $query->where('is_suspicious', true)
                    ->orWhere('security_score', '<', self::HIJACKING_DETECTION_THRESHOLD);
    }

    /**
     * Scope: By session type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('session_type', $type);
    }

    /**
     * Check if session is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && 
               $this->expires_at->isFuture() &&
               $this->isWithinActivityTimeout();
    }

    /**
     * Check if session is within activity timeout
     */
    public function isWithinActivityTimeout(): bool
    {
        return $this->last_activity_at->diffInMinutes(now()) <= self::ACTIVITY_TIMEOUT_MINUTES;
    }

    /**
     * Check if session is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast() || 
               !$this->isWithinActivityTimeout();
    }

    /**
     * Check if session appears hijacked
     */
    public function isHijacked(): bool
    {
        return $this->status === 'hijacked' || 
               $this->security_score < self::HIJACKING_DETECTION_THRESHOLD;
    }

    /**
     * Update session activity
     */
    public function updateActivity(array $context = []): void
    {
        $updates = [
            'last_activity_at' => now(),
        ];

        // Update IP if changed (potential security concern)
        if (isset($context['ip_address']) && $context['ip_address'] !== $this->ip_address) {
            $this->flagSuspiciousActivity('ip_change', [
                'old_ip' => $this->ip_address,
                'new_ip' => $context['ip_address'],
            ]);
        }

        // Update security context
        if (!empty($context)) {
            $currentContext = $this->security_context ?? [];
            $updates['security_context'] = array_merge($currentContext, $context);
        }

        $this->update($updates);

        // Update device activity
        if ($this->device) {
            $this->device->updateActivity($context['ip_address'] ?? null);
        }
    }

    /**
     * Flag suspicious activity
     */
    public function flagSuspiciousActivity(string $reason, array $details = []): void
    {
        $this->update([
            'is_suspicious' => true,
            'security_score' => max(0, $this->security_score - 20),
        ]);

        // Create security alert
        SecurityAlert::create([
            'user_id' => $this->user_id,
            'user_session_id' => $this->id,
            'alert_type' => 'suspicious_activity',
            'severity' => 'medium',
            'title' => 'Suspicious Session Activity Detected',
            'description' => "Suspicious activity detected in user session: {$reason}",
            'alert_data' => array_merge($details, [
                'session_id' => $this->id,
                'reason' => $reason,
                'session_fingerprint' => $this->session_fingerprint,
            ]),
            'source_ip' => $this->ip_address,
            'risk_score' => 100 - $this->security_score,
            'detected_at' => now(),
            'auto_generated' => true,
        ]);
    }

    /**
     * Terminate session
     */
    public function terminate(string $reason = 'logout', ?User $terminatedBy = null): bool
    {
        return $this->update([
            'status' => 'terminated',
            'termination_reason' => $reason,
            'terminated_at' => now(),
            'terminated_by' => $terminatedBy?->id,
        ]);
    }

    /**
     * Extend session expiration
     */
    public function extend(int $hours = null): void
    {
        $hours = $hours ?? self::SESSION_TIMEOUT_HOURS;
        
        $this->update([
            'expires_at' => now()->addHours($hours),
        ]);
    }

    /**
     * Generate session fingerprint
     */
    public static function generateFingerprint(array $context): string
    {
        $components = [
            $context['user_agent'] ?? '',
            $context['ip_address'] ?? '',
            $context['accept_language'] ?? '',
            $context['accept_encoding'] ?? '',
            $context['screen_resolution'] ?? '',
            $context['timezone'] ?? '',
        ];

        return hash('sha256', implode('|', $components));
    }

    /**
     * Create new session
     */
    public static function createSession(
        User $user, 
        UserDevice $device, 
        string $token, 
        array $context = []
    ): self {
        $ipAddress = $context['ip_address'] ?? '127.0.0.1';
        $userAgent = $context['user_agent'] ?? '';
        $sessionType = $context['session_type'] ?? 'web';

        return self::create([
            'user_id' => $user->id,
            'user_device_id' => $device->id,
            'session_token' => $token,
            'session_id' => $context['session_id'] ?? null,
            'session_name' => $context['session_name'] ?? self::generateSessionName($device, $context),
            'session_type' => $sessionType,
            'session_data' => $context['session_data'] ?? null,
            'started_at' => now(),
            'last_activity_at' => now(),
            'expires_at' => now()->addHours(self::SESSION_TIMEOUT_HOURS),
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'session_fingerprint' => self::generateFingerprint($context),
            'security_context' => [
                'login_method' => $context['login_method'] ?? 'password',
                'two_factor_used' => $context['two_factor_used'] ?? false,
                'device_trusted' => $device->is_trusted,
                'location_country' => $context['country'] ?? null,
                'location_city' => $context['city'] ?? null,
            ],
            'status' => 'active',
            'is_suspicious' => false,
            'security_score' => self::calculateInitialSecurityScore($user, $device, $context),
        ]);
    }

    /**
     * Generate session name
     */
    protected static function generateSessionName(UserDevice $device, array $context): string
    {
        $browser = $device->browser_name ?? 'Unknown Browser';
        $os = explode(' ', $device->operating_system ?? 'Unknown OS')[0];
        $location = $context['city'] ?? $context['country'] ?? 'Unknown Location';

        return "{$browser} on {$os} from {$location}";
    }

    /**
     * Calculate initial security score
     */
    protected static function calculateInitialSecurityScore(User $user, UserDevice $device, array $context): int
    {
        $score = 100;

        // Device trust factor
        if (!$device->is_trusted) {
            $score -= 20;
        }

        // New device penalty
        if ($device->registered_at->diffInDays(now()) < 1) {
            $score -= 15;
        }

        // IP address change
        if ($device->last_ip_address !== ($context['ip_address'] ?? '127.0.0.1')) {
            $score -= 10;
        }

        // Geographic location (if available)
        if (isset($context['country']) && $device->last_location_country && 
            $context['country'] !== $device->last_location_country) {
            $score -= 25;
        }

        // Time-based factors (unusual login times)
        $hour = now()->hour;
        if ($hour < 6 || $hour > 23) {
            $score -= 10;
        }

        // Recent failed attempts
        $recentFailures = $user->failed_login_attempts ?? 0;
        if ($recentFailures > 0) {
            $score -= min(30, $recentFailures * 5);
        }

        return max(0, min(100, $score));
    }

    /**
     * Get session duration
     */
    public function getDurationAttribute(): ?int
    {
        if (!$this->terminated_at) {
            return null;
        }

        return $this->started_at->diffInMinutes($this->terminated_at);
    }

    /**
     * Get formatted duration
     */
    public function getFormattedDurationAttribute(): string
    {
        if (!$this->duration) {
            return 'Active';
        }

        $hours = intval($this->duration / 60);
        $minutes = $this->duration % 60;

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }

    /**
     * Get session statistics
     */
    public function getStatistics(): array
    {
        return [
            'duration_minutes' => $this->duration,
            'activity_count' => $this->activities()->count(),
            'api_calls' => $this->activities()->where('activity_type', 'api_call')->count(),
            'page_views' => $this->activities()->where('activity_type', 'page_view')->count(),
            'uploads' => $this->activities()->where('activity_type', 'upload')->count(),
            'downloads' => $this->activities()->where('activity_type', 'download')->count(),
            'security_events' => $this->activities()->where('activity_type', 'security_event')->count(),
            'suspicious_activities' => $this->activities()->where('is_suspicious', true)->count(),
            'average_risk_score' => $this->activities()->avg('risk_score') ?? 0,
            'is_active' => $this->isActive(),
            'security_score' => $this->security_score,
            'trust_level' => $this->getTrustLevel(),
        ];
    }

    /**
     * Get trust level based on security score
     */
    public function getTrustLevel(): string
    {
        if ($this->security_score >= 80) return 'high';
        if ($this->security_score >= 60) return 'medium';
        if ($this->security_score >= 40) return 'low';
        return 'very_low';
    }

    /**
     * Cleanup expired sessions
     */
    public static function cleanupExpired(): int
    {
        return self::expired()->update([
            'status' => 'expired',
            'terminated_at' => now(),
            'termination_reason' => 'timeout',
        ]);
    }

    /**
     * Get concurrent sessions for user
     */
    public static function getConcurrentSessions(User $user): int
    {
        return self::where('user_id', $user->id)
                  ->active()
                  ->count();
    }
}