<?php

namespace App\Services\SurveyApproval;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\DataApprovalRequest;
use App\Models\User;
use App\Services\SurveyApproval\Domains\Security\ApprovalSecurityService;
use App\Services\SurveyApproval\Domains\Action\ApprovalActionService;
use App\Services\SurveyApproval\Domains\Query\ApprovalQueryService;
use App\Services\SurveyApproval\Domains\Bulk\BulkApprovalService;
use App\Services\SurveyApproval\Domains\Notification\ApprovalNotificationService;
use App\Services\SurveyApproval\Utilities\SurveyApprovalWorkflowResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

/**
 * Approval Workflow Facade
 *
 * COORDINATING FACADE
 * Coordinates all approval domain services with a unified API.
 * Provides complete backward compatibility with SurveyApprovalService.
 *
 * ARCHITECTURE:
 * - Security: ApprovalSecurityService (authorization, access control)
 * - Action: ApprovalActionService (approve, reject, return)
 * - Query: ApprovalQueryService (read operations, statistics)
 * - Bulk: BulkApprovalService (mass operations)
 * - Notification: ApprovalNotificationService (notifications)
 * - Utilities: SurveyApprovalWorkflowResolver (workflow management)
 *
 * BACKWARD COMPATIBILITY:
 * - 100% compatible with original SurveyApprovalService API
 * - Can be swapped via feature flag
 * - Zero breaking changes for controllers
 *
 * REFACTORED FROM: SurveyApprovalService (1,085 lines → 5 domain services)
 *
 * BENEFITS:
 * - Improved maintainability (smaller, focused services)
 * - Better testability (isolated domains)
 * - Enhanced security (centralized authorization)
 * - Cleaner code organization
 *
 * REFACTOR DATE: 2025-11-14
 *
 * @package App\Services\SurveyApproval
 */
class ApprovalWorkflowFacade
{
    protected ApprovalSecurityService $securityService;
    protected ApprovalActionService $actionService;
    protected ApprovalQueryService $queryService;
    protected BulkApprovalService $bulkService;
    protected ApprovalNotificationService $notificationService;
    protected SurveyApprovalWorkflowResolver $workflowResolver;

    public function __construct(
        ApprovalSecurityService $securityService,
        ApprovalActionService $actionService,
        ApprovalQueryService $queryService,
        BulkApprovalService $bulkService,
        ApprovalNotificationService $notificationService,
        SurveyApprovalWorkflowResolver $workflowResolver
    ) {
        $this->securityService = $securityService;
        $this->actionService = $actionService;
        $this->queryService = $queryService;
        $this->bulkService = $bulkService;
        $this->notificationService = $notificationService;
        $this->workflowResolver = $workflowResolver;
    }

    // ========================================
    // QUERY OPERATIONS (Delegated to QueryService)
    // ========================================

    /**
     * Get survey responses that need approval
     *
     * DELEGATION: QueryService::getResponsesForApproval()
     *
     * @param Survey $survey
     * @param Request $request
     * @param User $user
     * @return array
     */
    public function getResponsesForApproval(Survey $survey, Request $request, User $user): array
    {
        return $this->queryService->getResponsesForApproval($survey, $request, $user);
    }

    /**
     * Get approval statistics
     *
     * DELEGATION: QueryService::getApprovalStats()
     *
     * @param Survey $survey
     * @param User $user
     * @return array
     */
    public function getApprovalStats(Survey $survey, User $user): array
    {
        return $this->queryService->getApprovalStats($survey, $user);
    }

    /**
     * Get pending approvals for user
     *
     * DELEGATION: QueryService::getPendingApprovals()
     *
     * @param User $user
     * @param int $limit
     * @return array
     */
    public function getPendingApprovals(User $user, int $limit = 50): array
    {
        return $this->queryService->getPendingApprovals($user, $limit);
    }

    /**
     * Get approval history
     *
     * DELEGATION: QueryService::getApprovalHistory()
     *
     * @param SurveyResponse $response
     * @return array
     */
    public function getApprovalHistory(SurveyResponse $response): array
    {
        return $this->queryService->getApprovalHistory($response);
    }

    /**
     * Check if user can approve response
     *
     * DELEGATION: QueryService::canUserApprove()
     *
     * @param SurveyResponse $response
     * @param User $user
     * @return bool
     */
    public function canUserApprove(SurveyResponse $response, User $user): bool
    {
        return $this->queryService->canUserApprove($response, $user);
    }

    /**
     * Get responses for table view
     *
     * DELEGATION: QueryService::getResponsesForTableView()
     *
     * @param Survey $survey
     * @param Request $request
     * @param User $user
     * @return array
     */
    public function getResponsesForTableView(Survey $survey, Request $request, User $user): array
    {
        return $this->queryService->getResponsesForTableView($survey, $request, $user);
    }

    // ========================================
    // WORKFLOW OPERATIONS
    // ========================================

