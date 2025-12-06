<?php

namespace App\Services;

use App\Jobs\BulkApprovalJob;
use App\Models\ApprovalAction;
use App\Models\ApprovalWorkflow;
use App\Models\DataApprovalRequest;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Services\SurveyApproval\Domains\Security\ApprovalSecurityService;
use App\Services\SurveyApproval\Utilities\SurveyApprovalWorkflowResolver;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SurveyApprovalService extends BaseService
{
    protected string $modelClass = SurveyResponse::class;

    protected array $relationships = ['institution', 'department', 'respondent', 'approvalRequest'];

    protected int $cacheMinutes = 3; // Short cache for approval data

    protected ApprovalSecurityService $securityService;

    protected SurveyApprovalWorkflowResolver $workflowResolver;

    public function __construct()
    {
        // Don't call parent::__construct() as BaseService doesn't define a constructor
        $this->securityService = app(ApprovalSecurityService::class);
        $this->workflowResolver = app(SurveyApprovalWorkflowResolver::class);
    }

    /**
     * Get survey responses that need approval for a specific survey
     */
    public function getResponsesForApproval(Survey $survey, Request $request, User $user): array
    {
        \Log::info('🔍 [APPROVAL] Getting responses for approval', [
            'survey_id' => $survey->id,
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_role' => $user->role->name ?? $user->roles->pluck('name')->first() ?? 'unknown',
            'user_institution_id' => $user->institution_id,
            'user_institution_name' => $user->institution?->name,
            'filters' => $request->all(),
        ]);

        $query = SurveyResponse::where('survey_id', $survey->id)
            ->with([
                'institution:id,name,type,parent_id',
                'department:id,name',
                'respondent' => function ($query) {
                    $query->select('id', 'username', 'email')
                        ->with('profile:user_id,first_name,last_name');
                },
                'approvalRequest:id,approvalable_id,current_status,current_approval_level,submitted_at,completed_at',
                'approvalRequest.approvalActions:id,approval_request_id,approver_id,action,comments,action_taken_at',
            ])
            ->select(['id', 'survey_id', 'institution_id', 'department_id', 'respondent_id', 'status', 'responses', 'submitted_at', 'approved_at', 'progress_percentage']);

        // Apply user access control based on role hierarchy
        $this->applyUserAccessControl($query, $user);

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->get('institution_id'));
        }

        if ($request->filled('institution_type')) {
            $query->whereHas('institution', function ($q) use ($request) {
                $q->where('type', $request->get('institution_type'));
            });
        }

        if ($request->filled('date_from')) {
            $query->where('submitted_at', '>=', $request->get('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('submitted_at', '<=', $request->get('date_to'));
        }

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->whereHas('institution', function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%");
            });
        }

        // Apply approval status filter
        if ($request->filled('approval_status')) {
            $approvalStatus = $request->get('approval_status');
            $query->whereHas('approvalRequest', function ($q) use ($approvalStatus) {
                $q->where('current_status', $approvalStatus);
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 25);
        $responses = $query->orderBy('submitted_at', 'desc')->paginate($perPage);

        \Log::info('✅ [APPROVAL] Query executed', [
            'total_found' => $responses->total(),
            'per_page' => $perPage,
            'current_page' => $responses->currentPage(),
            'response_ids' => $responses->pluck('id')->toArray(),
            'institutions' => $responses->pluck('institution.name')->toArray(),
        ]);

        // Ensure respondent names are properly loaded
        foreach ($responses->items() as $response) {
            if ($response->respondent) {
                // Make sure the name attribute is properly included
                $response->respondent->makeVisible(['name']);
                $response->respondent->append('name');
            }
        }

        return [
            'responses' => $responses->items(),
            'pagination' => [
                'current_page' => $responses->currentPage(),
                'last_page' => $responses->lastPage(),
                'per_page' => $responses->perPage(),
                'total' => $responses->total(),
            ],
            'stats' => $this->getApprovalStats($survey, $user),
        ];
    }

    /**
     * Create approval request for a survey response
     *
     * REFACTORED: Uses SurveyApprovalWorkflowResolver (2025-11-14)
     */
    public function createApprovalRequest(SurveyResponse $response, array $data = []): DataApprovalRequest
    {
        // Check if approval request already exists
        if ($response->approvalRequest) {
            throw new \Exception('Approval request already exists for this response');
        }

        // Get workflow using resolver (single source of truth)
        $workflow = $this->workflowResolver->getOrCreateSurveyApprovalWorkflow();

        return DB::transaction(function () use ($response, $workflow, $data) {
            $initialLevel = $this->workflowResolver->getInitialApprovalLevel($workflow);

            $approvalRequest = DataApprovalRequest::create([
                'workflow_id' => $workflow->id,
                'institution_id' => $response->institution_id,
                'approvalable_type' => 'App\Models\SurveyResponse',
                'approvalable_id' => $response->id,
                'submitted_by' => Auth::id(),
                'submitted_at' => now(),
                'current_status' => 'pending',
                'current_approval_level' => $initialLevel,
                'submission_notes' => $data['notes'] ?? null,
                'request_metadata' => [
                    'survey_id' => $response->survey_id,
                    'institution_id' => $response->institution_id,
                    'response_summary' => $this->generateResponseSummary($response),
                ],
                'deadline' => $data['deadline'] ?? Carbon::now()->addDays(7),
            ]);

            // Update response status
            $response->update(['status' => 'submitted']);

            // Clear cache for approval stats
            $this->clearApprovalCache($response->survey_id);

            return $approvalRequest;
        });
    }

    /**
     * Approve a survey response
     */
    public function approveResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;

            if (! $approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            $workflow = $approvalRequest->workflow;
            $currentLevel = (int) ($approvalRequest->current_approval_level ?? 1);
            $targetLevel = $this->determineApprovalLevelForApprover($approvalRequest, $workflow, $approver);

            // Create approval action
            ApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'approver_id' => $approver->id,
                'approval_level' => $targetLevel,
                'action' => 'approved',
                'comments' => $data['comments'] ?? null,
                'action_metadata' => $data['metadata'] ?? null,
                'action_taken_at' => now(),
            ]);

            $currentLevel = $targetLevel;

            // SuperAdmin approval completes the chain immediately (case-insensitive)
            $approverRole = $approver->role->name ?? $approver->roles->pluck('name')->first() ?? null;
            $isSuperAdmin = $approverRole && strtolower($approverRole) === 'superadmin';

            // Check if this completes the approval chain
            if ($isSuperAdmin || $workflow->isFullyApproved($currentLevel)) {
                // Approval complete
                $approvalRequest->update([
                    'current_status' => 'approved',
                    'current_approval_level' => $currentLevel,
                    'completed_at' => now(),
                ]);

                $response->update([
                    'status' => 'approved',
                    'approved_by' => $approver->id,
                    'approved_at' => now(),
                ]);

                // Clear cache for approval stats
                $this->clearApprovalCache($response->survey_id);

                return ['status' => 'completed', 'message' => 'Response fully approved'];
            }
            $nextLevel = $this->getNextRequiredApprovalLevel($workflow, $currentLevel);

            if ($nextLevel === null) {
                // No further required levels, treat as fully approved
                $approvalRequest->update([
                    'current_status' => 'approved',
                    'current_approval_level' => $currentLevel,
                    'completed_at' => now(),
                ]);

                $response->update([
                    'status' => 'approved',
                    'approved_by' => $approver->id,
                    'approved_at' => now(),
                ]);

                $this->clearApprovalCache($response->survey_id);

                return ['status' => 'completed', 'message' => 'Response fully approved'];
            }

            // Move to next level
            $approvalRequest->update([
                'current_approval_level' => $nextLevel,
                'current_status' => 'in_progress',
            ]);

            return ['status' => 'in_progress', 'message' => 'Moved to next approval level'];
        });
    }

    /**
     * Reject a survey response
     */
    public function rejectResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        $transactionResult = DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;

            if (! $approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            $workflow = $approvalRequest->workflow;
            $targetLevel = $this->determineApprovalLevelForApprover($approvalRequest, $workflow, $approver);

            // Create rejection action
            ApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'approver_id' => $approver->id,
                'approval_level' => $targetLevel,
                'action' => 'rejected',
                'comments' => $data['comments'] ?? null,
                'action_metadata' => $data['metadata'] ?? null,
                'action_taken_at' => now(),
            ]);

            // Update request and response status
            $approvalRequest->update([
                'current_status' => 'rejected',
                'current_approval_level' => $targetLevel,
                'completed_at' => now(),
            ]);

            $response->update([
                'status' => 'rejected',
                'rejection_reason' => $data['comments'] ?? 'Response rejected',
            ]);

            // Clear cache for approval stats
            $this->clearApprovalCache($response->survey_id);

            return [
                'result' => ['status' => 'rejected', 'message' => 'Response rejected'],
                'response' => $response->fresh([
                    'institution',
                    'respondent',
                    'approvalRequest.submitter',
                    'approvalRequest.institution',
                    'approvalRequest.workflow',
                ]),
            ];
        });

        /** @var SurveyResponse|null $freshResponse */
        $freshResponse = $transactionResult['response'] ?? null;

        if ($freshResponse && $freshResponse->approvalRequest) {
            $this->notifySubmitterAboutRejection(
                $freshResponse->approvalRequest,
                $freshResponse,
                $approver,
                $data['comments'] ?? null
            );
        }

        return $transactionResult['result'] ?? ['status' => 'rejected', 'message' => 'Response rejected'];
    }

    /**
     * Return response for revision
     */
    public function returnForRevision(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;

            if (! $approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            $workflow = $approvalRequest->workflow;
            $targetLevel = $this->determineApprovalLevelForApprover($approvalRequest, $workflow, $approver);

            // Create return action
            ApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'approver_id' => $approver->id,
                'approval_level' => $targetLevel,
                'action' => 'returned',
                'comments' => $data['comments'] ?? null,
                'action_metadata' => $data['metadata'] ?? null,
                'action_taken_at' => now(),
            ]);

            // Reset to draft for revision
            $approvalRequest->update([
                'current_status' => 'returned',
                'current_approval_level' => 1,
            ]);

            $response->update(['status' => 'draft']);

            // Clear cache for approval stats
            $this->clearApprovalCache($response->survey_id);

            return ['status' => 'returned', 'message' => 'Response returned for revision'];
        });
    }

    /**
     * Bulk approval operations with queue processing
     */
    public function bulkApprovalOperation(array $responseIds, string $action, User $approver, array $data = []): array
    {
        $jobId = uniqid('bulk_approval_', true);
        $comments = $data['comments'] ?? null;

        // For small batches (<=20), process synchronously
        if (count($responseIds) <= 20) {
            return $this->processBulkApprovalSync($responseIds, $action, $approver, $comments);
        }

        // For larger batches, dispatch to background job
        BulkApprovalJob::dispatch($responseIds, $action, $approver->id, $comments, $jobId);

        return [
            'job_id' => $jobId,
            'status' => 'queued',
            'total' => count($responseIds),
            'message' => 'Bulk approval operation has been queued for background processing',
            'estimated_completion' => now()->addMinutes(ceil(count($responseIds) / 50))->toISOString(),
        ];
    }

    /**
     * Process bulk approval operations synchronously
     */
    public function processBulkApprovalSync(array $responseIds, string $action, User $approver, ?string $comments = null): array
    {
        $results = [];
        $errors = [];

        \Log::info('🚀 [BulkApproval] Starting sync processing', [
            'response_count' => count($responseIds),
            'response_ids' => $responseIds,
            'action' => $action,
            'approver_id' => $approver->id,
            'approver_role' => $approver->role,
        ]);

        DB::transaction(function () use ($responseIds, $action, $approver, $comments, &$results, &$errors) {
            foreach ($responseIds as $responseId) {
                try {
                    \Log::info('📋 [BulkApproval] Processing response', [
                        'response_id' => $responseId,
                        'action' => $action,
                    ]);

                    $result = $this->processIndividualApproval($responseId, $action, $approver, $comments);

                    $results[] = [
                        'response_id' => $responseId,
                        'status' => 'success',
                        'result' => $result,
                    ];

                    \Log::info('✅ [BulkApproval] Response processed successfully', [
                        'response_id' => $responseId,
                        'result' => $result,
                    ]);
                } catch (\Exception $e) {
                    $errors[] = [
                        'response_id' => $responseId,
                        'error' => $e->getMessage(),
                    ];

                    \Log::error('❌ [BulkApproval] Response processing failed', [
                        'response_id' => $responseId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }
        });

        $finalResult = [
            'successful' => count($results),
            'failed' => count($errors),
            'results' => $results,
            'errors' => $errors,
        ];

        \Log::info('🏁 [BulkApproval] Sync processing completed', $finalResult);

        return $finalResult;
    }

    /**
     * Process individual approval operation
     */
    public function processIndividualApproval(int $responseId, string $action, User $approver, ?string $comments = null): bool
    {
        $response = SurveyResponse::findOrFail($responseId);

        // Check if user has permission to approve this specific response
        if (! $this->canUserApproveResponse($response, $approver)) {
            throw new \Exception("User does not have permission to approve this response (ID: {$responseId})");
        }

        $result = match ($action) {
            'approve' => $this->approveResponse($response, $approver, ['comments' => $comments]),
            'reject' => $this->rejectResponse($response, $approver, ['comments' => $comments ?? 'Bulk rejection']),
            'return' => $this->returnForRevision($response, $approver, ['comments' => $comments ?? 'Returned for revision']),
            default => throw new \Exception("Invalid action: {$action}")
        };

        // Since approval methods return arrays with status info, check if they succeeded
        return is_array($result) && ! empty($result);
    }

    /**
     * Check if user can approve a specific response based on current approval state
     */
    private function canUserApproveResponse(SurveyResponse $response, User $approver): bool
    {
        $approvalRequest = $response->approvalRequest;

        if (! $approvalRequest) {
            return false;
        }

        // Must be submitted status
        if ($response->status !== 'submitted') {
            return false;
        }

        $currentStatus = $approvalRequest->current_status;
        $currentLevel = $approvalRequest->current_approval_level;

        // SuperAdmin can approve any pending or in_progress approval
        if ($approver->hasRole('superadmin')) {
            return in_array($currentStatus, ['pending', 'in_progress']);
        }

        // SektorAdmin can approve responses from schools in their sector
        if ($approver->hasRole('sektoradmin')) {
            $responseInstitution = $response->institution;
            if (! $responseInstitution) {
                return false;
            }

            $approverInstitution = $approver->institution;
            if (! $approverInstitution) {
                return false;
            }

            // Check if response is from a school under this sector
            // Schools have parent_id pointing to sector
            if ($responseInstitution->parent_id === $approverInstitution->id) {
                return in_array($currentStatus, ['pending', 'in_progress']);
            }

            return false;
        }

        // RegionAdmin can approve responses from institutions in their region
        if ($approver->hasRole('regionadmin')) {
            // Check if response institution is within RegionAdmin's region
            $responseInstitution = $response->institution;
            if (! $responseInstitution) {
                return false;
            }

            // Check region_id match
            if ($responseInstitution->region_id === $approver->region_id) {
                return in_array($currentStatus, ['pending', 'in_progress']);
            }

            return false;
        }

        // Check if status allows approval for other roles
        if ($currentStatus === 'pending') {
            return true; // Anyone with approval permission can start the chain
        }

        if ($currentStatus === 'in_progress') {
            // Other role-level checks can be added here if needed
            return false;
        }

        return false;
    }

    /**
     * Update survey response data
     */
    public function updateResponseData(SurveyResponse $response, array $responseData): SurveyResponse
    {
        return DB::transaction(function () use ($response, $responseData) {
            $response->update([
                'responses' => $responseData,
                'progress_percentage' => 100,
                'is_complete' => true,
            ]);

            // If response has approval request, log the edit
            if ($response->approvalRequest) {
                ApprovalAction::create([
                    'approval_request_id' => $response->approvalRequest->id,
                    'approver_id' => Auth::id(),
                    'approval_level' => $response->approvalRequest->current_approval_level,
                    'action' => 'edited',
                    'comments' => 'Response data updated',
                    'action_metadata' => ['edited_fields' => array_keys($responseData)],
                    'action_taken_at' => now(),
                ]);
            }

            return $response->fresh();
        });
    }

    /**
     * Get approval statistics for a survey
     */
    private function getApprovalStats(Survey $survey, User $user): array
    {
        $cacheKey = $this->getCacheKey('approval_stats', [
            'survey_id' => $survey->id,
            'user_id' => $user->id,
            'user_role' => $user->role?->name ?? 'unknown',
        ]);

        return $this->cacheQuery($cacheKey, function () use ($survey, $user) {
            $baseQuery = SurveyResponse::where('survey_id', $survey->id);
            $this->applyUserAccessControl($baseQuery, $user);

            // Single query to get all stats with aggregation
            $stats = $baseQuery->select(
                DB::raw('COUNT(*) as total'),
                DB::raw("COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending"),
                DB::raw("COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved"),
                DB::raw("COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected"),
                DB::raw("COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft")
            )->first();

            $total = $stats->total ?? 0;
            $approved = $stats->approved ?? 0;
            $rejected = $stats->rejected ?? 0;

            return [
                'total' => $total,
                'pending' => $stats->pending ?? 0,
                'approved' => $approved,
                'rejected' => $rejected,
                'draft' => $stats->draft ?? 0,
                'completion_rate' => $total > 0 ? round(($approved + $rejected) / $total * 100, 2) : 0,
            ];
        }, $this->cacheMinutes);
    }

    /**
     * Apply user access control based on role hierarchy
     *
     * REFACTORED: Delegated to ApprovalSecurityService (2025-11-14)
     * REASON: Single source of truth for security logic
     */
    private function applyUserAccessControl($query, User $user): void
    {
        $this->securityService->applyUserAccessControl($query, $user);
    }

    /**
     * Determine the appropriate approval level for the current approver
     *
     * REFACTORED: Delegated to ApprovalSecurityService (2025-11-14)
     * REASON: Single source of truth for security logic
     */
    private function determineApprovalLevelForApprover(DataApprovalRequest $approvalRequest, ApprovalWorkflow $workflow, User $approver): int
    {
        return $this->securityService->determineApprovalLevelForApprover($approvalRequest, $workflow, $approver);
    }

    /**
     * Notify submitter/respondent that their response was rejected
     *
     * DELEGATED to SurveyNotificationService (Sprint 7 Phase 2)
     */
    private function notifySubmitterAboutRejection(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver,
        ?string $reason
    ): void {
        $notificationService = app(\App\Services\SurveyNotificationService::class);
        $notificationService->notifySubmitterAboutRejection($approvalRequest, $response, $approver, $reason);
    }

    /**
     * Get the next required approval level for the workflow
     */
    private function getNextRequiredApprovalLevel(ApprovalWorkflow $workflow, int $currentLevel): ?int
    {
        $chain = $workflow->approval_chain ?? [];
        $requireAllLevels = (bool) data_get($workflow->workflow_config, 'require_all_levels', false);

        foreach ($chain as $step) {
            $level = isset($step['level']) ? (int) $step['level'] : null;
            if (! $level || $level <= $currentLevel) {
                continue;
            }

            $isRequired = $step['required'] ?? true;

            if ($requireAllLevels || $isRequired) {
                return $level;
            }
        }

        return null;
    }

    /**
     * Allow external services to refresh approval caches after status changes
     */
    public static function refreshCacheForSurvey(int $surveyId): void
    {
        (new self)->clearApprovalCache($surveyId);
    }

    /**
     * Generate response summary for metadata
     */
    private function generateResponseSummary(SurveyResponse $response): array
    {
        $responses = $response->responses ?? [];

        return [
            'total_questions' => count($responses),
            'completion_percentage' => $response->progress_percentage,
            'submitted_at' => $response->submitted_at?->toISOString(),
            'institution_name' => $response->institution?->name,
        ];
    }

    /**
     * Get responses organized for table editing interface
     * EXTEND existing getResponsesForApproval method
     */
    public function getResponsesForTableView(Survey $survey, Request $request, User $user): array
    {
        // Use existing method as base
        $baseData = $this->getResponsesForApproval($survey, $request, $user);

        // Group responses by institution for table view
        $responses = $baseData['responses'] ?? [];
        $institutionGroups = collect($responses)->groupBy('institution_id');

        // Get survey questions for table headers
        $questions = $survey->questions()->active()->ordered()->get();

        // Build institution matrix with editing permissions
        $institutionMatrix = [];
        foreach ($institutionGroups as $institutionId => $institutionResponses) {
            $institution = $institutionResponses->first()->institution ?? null;
            if (! $institution) {
                continue;
            }

            $institutionMatrix[$institutionId] = [
                'institution' => [
                    'id' => $institution->id,
                    'name' => $institution->name,
                    'type' => $institution->type,
                    'code' => $institution->code ?? 'N/A',
                ],
                'responses' => $this->buildResponseMatrix($institutionResponses, $questions),
                'respondents_count' => $institutionResponses->count(),
                'can_edit' => $this->canUserEditInstitutionResponse($user, $institution),
                'can_approve' => $this->canUserApproveInstitutionResponse($user, $institution),
            ];
        }

        return [
            'institutions' => $institutionMatrix,
            'questions' => $questions,
            'stats' => $baseData['stats'] ?? [],
        ];
    }

    /**
     * Batch update multiple responses (leveraging existing updateResponseData)
     * NO duplicate - uses existing method in loop with transaction
     */
    public function batchUpdateResponses(array $updates, User $user): array
    {
        $results = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($updates as $update) {
                try {
                    $response = SurveyResponse::findOrFail($update['response_id']);

                    // Check permissions
                    if (! $this->canUserEditInstitutionResponse($user, $response->institution)) {
                        $errors[] = "No permission to edit institution: {$response->institution->name}";

                        continue;
                    }

                    // Use existing updateResponseData method
                    $updatedResponse = $this->updateResponseData($response, $update['responses']);

                    $results[] = [
                        'response_id' => $response->id,
                        'institution' => $response->institution->name,
                        'status' => 'updated',
                    ];
                } catch (\Exception $e) {
                    $errors[] = "Error updating response {$update['response_id']}: " . $e->getMessage();
                }
            }

            if (empty($errors)) {
                DB::commit();
            } else {
                DB::rollback();
            }
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }

        return [
            'successful' => count($results),
            'failed' => count($errors),
            'results' => $results,
            'errors' => $errors,
        ];
    }

    /**
     * Build response matrix for table display
     */
    private function buildResponseMatrix($institutionResponses, $questions): array
    {
        $responseMatrix = [];

        foreach ($institutionResponses as $response) {
            $questionResponses = [];

            foreach ($questions as $question) {
                $questionId = (string) $question->id;
                $responseValue = $response->responses[$questionId] ?? null;

                $questionResponses[$questionId] = [
                    'question' => [
                        'id' => $question->id,
                        'title' => $question->title,
                        'type' => $question->type,
                        'is_required' => $question->is_required,
                        'options' => $question->options,
                    ],
                    'value' => $responseValue,
                    'is_editable' => true,
                ];
            }

            // Ensure respondent name is available
            if ($response->respondent) {
                $response->respondent->makeVisible(['name']);
                $response->respondent->append('name');
            }

            $responseMatrix[] = [
                'id' => $response->id,
                'respondent' => [
                    'id' => $response->respondent->id,
                    'name' => $response->respondent->name,
                    'email' => $response->respondent->email,
                ],
                'questions' => $questionResponses,
                'submitted_at' => $response->submitted_at,
                'status' => $response->status,
            ];
        }

        return $responseMatrix;
    }

    /**
     * Check if user can edit institution responses (enhanced permission check)
     */
    private function canUserEditInstitutionResponse(User $user, $institution): bool
    {
        $userRole = $user->role?->name ?? $user->roles->pluck('name')->first();

        switch ($userRole) {
            case 'superadmin':
                return true;
            case 'regionadmin':
                return $user->institution && in_array(
                    $institution->id,
                    $user->institution->getAllChildrenIds()
                );
            case 'sektoradmin':
                return $user->institution && in_array(
                    $institution->id,
                    $user->institution->getAllChildrenIds()
                );
            default:
                return false;
        }
    }

    /**
     * Check if user can approve institution responses
     */
    private function canUserApproveInstitutionResponse(User $user, $institution): bool
    {
        // Same logic as edit for now, can be customized later
        return $this->canUserEditInstitutionResponse($user, $institution);
    }

    /**
     * Export survey responses to Excel format
     *
     * DELEGATED to SurveyExportService (Sprint 7 Phase 1)
     */
    public function exportSurveyResponses(Survey $survey, Request $request, User $user): array
    {
        $exportService = app(\App\Services\SurveyExportService::class);

        return $exportService->exportSurveyResponses($survey, $request, $user);
    }

    /**
     * Clear approval-related cache for a survey
     */
    private function clearApprovalCache(int $surveyId): void
    {
        // Clear service cache using parent method
        // This clears all approval-related caches for the survey
        $this->clearServiceCache();
    }
}
