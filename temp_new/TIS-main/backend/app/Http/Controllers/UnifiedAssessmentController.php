<?php

namespace App\Http\Controllers;

use App\Helpers\DataIsolationHelper;
use App\Models\AcademicYear;
use App\Models\AssessmentEntry;
use App\Models\AssessmentType;
use App\Models\BSQResult;
use App\Models\KSQResult;
use App\Services\PerformanceAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UnifiedAssessmentController extends Controller
{
    protected PerformanceAnalyticsService $analyticsService;

    public function __construct(PerformanceAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get unified assessment dashboard data
     */
    public function getDashboardData(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
        ]);

        $user = Auth::user();

        if (! $user) {
            return response()->json(['error' => 'Giriş tələb olunur'], 401);
        }

        $institutionId = $request->institution_id ?? $user->institution_id;
        $academicYearId = $request->academic_year_id;

        // Authorization check
        if (! $this->canAccessInstitution($user, $institutionId)) {
            Log::info('Dashboard access denied for user', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_role' => $user->roles->first()?->name,
                'requested_institution_id' => $institutionId,
                'user_institution_id' => $user->institution_id,
            ]);

            return response()->json(['error' => 'Bu müəssisəyə giriş icazəniz yoxdur'], 403);
        }

        try {
            $data = [
                'statistics' => $this->getAssessmentStatistics($institutionId, $academicYearId),
                'recent_assessments' => $this->getRecentAssessments($institutionId, $academicYearId, 5),
                'performance_trends' => $this->getPerformanceTrends($institutionId, $academicYearId),
                'assessment_types' => $this->getActiveAssessmentTypes($institutionId),
                'alerts' => $this->getAssessmentAlerts($institutionId),
            ];

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Unified assessment dashboard error', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dashboard məlumatları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get assessment overview data for main assessment page
     */
    public function getAssessmentOverview(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $user = Auth::user();
        $institutionId = $request->institution_id ?? $user->institution_id;
        $academicYearId = $request->academic_year_id;
        $perPage = $request->per_page ?? 15;

        // Authorization check
        if (! $this->canAccessInstitution($user, $institutionId)) {
            return response()->json(['error' => 'Bu müəssisəyə giriş icazəniz yoxdur'], 403);
        }

        try {
            $data = [
                'ksq_results' => $this->getKSQResults($institutionId, $academicYearId, $perPage),
                'bsq_results' => $this->getBSQResults($institutionId, $academicYearId, $perPage),
                'recent_entries' => $this->getRecentAssessmentEntries($institutionId, $academicYearId, $perPage),
                'summary_stats' => $this->getOverviewStatistics($institutionId, $academicYearId),
            ];

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Assessment overview error', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə məlumatları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get gradebook data for specific assessment type and class
     */
    public function getGradebookData(Request $request): JsonResponse
    {
        $request->validate([
            'assessment_type_id' => 'nullable|integer|exists:assessment_types,id',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'class_id' => 'nullable|integer',
            'grade_level' => 'nullable|string|max:10',
            'subject' => 'nullable|string|max:100',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
        ]);

        $user = Auth::user();
        $institutionId = $request->institution_id ?? $user->institution_id;

        // Authorization check
        if (! $this->canAccessInstitution($user, $institutionId)) {
            return response()->json(['error' => 'Bu müəssisəyə giriş icazəniz yoxdur'], 403);
        }

        try {
            $data = $this->getGradebookEntries($request->all());

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Gradebook data error', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gradebook məlumatları yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get comprehensive analytics for reports
     */
    public function getAnalyticsData(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'include_trends' => 'boolean',
            'include_comparisons' => 'boolean',
        ]);

        $user = Auth::user();
        $institutionId = $request->institution_id ?? $user->institution_id;

        // Authorization check
        if (! $this->canAccessInstitution($user, $institutionId)) {
            return response()->json(['error' => 'Bu müəssisəyə giriş icazəniz yoxdur'], 403);
        }

        try {
            $analytics = $this->analyticsService->getInstitutionPerformanceAnalytics(
                $institutionId,
                $request->academic_year_id,
                [
                    'include_trends' => $request->include_trends ?? true,
                    'include_comparisons' => $request->include_comparisons ?? true,
                    'date_from' => $request->date_from,
                    'date_to' => $request->date_to,
                ]
            );

            $data = [
                'analytics' => $analytics,
                'charts_data' => $this->getChartsData($institutionId, $request->academic_year_id),
                'performance_indicators' => $this->getPerformanceIndicators($institutionId, $request->academic_year_id),
            ];

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Analytics data error', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Analitik məlumatlar yüklənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Private helper methods
     */
    private function canAccessInstitution($user, $institutionId): bool
    {
        return DataIsolationHelper::canAccessInstitution($user, $institutionId);
    }

    private function getAssessmentStatistics($institutionId, $academicYearId): array
    {
        $baseQuery = function ($model) use ($institutionId, $academicYearId) {
            $query = $model::where('institution_id', $institutionId);
            if ($academicYearId) {
                $query->where('academic_year_id', $academicYearId);
            }

            return $query;
        };

        $ksqTotal = $baseQuery(KSQResult::class)->count();
        $bsqTotal = $baseQuery(BSQResult::class)->count();
        $entriesTotal = $baseQuery(AssessmentEntry::class)->count();

        $ksqCompleted = $baseQuery(KSQResult::class)->where('status', 'approved')->count();
        $bsqCompleted = $baseQuery(BSQResult::class)->where('status', 'approved')->count();
        $entriesCompleted = $baseQuery(AssessmentEntry::class)->where('status', 'approved')->count();

        return [
            'total_assessments' => $ksqTotal + $bsqTotal + $entriesTotal,
            'completed_assessments' => $ksqCompleted + $bsqCompleted + $entriesCompleted,
            'active_assessments' => ($ksqTotal + $bsqTotal + $entriesTotal) - ($ksqCompleted + $bsqCompleted + $entriesCompleted),
            'ksq_assessments' => $ksqTotal,
            'bsq_assessments' => $bsqTotal,
            'regular_assessments' => $entriesTotal,
        ];
    }

    private function getRecentAssessments($institutionId, $academicYearId, $limit): array
    {
        $assessments = [];

        // Get recent KSQ results
        $ksqQuery = KSQResult::where('institution_id', $institutionId)
            ->with(['assessor', 'academicYear', 'subject']);
        if ($academicYearId) {
            $ksqQuery->where('academic_year_id', $academicYearId);
        }

        $ksqResults = $ksqQuery->orderBy('assessment_date', 'desc')->limit($limit)->get();
        foreach ($ksqResults as $result) {
            $assessments[] = [
                'type' => 'KSQ',
                'id' => $result->id,
                'title' => $result->assessment_type,
                'date' => $result->assessment_date,
                'score' => $result->percentage_score,
                'status' => $result->status,
            ];
        }

        // Get recent BSQ results
        $bsqQuery = BSQResult::where('institution_id', $institutionId)
            ->with(['assessor', 'academicYear']);
        if ($academicYearId) {
            $bsqQuery->where('academic_year_id', $academicYearId);
        }

        $bsqResults = $bsqQuery->orderBy('assessment_date', 'desc')->limit($limit)->get();
        foreach ($bsqResults as $result) {
            $assessments[] = [
                'type' => 'BSQ',
                'id' => $result->id,
                'title' => $result->international_standard,
                'date' => $result->assessment_date,
                'score' => $result->percentage_score,
                'status' => $result->status,
            ];
        }

        // Sort by date and limit
        usort($assessments, function ($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });

        return array_slice($assessments, 0, $limit);
    }

    private function getPerformanceTrends($institutionId, $academicYearId): array
    {
        // Implementation for performance trends over time
        return [
            'monthly_performance' => [],
            'subject_performance' => [],
            'grade_level_performance' => [],
        ];
    }

    private function getActiveAssessmentTypes($institutionId): array
    {
        return AssessmentType::where(function ($query) use ($institutionId) {
            $query->where('institution_id', $institutionId)
                ->orWhereNull('institution_id');
        })
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->toArray();
    }

    private function getAssessmentAlerts($institutionId): array
    {
        $alerts = [];

        // Check for overdue assessments
        $overdueCount = AssessmentEntry::where('institution_id', $institutionId)
            ->where('status', 'draft')
            ->where('created_at', '<=', now()->subDays(7))
            ->count();

        if ($overdueCount > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Gecikmiş qiymətləndirmələr',
                'message' => "{$overdueCount} qiymətləndirmə 7 gündən çox gözləyir",
                'count' => $overdueCount,
            ];
        }

        return $alerts;
    }

    private function getKSQResults($institutionId, $academicYearId, $perPage)
    {
        $query = KSQResult::where('institution_id', $institutionId)
            ->with(['assessor', 'approver', 'subject', 'academicYear'])
            ->orderBy('assessment_date', 'desc');

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        return $query->paginate($perPage);
    }

    private function getBSQResults($institutionId, $academicYearId, $perPage)
    {
        $query = BSQResult::where('institution_id', $institutionId)
            ->with(['assessor', 'approver', 'academicYear'])
            ->orderBy('assessment_date', 'desc');

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        return $query->paginate($perPage);
    }

    private function getRecentAssessmentEntries($institutionId, $academicYearId, $perPage)
    {
        $query = AssessmentEntry::where('institution_id', $institutionId)
            ->with(['assessmentType', 'student', 'creator'])
            ->orderBy('assessment_date', 'desc');

        if ($academicYearId) {
            $query->where('created_at', '>=',
                AcademicYear::find($academicYearId)?->start_date ?? now()->startOfYear()
            );
        }

        return $query->paginate($perPage);
    }

    private function getOverviewStatistics($institutionId, $academicYearId): array
    {
        return [
            'total_students_assessed' => $this->getTotalStudentsAssessed($institutionId, $academicYearId),
            'average_performance' => $this->getAveragePerformance($institutionId, $academicYearId),
            'assessment_completion_rate' => $this->getAssessmentCompletionRate($institutionId, $academicYearId),
        ];
    }

    private function getTotalStudentsAssessed($institutionId, $academicYearId): int
    {
        return AssessmentEntry::where('institution_id', $institutionId)
            ->when($academicYearId, function ($query, $academicYearId) {
                $query->where('created_at', '>=',
                    AcademicYear::find($academicYearId)?->start_date ?? now()->startOfYear()
                );
            })
            ->distinct('student_id')
            ->count('student_id');
    }

    private function getAveragePerformance($institutionId, $academicYearId): float
    {
        return AssessmentEntry::where('institution_id', $institutionId)
            ->when($academicYearId, function ($query, $academicYearId) {
                $query->where('created_at', '>=',
                    AcademicYear::find($academicYearId)?->start_date ?? now()->startOfYear()
                );
            })
            ->where('status', 'approved')
            ->avg('score') ?? 0;
    }

    private function getAssessmentCompletionRate($institutionId, $academicYearId): float
    {
        $total = AssessmentEntry::where('institution_id', $institutionId)
            ->when($academicYearId, function ($query, $academicYearId) {
                $query->where('created_at', '>=',
                    AcademicYear::find($academicYearId)?->start_date ?? now()->startOfYear()
                );
            })
            ->count();

        if ($total === 0) {
            return 0;
        }

        $completed = AssessmentEntry::where('institution_id', $institutionId)
            ->when($academicYearId, function ($query, $academicYearId) {
                $query->where('created_at', '>=',
                    AcademicYear::find($academicYearId)?->start_date ?? now()->startOfYear()
                );
            })
            ->where('status', 'approved')
            ->count();

        return round(($completed / $total) * 100, 2);
    }

    private function getGradebookEntries(array $filters): array
    {
        $query = AssessmentEntry::with(['student', 'assessmentType', 'creator'])
            ->where('institution_id', $filters['institution_id'] ?? auth()->user()->institution_id);

        if (! empty($filters['assessment_type_id'])) {
            $query->where('assessment_type_id', $filters['assessment_type_id']);
        }

        if (! empty($filters['grade_level'])) {
            $query->where('grade_level', $filters['grade_level']);
        }

        if (! empty($filters['subject'])) {
            $query->where('subject', $filters['subject']);
        }

        if (! empty($filters['class_id'])) {
            $query->whereHas('student', function ($q) use ($filters) {
                $q->where('current_class_id', $filters['class_id']);
            });
        }

        return $query->orderBy('assessment_date', 'desc')->get()->toArray();
    }

    private function getChartsData($institutionId, $academicYearId): array
    {
        return [
            'performance_over_time' => $this->getPerformanceOverTimeData($institutionId, $academicYearId),
            'assessment_type_distribution' => $this->getAssessmentTypeDistribution($institutionId, $academicYearId),
            'grade_level_performance' => $this->getGradeLevelPerformance($institutionId, $academicYearId),
        ];
    }

    private function getPerformanceOverTimeData($institutionId, $academicYearId): array
    {
        // Implementation for chart data
        return [];
    }

    private function getAssessmentTypeDistribution($institutionId, $academicYearId): array
    {
        // Implementation for chart data
        return [];
    }

    private function getGradeLevelPerformance($institutionId, $academicYearId): array
    {
        // Implementation for chart data
        return [];
    }

    private function getPerformanceIndicators($institutionId, $academicYearId): array
    {
        return [
            'overall_grade' => 'B+',
            'improvement_rate' => 15.5,
            'areas_of_strength' => ['Riyaziyyat', 'Elm'],
            'areas_for_improvement' => ['Ədəbiyyat', 'Tarix'],
        ];
    }
}