    /**
     * Create approval request for survey response
     *
     * @param SurveyResponse $response
     * @param array $data
     * @return DataApprovalRequest
     * @throws \Exception
     */
    public function createApprovalRequest(SurveyResponse $response, array $data = []): DataApprovalRequest
    {
        // Check if approval request already exists
        if ($response->approvalRequest) {
            throw new \Exception('Approval request already exists for this response');
        }

        // Get workflow using resolver
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

            // Clear cache
            $this->clearApprovalCache($response->survey_id);

            return $approvalRequest;
        });
    }

    // ========================================
    // ACTION OPERATIONS (Delegated to ActionService)
    // ========================================

    /**
     * Approve a survey response
     *
     * DELEGATION: ActionService::approveResponse()
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @param array $data
     * @return array
     * @throws \Exception
     */
    public function approveResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        return $this->actionService->approveResponse($response, $approver, $data);
    }

    /**
     * Reject a survey response
     *
     * DELEGATION: ActionService::rejectResponse()
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @param array $data
     * @return array
     * @throws \Exception
     */
    public function rejectResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        return $this->actionService->rejectResponse($response, $approver, $data);
    }

    /**
     * Return response for revision
     *
     * DELEGATION: ActionService::returnForRevision()
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @param array $data
     * @return array
     * @throws \Exception
     */
    public function returnForRevision(SurveyResponse $response, User $approver, array $data = []): array
    {
        return $this->actionService->returnForRevision($response, $approver, $data);
    }

    // ========================================
    // BULK OPERATIONS (Delegated to BulkService)
    // ========================================

    /**
     * Bulk approval operation
     *
     * DELEGATION: BulkService::bulkApprovalOperation()
     *
     * @param array $responseIds
     * @param string $action
     * @param User $approver
     * @param array $data
     * @return array
     * @throws \Exception
     */
    public function bulkApprovalOperation(array $responseIds, string $action, User $approver, array $data = []): array
    {
        return $this->bulkService->bulkApprovalOperation($responseIds, $action, $approver, $data);
    }

    /**
     * Process bulk approval synchronously
     *
     * DELEGATION: BulkService::processBulkApprovalSync()
     *
     * @param array $responseIds
     * @param string $action
     * @param User $approver
     * @param string|null $comments
     * @return array
     */
    public function processBulkApprovalSync(array $responseIds, string $action, User $approver, ?string $comments = null): array
    {
        return $this->bulkService->processBulkApprovalSync($responseIds, $action, $approver, $comments);
    }

    /**
     * Process individual approval
     *
     * DELEGATION: BulkService::processIndividualApproval()
     *
     * @param int $responseId
     * @param string $action
     * @param User $approver
     * @param string|null $comments
     * @return bool
     * @throws \Exception
     */
    public function processIndividualApproval(int $responseId, string $action, User $approver, ?string $comments = null): bool
    {
        return $this->bulkService->processIndividualApproval($responseId, $action, $approver, $comments);
    }

    /**
     * Batch update multiple responses
     *
     * DELEGATION: BulkService::batchUpdateResponses()
     *
     * @param array $updates
     * @param User $user
     * @return array
     * @throws \Exception
     */
    public function batchUpdateResponses(array $updates, User $user): array
    {
        return $this->bulkService->batchUpdateResponses($updates, $user);
    }

    // ========================================
    // NOTIFICATION OPERATIONS (Delegated to NotificationService)
    // ========================================

    /**
     * Notify submitter about rejection
     *
     * DELEGATION: NotificationService::notifySubmitterAboutRejection()
     *
     * @param DataApprovalRequest $approvalRequest
     * @param SurveyResponse $response
     * @param User $approver
     * @param string|null $reason
     * @return void
     */
    public function notifySubmitterAboutRejection(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver,
        ?string $reason
    ): void {
        $this->notificationService->notifySubmitterAboutRejection(
            $approvalRequest,
            $response,
            $approver,
            $reason
        );
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Generate response summary for metadata
     *
     * @param SurveyResponse $response
     * @return array
     */
    protected function generateResponseSummary(SurveyResponse $response): array
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
     * Clear approval cache
     *
     * @param int $surveyId
     * @return void
     */
    protected function clearApprovalCache(int $surveyId): void
    {
        Cache::forget("approval_stats_survey_id_{$surveyId}");
        Cache::forget("pending_approvals_{$surveyId}");
    }

    /**
     * Refresh cache for survey (static method for external calls)
     *
     * @param int $surveyId
     * @return void
     */
    public static function refreshCacheForSurvey(int $surveyId): void
    {
        Cache::forget("approval_stats_survey_id_{$surveyId}");
        Cache::forget("pending_approvals_{$surveyId}");
    }

    // ========================================
    // LEGACY COMPATIBILITY METHODS
    // ========================================

    /**
     * Update response data
     *
     * BACKWARD COMPATIBILITY: Maintains original method signature
     *
     * @param SurveyResponse $response
     * @param array $responseData
     * @return SurveyResponse
     */
    public function updateResponseData(SurveyResponse $response, array $responseData): SurveyResponse
    {
        return DB::transaction(function () use ($response, $responseData) {
            $response->update([
                'responses' => $responseData,
                'progress_percentage' => 100,
                'is_complete' => true,
            ]);

            return $response->fresh();
        });
    }

    /**
     * Export survey responses
     *
     * DELEGATION: SurveyExportService (external)
     *
     * @param Survey $survey
     * @param Request $request
     * @param User $user
     * @return array
     */
    public function exportSurveyResponses(Survey $survey, Request $request, User $user): array
    {
        $exportService = app(\App\Services\SurveyExportService::class);
        return $exportService->exportSurveyResponses($survey, $request, $user);
    }
}
