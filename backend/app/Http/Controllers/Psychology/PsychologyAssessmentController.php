<?php

namespace App\Http\Controllers\Psychology;

use App\Http\Controllers\Controller;
use App\Models\PsychologySession;
use App\Models\PsychologyAssessment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PsychologyAssessmentController extends Controller
{
    /**
     * Store a new assessment for a psychology session.
     */
    public function store(Request $request, PsychologySession $session): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'assessment_type' => 'required|in:behavioral,cognitive,emotional,social,academic,developmental,personality,trauma,anxiety,depression,adhd,autism,other',
            'assessment_tool' => 'required|string|max:255',
            'raw_scores' => 'required|array',
            'standardized_scores' => 'sometimes|array',
            'percentiles' => 'sometimes|array',
            'interpretation' => 'required|string|max:2000',
            'recommendations' => 'required|array|min:1',
            'recommendations.*' => 'string|max:500',
            'reliability' => 'sometimes|in:high,medium,low',
            'validity_concerns' => 'sometimes|string|max:1000',
            'administration_date' => 'required|date|before_or_equal:today',
            'duration_minutes' => 'required|integer|min:5|max:300',
            'environmental_factors' => 'sometimes|array',
            'behavioral_observations' => 'sometimes|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canAddAssessment($user, $session)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to add assessments to this session'
                ], 403);
            }

            DB::beginTransaction();

            // Calculate composite scores if applicable
            $compositeScores = $this->calculateCompositeScores(
                $request->assessment_type,
                $request->raw_scores
            );

            // Create the assessment
            $assessment = PsychologyAssessment::create([
                'psychology_session_id' => $session->id,
                'psychologist_id' => $user->id,
                'assessment_type' => $request->assessment_type,
                'assessment_tool' => $request->assessment_tool,
                'status' => 'draft',
                'raw_scores' => $request->raw_scores,
                'standardized_scores' => $request->standardized_scores ?? [],
                'percentiles' => $request->percentiles ?? [],
                'composite_scores' => $compositeScores,
                'interpretation' => $request->interpretation,
                'recommendations' => $request->recommendations,
                'reliability' => $request->reliability ?? 'medium',
                'validity_concerns' => $request->validity_concerns,
                'administration_date' => $request->administration_date,
                'duration_minutes' => $request->duration_minutes,
                'environmental_factors' => $request->environmental_factors ?? [],
                'behavioral_observations' => $request->behavioral_observations,
                'assessment_metadata' => [
                    'created_by' => $user->id,
                    'created_at' => now(),
                    'version' => '1.0',
                    'tool_version' => $this->getToolVersion($request->assessment_tool),
                ]
            ]);

            // Log the activity
            activity()
                ->performedOn($assessment)
                ->causedBy($user)
                ->withProperties([
                    'session_id' => $session->id,
                    'assessment_type' => $request->assessment_type,
                    'student_name' => $session->student->name,
                    'assessment_tool' => $request->assessment_tool
                ])
                ->log('Psychology assessment created');

            DB::commit();

            $assessment->load('psychologist:id,name,email');

            return response()->json([
                'success' => true,
                'data' => $this->transformAssessment($assessment),
                'message' => 'Assessment created successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating assessment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete an assessment (publish it).
     */
    public function complete(Request $request, PsychologyAssessment $assessment): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'final_interpretation' => 'sometimes|string|max:2000',
            'additional_recommendations' => 'sometimes|array',
            'additional_recommendations.*' => 'string|max:500',
            'supervisor_review' => 'sometimes|string|max:1000',
            'completion_notes' => 'sometimes|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canCompleteAssessment($user, $assessment)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to complete this assessment'
                ], 403);
            }

            if ($assessment->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Assessment is already completed'
                ], 400);
            }

            DB::beginTransaction();

            // Update assessment
            $updateData = [
                'status' => 'completed',
                'completed_at' => now(),
                'completed_by' => $user->id,
                'completion_notes' => $request->completion_notes,
                'assessment_metadata' => array_merge($assessment->assessment_metadata ?? [], [
                    'completed_by' => $user->id,
                    'completed_at' => now(),
                    'completion_version' => '1.0',
                ])
            ];

            if ($request->has('final_interpretation')) {
                $updateData['interpretation'] = $request->final_interpretation;
            }

            if ($request->has('additional_recommendations')) {
                $updateData['recommendations'] = array_merge(
                    $assessment->recommendations,
                    $request->additional_recommendations
                );
            }

            if ($request->has('supervisor_review')) {
                $updateData['assessment_metadata']['supervisor_review'] = $request->supervisor_review;
                $updateData['assessment_metadata']['reviewed_by'] = $user->id;
                $updateData['assessment_metadata']['reviewed_at'] = now();
            }

            $assessment->update($updateData);

            // Generate assessment report if needed
            $this->generateAssessmentReport($assessment);

            // Log the activity
            activity()
                ->performedOn($assessment)
                ->causedBy($user)
                ->withProperties([
                    'session_id' => $assessment->psychology_session_id,
                    'assessment_type' => $assessment->assessment_type
                ])
                ->log('Psychology assessment completed');

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $this->transformAssessment($assessment->fresh()),
                'message' => 'Assessment completed successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error completing assessment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get assessments for a session or institution.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => 'sometimes|exists:psychology_sessions,id',
            'institution_id' => 'sometimes|exists:institutions,id',
            'assessment_type' => 'sometimes|in:behavioral,cognitive,emotional,social,academic,developmental,personality,trauma,anxiety,depression,adhd,autism,other',
            'status' => 'sometimes|in:draft,in_progress,completed,archived',
            'psychologist_id' => 'sometimes|exists:users,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            $query = PsychologyAssessment::with([
                'psychologist:id,name,email',
                'session:id,student_id,session_type,scheduled_date',
                'session.student:id,name,email',
            ]);

            // Apply user-based filtering
            $this->applyUserFiltering($query, $user);

            // Apply request filters
            $this->applyRequestFilters($query, $request);

            // Sort by date
            $query->orderBy('administration_date', 'desc');

            // Paginate
            $perPage = $request->get('per_page', 15);
            $assessments = $query->paginate($perPage);

            $assessments->getCollection()->transform(function ($assessment) {
                return $this->transformAssessment($assessment);
            });

            return response()->json([
                'success' => true,
                'data' => $assessments,
                'filters' => $request->only([
                    'session_id', 'institution_id', 'assessment_type', 
                    'status', 'psychologist_id', 'start_date', 'end_date'
                ]),
                'message' => 'Assessments retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving assessments: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed assessment information.
     */
    public function show(PsychologyAssessment $assessment): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canViewAssessment($user, $assessment)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to view this assessment'
                ], 403);
            }

            $assessment->load([
                'psychologist:id,name,email',
                'psychologist.profile:user_id,specializations,qualifications',
                'session:id,student_id,session_type,scheduled_date,institution_id',
                'session.student:id,name,email',
                'session.student.profile:user_id,first_name,last_name,birth_date',
                'session.institution:id,name',
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'assessment' => $this->transformDetailedAssessment($assessment),
                    'permissions' => [
                        'can_edit' => $this->canEditAssessment($user, $assessment),
                        'can_complete' => $this->canCompleteAssessment($user, $assessment),
                        'can_archive' => $this->canArchiveAssessment($user, $assessment),
                    ]
                ],
                'message' => 'Assessment retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving assessment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get psychology statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'psychologist_id' => 'sometimes|exists:users,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'period' => 'sometimes|in:week,month,quarter,year',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();

            // Check permissions
            if (!$this->canViewStatistics($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to view statistics'
                ], 403);
            }

            $period = $request->get('period', 'month');
            $startDate = $request->get('start_date', $this->getStartDateForPeriod($period));
            $endDate = $request->get('end_date', now());

            // Build base queries
            $sessionQuery = PsychologySession::whereBetween('scheduled_date', [$startDate, $endDate]);
            $assessmentQuery = PsychologyAssessment::whereBetween('administration_date', [$startDate, $endDate]);

            // Apply user-based filtering
            $this->applyUserFilteringToStats($sessionQuery, $assessmentQuery, $user, $request);

            $statistics = [
                'sessions' => $this->getSessionStatistics($sessionQuery),
                'assessments' => $this->getAssessmentStatistics($assessmentQuery),
                'trends' => $this->getTrendData($sessionQuery, $assessmentQuery, $period),
                'performance' => $this->getPerformanceMetrics($sessionQuery, $assessmentQuery),
                'demographics' => $this->getDemographics($sessionQuery),
                'outcomes' => $this->getOutcomeMetrics($sessionQuery),
            ];

            return response()->json([
                'success' => true,
                'data' => $statistics,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'period' => $period
                ],
                'message' => 'Statistics retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    // Helper methods
    private function calculateCompositeScores($assessmentType, $rawScores): array
    {
        // Implementation for calculating composite scores based on assessment type
        // This would contain the actual scoring algorithms for different assessment tools
        return [];
    }

    private function getToolVersion($assessmentTool): string
    {
        // Return version information for the assessment tool
        return '1.0';
    }

    private function generateAssessmentReport($assessment): void
    {
        // Generate and store assessment report
        // This would create a formatted PDF report
    }

    private function transformAssessment($assessment): array
    {
        return [
            'id' => $assessment->id,
            'psychology_session_id' => $assessment->psychology_session_id,
            'psychologist' => $assessment->psychologist ? [
                'id' => $assessment->psychologist->id,
                'name' => $assessment->psychologist->name,
                'email' => $assessment->psychologist->email,
            ] : null,
            'session' => $assessment->session ? [
                'id' => $assessment->session->id,
                'session_type' => $assessment->session->session_type,
                'scheduled_date' => $assessment->session->scheduled_date,
                'student' => $assessment->session->student ? [
                    'id' => $assessment->session->student->id,
                    'name' => $assessment->session->student->name,
                ] : null,
            ] : null,
            'assessment_type' => $assessment->assessment_type,
            'assessment_tool' => $assessment->assessment_tool,
            'status' => $assessment->status,
            'administration_date' => $assessment->administration_date,
            'duration_minutes' => $assessment->duration_minutes,
            'reliability' => $assessment->reliability,
            'completed_at' => $assessment->completed_at,
            'created_at' => $assessment->created_at,
            'updated_at' => $assessment->updated_at,
        ];
    }

    private function transformDetailedAssessment($assessment): array
    {
        $basic = $this->transformAssessment($assessment);
        return array_merge($basic, [
            'raw_scores' => $assessment->raw_scores,
            'standardized_scores' => $assessment->standardized_scores,
            'percentiles' => $assessment->percentiles,
            'composite_scores' => $assessment->composite_scores,
            'interpretation' => $assessment->interpretation,
            'recommendations' => $assessment->recommendations,
            'validity_concerns' => $assessment->validity_concerns,
            'environmental_factors' => $assessment->environmental_factors,
            'behavioral_observations' => $assessment->behavioral_observations,
            'completion_notes' => $assessment->completion_notes,
            'assessment_metadata' => $assessment->assessment_metadata,
        ]);
    }

    // Permission methods
    private function canAddAssessment($user, $session): bool
    {
        return $user->id === $session->psychologist_id || $user->hasRole('SuperAdmin');
    }

    private function canCompleteAssessment($user, $assessment): bool
    {
        return $user->id === $assessment->psychologist_id || $user->hasRole('SuperAdmin');
    }

    private function canViewAssessment($user, $assessment): bool
    {
        if ($user->hasRole('SuperAdmin')) return true;
        if ($user->id === $assessment->psychologist_id) return true;
        if ($user->hasRole('SchoolAdmin') && $user->institution_id === $assessment->session->institution_id) return true;
        return false;
    }

    private function canEditAssessment($user, $assessment): bool
    {
        return $user->id === $assessment->psychologist_id && $assessment->status === 'draft';
    }

    private function canArchiveAssessment($user, $assessment): bool
    {
        return $user->hasRole('SuperAdmin') || $user->id === $assessment->psychologist_id;
    }

    private function canViewStatistics($user): bool
    {
        return $user->hasAnyRole(['SuperAdmin', 'RegionAdmin', 'SektorAdmin', 'SchoolAdmin', 'psixoloq']);
    }

    // Filtering methods
    private function applyUserFiltering($query, $user)
    {
        if ($user->hasRole('SuperAdmin')) {
            return;
        }

        if ($user->hasRole('psixoloq')) {
            $query->where('psychologist_id', $user->id);
        } elseif ($user->hasRole('SchoolAdmin')) {
            $query->whereHas('session', function($q) use ($user) {
                $q->where('institution_id', $user->institution_id);
            });
        }
    }

    private function applyRequestFilters($query, $request)
    {
        if ($request->has('session_id')) {
            $query->where('psychology_session_id', $request->session_id);
        }

        if ($request->has('institution_id')) {
            $query->whereHas('session', function($q) use ($request) {
                $q->where('institution_id', $request->institution_id);
            });
        }

        if ($request->has('assessment_type')) {
            $query->where('assessment_type', $request->assessment_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('psychologist_id')) {
            $query->where('psychologist_id', $request->psychologist_id);
        }

        if ($request->has('start_date')) {
            $query->whereDate('administration_date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->whereDate('administration_date', '<=', $request->end_date);
        }
    }

    // Statistics helper methods (placeholder implementations)
    private function getStartDateForPeriod($period): string
    {
        return match($period) {
            'week' => now()->subWeek()->toDateString(),
            'month' => now()->subMonth()->toDateString(),
            'quarter' => now()->subMonths(3)->toDateString(),
            'year' => now()->subYear()->toDateString(),
            default => now()->subMonth()->toDateString(),
        };
    }

    private function applyUserFilteringToStats($sessionQuery, $assessmentQuery, $user, $request): void
    {
        // Apply user-based filtering to both queries
    }

    private function getSessionStatistics($query): array { return []; }
    private function getAssessmentStatistics($query): array { return []; }
    private function getTrendData($sessionQuery, $assessmentQuery, $period): array { return []; }
    private function getPerformanceMetrics($sessionQuery, $assessmentQuery): array { return []; }
    private function getDemographics($query): array { return []; }
    private function getOutcomeMetrics($query): array { return []; }
}