<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class UserStorageQuota extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'monthly_quota',
        'current_usage',
        'file_count',
        'quota_period_start',
        'quota_period_end',
        'last_reset_at',
        'total_uploaded',
        'total_downloaded',
        'total_files_uploaded',
        'total_files_deleted',
        'quota_exceeded',
        'quota_exceeded_at',
        'quota_warning_sent',
        'usage_history',
    ];

    protected $casts = [
        'quota_period_start' => 'date',
        'quota_period_end' => 'date',
        'last_reset_at' => 'datetime',
        'quota_exceeded' => 'boolean',
        'quota_exceeded_at' => 'datetime',
        'quota_warning_sent' => 'boolean',
        'usage_history' => 'array',
    ];

    // PRD-2: İstifadəçi başına aylıq 100MB limit
    const DEFAULT_MONTHLY_QUOTA = 104857600; // 100MB in bytes
    const WARNING_THRESHOLD = 0.8; // 80% warning
    const CRITICAL_THRESHOLD = 0.95; // 95% critical

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: Users exceeding quota
     */
    public function scopeExceeded(Builder $query): Builder
    {
        return $query->where('quota_exceeded', true);
    }

    /**
     * Scope: Users near quota limit
     */
    public function scopeNearLimit(Builder $query, float $threshold = self::WARNING_THRESHOLD): Builder
    {
        return $query->whereRaw('current_usage >= (monthly_quota * ?)', [$threshold]);
    }

    /**
     * Scope: Current period
     */
    public function scopeCurrentPeriod(Builder $query): Builder
    {
        return $query->where('quota_period_start', '<=', now())
                    ->where('quota_period_end', '>=', now());
    }

    /**
     * Get usage percentage
     */
    public function getUsagePercentageAttribute(): float
    {
        if ($this->monthly_quota == 0) {
            return 0;
        }

        return round(($this->current_usage / $this->monthly_quota) * 100, 2);
    }

    /**
     * Get remaining quota in bytes
     */
    public function getRemainingQuotaAttribute(): int
    {
        return max(0, $this->monthly_quota - $this->current_usage);
    }

    /**
     * Get formatted current usage
     */
    public function getFormattedCurrentUsageAttribute(): string
    {
        return $this->formatBytes($this->current_usage);
    }

    /**
     * Get formatted monthly quota
     */
    public function getFormattedMonthlyQuotaAttribute(): string
    {
        return $this->formatBytes($this->monthly_quota);
    }

    /**
     * Get formatted remaining quota
     */
    public function getFormattedRemainingQuotaAttribute(): string
    {
        return $this->formatBytes($this->remaining_quota);
    }

    /**
     * Check if user can upload file
     */
    public function canUpload(int $fileSize): bool
    {
        return !$this->quota_exceeded && 
               ($this->current_usage + $fileSize) <= $this->monthly_quota;
    }

    /**
     * Check if quota is exceeded
     */
    public function isQuotaExceeded(): bool
    {
        return $this->current_usage >= $this->monthly_quota;
    }

    /**
     * Check if nearing quota limit
     */
    public function isNearingLimit(float $threshold = self::WARNING_THRESHOLD): bool
    {
        return $this->usage_percentage >= ($threshold * 100);
    }

    /**
     * Check if in critical zone
     */
    public function isCritical(float $threshold = self::CRITICAL_THRESHOLD): bool
    {
        return $this->usage_percentage >= ($threshold * 100);
    }

    /**
     * Add file upload to quota
     */
    public function addUpload(int $fileSize): bool
    {
        if (!$this->canUpload($fileSize)) {
            return false;
        }

        $this->increment('current_usage', $fileSize);
        $this->increment('total_uploaded', $fileSize);
        $this->increment('file_count');
        $this->increment('total_files_uploaded');

        // Check if quota exceeded after upload
        if ($this->fresh()->isQuotaExceeded()) {
            $this->markQuotaExceeded();
        }

        return true;
    }

    /**
     * Remove file from quota (when deleted)
     */
    public function removeFile(int $fileSize): void
    {
        $this->decrement('current_usage', min($fileSize, $this->current_usage));
        $this->decrement('file_count', min(1, $this->file_count));
        $this->increment('total_files_deleted');

        // If usage drops below quota, clear exceeded flag
        if ($this->quota_exceeded && $this->current_usage < $this->monthly_quota) {
            $this->update([
                'quota_exceeded' => false,
                'quota_exceeded_at' => null,
            ]);
        }
    }

    /**
     * Mark quota as exceeded
     */
    public function markQuotaExceeded(): void
    {
        if (!$this->quota_exceeded) {
            $this->update([
                'quota_exceeded' => true,
                'quota_exceeded_at' => now(),
            ]);
        }
    }

    /**
     * Reset monthly quota
     */
    public function resetMonthlyQuota(): void
    {
        // Save current month's usage to history
        $this->saveUsageHistory();

        $this->update([
            'current_usage' => 0,
            'file_count' => 0,
            'quota_period_start' => now()->startOfMonth(),
            'quota_period_end' => now()->endOfMonth(),
            'last_reset_at' => now(),
            'quota_exceeded' => false,
            'quota_exceeded_at' => null,
            'quota_warning_sent' => false,
        ]);
    }

    /**
     * Save usage history
     */
    protected function saveUsageHistory(): void
    {
        $history = $this->usage_history ?? [];
        $currentMonth = now()->format('Y-m');

        $history[$currentMonth] = [
            'usage' => $this->current_usage,
            'files' => $this->file_count,
            'quota' => $this->monthly_quota,
            'percentage' => $this->usage_percentage,
            'exceeded' => $this->quota_exceeded,
            'period_start' => $this->quota_period_start->toDateString(),
            'period_end' => $this->quota_period_end->toDateString(),
        ];

        // Keep only last 12 months
        if (count($history) > 12) {
            $history = array_slice($history, -12, 12, true);
        }

        $this->update(['usage_history' => $history]);
    }

    /**
     * Get usage trend
     */
    public function getUsageTrend(int $months = 6): array
    {
        $history = $this->usage_history ?? [];
        $trend = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $month = now()->subMonths($i)->format('Y-m');
            $trend[$month] = $history[$month] ?? [
                'usage' => 0,
                'files' => 0,
                'quota' => $this->monthly_quota,
                'percentage' => 0,
                'exceeded' => false,
            ];
        }

        return $trend;
    }

    /**
     * Get quota statistics
     */
    public function getStatistics(): array
    {
        return [
            'current_usage' => $this->current_usage,
            'monthly_quota' => $this->monthly_quota,
            'usage_percentage' => $this->usage_percentage,
            'remaining_quota' => $this->remaining_quota,
            'file_count' => $this->file_count,
            'quota_exceeded' => $this->quota_exceeded,
            'days_in_period' => $this->quota_period_start->diffInDays($this->quota_period_end) + 1,
            'days_remaining' => now()->diffInDays($this->quota_period_end),
            'daily_average_usage' => $this->quota_period_start->diffInDays(now()) > 0 ? 
                round($this->current_usage / $this->quota_period_start->diffInDays(now()), 2) : 0,
            'projected_monthly_usage' => $this->quota_period_start->diffInDays(now()) > 0 ? 
                round($this->current_usage / $this->quota_period_start->diffInDays(now()) * 30, 2) : 0,
            'is_warning' => $this->isNearingLimit(),
            'is_critical' => $this->isCritical(),
            'total_uploaded_ever' => $this->total_uploaded,
            'total_files_uploaded_ever' => $this->total_files_uploaded,
        ];
    }

    /**
     * Format bytes to human readable
     */
    protected function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    /**
     * Create or get quota for user
     */
    public static function getOrCreateForUser(User $user): self
    {
        return self::firstOrCreate(
            ['user_id' => $user->id],
            [
                'monthly_quota' => self::DEFAULT_MONTHLY_QUOTA,
                'current_usage' => 0,
                'file_count' => 0,
                'quota_period_start' => now()->startOfMonth(),
                'quota_period_end' => now()->endOfMonth(),
                'total_uploaded' => 0,
                'total_downloaded' => 0,
                'total_files_uploaded' => 0,
                'total_files_deleted' => 0,
                'quota_exceeded' => false,
                'quota_warning_sent' => false,
                'usage_history' => [],
            ]
        );
    }

    /**
     * Reset all quotas for new month
     */
    public static function resetAllQuotas(): int
    {
        $quotas = self::whereDate('quota_period_end', '<', now())->get();
        
        foreach ($quotas as $quota) {
            $quota->resetMonthlyQuota();
        }

        return $quotas->count();
    }

    /**
     * Get users needing quota warning
     */
    public static function getUsersNeedingWarning(): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('quota_warning_sent', false)
                  ->whereRaw('current_usage >= (monthly_quota * ?)', [self::WARNING_THRESHOLD])
                  ->with('user')
                  ->get();
    }

    /**
     * Get system quota overview
     */
    public static function getSystemOverview(): array
    {
        $totalUsers = self::count();
        $exceedingQuota = self::where('quota_exceeded', true)->count();
        $nearingLimit = self::whereRaw('current_usage >= (monthly_quota * ?)', [self::WARNING_THRESHOLD])->count();

        return [
            'total_users' => $totalUsers,
            'users_exceeding_quota' => $exceedingQuota,
            'users_nearing_limit' => $nearingLimit,
            'quota_utilization' => $totalUsers > 0 ? round(($exceedingQuota / $totalUsers) * 100, 2) : 0,
            'total_storage_used' => self::sum('current_usage'),
            'total_storage_allocated' => self::sum('monthly_quota'),
            'average_usage_percentage' => self::selectRaw('AVG((current_usage / monthly_quota) * 100) as avg')->first()->avg ?? 0,
            'top_users_by_usage' => self::orderByDesc('current_usage')->limit(10)->with('user')->get(),
        ];
    }
}