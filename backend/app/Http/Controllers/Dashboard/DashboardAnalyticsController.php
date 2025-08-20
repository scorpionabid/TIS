<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\Task;
use App\Models\Document;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DashboardAnalyticsController extends Controller
{
    /**
     * Get SuperAdmin advanced analytics
     */
    public function superAdminAnalytics(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check SuperAdmin permission
            if (!$user || !$user->hasRole('SuperAdmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara giriş icazəniz yoxdur'
                ], 403);
            }

            // Cache advanced analytics for 10 minutes
            $analytics = Cache::remember('superadmin_analytics', 600, function () {
                return [
                    'users' => $this->getRealUserStats(),
                    'institutions' => $this->getRealInstitutionStats(),
                    'surveys' => $this->getRealSurveyStats(),
                    'tasks' => $this->getRealTaskStats(),
                    'systemHealth' => $this->getDetailedSystemHealth(),
                    'userEngagement' => $this->getUserEngagement(),
                    'institutionPerformance' => $this->getInstitutionPerformance(),
                    'surveyEffectiveness' => $this->getSurveyEffectiveness(),
                    'growthMetrics' => $this->getGrowthMetrics(),
                    'alertsSummary' => $this->getSystemAlerts()
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'generated_at' => now(),
                'cache_expires_in' => 600,
            ]);

        } catch (\Exception $e) {
            Log::error('SuperAdmin analytics error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'SuperAdmin analytics yüklənərkən xəta baş verdi'
            ], 500);
        }
    }

    /**
     * Get regional analytics for RegionAdmin
     */
    public function regionalAnalytics(): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user || !$user->hasRole('RegionAdmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu məlumatlara giriş icazəniz yoxdur'
                ], 403);
            }

            $regionId = $user->institution_id;
            $cacheKey = 'regional_analytics_' . $regionId;

            $analytics = Cache::remember($cacheKey, 600, function () use ($regionId) {
                return [
                    'region_overview' => $this->getRegionOverview($regionId),
                    'sector_performance' => $this->getSectorPerformance($regionId),
                    'school_metrics' => $this->getSchoolMetrics($regionId),
                    'staff_distribution' => $this->getStaffDistribution($regionId),
                    'survey_participation' => $this->getSurveyParticipation($regionId),
                    'task_completion' => $this->getTaskCompletion($regionId),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $analytics,
                'region' => $user->institution->name,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Regional analytics alınarkən səhv: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get comprehensive user statistics
     */
    private function getRealUserStats(): array
    {
        $thirtyDaysAgo = now()->subDays(30);
        $sevenDaysAgo = now()->subDays(7);

        return [
            'total' => User::count(),
            'active' => User::where('is_active', true)->count(),
            'inactive' => User::where('is_active', false)->count(),
            'new_this_month' => User::where('created_at', '>=', $thirtyDaysAgo)->count(),
            'new_this_week' => User::where('created_at', '>=', $sevenDaysAgo)->count(),
            'by_role' => $this->getUsersByRole(),
            'by_institution_type' => $this->getUsersByInstitutionType(),
            'login_activity' => $this->getLoginActivity(),
            'geographic_distribution' => $this->getGeographicDistribution(),
        ];
    }

    /**
     * Get comprehensive institution statistics
     */
    private function getRealInstitutionStats(): array
    {
        return [
            'total' => Institution::count(),
            'active' => Institution::where('is_active', true)->count(),
            'by_type' => $this->getInstitutionsByType(),
            'by_level' => $this->getInstitutionsByLevel(),
            'regional_distribution' => $this->getRegionalDistribution(),
            'performance_metrics' => $this->getInstitutionPerformanceMetrics(),
            'capacity_utilization' => $this->getCapacityUtilization(),
        ];
    }

    /**
     * Get survey statistics
     */
    private function getRealSurveyStats(): array
    {
        return [
            'total' => Survey::count(),
            'active' => Survey::where('status', 'active')->count(),
            'completed' => Survey::where('status', 'completed')->count(),
            'pending' => Survey::where('status', 'pending')->count(),
            'response_rates' => $this->getSurveyResponseRates(),
            'completion_trends' => $this->getSurveyCompletionTrends(),
            'category_breakdown' => $this->getSurveyCategoryBreakdown(),
            'average_response_time' => $this->getAverageResponseTime(),
        ];
    }

    /**
     * Get task statistics
     */
    private function getRealTaskStats(): array
    {
        return [
            'total' => Task::count(),
            'active' => Task::where('status', 'active')->count(),
            'completed' => Task::where('status', 'completed')->count(),
            'overdue' => Task::where('due_date', '<', now())
                ->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'completion_rate' => $this->getTaskCompletionRate(),
            'average_completion_time' => $this->getAverageTaskCompletionTime(),
            'by_priority' => $this->getTasksByPriority(),
            'by_category' => $this->getTasksByCategory(),
        ];
    }

    /**
     * Get detailed system health metrics
     */
    private function getDetailedSystemHealth(): array
    {
        return [
            'database' => $this->getDatabaseHealth(),
            'cache' => $this->getCacheHealth(),
            'storage' => $this->getStorageHealth(),
            'performance' => $this->getPerformanceMetrics(),
            'errors' => $this->getErrorRates(),
            'uptime' => $this->getUptimeMetrics(),
        ];
    }

    /**
     * Get user engagement metrics
     */
    private function getUserEngagement(): array
    {
        $thirtyDaysAgo = now()->subDays(30);

        return [
            'daily_active_users' => User::where('last_login_at', '>=', now()->subDay())->count(),
            'weekly_active_users' => User::where('last_login_at', '>=', now()->subWeek())->count(),
            'monthly_active_users' => User::where('last_login_at', '>=', $thirtyDaysAgo)->count(),
            'session_duration' => $this->getAverageSessionDuration(),
            'feature_usage' => $this->getFeatureUsageStats(),
            'page_views' => $this->getPageViewStats(),
        ];
    }

    /**
     * Get institution performance metrics
     */
    private function getInstitutionPerformance(): array
    {
        return [
            'survey_participation' => $this->getInstitutionSurveyParticipation(),
            'task_completion' => $this->getInstitutionTaskCompletion(),
            'user_activity' => $this->getInstitutionUserActivity(),
            'top_performers' => $this->getTopPerformingInstitutions(),
            'improvement_needed' => $this->getInstitutionsNeedingImprovement(),
        ];
    }

    /**
     * Get survey effectiveness metrics
     */
    private function getSurveyEffectiveness(): array
    {
        return [
            'completion_rates' => $this->getSurveyCompletionRates(),
            'time_to_complete' => $this->getSurveyTimeToComplete(),
            'quality_scores' => $this->getSurveyQualityScores(),
            'feedback_sentiment' => $this->getFeedbackSentiment(),
        ];
    }

    /**
     * Get growth metrics
     */
    private function getGrowthMetrics(): array
    {
        return [
            'user_growth' => $this->getUserGrowthTrends(),
            'institution_growth' => $this->getInstitutionGrowthTrends(),
            'content_growth' => $this->getContentGrowthTrends(),
            'engagement_trends' => $this->getEngagementTrends(),
        ];
    }

    /**
     * Get system alerts
     */
    private function getSystemAlerts(): array
    {
        return [
            'critical' => $this->getCriticalAlerts(),
            'warnings' => $this->getWarningAlerts(),
            'info' => $this->getInfoAlerts(),
            'maintenance' => $this->getMaintenanceAlerts(),
        ];
    }

    // Helper methods for statistics collection
    private function getUsersByRole(): array
    {
        return User::join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->select('roles.name', DB::raw('count(*) as count'))
            ->groupBy('roles.name')
            ->pluck('count', 'name')
            ->toArray();
    }

    private function getUsersByInstitutionType(): array
    {
        return User::join('institutions', 'users.institution_id', '=', 'institutions.id')
            ->join('institution_types', 'institutions.institution_type_id', '=', 'institution_types.id')
            ->select('institution_types.name', DB::raw('count(*) as count'))
            ->groupBy('institution_types.name')
            ->pluck('count', 'name')
            ->toArray();
    }

    private function getInstitutionsByType(): array
    {
        return Institution::join('institution_types', 'institutions.institution_type_id', '=', 'institution_types.id')
            ->select('institution_types.name', DB::raw('count(*) as count'))
            ->groupBy('institution_types.name')
            ->pluck('count', 'name')
            ->toArray();
    }

    private function getInstitutionsByLevel(): array
    {
        return Institution::select('level', DB::raw('count(*) as count'))
            ->groupBy('level')
            ->pluck('count', 'level')
            ->toArray();
    }

    // Placeholder methods for complex analytics
    private function getLoginActivity(): array { return []; }
    private function getGeographicDistribution(): array { return []; }
    private function getRegionalDistribution(): array { return []; }
    private function getInstitutionPerformanceMetrics(): array { return []; }
    private function getCapacityUtilization(): array { return []; }
    private function getSurveyResponseRates(): array { return []; }
    private function getSurveyCompletionTrends(): array { return []; }
    private function getSurveyCategoryBreakdown(): array { return []; }
    private function getAverageResponseTime(): float { return 0.0; }
    private function getTaskCompletionRate(): float { return 0.0; }
    private function getAverageTaskCompletionTime(): float { return 0.0; }
    private function getTasksByPriority(): array { return []; }
    private function getTasksByCategory(): array { return []; }
    private function getDatabaseHealth(): array { return ['status' => 'healthy']; }
    private function getCacheHealth(): array { return ['status' => 'healthy']; }
    private function getStorageHealth(): array { return ['status' => 'healthy']; }
    private function getPerformanceMetrics(): array { return []; }
    private function getErrorRates(): array { return []; }
    private function getUptimeMetrics(): array { return []; }
    private function getAverageSessionDuration(): float { return 0.0; }
    private function getFeatureUsageStats(): array { return []; }
    private function getPageViewStats(): array { return []; }
    private function getInstitutionSurveyParticipation(): array { return []; }
    private function getInstitutionTaskCompletion(): array { return []; }
    private function getInstitutionUserActivity(): array { return []; }
    private function getTopPerformingInstitutions(): array { return []; }
    private function getInstitutionsNeedingImprovement(): array { return []; }
    private function getSurveyCompletionRates(): array { return []; }
    private function getSurveyTimeToComplete(): array { return []; }
    private function getSurveyQualityScores(): array { return []; }
    private function getFeedbackSentiment(): array { return []; }
    private function getUserGrowthTrends(): array { return []; }
    private function getInstitutionGrowthTrends(): array { return []; }
    private function getContentGrowthTrends(): array { return []; }
    private function getEngagementTrends(): array { return []; }
    private function getCriticalAlerts(): array { return []; }
    private function getWarningAlerts(): array { return []; }
    private function getInfoAlerts(): array { return []; }
    private function getMaintenanceAlerts(): array { return []; }

    // Regional analytics helper methods
    private function getRegionOverview($regionId): array { return []; }
    private function getSectorPerformance($regionId): array { return []; }
    private function getSchoolMetrics($regionId): array { return []; }
    private function getStaffDistribution($regionId): array { return []; }
    private function getSurveyParticipation($regionId): array { return []; }
    private function getTaskCompletion($regionId): array { return []; }
}