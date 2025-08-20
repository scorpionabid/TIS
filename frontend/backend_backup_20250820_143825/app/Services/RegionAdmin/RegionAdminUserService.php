<?php

namespace App\Services\RegionAdmin;

use App\Models\User;
use App\Models\Institution;
use Carbon\Carbon;
use Illuminate\Http\Request;

class RegionAdminUserService
{
    /**
     * Get all institution IDs for a region admin
     */
    public function getRegionInstitutionIds($userRegionId)
    {
        return Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->pluck('id');
    }

    /**
     * Get user statistics by role for region
     */
    public function getUsersByRole($institutionIds)
    {
        return User::whereIn('institution_id', $institutionIds)
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('model_has_roles.model_type', User::class)
            ->groupBy('roles.name', 'roles.display_name')
            ->selectRaw('roles.name, roles.display_name, COUNT(*) as count')
            ->get()
            ->keyBy('name');
    }

    /**
     * Get user statistics by institution level
     */
    public function getUsersByLevel($institutionIds)
    {
        return User::whereIn('institution_id', $institutionIds)
            ->join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->groupBy('institutions.level')
            ->selectRaw('institutions.level, COUNT(*) as count')
            ->get()
            ->mapWithKeys(function($item) {
                $levelNames = [
                    2 => 'Regional',
                    3 => 'Sector', 
                    4 => 'School'
                ];
                return [$levelNames[$item->level] ?? 'Unknown' => $item->count];
            });
    }

    /**
     * Get recent user registrations
     */
    public function getRecentUsers($institutionIds, $limit = 10)
    {
        return User::whereIn('institution_id', $institutionIds)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->with(['institution', 'roles'])
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->display_name ?? 'No Role',
                    'institution' => $user->institution?->name ?? 'No Institution',
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'last_login' => $user->last_login_at ? Carbon::parse($user->last_login_at)->diffForHumans() : 'Never'
                ];
            });
    }

    /**
     * Get comprehensive user statistics
     */
    public function getComprehensiveStats($institutionIds)
    {
        return [
            'total_users' => User::whereIn('institution_id', $institutionIds)->count(),
            'active_users' => User::whereIn('institution_id', $institutionIds)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count(),
            'new_users_this_month' => User::whereIn('institution_id', $institutionIds)
                ->where('created_at', '>=', Carbon::now()->startOfMonth())
                ->count()
        ];
    }

    /**
     * Get paginated and filtered users list
     */
    public function getUsersList(Request $request, $institutionIds)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');
        $roleFilter = $request->get('role');
        $institutionFilter = $request->get('institution');
        
        $query = User::whereIn('institution_id', $institutionIds)
            ->with(['institution', 'roles']);
        
        // Apply search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }
        
        // Apply role filter
        if ($roleFilter) {
            $query->whereHas('roles', function($q) use ($roleFilter) {
                $q->where('name', $roleFilter);
            });
        }
        
        // Apply institution filter
        if ($institutionFilter) {
            $query->where('institution_id', $institutionFilter);
        }
        
        $users = $query->paginate($perPage);
        
        $usersData = $users->getCollection()->map(function($user) {
            return [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->roles->first()?->display_name ?? 'No Role',
                'role_name' => $user->roles->first()?->name ?? null,
                'institution' => $user->institution?->name ?? 'No Institution',
                'institution_id' => $user->institution_id,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at ? Carbon::parse($user->last_login_at)->diffForHumans() : 'Never',
                'created_at' => $user->created_at->format('Y-m-d H:i:s')
            ];
        });
        
        return [
            'users' => $usersData,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem()
            ]
        ];
    }

    /**
     * Get user activity analytics over time
     */
    public function getUserActivityAnalytics($institutionIds)
    {
        // Daily activity for last 30 days
        $dailyActivity = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            
            $activeCount = User::whereIn('institution_id', $institutionIds)
                ->whereBetween('last_login_at', [$dayStart, $dayEnd])
                ->count();
                
            $dailyActivity[] = [
                'date' => $date->format('Y-m-d'),
                'active_users' => $activeCount
            ];
        }
        
        return $dailyActivity;
    }

    /**
     * Get users breakdown by institution
     */
    public function getUsersByInstitution($institutionIds)
    {
        return Institution::whereIn('id', $institutionIds)
            ->withCount('users')
            ->get()
            ->map(function($institution) {
                $activeUsers = User::where('institution_id', $institution->id)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
                    
                return [
                    'institution_name' => $institution->name,
                    'total_users' => $institution->users_count,
                    'active_users' => $activeUsers,
                    'activity_rate' => $institution->users_count > 0 ? 
                        round(($activeUsers / $institution->users_count) * 100, 1) : 0
                ];
            });
    }

    /**
     * Get user activity summary insights
     */
    public function getActivitySummary($institutionIds, $dailyActivity)
    {
        return [
            'total_logins_this_month' => User::whereIn('institution_id', $institutionIds)
                ->where('last_login_at', '>=', Carbon::now()->startOfMonth())
                ->count(),
            'new_users_this_week' => User::whereIn('institution_id', $institutionIds)
                ->where('created_at', '>=', Carbon::now()->startOfWeek())
                ->count(),
            'most_active_day' => collect($dailyActivity)->sortByDesc('active_users')->first()
        ];
    }

    /**
     * Calculate user engagement metrics
     */
    public function calculateEngagementMetrics($institutionIds)
    {
        $totalUsers = User::whereIn('institution_id', $institutionIds)->count();
        $activeUsers = User::whereIn('institution_id', $institutionIds)
            ->where('last_login_at', '>=', Carbon::now()->subDays(30))
            ->count();
        $regularUsers = User::whereIn('institution_id', $institutionIds)
            ->where('last_login_at', '>=', Carbon::now()->subDays(7))
            ->count();
            
        return [
            'engagement_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0,
            'weekly_engagement' => $totalUsers > 0 ? round(($regularUsers / $totalUsers) * 100, 1) : 0,
            'retention_score' => $activeUsers > 0 ? round(($regularUsers / $activeUsers) * 100, 1) : 0
        ];
    }
}