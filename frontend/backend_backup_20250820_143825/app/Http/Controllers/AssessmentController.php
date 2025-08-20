<?php

namespace App\Http\Controllers;

use App\Models\KSQResult;
use App\Models\BSQResult;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Services\PerformanceAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AssessmentController extends Controller
{
    protected PerformanceAnalyticsService $analyticsService;

    public function __construct(PerformanceAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get assessment overview for dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
            'assessment_type' => 'nullable|string|in:ksq,bsq,all',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        $user = Auth::user();
        \Log::info('Assessment API called', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_institution_id' => $user->institution_id,
            'request_institution_id' => $request->institution_id,
            'request_params' => $request->all()
        ]);

        $institutionId = $request->institution_id ?? $user->institution_id;
        $academicYearId = $request->academic_year_id;

        \Log::info('Assessment API institution check', [
            'request_institution_id' => $request->institution_id,
            'user_institution_id' => $user->institution_id,
            'final_institution_id' => $institutionId,
            'institution_id_is_empty' => empty($institutionId),
            'institution_exists' => $institutionId ? Institution::where('id', $institutionId)->exists() : false,
            'user_roles' => $user->roles->pluck('name')->toArray()
        ]);

        // Handle case where no valid institution_id is available
        if (empty($institutionId) || $institutionId === '' || $institutionId === null) {
            \Log::warning('Assessment API: No valid institution_id available', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'request_institution_id' => $request->institution_id,
                'user_institution_id' => $user->institution_id,
                'institution_id_value' => $institutionId,
                'institution_id_type' => gettype($institutionId)
            ]);
            
            // For SuperAdmin without specific institution, return aggregate data
            if ($user->hasRole('superadmin')) {
                \Log::info('Returning aggregate data for SuperAdmin');
                return response()->json([
                    'success' => true,
                    'data' => $this->getAggregateAssessmentData($academicYearId, $request->assessment_type, $request->per_page)
                ]);
            }
            
            return response()->json(['error' => 'Qiymətləndirmə məlumatlarına giriş üçün müəssisə təyin edilməlidir'], 400);
        }

        // Authorization check
        if (!$this->canAccessInstitution($user, $institutionId)) {
            \Log::warning('Assessment API access denied', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'reason' => 'canAccessInstitution returned false'
            ]);
            return response()->json(['error' => 'Bu müəssisəyə giriş icazəniz yoxdur'], 403);
        }

        $assessmentType = $request->assessment_type ?? 'all';
        $data = [];

        if ($assessmentType === 'all' || $assessmentType === 'ksq') {
            $data['ksq_results'] = $this->getKSQResults($institutionId, $academicYearId, $request->per_page);
        }

        if ($assessmentType === 'all' || $assessmentType === 'bsq') {
            $data['bsq_results'] = $this->getBSQResults($institutionId, $academicYearId, $request->per_page);
        }

        // Get summary analytics only if we have a valid institution
        // For SuperAdmin aggregate data, we already have analytics in getAggregateAssessmentData
        if (!empty($institutionId)) {
            try {
                $data['analytics'] = $this->analyticsService->getInstitutionPerformanceAnalytics(
                    $institutionId, 
                    $academicYearId
                );
            } catch (\Exception $e) {
                \Log::error('Analytics service error', [
                    'institution_id' => $institutionId,
                    'academic_year_id' => $academicYearId,
                    'error' => $e->getMessage()
                ]);
                // Continue without analytics if there's an error
                $data['analytics'] = null;
            }
        } else {
            // For SuperAdmin without specific institution, analytics are handled in getAggregateAssessmentData
            \Log::info('Skipping individual institution analytics for SuperAdmin aggregate view');
        }

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Store new KSQ assessment result
     */
    public function storeKSQ(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|integer|exists:institutions,id',
            'academic_year_id' => 'required|integer|exists:academic_years,id',
            'assessment_date' => 'required|date',
            'assessment_type' => 'required|string|max:100',
            'total_score' => 'required|numeric|min:0',
            'max_possible_score' => 'required|numeric|min:1',
            'grade_level' => 'nullable|string|max:50',
            'subject_id' => 'nullable|integer|exists:subjects,id',
            'criteria_scores' => 'required|array',
            'criteria_scores.*' => 'numeric|min:0|max:100',
            'detailed_results' => 'nullable|array',
            'strengths' => 'nullable|array',
            'improvement_areas' => 'nullable|array',
            'recommendations' => 'nullable|array',
            'notes' => 'nullable|string|max:1000',
            'follow_up_required' => 'boolean',
            'follow_up_date' => 'nullable|date|after:assessment_date',
            'previous_assessment_id' => 'nullable|integer|exists:ksq_results,id'
        ]);

        $user = Auth::user();

        // Authorization check
        if (!$this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Bu müəssisəyə qiymətləndirmə əlavə etmək icazəniz yoxdur'], 403);
        }

        DB::beginTransaction();
        try {
            $percentageScore = ($request->total_score / $request->max_possible_score) * 100;

            $ksqResult = KSQResult::create([
                'institution_id' => $request->institution_id,
                'academic_year_id' => $request->academic_year_id,
                'assessment_date' => $request->assessment_date,
                'assessment_type' => $request->assessment_type,
                'assessor_id' => $user->id,
                'total_score' => $request->total_score,
                'max_possible_score' => $request->max_possible_score,
                'percentage_score' => round($percentageScore, 2),
                'grade_level' => $request->grade_level,
                'subject_id' => $request->subject_id,
                'criteria_scores' => $request->criteria_scores,
                'detailed_results' => $request->detailed_results ?? [],
                'strengths' => $request->strengths ?? [],
                'improvement_areas' => $request->improvement_areas ?? [],
                'recommendations' => $request->recommendations ?? [],
                'status' => 'draft',
                'notes' => $request->notes,
                'follow_up_required' => $request->follow_up_required ?? false,
                'follow_up_date' => $request->follow_up_date,
                'previous_assessment_id' => $request->previous_assessment_id
            ]);

            // Calculate improvement if previous assessment exists
            if ($request->previous_assessment_id) {
                $ksqResult->calculateImprovementFromPrevious();
            }

            // Generate automatic recommendations
            $autoRecommendations = $ksqResult->generateRecommendations();
            if (!empty($autoRecommendations)) {
                $existingRecommendations = $ksqResult->recommendations ?? [];
                $ksqResult->recommendations = array_merge($existingRecommendations, $autoRecommendations);
                $ksqResult->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'KSQ qiymətləndirmə nəticəsi uğurla əlavə edildi',
                'data' => $ksqResult->load(['institution', 'academicYear', 'assessor', 'subject'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'KSQ nəticəsi əlavə edilərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store new BSQ assessment result
     */
    public function storeBSQ(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|integer|exists:institutions,id',
            'academic_year_id' => 'required|integer|exists:academic_years,id',
            'assessment_date' => 'required|date',
            'international_standard' => 'required|string|max:100',
            'assessment_body' => 'required|string|max:255',
            'total_score' => 'required|numeric|min:0',
            'max_possible_score' => 'required|numeric|min:1',
            'international_ranking' => 'nullable|integer|min:1',
            'national_ranking' => 'nullable|integer|min:1',
            'regional_ranking' => 'nullable|integer|min:1',
            'competency_areas' => 'required|array',
            'competency_areas.*' => 'numeric|min:0|max:100',
            'detailed_scores' => 'nullable|array',
            'international_comparison' => 'nullable|array',
            'certification_level' => 'nullable|string|max:100',
            'certification_valid_until' => 'nullable|date|after:assessment_date',
            'improvement_plan' => 'nullable|array',
            'action_items' => 'nullable|array',
            'external_report_url' => 'nullable|url',
            'compliance_score' => 'nullable|numeric|min:0|max:100',
            'accreditation_status' => 'nullable|string|in:full_accreditation,conditional_accreditation,provisional_accreditation,denied,not_applicable'
        ]);

        $user = Auth::user();

        // Authorization check
        if (!$this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Bu müəssisəyə qiymətləndirmə əlavə etmək icazəniz yoxdur'], 403);
        }

        DB::beginTransaction();
        try {
            $percentageScore = ($request->total_score / $request->max_possible_score) * 100;

            $bsqResult = BSQResult::create([
                'institution_id' => $request->institution_id,
                'academic_year_id' => $request->academic_year_id,
                'assessment_date' => $request->assessment_date,
                'international_standard' => $request->international_standard,
                'assessment_body' => $request->assessment_body,
                'assessor_id' => $user->id,
                'total_score' => $request->total_score,
                'max_possible_score' => $request->max_possible_score,
                'percentage_score' => round($percentageScore, 2),
                'international_ranking' => $request->international_ranking,
                'national_ranking' => $request->national_ranking,
                'regional_ranking' => $request->regional_ranking,
                'competency_areas' => $request->competency_areas,
                'detailed_scores' => $request->detailed_scores ?? [],
                'international_comparison' => $request->international_comparison ?? [],
                'certification_level' => $request->certification_level,
                'certification_valid_until' => $request->certification_valid_until,
                'improvement_plan' => $request->improvement_plan ?? [],
                'action_items' => $request->action_items ?? [],
                'status' => 'draft',
                'external_report_url' => $request->external_report_url,
                'compliance_score' => $request->compliance_score,
                'accreditation_status' => $request->accreditation_status ?? 'not_applicable'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'BSQ qiymətləndirmə nəticəsi uğurla əlavə edildi',
                'data' => $bsqResult->load(['institution', 'academicYear', 'assessor'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'BSQ nəticəsi əlavə edilərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get comprehensive analytics for an institution
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|integer|exists:institutions,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
            'include_trends' => 'boolean',
            'include_rankings' => 'boolean',
            'include_recommendations' => 'boolean'
        ]);

        $user = Auth::user();

        // Authorization check
        if (!$this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Bu müəssisəyə analitik məlumat almaq icazəniz yoxdur'], 403);
        }

        $analytics = $this->analyticsService->getInstitutionPerformanceAnalytics(
            $request->institution_id,
            $request->academic_year_id,
            [
                'include_trends' => $request->include_trends ?? true,
                'include_rankings' => $request->include_rankings ?? true,
                'include_recommendations' => $request->include_recommendations ?? true
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $analytics
        ]);
    }

    /**
     * Approve assessment result
     */
    public function approve(Request $request, $type, $id): JsonResponse
    {
        $request->validate([
            'comments' => 'nullable|string|max:500'
        ]);

        $user = Auth::user();

        // Only certain roles can approve assessments
        if (!$user->hasAnyRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json(['error' => 'Qiymətləndirmə nəticələrini təsdiqləmək icazəniz yoxdur'], 403);
        }

        $model = $type === 'ksq' ? KSQResult::class : BSQResult::class;
        $result = $model::findOrFail($id);

        // Authorization check
        if (!$this->canAccessInstitution($user, $result->institution_id)) {
            return response()->json(['error' => 'Bu qiymətləndirmə nəticəsini təsdiqləmək icazəniz yoxdur'], 403);
        }

        $result->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($type) . ' qiymətləndirmə nəticəsi təsdiqləndi',
            'data' => $result->load(['approver'])
        ]);
    }

    /**
     * Get performance rankings
     */
    public function getRankings(Request $request): JsonResponse
    {
        $request->validate([
            'ranking_type' => 'required|string|in:regional,national,international',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
            'institution_type' => 'nullable|string',
            'limit' => 'nullable|integer|min:1|max:100'
        ]);

        $academicYearId = $request->academic_year_id;
        $rankingType = $request->ranking_type;
        $limit = $request->limit ?? 50;

        $rankings = $this->calculateRankings($rankingType, $academicYearId, $limit, $request->institution_type);

        return response()->json([
            'success' => true,
            'data' => [
                'ranking_type' => $rankingType,
                'academic_year_id' => $academicYearId,
                'rankings' => $rankings,
                'generated_at' => now()
            ]
        ]);
    }

    /**
     * Export assessment data
     */
    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|integer|exists:institutions,id',
            'academic_year_id' => 'nullable|integer|exists:academic_years,id',
            'assessment_type' => 'required|string|in:ksq,bsq,both',
            'format' => 'required|string|in:excel,pdf,csv'
        ]);

        $user = Auth::user();

        // Authorization check
        if (!$this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Bu müəssisənin məlumatlarını ixrac etmək icazəniz yoxdur'], 403);
        }

        // Implementation placeholder - would integrate with export service
        return response()->json([
            'success' => true,
            'message' => 'İxrac əməliyyatı başladı. Hazır olduqda bildiriş alacaqsınız.',
            'export_id' => 'exp_' . uniqid()
        ]);
    }

    /**
     * Private helper methods
     */
    private function canAccessInstitution($user, $institutionId): bool
    {
        // SuperAdmin can access all institutions
        if ($user->hasRole('superadmin')) return true;
        
        // If no institution ID provided, deny access for non-superadmin users
        if (empty($institutionId) || !$institutionId) {
            \Log::warning('canAccessInstitution: Empty institution ID', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'institution_id_type' => gettype($institutionId),
                'user_roles' => $user->roles->pluck('name')->toArray()
            ]);
            return false;
        }
        
        // Check if institution exists
        $institution = Institution::find($institutionId);
        if (!$institution) {
            \Log::warning('canAccessInstitution: Institution not found', [
                'user_id' => $user->id,
                'institution_id' => $institutionId,
                'existing_institutions' => Institution::pluck('id')->toArray()
            ]);
            return false;
        }
        
        // RegionAdmin can access institutions in their region
        if ($user->hasRole('regionadmin')) {
            $userInstitution = Institution::find($user->institution_id);
            if (!$userInstitution) {
                \Log::warning('canAccessInstitution: RegionAdmin user institution not found', [
                    'user_id' => $user->id,
                    'user_institution_id' => $user->institution_id
                ]);
                return false;
            }
            
            // Both should be in same region (level 2 or have same level 2 parent)
            $userRegionId = $userInstitution->level === 2 ? $userInstitution->id : $userInstitution->parent_id;
            $institutionRegionId = $institution->level === 2 ? $institution->id : $institution->parent_id;
            
            return $userRegionId === $institutionRegionId;
        }
        
        // Other users can only access their own institution
        return $user->institution_id === $institutionId;
    }

    private function getKSQResults($institutionId, $academicYearId, $perPage)
    {
        $query = KSQResult::where('institution_id', $institutionId)
            ->with(['assessor', 'approver', 'subject', 'academicYear'])
            ->orderBy('assessment_date', 'desc');

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    private function getBSQResults($institutionId, $academicYearId, $perPage)
    {
        $query = BSQResult::where('institution_id', $institutionId)
            ->with(['assessor', 'approver', 'academicYear'])
            ->orderBy('assessment_date', 'desc');

        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    private function getAggregateAssessmentData($academicYearId, $assessmentType, $perPage)
    {
        $data = [];
        
        if (!$assessmentType || $assessmentType === 'all' || $assessmentType === 'ksq') {
            // Get all KSQ results across all institutions
            $ksqQuery = KSQResult::with(['institution', 'assessor', 'approver', 'subject', 'academicYear'])
                ->orderBy('assessment_date', 'desc');
            
            if ($academicYearId) {
                $ksqQuery->where('academic_year_id', $academicYearId);
            }
            
            $data['ksq_results'] = $perPage ? $ksqQuery->paginate($perPage) : $ksqQuery->get();
        }

        if (!$assessmentType || $assessmentType === 'all' || $assessmentType === 'bsq') {
            // Get all BSQ results across all institutions
            $bsqQuery = BSQResult::with(['institution', 'assessor', 'approver', 'academicYear'])
                ->orderBy('assessment_date', 'desc');
            
            if ($academicYearId) {
                $bsqQuery->where('academic_year_id', $academicYearId);
            }
            
            $data['bsq_results'] = $perPage ? $bsqQuery->paginate($perPage) : $bsqQuery->get();
        }

        // For aggregate data, we don't provide institution-specific analytics
        $data['analytics'] = [
            'overall_analytics' => [
                'total_assessments' => 0,
                'average_performance' => 0,
                'improvement_percentage' => 0,
                'recommendations' => ['Müəssisə seçin daha detallı analitik üçün'],
                'risk_areas' => [],
                'success_factors' => []
            ]
        ];

        return $data;
    }

    private function calculateRankings($type, $academicYearId, $limit, $institutionType)
    {
        // Implementation placeholder for ranking calculation
        // This would calculate institution rankings based on assessment scores
        
        $query = Institution::select('institutions.*')
            ->with(['ksqResults', 'bsqResults'])
            ->where('is_active', true);

        if ($institutionType) {
            $query->where('type', $institutionType);
        }

        // Add ranking logic based on performance scores
        // This is a simplified version - real implementation would be more complex
        
        return $query->limit($limit)->get()->map(function ($institution) {
            return [
                'institution' => $institution,
                'overall_score' => 0, // Calculate from analytics service
                'ksq_score' => 0,
                'bsq_score' => 0,
                'rank_position' => 0
            ];
        });
    }
}