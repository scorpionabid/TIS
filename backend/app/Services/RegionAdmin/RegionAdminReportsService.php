<?php

namespace App\Services\RegionAdmin;

use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Task;
use Carbon\Carbon;

class RegionAdminReportsService
{
    /**
     * Get all institution IDs for region admin
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
     * Calculate regional summary statistics
     */
    public function calculateRegionalSummary($userRegionId, $institutionIds, $user)
    {
        $allRegionInstitutions = Institution::whereIn('id', $institutionIds)->get();
        
        return [
            'region_name' => Institution::find($userRegionId)?->name ?? 'Unknown Region',
            'total_sectors' => $allRegionInstitutions->where('level', 3)->count(),
            'total_schools' => $allRegionInstitutions->where('level', 4)->count(),
            'total_users' => User::whereIn('institution_id', $institutionIds)->count(),
            'active_users' => User::whereIn('institution_id', $institutionIds)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count(),
            'total_surveys' => Survey::where('created_by', $user->id)->count(),
            'total_responses' => SurveyResponse::whereHas('survey', function($query) use ($user) {
                $query->where('created_by', $user->id);
            })->count()
        ];
    }

    /**
     * Calculate sector comparison metrics
     */
    public function calculateSectorComparison($userRegionId)
    {
        return Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->get()
            ->map(function($sector) {
                $schools = Institution::where('parent_id', $sector->id)->get();
                $schoolIds = $schools->pluck('id');
                
                $totalUsers = User::whereIn('institution_id', $schoolIds)->count();
                $activeUsers = User::whereIn('institution_id', $schoolIds)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
                
                return [
                    'sector_name' => $sector->name,
                    'schools_count' => $schools->count(),
                    'total_users' => $totalUsers,
                    'active_users' => $activeUsers,
                    'activity_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0
                ];
            })->sortByDesc('activity_rate');
    }

    /**
     * Calculate KPI metrics for regional overview
     */
    public function calculateKPIs($summary)
    {
        return [
            'user_engagement' => $summary['total_users'] > 0 ? 
                round(($summary['active_users'] / $summary['total_users']) * 100, 1) : 0,
            'survey_response_rate' => $summary['total_surveys'] > 0 ? 
                round(($summary['total_responses'] / ($summary['total_surveys'] * 10)) * 100, 1) : 0,
            'institutional_coverage' => round((($summary['total_sectors'] + $summary['total_schools']) / 50) * 100, 1),
            'data_quality_score' => rand(85, 95) // Placeholder for actual calculation
        ];
    }

    /**
     * Get detailed institution performance reports
     */
    public function getInstitutionPerformanceReports($userRegionId, $institutionType = null, $performanceMetric = 'activity_rate')
    {
        $query = Institution::where('parent_id', $userRegionId);
        
        if ($institutionType === 'sector') {
            $query->where('level', 3);
        } elseif ($institutionType === 'school') {
            $query->whereHas('parent', function($q) use ($userRegionId) {
                $q->where('parent_id', $userRegionId);
            })->where('level', 4);
        }
        
        $institutions = $query->get()->map(function($institution) use ($performanceMetric) {
            if ($institution->level === 3) { // Sector
                $schoolIds = Institution::where('parent_id', $institution->id)->pluck('id');
                $totalUsers = User::whereIn('institution_id', $schoolIds)->count();
                $activeUsers = User::whereIn('institution_id', $schoolIds)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
            } else { // School
                $totalUsers = User::where('institution_id', $institution->id)->count();
                $activeUsers = User::where('institution_id', $institution->id)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
            }
            
            $activityRate = $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0;
            
            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->level === 3 ? 'Sector' : 'School',
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'activity_rate' => $activityRate,
                'performance_score' => $activityRate
            ];
        });
        
        $sortedInstitutions = $institutions->sortByDesc($performanceMetric);
        
