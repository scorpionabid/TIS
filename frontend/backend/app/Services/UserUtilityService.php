<?php

namespace App\Services;

use App\Models\User;
use App\Models\Institution;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use Exception;

class UserUtilityService
{
    /**
     * Reset user password
     */
    public function resetPassword(User $user, string $newPassword): User
    {
        $oldData = $user->toArray();

        $user->update([
            'password' => Hash::make($newPassword),
            'password_changed_at' => now(),
            'failed_login_attempts' => 0,
            'locked_until' => null
        ]);

        // Revoke all user tokens to force re-login
        $user->tokens()->delete();

        // Log activity
        $this->logActivity('password_reset', "Reset password for user: {$user->username}", [
            'entity_type' => 'User',
            'entity_id' => $user->id
        ]);

        // Log security event
        SecurityEvent::logEvent([
            'event_type' => 'password_reset_by_admin',
            'severity' => 'warning',
            'user_id' => Auth::id(),
            'target_user_id' => $user->id,
            'description' => 'Password reset by administrator',
            'event_data' => [
                'target_username' => $user->username
            ]
        ]);

        return $user;
    }
    
    /**
     * Toggle user active status
     */
    public function toggleStatus(User $user): User
    {
        if ($user->id === Auth::id()) {
            throw new Exception('Cannot modify your own account status');
        }

        $oldStatus = $user->is_active;
        $newStatus = !$user->is_active;
        
        $user->update([
            'is_active' => $newStatus,
            'locked_until' => $newStatus ? null : now()->addYears(10)
        ]);

        // Revoke tokens if deactivating
        if (!$newStatus) {
            $user->tokens()->delete();
        }

        // Log activity
        $this->logActivity('user_status_toggle', 
            $newStatus ? "Activated user: {$user->username}" : "Deactivated user: {$user->username}", [
            'entity_type' => 'User',
            'entity_id' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus
        ]);

        // Log security event
        SecurityEvent::logEvent([
            'event_type' => $newStatus ? 'user_activated' : 'user_deactivated',
            'severity' => 'info',
            'user_id' => Auth::id(),
            'target_user_id' => $user->id,
            'description' => $newStatus ? 'User account activated' : 'User account deactivated',
            'event_data' => [
                'target_username' => $user->username,
                'old_status' => $oldStatus,
                'new_status' => $newStatus
            ]
        ]);

        return $user;
    }
    
    /**
     * Export users data
     */
    public function exportUsers(array $filters = [], string $format = 'json', bool $includeProfiles = false): array
    {
        $query = User::with(['role', 'institution']);
        
        if ($includeProfiles) {
            $query->with('profile');
        }

        // Apply filters if provided
        $this->applyExportFilters($query, $filters);

        $users = $query->get();

        $exportData = $users->map(function ($user) use ($includeProfiles) {
            $data = [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role?->name,
                'role_display_name' => $user->role?->display_name,
                'institution' => $user->institution?->name,
                'institution_type' => $user->institution?->type,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at?->toDateTimeString(),
                'last_login_at' => $user->last_login_at?->toDateTimeString()
            ];

            if ($includeProfiles && $user->profile) {
                $data = array_merge($data, [
                    'first_name' => $user->profile->first_name,
                    'last_name' => $user->profile->last_name,
                    'full_name' => $user->profile->full_name,
                    'contact_phone' => $user->profile->contact_phone,
                    'birth_date' => $user->profile->birth_date,
                    'gender' => $user->profile->gender
                ]);
            }

            return $data;
        });

        // Log export activity
        $this->logActivity('users_export', "Exported {$users->count()} users in {$format} format", [
            'entity_type' => 'User',
            'event_data' => [
                'format' => $format,
                'count' => $users->count(),
                'include_profiles' => $includeProfiles,
                'filters' => $filters
            ]
        ]);

        return [
            'format' => $format,
            'count' => $users->count(),
            'data' => $exportData,
            'exported_at' => now()->toISOString(),
            'exported_by' => Auth::user()?->username,
            'filters_applied' => $filters
        ];
    }
    
    /**
     * Get comprehensive user statistics
     */
    public function getStatistics(): array
    {
        $stats = [
            'overview' => $this->getOverviewStats(),
            'by_role' => $this->getStatsByRole(),
            'by_institution' => $this->getStatsByInstitution(),
            'activity' => $this->getActivityStats(),
            'security' => $this->getSecurityStats(),
            'trends' => $this->getTrendStats()
        ];

        // Log statistics access
        $this->logActivity('statistics_view', 'Accessed user statistics', [
            'event_data' => [
                'sections' => array_keys($stats),
                'total_users_counted' => $stats['overview']['total_users']
            ]
        ]);

        return $stats;
    }
    
