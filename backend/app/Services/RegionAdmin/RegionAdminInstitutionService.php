<?php

namespace App\Services\RegionAdmin;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use Carbon\Carbon;

class RegionAdminInstitutionService
{
    /**
     * Get detailed sector statistics for a region
     */
    public function getSectorStatistics($userRegionId)
    {
        return Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with(['children' => function($query) {
                $query->where('level', 4); // Schools
            }])
            ->get()
            ->map(function($sector) {
                $schools = $sector->children;
                $schoolIds = $schools->pluck('id');
                
                // Get users in sector schools
                $totalUsers = User::whereIn('institution_id', $schoolIds)->count();
                $activeUsers = User::whereIn('institution_id', $schoolIds)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
                
                // Get survey activity
                $surveys = Survey::whereHas('targeting', function($query) use ($schoolIds) {
                    $query->whereIn('institution_id', $schoolIds);
                })->count();
                
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'schools_count' => $schools->count(),
                    'total_users' => $totalUsers,
                    'active_users' => $activeUsers,
                    'surveys_count' => $surveys,
                    'activity_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0,
                    'schools' => $this->getSchoolStatistics($schools)
                ];
            });
    }

    /**
     * Get statistics for schools within a sector
     */
    private function getSchoolStatistics($schools)
    {
        return $schools->map(function($school) {
            $userCount = User::where('institution_id', $school->id)->count();
            $activeCount = User::where('institution_id', $school->id)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count();
            
            return [
                'id' => $school->id,
                'name' => $school->name,
                'user_count' => $userCount,
                'active_users' => $activeCount,
                'activity_rate' => $userCount > 0 ? round(($activeCount / $userCount) * 100, 1) : 0
            ];
        });
    }

    /**
     * Build complete institution hierarchy for region
     */
    public function buildInstitutionHierarchy($userRegionId)
    {
        $region = Institution::with(['children.children']) // Region -> Sectors -> Schools
            ->find($userRegionId);
            
        if (!$region) {
            return null;
        }
        
        return [
            'region' => [
                'id' => $region->id,
                'name' => $region->name,
                'level' => $region->level,
                'sectors' => $region->children->map(function($sector) {
                    return [
                        'id' => $sector->id,
                        'name' => $sector->name,
                        'level' => $sector->level,
                        'schools_count' => $sector->children->count(),
                        'schools' => $sector->children->map(function($school) {
                            $userCount = User::where('institution_id', $school->id)->count();
                            return [
                                'id' => $school->id,
                                'name' => $school->name,
                                'level' => $school->level,
                                'user_count' => $userCount
                            ];
                        })
                    ];
                })
            ]
        ];
    }

    /**
     * Calculate performance insights for all sectors in region
     */
    public function calculatePerformanceInsights($userRegionId)
    {
        $sectors = Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with('children')
            ->get();
            
        $allSectorData = [];
        
        foreach ($sectors as $sector) {
            $schoolIds = $sector->children->pluck('id');
            
            $totalUsers = User::whereIn('institution_id', $schoolIds)->count();
            $activeUsers = User::whereIn('institution_id', $schoolIds)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count();
            $surveys = Survey::whereHas('targeting', function($query) use ($schoolIds) {
                $query->whereIn('institution_id', $schoolIds);
            })->count();
            
            $activityRate = $totalUsers > 0 ? ($activeUsers / $totalUsers) * 100 : 0;
            
            $sectorData = [
                'id' => $sector->id,
                'name' => $sector->name,
                'schools_count' => $sector->children->count(),
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'activity_rate' => round($activityRate, 1),
                'surveys_count' => $surveys,
                'performance_score' => round(($activityRate + ($surveys > 0 ? 20 : 0)) / 2, 1)
            ];
            
            $allSectorData[] = $sectorData;
        }
        
        // Sort by performance score
        usort($allSectorData, function($a, $b) {
            return $b['performance_score'] <=> $a['performance_score'];
        });
        
        // Get top performer and attention needed
        $topPerformer = $allSectorData[0] ?? null;
        $attentionNeeded = array_filter($allSectorData, function($sector) {
            return $sector['activity_rate'] < 50;
        });
        
        return [
            'sectors_performance' => $allSectorData,
            'top_performer' => $topPerformer,
            'attention_needed' => array_values($attentionNeeded),
            'average_performance' => round(collect($allSectorData)->avg('performance_score'), 1),
            'total_institutions' => collect($allSectorData)->sum('schools_count') + count($allSectorData)
        ];
    }

    /**
     * Get institution summary statistics
     */
    public function getSummaryStatistics($sectors)
    {
        return [
            'total_sectors' => $sectors->count(),
            'total_schools' => $sectors->sum('schools_count'),
            'total_users' => $sectors->sum('total_users'),
            'total_active_users' => $sectors->sum('active_users')
        ];
    }

    /**
     * Get institution filtering options
     */
    public function getFilteringOptions($userRegionId)
    {
        $sectors = Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->select('id', 'name')
            ->get();
            
        $schools = Institution::whereHas('parent', function($query) use ($userRegionId) {
            $query->where('parent_id', $userRegionId);
        })
        ->where('level', 4)
        ->select('id', 'name', 'parent_id')
        ->with('parent:id,name')
        ->get();
        
        return [
            'sectors' => $sectors,
            'schools' => $schools->groupBy('parent_id')
        ];
    }
}