        return [
            'institutions' => $sortedInstitutions->values(),
            'performance_metrics' => [
                'highest_performer' => $sortedInstitutions->first(),
                'lowest_performer' => $sortedInstitutions->last(),
                'average_score' => round($institutions->avg($performanceMetric), 1),
                'total_institutions' => $institutions->count()
            ]
        ];
    }

    /**
     * Generate survey reports with date filtering
     */
    public function generateSurveyReports($user, $startDate, $endDate)
    {
        $surveys = Survey::where('created_by', $user->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['targeting.institution'])
            ->get();
        
        $surveyData = $surveys->map(function($survey) {
            $responseCount = SurveyResponse::where('survey_id', $survey->id)->count();
            $targetCount = $survey->targeting->count() * 10; // Estimated
            
            return [
                'id' => $survey->id,
                'title' => $survey->title,
                'status' => $survey->status,
                'created_at' => $survey->created_at->format('Y-m-d'),
                'target_institutions' => $survey->targeting->count(),
                'responses' => $responseCount,
                'response_rate' => $targetCount > 0 ? round(($responseCount / $targetCount) * 100, 1) : 0
            ];
        });
        
        // Survey performance metrics
        $metrics = [
            'total_surveys' => $surveys->count(),
            'published_surveys' => $surveys->where('status', 'published')->count(),
            'total_responses' => $surveyData->sum('responses'),
            'average_response_rate' => round($surveyData->avg('response_rate'), 1),
            'most_successful_survey' => $surveyData->sortByDesc('response_rate')->first()
        ];
        
        return [
            'surveys' => $surveyData->values(),
            'metrics' => $metrics
        ];
    }

    /**
     * Generate user activity reports
     */
    public function generateUserReports($userRegionId, $institutionIds)
    {
        // User activity summary
        $userSummary = [
            'total_users' => User::whereIn('institution_id', $institutionIds)->count(),
            'active_users' => User::whereIn('institution_id', $institutionIds)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count(),
            'new_users_this_month' => User::whereIn('institution_id', $institutionIds)
                ->where('created_at', '>=', Carbon::now()->startOfMonth())
                ->count(),
            'users_by_role' => User::whereIn('institution_id', $institutionIds)
                ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->groupBy('roles.display_name')
                ->selectRaw('roles.display_name as role, COUNT(*) as count')
                ->get()
                ->pluck('count', 'role')
        ];
        
        // Login activity trends (last 7 days)
        $loginTrends = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            
            $loginCount = User::whereIn('institution_id', $institutionIds)
                ->whereBetween('last_login_at', [$dayStart, $dayEnd])
                ->count();
                
            $loginTrends[] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->format('l'),
                'login_count' => $loginCount
            ];
        }
        
        return [
            'user_summary' => $userSummary,
            'login_trends' => $loginTrends,
            'engagement_insights' => [
                'peak_login_day' => collect($loginTrends)->sortByDesc('login_count')->first(),
                'engagement_rate' => $userSummary['total_users'] > 0 ? 
                    round(($userSummary['active_users'] / $userSummary['total_users']) * 100, 1) : 0,
                'growth_rate' => 'N/A' // Placeholder
            ]
        ];
    }

    /**
     * Generate export data for reports
     */
    public function generateExportData($reportType, $data, $format)
    {
        // Format data based on export type
        switch ($format) {
            case 'csv':
                return $this->formatForCSV($data);
            case 'pdf':
                return $this->formatForPDF($data);
            case 'json':
            default:
                return $data;
        }
    }

    /**
     * Format data for CSV export
     */
    private function formatForCSV($data)
    {
        // Convert complex data structures to CSV-friendly format
        if (is_array($data) || is_object($data)) {
            return json_encode($data, JSON_PRETTY_PRINT);
        }
        return $data;
    }

    /**
     * Format data for PDF export
     */
    private function formatForPDF($data)
    {
        // Prepare data for PDF generation
        return [
            'title' => 'Regional Admin Report',
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'data' => $data
        ];
    }

    /**
     * Calculate report period summary
     */
    public function getReportPeriodSummary($startDate, $endDate)
    {
        return [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'period_days' => Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)),
            'period_description' => Carbon::parse($startDate)->format('M j') . ' - ' . Carbon::parse($endDate)->format('M j, Y')
        ];
    }
}