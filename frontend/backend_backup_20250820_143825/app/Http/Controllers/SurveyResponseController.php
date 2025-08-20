<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\SurveyAuditLog;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SurveyResponseController extends Controller
{
    /**
     * Get survey responses with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'survey_id' => 'nullable|integer|exists:surveys,id',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'respondent_id' => 'nullable|integer|exists:users,id',
            'status' => 'nullable|string|in:draft,submitted,approved,rejected',
            'is_complete' => 'nullable|boolean',
            'my_responses' => 'nullable|boolean', // Only my responses
            'institution_responses' => 'nullable|boolean', // Only my institution's responses
            'sort_by' => 'nullable|string|in:created_at,updated_at,submitted_at,progress_percentage',
            'sort_direction' => 'nullable|string|in:asc,desc'
        ]);

        $query = SurveyResponse::with(['survey', 'institution', 'respondent.profile', 'approvedBy']);

        // Apply filters
        if ($request->survey_id) {
            $query->bySurvey($request->survey_id);
        }

        if ($request->institution_id) {
            $query->byInstitution($request->institution_id);
        }

        if ($request->respondent_id) {
            $query->byRespondent($request->respondent_id);
        }

        if ($request->status) {
            $query->byStatus($request->status);
        }

        if ($request->has('is_complete')) {
            if ($request->is_complete) {
                $query->completed();
            } else {
                $query->where('is_complete', false);
            }
        }

        if ($request->my_responses) {
            $query->byRespondent($request->user()->id);
        }

        if ($request->institution_responses) {
            $userInstitutionId = $request->user()->institution_id;
            if ($userInstitutionId) {
                $query->byInstitution($userInstitutionId);
            }
        }

        // Apply sorting
        $sortBy = $request->sort_by ?? 'created_at';
        $sortDirection = $request->sort_direction ?? 'desc';
        $query->orderBy($sortBy, $sortDirection);

        $responses = $query->paginate($request->per_page ?? 15);

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'survey_responses_list',
            'description' => 'Accessed survey responses list',
            'properties' => [
                'filters' => $request->only(['survey_id', 'status', 'my_responses', 'institution_responses']),
                'pagination' => [
                    'per_page' => $request->per_page ?? 15,
                    'page' => $request->page ?? 1
                ]
            ],
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'responses' => $responses->map(function ($response) {
                return $this->formatResponse($response);
            }),
            'meta' => [
                'current_page' => $responses->currentPage(),
                'last_page' => $responses->lastPage(),
                'per_page' => $responses->perPage(),
                'total' => $responses->total(),
                'from' => $responses->firstItem(),
                'to' => $responses->lastItem()
            ]
        ]);
    }

    /**
     * Get specific survey response
     */
    public function show(Request $request, SurveyResponse $response): JsonResponse
    {
        $response->load(['survey', 'institution', 'department', 'respondent.profile', 'approvedBy']);

        // Check permissions
        $canView = $response->respondent_id === $request->user()->id ||
                   $response->institution_id === $request->user()->institution_id ||
                   $response->survey->creator_id === $request->user()->id;

        if (!$canView) {
            return response()->json([
                'message' => 'You do not have permission to view this response'
            ], 403);
        }

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'survey_response_view',
            'entity_type' => 'SurveyResponse',
            'entity_id' => $response->id,
            'description' => "Viewed survey response for: {$response->survey->title}",
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'response' => [
                'id' => $response->id,
                'survey' => [
                    'id' => $response->survey->id,
                    'title' => $response->survey->title,
                    'survey_type' => $response->survey->survey_type,
                    'is_anonymous' => $response->survey->is_anonymous
                ],
                'institution' => [
                    'id' => $response->institution->id,
                    'name' => $response->institution->name,
                    'type' => $response->institution->type
                ],
                'department' => $response->department ? [
                    'id' => $response->department->id,
                    'name' => $response->department->name
                ] : null,
                'respondent' => $response->survey->is_anonymous ? null : [
                    'id' => $response->respondent->id,
                    'username' => $response->respondent->username,
                    'name' => $response->respondent->profile?->full_name ?? $response->respondent->username
                ],
                'respondent_role' => $response->respondent_role,
                'responses' => $response->responses,
                'progress_percentage' => $response->progress_percentage,
                'is_complete' => $response->is_complete,
                'status' => $response->status,
                'started_at' => $response->started_at,
                'submitted_at' => $response->submitted_at,
                'approved_at' => $response->approved_at,
                'approved_by' => $response->approvedBy ? [
                    'id' => $response->approvedBy->id,
                    'username' => $response->approvedBy->username,
                    'name' => $response->approvedBy->profile?->full_name ?? $response->approvedBy->username
                ] : null,
                'rejection_reason' => $response->rejection_reason,
                'metadata' => $response->metadata,
                'created_at' => $response->created_at,
                'updated_at' => $response->updated_at
            ]
        ]);
    }

    /**
     * Start or continue a survey response
     */
    public function start(Request $request, Survey $survey): JsonResponse
    {
        $request->validate([
            'department_id' => 'nullable|exists:departments,id'
        ]);

        $userInstitutionId = $request->user()->institution_id;

        if (!$userInstitutionId) {
            return response()->json([
                'message' => 'You must belong to an institution to respond to surveys'
            ], 422);
        }

        // Check if survey is open for responses
        if (!$survey->canInstitutionRespond($userInstitutionId)) {
            return response()->json([
                'message' => 'This survey is not available for your institution or has expired'
            ], 422);
        }

        // Check for existing response
        $existingResponse = SurveyResponse::where('survey_id', $survey->id)
            ->where('institution_id', $userInstitutionId)
            ->where('respondent_id', $request->user()->id)
            ->first();

        if ($existingResponse) {
            if ($existingResponse->is_complete && !$survey->allow_multiple_responses) {
                return response()->json([
                    'message' => 'You have already completed this survey',
                    'response' => $this->formatResponse($existingResponse)
                ], 422);
            }

            // Return existing draft response
            return response()->json([
                'message' => 'Continuing existing response',
                'response' => $this->formatResponse($existingResponse)
            ]);
        }

        try {
            DB::beginTransaction();

            // Create new response
            $response = SurveyResponse::create([
                'survey_id' => $survey->id,
                'institution_id' => $userInstitutionId,
                'department_id' => $request->department_id,
                'respondent_id' => $request->user()->id,
                'respondent_role' => $request->user()->role?->name,
                'responses' => [],
                'progress_percentage' => 0,
                'is_complete' => false,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'started_at' => now(),
                'status' => 'draft',
                'metadata' => []
            ]);

            $response->load(['survey', 'institution', 'respondent.profile']);

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'survey_response_start',
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Started survey response for: {$survey->title}",
                'institution_id' => $userInstitutionId
            ]);

            // Log audit
            SurveyAuditLog::create([
                'survey_id' => $survey->id,
                'response_id' => $response->id,
                'user_id' => $request->user()->id,
                'action' => 'started',
                'details' => [
                    'institution_id' => $userInstitutionId,
                    'department_id' => $request->department_id
                ],
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Survey response started successfully',
                'response' => $this->formatResponse($response)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to start survey response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save survey response (partial or complete)
     */
    public function save(Request $request, SurveyResponse $response): JsonResponse
    {
        // Check permissions
        if ($response->respondent_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only update your own responses'
            ], 403);
        }

        if ($response->status !== 'draft') {
            return response()->json([
                'message' => 'Cannot modify submitted responses'
            ], 422);
        }

        $request->validate([
            'responses' => 'required|array',
            'auto_submit' => 'nullable|boolean' // Auto-submit if complete
        ]);

        try {
            DB::beginTransaction();

            $oldData = $response->toArray();

            // Update responses
            $response->responses = $request->responses;
            $response->updateProgress();
            $response->save();

            // Auto-submit if complete and requested
            if ($request->auto_submit && $response->is_complete) {
                $response->submit();
            }

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'survey_response_save',
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Saved survey response for: {$response->survey->title}",
                'before_state' => $oldData,
                'after_state' => $response->toArray(),
                'institution_id' => $request->user()->institution_id
            ]);

            // Log audit
            SurveyAuditLog::create([
                'survey_id' => $response->survey_id,
                'response_id' => $response->id,
                'user_id' => $request->user()->id,
                'action' => $response->status === 'submitted' ? 'submitted' : 'saved',
                'details' => [
                    'progress_percentage' => $response->progress_percentage,
                    'is_complete' => $response->is_complete,
                    'auto_submitted' => $request->auto_submit && $response->is_complete
                ],
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => $response->status === 'submitted' ? 'Survey response submitted successfully' : 'Survey response saved successfully',
                'response' => $this->formatResponse($response)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to save survey response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit survey response
     */
    public function submit(Request $request, SurveyResponse $response): JsonResponse
    {
        // Check permissions
        if ($response->respondent_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only submit your own responses'
            ], 403);
        }

        if ($response->status !== 'draft') {
            return response()->json([
                'message' => 'Response has already been submitted'
            ], 422);
        }

        if (!$response->is_complete) {
            return response()->json([
                'message' => 'Response must be complete before submission'
            ], 422);
        }

        try {
            DB::beginTransaction();

            $response->submit();

            // Update survey response count
            $response->survey->increment('response_count');

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'survey_response_submit',
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Submitted survey response for: {$response->survey->title}",
                'institution_id' => $request->user()->institution_id
            ]);

            // Log audit
            SurveyAuditLog::create([
                'survey_id' => $response->survey_id,
                'response_id' => $response->id,
                'user_id' => $request->user()->id,
                'action' => 'submitted',
                'details' => [
                    'submitted_at' => $response->submitted_at,
                    'progress_percentage' => $response->progress_percentage
                ],
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Survey response submitted successfully',
                'response' => $this->formatResponse($response)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to submit survey response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve survey response
     */
    public function approve(Request $request, SurveyResponse $response): JsonResponse
    {
        if ($response->status !== 'submitted') {
            return response()->json([
                'message' => 'Only submitted responses can be approved'
            ], 422);
        }

        try {
            DB::beginTransaction();

            $response->approve($request->user());

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'survey_response_approve',
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Approved survey response for: {$response->survey->title}",
                'institution_id' => $request->user()->institution_id
            ]);

            // Log audit
            SurveyAuditLog::create([
                'survey_id' => $response->survey_id,
                'response_id' => $response->id,
                'user_id' => $request->user()->id,
                'action' => 'approved',
                'details' => [
                    'approved_at' => $response->approved_at,
                    'approved_by' => $request->user()->id
                ],
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Survey response approved successfully',
                'response' => $this->formatResponse($response)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to approve survey response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject survey response
     */
    public function reject(Request $request, SurveyResponse $response): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:1000'
        ]);

        if ($response->status !== 'submitted') {
            return response()->json([
                'message' => 'Only submitted responses can be rejected'
            ], 422);
        }

        try {
            DB::beginTransaction();

            $response->reject($request->reason);

            DB::commit();

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $request->user()->id,
                'activity_type' => 'survey_response_reject',
                'entity_type' => 'SurveyResponse',
                'entity_id' => $response->id,
                'description' => "Rejected survey response for: {$response->survey->title}",
                'institution_id' => $request->user()->institution_id
            ]);

            // Log audit
            SurveyAuditLog::create([
                'survey_id' => $response->survey_id,
                'response_id' => $response->id,
                'user_id' => $request->user()->id,
                'action' => 'rejected',
                'details' => [
                    'rejection_reason' => $request->reason
                ],
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Survey response rejected successfully',
                'response' => $this->formatResponse($response)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to reject survey response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete survey response
     */
    public function destroy(Request $request, SurveyResponse $response): JsonResponse
    {
        // Check permissions
        if ($response->respondent_id !== $request->user()->id && $response->survey->creator_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only delete your own responses or responses to your surveys'
            ], 403);
        }

        if ($response->status === 'approved') {
            return response()->json([
                'message' => 'Cannot delete approved responses'
            ], 422);
        }

        $oldData = $response->toArray();

        $response->delete();

        // Update survey response count
        if ($response->status === 'submitted') {
            $response->survey->decrement('response_count');
        }

        // Log activity
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'survey_response_delete',
            'entity_type' => 'SurveyResponse',
            'entity_id' => $response->id,
            'description' => "Deleted survey response for: {$response->survey->title}",
            'before_state' => $oldData,
            'institution_id' => $request->user()->institution_id
        ]);

        return response()->json([
            'message' => 'Survey response deleted successfully'
        ]);
    }

    /**
     * Get response statistics
     */
    public function statistics(Request $request, SurveyResponse $response): JsonResponse
    {
        // Check permissions
        $canView = $response->respondent_id === $request->user()->id ||
                   $response->institution_id === $request->user()->institution_id ||
                   $response->survey->creator_id === $request->user()->id;

        if (!$canView) {
            return response()->json([
                'message' => 'You do not have permission to view this response statistics'
            ], 403);
        }

        $stats = [
            'progress' => [
                'percentage' => $response->progress_percentage,
                'is_complete' => $response->is_complete
            ],
            'timing' => [
                'started_at' => $response->started_at,
                'submitted_at' => $response->submitted_at,
                'time_spent' => $response->submitted_at ? 
                    $response->started_at->diffInMinutes($response->submitted_at) : null
            ],
            'status' => [
                'current' => $response->status,
                'is_draft' => $response->isDraft(),
                'is_submitted' => $response->isSubmitted(),
                'is_approved' => $response->isApproved(),
                'is_rejected' => $response->isRejected()
            ]
        ];

        // Add question-level statistics if response is complete
        if ($response->is_complete && $response->survey->structure) {
            $questionStats = [];
            foreach ($response->survey->structure['sections'] ?? [] as $section) {
                foreach ($section['questions'] ?? [] as $question) {
                    $questionId = $question['id'];
                    $hasResponse = isset($response->responses[$questionId]) && 
                                   $response->responses[$questionId] !== null && 
                                   $response->responses[$questionId] !== '';
                    
                    $questionStats[$questionId] = [
                        'question' => $question['question'],
                        'type' => $question['type'],
                        'has_response' => $hasResponse,
                        'response_length' => $hasResponse ? 
                            (is_string($response->responses[$questionId]) ? 
                                strlen($response->responses[$questionId]) : null) : null
                    ];
                }
            }
            $stats['questions'] = $questionStats;
        }

        return response()->json(['statistics' => $stats]);
    }

    /**
     * Format response for API output
     */
    private function formatResponse($response): array
    {
        return [
            'id' => $response->id,
            'survey' => [
                'id' => $response->survey->id,
                'title' => $response->survey->title,
                'survey_type' => $response->survey->survey_type,
                'is_anonymous' => $response->survey->is_anonymous
            ],
            'institution' => [
                'id' => $response->institution->id,
                'name' => $response->institution->name,
                'type' => $response->institution->type
            ],
            'respondent' => $response->survey->is_anonymous ? null : [
                'id' => $response->respondent->id,
                'username' => $response->respondent->username,
                'name' => $response->respondent->profile?->full_name ?? $response->respondent->username
            ],
            'respondent_role' => $response->respondent_role,
            'progress_percentage' => $response->progress_percentage,
            'is_complete' => $response->is_complete,
            'status' => $response->status,
            'started_at' => $response->started_at,
            'submitted_at' => $response->submitted_at,
            'approved_at' => $response->approved_at,
            'created_at' => $response->created_at,
            'updated_at' => $response->updated_at
        ];
    }
}