    /**
     * Get available institutions for user assignment
     */
    public function getAvailableInstitutions(): Collection
    {
        return Institution::select(['id', 'name', 'type', 'level'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
    
    /**
     * Get user activity report
     */
    public function getUserActivityReport(User $user, int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $activities = ActivityLog::where('user_id', $user->id)
            ->where('created_at', '>=', $startDate)
            ->orderBy('created_at', 'desc')
            ->get();
            
        $securityEvents = SecurityEvent::where('target_user_id', $user->id)
            ->where('created_at', '>=', $startDate)
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email
            ],
            'period' => [
                'days' => $days,
                'from' => $startDate->toDateString(),
                'to' => now()->toDateString()
            ],
            'activities' => [
                'count' => $activities->count(),
                'data' => $activities->map(function ($activity) {
                    return [
                        'type' => $activity->activity_type,
                        'description' => $activity->description,
                        'created_at' => $activity->created_at->toDateTimeString()
                    ];
                })
            ],
            'security_events' => [
                'count' => $securityEvents->count(),
                'data' => $securityEvents->map(function ($event) {
                    return [
                        'type' => $event->event_type,
                        'severity' => $event->severity,
                        'description' => $event->description,
                        'created_at' => $event->created_at->toDateTimeString()
                    ];
                })
            ]
        ];
    }
    
    /**
     * Generate user performance metrics
     */
    public function getUserPerformanceMetrics(User $user): array
    {
        return [
            'login_frequency' => $this->getLoginFrequency($user),
            'activity_score' => $this->getActivityScore($user),
            'security_score' => $this->getSecurityScore($user),
            'engagement_metrics' => $this->getEngagementMetrics($user),
            'recommendations' => $this->getPerformanceRecommendations($user)
        ];
    }
    
    /**
     * Apply export filters to query
     */
    protected function applyExportFilters($query, array $filters): void
    {
        if (!empty($filters['role'])) {
            $query->whereHas('role', function ($q) use ($filters) {
                $q->where('name', $filters['role']);
            });
        }

        if (!empty($filters['institution_id'])) {
            $query->where('institution_id', $filters['institution_id']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        if (!empty($filters['created_from'])) {
            $query->whereDate('created_at', '>=', $filters['created_from']);
        }

        if (!empty($filters['created_to'])) {
            $query->whereDate('created_at', '<=', $filters['created_to']);
        }
    }
    
    /**
     * Get overview statistics
     */
    protected function getOverviewStats(): array
    {
        return [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'inactive_users' => User::where('is_active', false)->count(),
            'verified_emails' => User::whereNotNull('email_verified_at')->count(),
            'unverified_emails' => User::whereNull('email_verified_at')->count(),
            'locked_users' => User::whereNotNull('locked_until')
                ->where('locked_until', '>', now())
                ->count(),
            'users_with_failed_attempts' => User::where('failed_login_attempts', '>', 0)->count(),
            'never_logged_in' => User::whereNull('last_login_at')->count()
        ];
    }
    
    /**
     * Get statistics by role
     */
    protected function getStatsByRole(): array
    {
        return User::selectRaw('
                roles.name as role_name,
                roles.display_name as role_display_name,
                COUNT(*) as total_count,
                SUM(CASE WHEN users.is_active = true THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN users.is_active = false THEN 1 ELSE 0 END) as inactive_count,
                SUM(CASE WHEN users.last_login_at >= ? THEN 1 ELSE 0 END) as recently_active_count
            ', [now()->subDays(7)])
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->groupBy('roles.id', 'roles.name', 'roles.display_name')
            ->orderBy('roles.level')
            ->get()
            ->toArray();
    }
    
    /**
     * Get statistics by institution
     */
    protected function getStatsByInstitution(): array
    {
        return User::selectRaw('
                institutions.name as institution_name,
                institutions.type as institution_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN users.is_active = true THEN 1 ELSE 0 END) as active_count
            ')
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->groupBy('institutions.id', 'institutions.name', 'institutions.type')
            ->orderBy('institutions.name')
            ->get()
            ->toArray();
    }
    
    /**
     * Get activity statistics
     */
    protected function getActivityStats(): array
    {
        return [
            'created_this_week' => User::whereBetween('created_at', [
                now()->startOfWeek(),
                now()->endOfWeek()
            ])->count(),
            'created_this_month' => User::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
            'recently_logged_in' => User::where('last_login_at', '>=', now()->subDays(7))->count(),
            'logged_in_today' => User::whereDate('last_login_at', today())->count()
        ];
    }
    
    /**
     * Get security statistics
     */
    protected function getSecurityStats(): array
    {
        return [
            'password_resets_this_month' => SecurityEvent::where('event_type', 'password_reset_by_admin')
                ->whereMonth('created_at', now()->month)
                ->count(),
            'failed_login_attempts' => User::sum('failed_login_attempts'),
            'accounts_locked' => User::whereNotNull('locked_until')
                ->where('locked_until', '>', now())
                ->count(),
            'security_incidents' => SecurityEvent::where('severity', 'high')
                ->whereMonth('created_at', now()->month)
                ->count()
        ];
    }
    
    /**
     * Get trend statistics
     */
    protected function getTrendStats(): array
    {
        $lastMonth = User::whereMonth('created_at', now()->subMonth()->month)->count();
        $thisMonth = User::whereMonth('created_at', now()->month)->count();
        
        return [
            'user_growth' => [
                'last_month' => $lastMonth,
                'this_month' => $thisMonth,
                'growth_rate' => $lastMonth > 0 ? round((($thisMonth - $lastMonth) / $lastMonth) * 100, 2) : 0
            ],
            'activity_trend' => [
                'last_week' => User::where('last_login_at', '>=', now()->subWeeks(2))
                    ->where('last_login_at', '<', now()->subWeek())
                    ->count(),
                'this_week' => User::where('last_login_at', '>=', now()->subWeek())->count()
            ]
        ];
    }
    
    /**
     * Get login frequency for user
     */
    protected function getLoginFrequency(User $user): array
    {
        // This would require login history tracking
        return [
            'last_login' => $user->last_login_at?->toDateTimeString(),
            'average_per_week' => 0, // Would calculate from login history
            'consistency_score' => 0 // Would calculate based on regular login pattern
        ];
    }
    
    /**
     * Get activity score for user
     */
    protected function getActivityScore(User $user): int
    {
        $score = 0;
        
        // Recent login bonus
        if ($user->last_login_at && $user->last_login_at->diffInDays() <= 7) {
            $score += 30;
        }
        
        // Account age bonus
        if ($user->created_at->diffInMonths() >= 3) {
            $score += 20;
        }
        
        // Active status bonus
        if ($user->is_active) {
            $score += 50;
        }
        
        return min($score, 100);
    }
    
    /**
     * Get security score for user
     */
    protected function getSecurityScore(User $user): int
    {
        $score = 100;
        
        // Deduct for failed login attempts
        $score -= min($user->failed_login_attempts * 5, 30);
        
        // Deduct if locked
        if ($user->locked_until && $user->locked_until > now()) {
            $score -= 50;
        }
        
        // Deduct for unverified email
        if (!$user->email_verified_at) {
            $score -= 20;
        }
        
        return max($score, 0);
    }
    
    /**
     * Get engagement metrics for user
     */
    protected function getEngagementMetrics(User $user): array
    {
        return [
            'profile_completeness' => $user->profile ? 100 : 20,
            'last_activity' => $user->last_login_at?->diffForHumans(),
            'account_age' => $user->created_at->diffForHumans()
        ];
    }
    
    /**
     * Get performance recommendations for user
     */
    protected function getPerformanceRecommendations(User $user): array
    {
        $recommendations = [];
        
        if (!$user->profile) {
            $recommendations[] = 'Complete user profile for better experience';
        }
        
        if (!$user->email_verified_at) {
            $recommendations[] = 'Verify email address for security';
        }
        
        if (!$user->last_login_at || $user->last_login_at->diffInDays() > 30) {
            $recommendations[] = 'User appears inactive - consider engagement strategies';
        }
        
        if ($user->failed_login_attempts > 0) {
            $recommendations[] = 'Review account security - failed login attempts detected';
        }
        
        return $recommendations;
    }
    
    /**
     * Log activity
     */
    protected function logActivity(string $activityType, string $description, array $additionalData = []): void
    {
        $data = array_merge([
            'user_id' => Auth::id(),
            'activity_type' => $activityType,
            'description' => $description,
            'institution_id' => Auth::user()?->institution_id
        ], $additionalData);
        
        ActivityLog::logActivity($data);
    }
}