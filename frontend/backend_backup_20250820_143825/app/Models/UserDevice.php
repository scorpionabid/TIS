<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Request;

class UserDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_id',
        'device_name',
        'device_type',
        'browser_name',
        'browser_version',
        'operating_system',
        'platform',
        'user_agent',
        'screen_resolution',
        'timezone',
        'language',
        'device_fingerprint',
        'last_ip_address',
        'registration_ip',
        'last_location_country',
        'last_location_city',
        'is_trusted',
        'is_active',
        'trusted_at',
        'last_seen_at',
        'registered_at',
        'requires_verification',
        'failed_verification_attempts',
        'verification_blocked_until',
    ];

    protected $casts = [
        'device_fingerprint' => 'array',
        'is_trusted' => 'boolean',
        'is_active' => 'boolean',
        'trusted_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'registered_at' => 'datetime',
        'requires_verification' => 'boolean',
        'verification_blocked_until' => 'datetime',
    ];

    const DEVICE_TYPES = [
        'mobile' => 'Mobile Phone',
        'tablet' => 'Tablet',
        'desktop' => 'Desktop Computer',
        'laptop' => 'Laptop',
        'unknown' => 'Unknown Device',
    ];

    const MAX_DEVICES_PER_USER = 3; // PRD-2: Maximum 3 devices per user

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Sessions for this device
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class);
    }

    /**
     * Active sessions for this device
     */
    public function activeSessions(): HasMany
    {
        return $this->sessions()->where('status', 'active')
                                ->where('expires_at', '>', now());
    }

    /**
     * Scope: Active devices
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Trusted devices
     */
    public function scopeTrusted(Builder $query): Builder
    {
        return $query->where('is_trusted', true);
    }

    /**
     * Scope: Recently seen devices
     */
    public function scopeRecentlySeen(Builder $query, int $hours = 24): Builder
    {
        return $query->where('last_seen_at', '>=', now()->subHours($hours));
    }

    /**
     * Get device type label
     */
    public function getDeviceTypeLabelAttribute(): string
    {
        return self::DEVICE_TYPES[$this->device_type] ?? $this->device_type;
    }

    /**
     * Get formatted last seen
     */
    public function getFormattedLastSeenAttribute(): string
    {
        if (!$this->last_seen_at) {
            return 'Never';
        }

        return $this->last_seen_at->diffForHumans();
    }

    /**
     * Check if device is currently online
     */
    public function isOnline(): bool
    {
        return $this->activeSessions()->exists() && 
               $this->last_seen_at && 
               $this->last_seen_at->diffInMinutes(now()) <= 15;
    }

    /**
     * Check if device requires verification
     */
    public function needsVerification(): bool
    {
        return $this->requires_verification && 
               (!$this->verification_blocked_until || $this->verification_blocked_until->isPast());
    }

    /**
     * Mark device as trusted
     */
    public function markAsTrusted(): bool
    {
        return $this->update([
            'is_trusted' => true,
            'trusted_at' => now(),
            'requires_verification' => false,
            'failed_verification_attempts' => 0,
            'verification_blocked_until' => null,
        ]);
    }

    /**
     * Update device activity
     */
    public function updateActivity(string $ipAddress = null, array $metadata = []): void
    {
        $updates = [
            'last_seen_at' => now(),
        ];

        if ($ipAddress) {
            $updates['last_ip_address'] = $ipAddress;
        }

        // Update location if provided in metadata
        if (isset($metadata['country'])) {
            $updates['last_location_country'] = $metadata['country'];
        }
        
        if (isset($metadata['city'])) {
            $updates['last_location_city'] = $metadata['city'];
        }

        $this->update($updates);
    }

    /**
     * Generate unique device ID
     */
    public static function generateDeviceId(): string
    {
        do {
            $deviceId = Str::random(32);
        } while (self::where('device_id', $deviceId)->exists());

        return $deviceId;
    }

    /**
     * Create device fingerprint
     */
    public static function createFingerprint(array $deviceInfo): array
    {
        return [
            'screen' => $deviceInfo['screen_resolution'] ?? null,
            'timezone' => $deviceInfo['timezone'] ?? null,
            'language' => $deviceInfo['language'] ?? null,
            'platform' => $deviceInfo['platform'] ?? null,
            'user_agent_hash' => isset($deviceInfo['user_agent']) ? hash('sha256', $deviceInfo['user_agent']) : null,
            'canvas_fingerprint' => $deviceInfo['canvas_fingerprint'] ?? null,
            'webgl_fingerprint' => $deviceInfo['webgl_fingerprint'] ?? null,
            'audio_fingerprint' => $deviceInfo['audio_fingerprint'] ?? null,
        ];
    }

    /**
     * Register new device for user
     */
    public static function registerDevice(User $user, array $deviceInfo): self
    {
        // Check device limit
        $activeDeviceCount = $user->devices()->active()->count();
        if ($activeDeviceCount >= self::MAX_DEVICES_PER_USER) {
            throw new \Exception("Maksimum {self::MAX_DEVICES_PER_USER} cihaz limiti aşıldı.");
        }

        $ipAddress = Request::ip() ?? '127.0.0.1';
        
        // Parse user agent for device information
        $parsedUA = self::parseUserAgent($deviceInfo['user_agent'] ?? '');

        return self::create([
            'user_id' => $user->id,
            'device_id' => self::generateDeviceId(),
            'device_name' => $deviceInfo['device_name'] ?? self::generateDeviceName($parsedUA),
            'device_type' => $deviceInfo['device_type'] ?? $parsedUA['device_type'],
            'browser_name' => $parsedUA['browser_name'],
            'browser_version' => $parsedUA['browser_version'],
            'operating_system' => $parsedUA['operating_system'],
            'platform' => $parsedUA['platform'],
            'user_agent' => $deviceInfo['user_agent'] ?? '',
            'screen_resolution' => $deviceInfo['screen_resolution'] ?? null,
            'timezone' => $deviceInfo['timezone'] ?? null,
            'language' => $deviceInfo['language'] ?? null,
            'device_fingerprint' => self::createFingerprint($deviceInfo),
            'last_ip_address' => $ipAddress,
            'registration_ip' => $ipAddress,
            'last_location_country' => $deviceInfo['country'] ?? null,
            'last_location_city' => $deviceInfo['city'] ?? null,
            'is_trusted' => false,
            'is_active' => true,
            'last_seen_at' => now(),
            'registered_at' => now(),
            'requires_verification' => true,
        ]);
    }

    /**
     * Find device by device ID or create new one
     */
    public static function findOrCreateDevice(User $user, array $deviceInfo): self
    {
        $deviceId = $deviceInfo['device_id'] ?? null;
        
        if ($deviceId) {
            $device = self::where('device_id', $deviceId)
                         ->where('user_id', $user->id)
                         ->first();
            
            if ($device) {
                $device->updateActivity(Request::ip(), $deviceInfo);
                return $device;
            }
        }

        return self::registerDevice($user, $deviceInfo);
    }

    /**
     * Parse user agent string
     */
    protected static function parseUserAgent(string $userAgent): array
    {
        $browser = self::getBrowserInfo($userAgent);
        $os = self::getOperatingSystem($userAgent);
        $deviceType = self::getDeviceType($userAgent);

        return [
            'browser_name' => $browser['name'],
            'browser_version' => $browser['version'],
            'operating_system' => $os,
            'platform' => $browser['platform'],
            'device_type' => $deviceType,
        ];
    }

    /**
     * Extract browser information from user agent
     */
    protected static function getBrowserInfo(string $userAgent): array
    {
        $browsers = [
            'Chrome' => '/Chrome\/([0-9\.]+)/',
            'Firefox' => '/Firefox\/([0-9\.]+)/',
            'Safari' => '/Safari\/([0-9\.]+)/',
            'Edge' => '/Edg\/([0-9\.]+)/',
            'Opera' => '/Opera\/([0-9\.]+)/',
        ];

        foreach ($browsers as $name => $pattern) {
            if (preg_match($pattern, $userAgent, $matches)) {
                return [
                    'name' => $name,
                    'version' => $matches[1] ?? 'unknown',
                    'platform' => self::getPlatform($userAgent),
                ];
            }
        }

        return [
            'name' => 'Unknown',
            'version' => 'unknown',
            'platform' => 'unknown',
        ];
    }

    /**
     * Get operating system from user agent
     */
    protected static function getOperatingSystem(string $userAgent): string
    {
        $systems = [
            'Windows' => '/Windows NT ([0-9\.]+)/',
            'macOS' => '/Mac OS X ([0-9_\.]+)/',
            'Linux' => '/Linux/',
            'Android' => '/Android ([0-9\.]+)/',
            'iOS' => '/iPhone OS ([0-9_\.]+)/',
        ];

        foreach ($systems as $name => $pattern) {
            if (preg_match($pattern, $userAgent, $matches)) {
                $version = isset($matches[1]) ? str_replace('_', '.', $matches[1]) : '';
                return $version ? "{$name} {$version}" : $name;
            }
        }

        return 'Unknown';
    }

    /**
     * Get device type from user agent
     */
    protected static function getDeviceType(string $userAgent): string
    {
        if (preg_match('/Mobile|Android|iPhone|iPad/', $userAgent)) {
            if (preg_match('/iPad|Tablet/', $userAgent)) {
                return 'tablet';
            }
            return 'mobile';
        }

        return 'desktop';
    }

    /**
     * Get platform from user agent
     */
    protected static function getPlatform(string $userAgent): string
    {
        if (preg_match('/Windows/', $userAgent)) return 'Windows';
        if (preg_match('/Macintosh/', $userAgent)) return 'macOS';
        if (preg_match('/Linux/', $userAgent)) return 'Linux';
        if (preg_match('/Android/', $userAgent)) return 'Android';
        if (preg_match('/iPhone|iPad/', $userAgent)) return 'iOS';

        return 'Unknown';
    }

    /**
     * Generate device name
     */
    protected static function generateDeviceName(array $parsedUA): string
    {
        $browser = $parsedUA['browser_name'];
        $os = explode(' ', $parsedUA['operating_system'])[0];
        $type = ucfirst($parsedUA['device_type']);

        return "{$browser} on {$os} ({$type})";
    }

    /**
     * Deactivate device
     */
    public function deactivate(string $reason = null): bool
    {
        // Terminate all active sessions
        $this->activeSessions()->update([
            'status' => 'terminated',
            'termination_reason' => 'device_limit',
            'terminated_at' => now(),
        ]);

        return $this->update(['is_active' => false]);
    }

    /**
     * Get device statistics
     */
    public function getStatistics(): array
    {
        return [
            'total_sessions' => $this->sessions()->count(),
            'active_sessions' => $this->activeSessions()->count(),
            'last_login' => $this->sessions()->latest()->first()?->started_at,
            'total_login_time' => $this->sessions()
                ->whereNotNull('terminated_at')
                ->selectRaw('SUM(TIMESTAMPDIFF(MINUTE, started_at, terminated_at)) as total_minutes')
                ->first()?->total_minutes ?? 0,
            'is_online' => $this->isOnline(),
            'registration_age_days' => $this->registered_at->diffInDays(now()),
            'trust_status' => $this->is_trusted ? 'trusted' : 'untrusted',
        ];
    }
}