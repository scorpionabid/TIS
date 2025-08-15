<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class LinkShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'url',
        'link_type',
        'shared_by',
        'institution_id',
        'share_scope',
        'target_institutions',
        'target_roles',
        'target_departments',
        'requires_login',
        'expires_at',
        'max_clicks',
        'click_count',
        'access_start_time',
        'access_end_time',
        'access_days_of_week',
        'status',
        'thumbnail_url',
        'metadata',
        'is_featured',
    ];

    protected $casts = [
        'target_institutions' => 'array',
        'target_roles' => 'array',
        'target_departments' => 'array',
        'requires_login' => 'boolean',
        'expires_at' => 'datetime',
        'max_clicks' => 'integer',
        'click_count' => 'integer',
        'access_start_time' => 'datetime:H:i',
        'access_end_time' => 'datetime:H:i',
        'access_days_of_week' => 'array',
        'metadata' => 'array',
        'is_featured' => 'boolean',
    ];

    /**
     * User who shared the link
     */
    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by');
    }

    /**
     * Institution relationship
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Access logs relationship
     */
    public function accessLogs(): HasMany
    {
        return $this->hasMany(LinkAccessLog::class, 'link_share_id');
    }

    /**
     * Scope: Active links
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->where(function($q) {
                        $q->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                    });
    }

    /**
     * Scope: Filter by scope
     */
    public function scopeByScope(Builder $query, string $scope): Builder
    {
        return $query->where('share_scope', $scope);
    }

    /**
     * Scope: Featured links
     */
    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope: For institution hierarchy
     */
    public function scopeForInstitution(Builder $query, int $institutionId): Builder
    {
        return $query->where(function($q) use ($institutionId) {
            $q->where('institution_id', $institutionId)
              ->orWhere('share_scope', 'public')
              ->orWhereJsonContains('target_institutions', $institutionId);
        });
    }

    /**
     * Check if user can access this link
     */
    public function canBeAccessedBy(User $user): bool
    {
        // Check if link is active
        if (!$this->isActive()) {
            return false;
        }

        // Check access time restrictions
        if (!$this->isAccessTimeValid()) {
            return false;
        }

        // Public links can be accessed by anyone
        if ($this->share_scope === 'public') {
            return true;
        }

        // Check if login is required
        if ($this->requires_login && !$user) {
            return false;
        }

        // SuperAdmin can access everything
        if ($user && $user->hasRole('superadmin')) {
            return true;
        }

        // Creator can always access
        if ($user && $this->shared_by === $user->id) {
            return true;
        }

        // Check role-based access
        if ($user && $this->target_roles) {
            $userRole = $user->roles->first();
            if ($userRole && in_array($userRole->name, $this->target_roles)) {
                return true;
            }
        }

        // Check institution-based access
        if ($user && $this->target_institutions) {
            if (in_array($user->institution_id, $this->target_institutions)) {
                return true;
            }
        }

        // Check scope-based access
        if ($user) {
            switch ($this->share_scope) {
                case 'institutional':
                    return $this->institution_id === $user->institution_id;
                case 'sectoral':
                    return $this->isSameSector($user);
                case 'regional':
                    return $this->isSameRegion($user);
            }
        }

        return false;
    }

    /**
     * Check if link is active
     */
    public function isActive(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->expires_at && $this->expires_at < now()) {
            return false;
        }

        if ($this->max_clicks && $this->click_count >= $this->max_clicks) {
            return false;
        }

        return true;
    }

    /**
     * Check if current time is within access time restrictions
     */
    public function isAccessTimeValid(): bool
    {
        // No time restrictions
        if (!$this->access_start_time && !$this->access_end_time && !$this->access_days_of_week) {
            return true;
        }

        $now = now();
        
        // Check day of week restrictions
        if ($this->access_days_of_week) {
            $currentDayOfWeek = $now->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.
            if (!in_array($currentDayOfWeek, $this->access_days_of_week)) {
                return false;
            }
        }

        // Check time restrictions
        if ($this->access_start_time && $this->access_end_time) {
            $currentTime = $now->format('H:i');
            $startTime = $this->access_start_time;
            $endTime = $this->access_end_time;
            
            if ($currentTime < $startTime || $currentTime > $endTime) {
                return false;
            }
        }

        return true;
    }

    /**
     * Record link access
     */
    public function recordAccess(User $user = null, string $ipAddress = null, string $userAgent = null): void
    {
        // Increment click count
        $this->increment('click_count');

        // Log the access
        $this->accessLogs()->create([
            'user_id' => $user ? $user->id : null,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'referrer' => request()->header('referer'),
        ]);

        // Check if link should expire due to max clicks
        if ($this->max_clicks && $this->click_count >= $this->max_clicks) {
            $this->update(['status' => 'expired']);
        }
    }

    /**
     * Check if user is in same sector
     */
    private function isSameSector(User $user): bool
    {
        if (!$user->institution || !$this->institution) {
            return false;
        }

        // Get sector for both institutions
        $userSector = $user->institution->type === 'sektor' ? 
                     $user->institution : 
                     $user->institution->parent;
        
        $linkSector = $this->institution->type === 'sektor' ? 
                     $this->institution : 
                     $this->institution->parent;

        return $userSector && $linkSector && $userSector->id === $linkSector->id;
    }

    /**
     * Check if user is in same region
     */
    private function isSameRegion(User $user): bool
    {
        if (!$user->institution || !$this->institution) {
            return false;
        }

        return $user->institution->region_code === $this->institution->region_code;
    }

    /**
     * Get link statistics
     */
    public function getStatistics(): array
    {
        $totalClicks = $this->click_count;
        $uniqueUsers = $this->accessLogs()->whereNotNull('user_id')->distinct('user_id')->count();
        $anonymousClicks = $this->accessLogs()->whereNull('user_id')->count();
        $recentAccess = $this->accessLogs()->where('created_at', '>=', now()->subDays(7))->count();

        return [
            'total_clicks' => $totalClicks,
            'unique_users' => $uniqueUsers,
            'anonymous_clicks' => $anonymousClicks,
            'recent_access_7_days' => $recentAccess,
            'avg_daily_clicks' => $this->created_at ? round($totalClicks / max(1, $this->created_at->diffInDays(now())), 2) : 0,
            'is_trending' => $recentAccess > ($totalClicks * 0.3), // More than 30% of clicks in last 7 days
        ];
    }
}