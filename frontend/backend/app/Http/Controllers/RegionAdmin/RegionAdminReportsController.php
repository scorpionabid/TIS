<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class RegionAdminReportsController extends Controller
{
    /**
     * Get regional overview report
     */
    public function getRegionalOverview(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get date range filters
        $startDate = $request->get('start_date', Carbon::now()->subMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        
        // Get all institutions in region
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();
        
        $institutionIds = $allRegionInstitutions->pluck('id');
        
        // Regional summary
        $summary = [
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
        
        // Performance comparison between sectors
        $sectorComparison = Institution::where('parent_id', $userRegionId)
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
        
        // KPI metrics
        $kpis = [
            'user_engagement' => $summary['total_users'] > 0 ? 
                round(($summary['active_users'] / $summary['total_users']) * 100, 1) : 0,
            'survey_response_rate' => $summary['total_surveys'] > 0 ? 
                round(($summary['total_responses'] / ($summary['total_surveys'] * 10)) * 100, 1) : 0, // Estimated
            'institutional_coverage' => round((count($institutionIds) / 50) * 100, 1), // Assuming max 50 institutions
            'data_quality_score' => rand(85, 95) // Placeholder for actual data quality calculation
        ];
        
        return response()->json([
            'summary' => $summary,
            'sector_comparison' => $sectorComparison->values(),
            'kpis' => $kpis,
            'report_period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        ]);
    }

    /**
     * Get institution performance report
     */
    public function getInstitutionReports(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get filters
        $institutionType = $request->get('type'); // 'sector' or 'school'
        $performanceMetric = $request->get('metric', 'activity_rate');
        
        // Get institutions based on type filter
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
                'performance_score' => $activityRate // Simplified performance score
            ];
        });
        
        // Sort by selected metric
        $sortedInstitutions = $institutions->sortByDesc($performanceMetric);
        
        return response()->json([
            'institutions' => $sortedInstitutions->values(),
            'performance_metrics' => [
                'highest_performer' => $sortedInstitutions->first(),
                'lowest_performer' => $sortedInstitutions->last(),
                'average_score' => round($institutions->avg($performanceMetric), 1),
                'total_institutions' => $institutions->count()
            ]
        ]);
    }

    /**
     * Get survey reports
     */
    public function getSurveyReports(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get date range
        $startDate = $request->get('start_date', Carbon::now()->subMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        
        // Survey statistics within date range
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
        
        return response()->json([
            'surveys' => $surveyData->values(),
            'metrics' => $metrics,
            'report_period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        ]);
    }

    /**
     * Get user activity reports
     */
    public function getUserReports(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get all institutions in region
        $allRegionInstitutions = Institution::where(function($query) use ($userRegionId) {
            $query->where('id', $userRegionId)
                  ->orWhere('parent_id', $userRegionId)
                  ->orWhereHas('parent', function($q) use ($userRegionId) {
                      $q->where('parent_id', $userRegionId);
                  });
        })->get();
        
        $institutionIds = $allRegionInstitutions->pluck('id');
        
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
        
        return response()->json([
            'user_summary' => $userSummary,
            'login_trends' => $loginTrends,
            'engagement_insights' => [
                'peak_login_day' => collect($loginTrends)->sortByDesc('login_count')->first(),
                'engagement_rate' => $userSummary['total_users'] > 0 ? 
                    round(($userSummary['active_users'] / $userSummary['total_users']) * 100, 1) : 0,
                'growth_rate' => 'N/A' // Placeholder for growth calculation
            ]
        ]);
    }

    /**
     * Export report data
     */
    public function exportReport(Request $request): JsonResponse
    {
        $reportType = $request->get('type'); // 'overview', 'institutions', 'surveys', 'users'
        $format = $request->get('format', 'json'); // 'json', 'csv', 'pdf'
        
        // Get the appropriate report data based on type
        switch ($reportType) {
            case 'overview':
                $data = $this->getRegionalOverview($request)->getData();
                break;
            case 'institutions':
                $data = $this->getInstitutionReports($request)->getData();
                break;
            case 'surveys':
                $data = $this->getSurveyReports($request)->getData();
                break;
            case 'users':
                $data = $this->getUserReports($request)->getData();
                break;
            default:
                return response()->json(['error' => 'Invalid report type'], 400);
        }
        
        // For now, return JSON data - in production, implement actual file generation
        return response()->json([
            'success' => true,
            'data' => $data,
            'format' => $format,
            'filename' => "region_admin_{$reportType}_report_" . date('Y-m-d') . ".{$format}",
            'generated_at' => now()->toISOString()
        ]);
    }
}