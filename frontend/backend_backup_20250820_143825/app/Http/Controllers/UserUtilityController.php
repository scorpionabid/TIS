<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\UserUtilityService;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserUtilityController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    public function __construct(
        protected UserUtilityService $utilityService
    ) {}

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $validated = $request->validate([
                'new_password' => 'required|string|min:8|max:255',
            ]);

            $this->utilityService->resetPassword($user, $validated['new_password']);
            
            return $this->success(null, 'Password reset successfully');
        }, 'user.utility.reset_password');
    }

    /**
     * Toggle user active status
     */
    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $updatedUser = $this->utilityService->toggleStatus($user);
            
            return $this->success([
                'id' => $updatedUser->id,
                'username' => $updatedUser->username,
                'is_active' => $updatedUser->is_active,
                'status' => $updatedUser->is_active ? 'active' : 'inactive'
            ], $updatedUser->is_active ? 'User activated successfully' : 'User deactivated successfully');
        }, 'user.utility.toggle_status');
    }

    /**
     * Export users data
     */
    public function export(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'format' => 'nullable|string|in:json,csv',
                'filters' => 'nullable|array',
                'filters.role' => 'nullable|string|exists:roles,name',
                'filters.institution_id' => 'nullable|integer|exists:institutions,id',
                'filters.is_active' => 'nullable|boolean',
                'filters.created_from' => 'nullable|date',
                'filters.created_to' => 'nullable|date',
                'include_profiles' => 'nullable|boolean'
            ]);

            $result = $this->utilityService->exportUsers(
                $validated['filters'] ?? [],
                $validated['format'] ?? 'json',
                $validated['include_profiles'] ?? false
            );
            
            return $this->success($result, 'Users exported successfully');
        }, 'user.utility.export');
    }

    /**
     * Get user statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $stats = $this->utilityService->getStatistics();
            return $this->success($stats, 'User statistics retrieved successfully');
        }, 'user.utility.statistics');
    }

    /**
     * Get available institutions
     */
    public function institutions(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $institutions = $this->utilityService->getAvailableInstitutions();
            return $this->success($institutions, 'Available institutions retrieved successfully');
        }, 'user.utility.institutions');
    }

    /**
     * Get user activity report
     */
    public function activityReport(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $validated = $request->validate([
                'days' => 'nullable|integer|min:1|max:365'
            ]);

            $report = $this->utilityService->getUserActivityReport(
                $user, 
                $validated['days'] ?? 30
            );
            
            return $this->success($report, 'User activity report generated successfully');
        }, 'user.utility.activity_report');
    }

    /**
     * Get user performance metrics
     */
    public function performanceMetrics(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $metrics = $this->utilityService->getUserPerformanceMetrics($user);
            return $this->success($metrics, 'User performance metrics retrieved successfully');
        }, 'user.utility.performance_metrics');
    }

    /**
     * Get user health check
     */
    public function healthCheck(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $health = [
                'user_id' => $user->id,
                'username' => $user->username,
                'status' => $user->is_active ? 'active' : 'inactive',
                'last_login' => $user->last_login_at?->toDateTimeString(),
                'account_age' => $user->created_at->diffForHumans(),
                'security_score' => $this->calculateSecurityScore($user),
                'completeness_score' => $this->calculateCompletenessScore($user),
                'recommendations' => $this->getHealthRecommendations($user)
            ];
            
            return $this->success($health, 'User health check completed');
        }, 'user.utility.health_check');
    }

    /**
     * Generate user summary
     */
    public function summary(Request $request, User $user): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request, $user) {
            $user->load(['role', 'institution', 'profile']);
            
            $summary = [
                'basic_info' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'full_name' => $user->profile?->full_name ?? 'N/A',
                    'is_active' => $user->is_active
                ],
                'role_info' => [
                    'role' => $user->role?->display_name ?? 'N/A',
                    'institution' => $user->institution?->name ?? 'N/A',
                    'department' => $user->department?->name ?? 'N/A'
                ],
                'activity_info' => [
                    'created_at' => $user->created_at->toDateTimeString(),
                    'last_login_at' => $user->last_login_at?->toDateTimeString() ?? 'Never',
                    'password_changed_at' => $user->password_changed_at?->toDateTimeString(),
                    'failed_attempts' => $user->failed_login_attempts
                ],
                'quick_stats' => [
                    'account_age_days' => $user->created_at->diffInDays(),
                    'days_since_last_login' => $user->last_login_at ? $user->last_login_at->diffInDays() : null,
                    'security_score' => $this->calculateSecurityScore($user),
                    'profile_complete' => $user->profile ? true : false
                ]
            ];
            
            return $this->success($summary, 'User summary generated successfully');
        }, 'user.utility.summary');
    }

    /**
     * Calculate security score for user
     */
    protected function calculateSecurityScore(User $user): int
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
        
        // Deduct for old password
        if ($user->password_changed_at && $user->password_changed_at->diffInMonths() > 6) {
            $score -= 15;
        }
        
        return max($score, 0);
    }

    /**
     * Calculate profile completeness score
     */
    protected function calculateCompletenessScore(User $user): int
    {
        $score = 0;
        
        // Basic fields
        if ($user->username) $score += 20;
        if ($user->email) $score += 20;
        if ($user->email_verified_at) $score += 10;
        
        // Profile fields
        if ($user->profile) {
            if ($user->profile->first_name) $score += 10;
            if ($user->profile->last_name) $score += 10;
            if ($user->profile->contact_phone) $score += 10;
            if ($user->profile->birth_date) $score += 10;
            if ($user->profile->gender) $score += 5;
            if ($user->profile->address) $score += 5;
        }
        
        return min($score, 100);
    }

    /**
     * Get health recommendations for user
     */
    protected function getHealthRecommendations(User $user): array
    {
        $recommendations = [];
        
        if (!$user->profile) {
            $recommendations[] = [
                'type' => 'profile',
                'priority' => 'medium',
                'message' => 'Complete user profile for better experience'
            ];
        }
        
        if (!$user->email_verified_at) {
            $recommendations[] = [
                'type' => 'security',
                'priority' => 'high',
                'message' => 'Verify email address for security'
            ];
        }
        
        if (!$user->last_login_at || $user->last_login_at->diffInDays() > 30) {
            $recommendations[] = [
                'type' => 'engagement',
                'priority' => 'low',
                'message' => 'User appears inactive - consider engagement strategies'
            ];
        }
        
        if ($user->failed_login_attempts > 0) {
            $recommendations[] = [
                'type' => 'security',
                'priority' => 'high',
                'message' => 'Review account security - failed login attempts detected'
            ];
        }
        
        if ($user->password_changed_at && $user->password_changed_at->diffInMonths() > 6) {
            $recommendations[] = [
                'type' => 'security',
                'priority' => 'medium',
                'message' => 'Consider updating password - last changed over 6 months ago'
            ];
        }
        
        return $recommendations;
    }
}