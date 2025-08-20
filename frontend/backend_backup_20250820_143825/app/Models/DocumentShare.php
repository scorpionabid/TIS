<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class DocumentShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'shared_by',
        'share_token',
        'share_name',
        'expires_at',
        'max_downloads',
        'download_count',
        'view_count',
        'requires_password',
        'password_hash',
        'allowed_ips',
        'is_active',
        'can_download',
        'can_view_online',
        'can_share',
        'last_accessed_at',
        'last_accessed_ip',
        'access_notes',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'allowed_ips' => 'array',
        'requires_password' => 'boolean',
        'is_active' => 'boolean',
        'can_download' => 'boolean',
        'can_view_online' => 'boolean',
        'can_share' => 'boolean',
        'last_accessed_at' => 'datetime',
    ];

    /**
     * Document relationship
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Shared by user relationship
     */
    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by');
    }

    /**
     * Downloads through this share
     */
    public function downloads(): HasMany
    {
        return $this->hasMany(DocumentDownload::class);
    }

    /**
     * Scope: Active shares
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
                    ->where('expires_at', '>', now());
    }

    /**
     * Scope: Expired shares
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<=', now());
    }

    /**
     * Scope: By token
     */
    public function scopeByToken(Builder $query, string $token): Builder
    {
        return $query->where('share_token', $token);
    }

    /**
     * Generate unique share token
     */
    public static function generateShareToken(): string
    {
        do {
            $token = Str::random(32);
        } while (self::where('share_token', $token)->exists());

        return $token;
    }

    /**
     * Check if share is valid
     */
    public function isValid(): bool
    {
        return $this->is_active && 
               $this->expires_at->isFuture() && 
               (!$this->max_downloads || $this->download_count < $this->max_downloads);
    }

    /**
     * Check if share is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if download limit reached
     */
    public function isDownloadLimitReached(): bool
    {
        return $this->max_downloads && $this->download_count >= $this->max_downloads;
    }

    /**
     * Check password for protected share
     */
    public function checkPassword(string $password): bool
    {
        if (!$this->requires_password) {
            return true;
        }

        return Hash::check($password, $this->password_hash);
    }

    /**
     * Set password for share
     */
    public function setPassword(string $password): void
    {
        $this->update([
            'requires_password' => true,
            'password_hash' => Hash::make($password),
        ]);
    }

    /**
     * Check if IP is allowed
     */
    public function isIpAllowed(string $ip): bool
    {
        if (!$this->allowed_ips) {
            return true;
        }

        return in_array($ip, $this->allowed_ips);
    }

    /**
     * Record access
     */
    public function recordAccess(string $ip, string $type = 'view'): void
    {
        $this->update([
            'last_accessed_at' => now(),
            'last_accessed_ip' => $ip,
        ]);

        if ($type === 'view') {
            $this->increment('view_count');
        } elseif ($type === 'download') {
            $this->increment('download_count');
        }
    }

    /**
     * Deactivate share
     */
    public function deactivate(string $reason = null): bool
    {
        return $this->update([
            'is_active' => false,
            'access_notes' => $reason ? "Deactivated: {$reason}" : 'Manually deactivated',
        ]);
    }

    /**
     * Get share URL
     */
    public function getShareUrlAttribute(): string
    {
        return route('documents.shared', $this->share_token);
    }

    /**
     * Get formatted expiration
     */
    public function getFormattedExpirationAttribute(): string
    {
        if ($this->expires_at->isToday()) {
            return 'Bugün saat ' . $this->expires_at->format('H:i');
        } elseif ($this->expires_at->isTomorrow()) {
            return 'Sabah saat ' . $this->expires_at->format('H:i');
        } elseif ($this->expires_at->diffInDays() <= 7) {
            return $this->expires_at->diffForHumans();
        } else {
            return $this->expires_at->format('d.m.Y H:i');
        }
    }

    /**
     * Get remaining downloads
     */
    public function getRemainingDownloadsAttribute(): ?int
    {
        if (!$this->max_downloads) {
            return null;
        }

        return max(0, $this->max_downloads - $this->download_count);
    }

    /**
     * Get share analytics
     */
    public function getAnalytics(): array
    {
        return [
            'total_views' => $this->view_count,
            'total_downloads' => $this->download_count,
            'unique_visitors' => $this->downloads()->distinct('ip_address')->count('ip_address'),
            'remaining_downloads' => $this->remaining_downloads,
            'days_until_expiry' => $this->expires_at->diffInDays(now()),
            'is_valid' => $this->isValid(),
            'usage_percentage' => $this->max_downloads ? 
                round(($this->download_count / $this->max_downloads) * 100, 2) : null,
        ];
    }

    /**
     * Create share link with default settings
     */
    public static function createShareLink(
        Document $document, 
        User $user, 
        array $options = []
    ): self {
        $defaultExpiration = now()->addDays(7); // PRD-2: 7-30 gün arası
        
        return self::create([
            'document_id' => $document->id,
            'shared_by' => $user->id,
            'share_token' => self::generateShareToken(),
            'share_name' => $options['name'] ?? "Share of {$document->title}",
            'expires_at' => $options['expires_at'] ?? $defaultExpiration,
            'max_downloads' => $options['max_downloads'] ?? null,
            'requires_password' => $options['requires_password'] ?? false,
            'password_hash' => isset($options['password']) ? Hash::make($options['password']) : null,
            'allowed_ips' => $options['allowed_ips'] ?? null,
            'can_download' => $options['can_download'] ?? true,
            'can_view_online' => $options['can_view_online'] ?? true,
            'can_share' => $options['can_share'] ?? false,
        ]);
    }

    /**
     * Cleanup expired shares
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<=', now())
                  ->where('is_active', true)
                  ->update(['is_active' => false]);
    }
}