<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class SessionActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_session_id',
        'user_id',
        'activity_type',
        'activity_description',
        'endpoint',
        'http_method',
        'response_status',
        'ip_address',
        'user_agent',
        'referer',
        'request_data',
        'is_suspicious',
        'risk_score',
        'security_flags',
        'response_time_ms',
        'memory_usage_mb',
        'debug_data',
        'location_country',
        'location_city',
        'device_type',
        'created_at',
    ];

    protected $casts = [
        'request_data' => 'array',
        'security_flags' => 'array',
        'debug_data' => 'array',
        'is_suspicious' => 'boolean',
        'created_at' => 'datetime',
    ];

    // We only want to track created_at, not updated_at
    const UPDATED_AT = null;
    
    protected $dates = ['created_at'];
    
    // Set the created_at timestamp when creating a new record
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->created_at)) {
                $model->created_at = $model->freshTimestamp();
            }
        });
    }

    const ACTIVITY_TYPES = [
        'login' => 'User Login',
        'logout' => 'User Logout', 
        'heartbeat' => 'Session Heartbeat',
        'api_call' => 'API Request',
        'page_view' => 'Page View',
        'download' => 'File Download',
        'upload' => 'File Upload',
        'password_change' => 'Password Change',
        'settings_change' => 'Settings Change',
        'security_event' => 'Security Event',
    ];

    const RISK_LEVELS = [
        'very_low' => [0, 20],
        'low' => [21, 40], 
        'medium' => [41, 60],
        'high' => [61, 80],
        'critical' => [81, 100],
    ];

    /**
     * User session relationship
     */
    public function userSession(): BelongsTo
    {
        return $this->belongsTo(UserSession::class);
    }

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: By activity type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('activity_type', $type);
    }

    /**
     * Scope: Suspicious activities
     */
    public function scopeSuspicious(Builder $query): Builder
    {
        return $query->where('is_suspicious', true);
    }

    /**
     * Scope: High risk activities
     */
    public function scopeHighRisk(Builder $query, int $threshold = 60): Builder
    {
        return $query->where('risk_score', '>=', $threshold);
    }

    /**
     * Scope: Recent activities
     */
    public function scopeRecent(Builder $query, int $hours = 24): Builder
    {
        return $query->where('created_at', '>=', now()->subHours($hours));
    }

    /**
     * Scope: By date range
     */
    public function scopeInDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope: Failed requests
     */
    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('response_status', '>=', 400);
    }

    /**
     * Get activity type label
     */
    public function getActivityTypeLabelAttribute(): string
    {
        return self::ACTIVITY_TYPES[$this->activity_type] ?? $this->activity_type;
    }

    /**
     * Get risk level
     */
    public function getRiskLevelAttribute(): string
    {
        foreach (self::RISK_LEVELS as $level => $range) {
            if ($this->risk_score >= $range[0] && $this->risk_score <= $range[1]) {
                return $level;
            }
        }
        return 'unknown';
    }

    /**
     * Get formatted response time
     */
    public function getFormattedResponseTimeAttribute(): string
    {
        if (!$this->response_time_ms) {
            return 'N/A';
        }

        if ($this->response_time_ms >= 1000) {
            return number_format($this->response_time_ms / 1000, 2) . 's';
        }

        return $this->response_time_ms . 'ms';
    }

    /**
     * Check if activity indicates potential security threat
     */
    public function isSecurityThreat(): bool
    {
        return $this->is_suspicious || 
               $this->risk_score >= 70 || 
               $this->activity_type === 'security_event';
    }

    /**
     * Log activity
     */
    public static function logActivity(
        UserSession $session,
        string $activityType,
        array $data = []
    ): self {
        $riskScore = self::calculateRiskScore($activityType, $data, $session);
        $isSuspicious = $riskScore >= 60 || ($data['is_suspicious'] ?? false);

        return self::create([
            'user_session_id' => $session->id,
            'user_id' => $session->user_id,
            'activity_type' => $activityType,
            'activity_description' => $data['description'] ?? self::generateDescription($activityType, $data),
            'endpoint' => $data['endpoint'] ?? null,
            'http_method' => $data['method'] ?? null,
            'response_status' => $data['status'] ?? null,
            'ip_address' => $data['ip'] ?? request()->ip() ?? '127.0.0.1',
            'user_agent' => $data['user_agent'] ?? request()->header('User-Agent'),
            'referer' => $data['referer'] ?? request()->header('Referer'),
            'request_data' => $data['request_data'] ?? null,
            'is_suspicious' => $isSuspicious,
            'risk_score' => $riskScore,
            'security_flags' => $data['security_flags'] ?? null,
            'response_time_ms' => $data['response_time'] ?? null,
            'memory_usage_mb' => $data['memory_usage'] ?? null,
            'debug_data' => $data['debug_data'] ?? null,
            'location_country' => $data['country'] ?? null,
            'location_city' => $data['city'] ?? null,
            'device_type' => $session->device->device_type ?? null,
            'created_at' => now(),
        ]);
    }

    /**
     * Calculate risk score for activity
     */
    protected static function calculateRiskScore(string $activityType, array $data, UserSession $session): int
    {
        $baseScore = 0;

        // Base risk by activity type
        $activityRisks = [
            'login' => 10,
            'logout' => 5,
            'heartbeat' => 0,
            'api_call' => 5,
            'page_view' => 0,
            'download' => 15,
            'upload' => 20,
            'password_change' => 30,
            'settings_change' => 25,
            'security_event' => 50,
        ];

        $baseScore = $activityRisks[$activityType] ?? 10;

        // IP address change risk
        if (isset($data['ip']) && $data['ip'] !== $session->ip_address) {
            $baseScore += 20;
        }

        // Failed request risk
        if (isset($data['status']) && $data['status'] >= 400) {
            $baseScore += 15;
            if ($data['status'] === 401 || $data['status'] === 403) {
                $baseScore += 25; // Unauthorized access attempts
            }
        }

        // Geographic anomaly
        if (isset($data['country']) && $session->device && 
            $data['country'] !== $session->device->last_location_country) {
            $baseScore += 30;
        }

        // Time-based risk (unusual hours)
        $hour = now()->hour;
        if ($hour < 6 || $hour > 23) {
            $baseScore += 10;
        }

        // Suspicious patterns in request data
        if (isset($data['request_data']) && self::containsSuspiciousPatterns($data['request_data'])) {
            $baseScore += 25;
        }

        // Response time anomaly (too fast might indicate automation)
        if (isset($data['response_time']) && $data['response_time'] < 50) {
            $baseScore += 15;
        }

        // Multiple rapid requests (potential bot behavior)
        $recentActivities = $session->activities()
            ->where('created_at', '>=', now()->subMinutes(5))
            ->count();
        
        if ($recentActivities > 50) {
            $baseScore += 30;
        }

        return min(100, max(0, $baseScore));
    }

    /**
     * Check for suspicious patterns in request data
     */
    protected static function containsSuspiciousPatterns(array $requestData): bool
    {
        $suspiciousPatterns = [
            'script', 'javascript:', 'eval(', 'document.cookie',
            'union select', 'drop table', 'insert into', 'delete from',
            '../', '..\\', '/etc/passwd', 'cmd.exe',
            '<script', 'onerror=', 'onload=', 'onclick=',
        ];

        $dataString = json_encode($requestData);
        
        foreach ($suspiciousPatterns as $pattern) {
            if (stripos($dataString, $pattern) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate activity description
     */
    protected static function generateDescription(string $activityType, array $data): string
    {
        switch ($activityType) {
            case 'login':
                return 'User logged in';
            case 'logout':
                return 'User logged out';
            case 'api_call':
                $endpoint = $data['endpoint'] ?? 'unknown endpoint';
                $method = $data['method'] ?? 'GET';
                return "API call: {$method} {$endpoint}";
            case 'page_view':
                $page = $data['page'] ?? $data['endpoint'] ?? 'unknown page';
                return "Viewed page: {$page}";
            case 'download':
                $file = $data['file'] ?? 'unknown file';
                return "Downloaded file: {$file}";
            case 'upload':
                $file = $data['file'] ?? 'unknown file';
                return "Uploaded file: {$file}";
            case 'password_change':
                return 'Changed password';
            case 'settings_change':
                $setting = $data['setting'] ?? 'unknown setting';
                return "Changed setting: {$setting}";
            case 'security_event':
                return $data['description'] ?? 'Security event occurred';
            default:
                return "Activity: {$activityType}";
        }
    }

    /**
     * Get activity statistics for session
     */
    public static function getSessionStatistics(UserSession $session): array
    {
        $activities = self::where('user_session_id', $session->id);

        return [
            'total_activities' => $activities->count(),
            'by_type' => $activities->selectRaw('activity_type, COUNT(*) as count')
                                    ->groupBy('activity_type')
                                    ->pluck('count', 'activity_type')
                                    ->toArray(),
            'suspicious_count' => $activities->suspicious()->count(),
            'high_risk_count' => $activities->highRisk()->count(),
            'failed_requests' => $activities->failed()->count(),
            'average_risk_score' => $activities->avg('risk_score') ?? 0,
            'peak_activity_hour' => $activities->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
                                              ->groupBy('hour')
                                              ->orderByDesc('count')
                                              ->first()?->hour,
            'total_response_time' => $activities->sum('response_time_ms'),
            'average_response_time' => $activities->avg('response_time_ms'),
        ];
    }

    /**
     * Get user activity patterns
     */
    public static function getUserActivityPatterns(User $user, int $days = 30): array
    {
        $activities = self::where('user_id', $user->id)
                         ->where('created_at', '>=', now()->subDays($days));

        return [
            'daily_average' => $activities->count() / $days,
            'most_active_hour' => $activities->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
                                            ->groupBy('hour')
                                            ->orderByDesc('count')
                                            ->first()?->hour ?? 0,
            'activity_by_type' => $activities->selectRaw('activity_type, COUNT(*) as count')
                                            ->groupBy('activity_type')
                                            ->pluck('count', 'activity_type')
                                            ->toArray(),
            'risk_distribution' => $activities->selectRaw('
                                       CASE 
                                           WHEN risk_score <= 20 THEN "very_low"
                                           WHEN risk_score <= 40 THEN "low"
                                           WHEN risk_score <= 60 THEN "medium"
                                           WHEN risk_score <= 80 THEN "high"
                                           ELSE "critical"
                                       END as risk_level, COUNT(*) as count
                                   ')
                                   ->groupBy('risk_level')
                                   ->pluck('count', 'risk_level')
                                   ->toArray(),
            'suspicious_activity_rate' => $activities->count() > 0 ? 
                ($activities->suspicious()->count() / $activities->count()) * 100 : 0,
        ];
    }
}