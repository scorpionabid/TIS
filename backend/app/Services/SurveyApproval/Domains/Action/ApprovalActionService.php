<?php

namespace App\Services\SurveyApproval\Domains\Action;

use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\ApprovalAction;
use App\Models\DataApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Services\SurveyApproval\Domains\Security\ApprovalSecurityService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * Approval Action Service
 *
 * CRITICAL SECURITY COMPONENT
 * Handles approve, reject, and return-for-revision actions.
 *
 * RESPONSIBILITIES:
 * - Process approval actions (approve/reject/return)
 * - Record approval actions in audit trail
 * - Update approval workflow state
 * - Manage approval level transitions
 *
 * SECURITY FEATURES:
 * - All actions within DB transactions
 * - Authorization check before every action
 * - Audit logging for all state changes
 * - Cache invalidation for approval stats
 *
 * SECURITY AUDIT: 2025-11-14
 *
 * @package App\Services\SurveyApproval\Domains\Action
 */
class ApprovalActionService
{
    protected ApprovalSecurityService $securityService;

    public function __construct(ApprovalSecurityService $securityService)
    {
        $this->securityService = $securityService;
    }

    /**
     * Approve a survey response
     *
     * SECURITY CRITICAL: Authorization checked, transaction-safe
     * LOGIC PRESERVED FROM: SurveyApprovalService::approveResponse() (lines 165-241)
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @param array $data ['comments' => string, 'metadata' => array]
     * @return array ['status' => string, 'message' => string]
     * @throws \Exception
     */
    public function approveResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;

            if (!$approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            $workflow = $approvalRequest->workflow;

            // SECURITY CHECK: Determine if user can approve at any level
            $targetLevel = $this->securityService->determineApprovalLevelForApprover(
                $approvalRequest,
                $workflow,
                $approver
            );

            // Record approval action (AUDIT TRAIL)
            $this->recordApprovalAction($approvalRequest, $approver, 'approved', $targetLevel, $data);

            // Check if approval chain is complete
            if ($this->isApprovalChainComplete($workflow, $targetLevel)) {
                return $this->completeApproval($approvalRequest, $response, $approver);
            }

            // Move to next approval level
            return $this->moveToNextLevel($approvalRequest, $workflow, $targetLevel);
        });
    }

    /**
     * Reject a survey response
     *
     * SECURITY CRITICAL: Authorization checked, transaction-safe
     * LOGIC PRESERVED FROM: SurveyApprovalService::rejectResponse() (lines 246-309)
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @param array $data ['comments' => string, 'metadata' => array]
     * @return array ['status' => string, 'message' => string]
     * @throws \Exception
     */
    public function rejectResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;

            if (!$approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            $workflow = $approvalRequest->workflow;

            // SECURITY CHECK
            $targetLevel = $this->securityService->determineApprovalLevelForApprover(
                $approvalRequest,
                $workflow,
                $approver
            );

            // Record rejection action (AUDIT TRAIL)
            $this->recordApprovalAction($approvalRequest, $approver, 'rejected', $targetLevel, $data);

            // Update approval request status
            $approvalRequest->update([
                'current_status' => 'rejected',
                'current_approval_level' => $targetLevel,
                'completed_at' => now(),
            ]);

            // Update response status
            $response->update([
                'status' => 'rejected',
                'rejection_reason' => $data['comments'] ?? 'Response rejected',
            ]);

            // Clear approval stats cache
            $this->clearApprovalCache($response->survey_id);

            return [
                'status' => 'rejected',
                'message' => 'Response rejected',
                'response_id' => $response->id
            ];
        });
    }

    /**
     * Return response for revision
     *
     * SECURITY CRITICAL: Authorization checked, transaction-safe
     * LOGIC PRESERVED FROM: SurveyApprovalService::returnForRevision() (lines 314-353)
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @param array $data ['comments' => string, 'metadata' => array]
     * @return array
     * @throws \Exception
     */
    public function returnForRevision(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;

            if (!$approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            $workflow = $approvalRequest->workflow;

            // SECURITY CHECK
            $targetLevel = $this->securityService->determineApprovalLevelForApprover(
                $approvalRequest,
                $workflow,
                $approver
            );

            // Record return-for-revision action (AUDIT TRAIL)
            $this->recordApprovalAction($approvalRequest, $approver, 'returned_for_revision', $targetLevel, $data);

            // Reset approval request to initial state
            $approvalRequest->update([
                'current_status' => 'returned_for_revision',
                'current_approval_level' => 1, // Reset to initial level
                'revision_notes' => $data['comments'] ?? null,
            ]);

            // Update response status
            $response->update([
                'status' => 'needs_revision',
                'revision_notes' => $data['comments'] ?? 'Response needs revision',
            ]);

            // Clear approval stats cache
            $this->clearApprovalCache($response->survey_id);

            return [
                'status' => 'returned_for_revision',
                'message' => 'Response returned for revision',
                'response_id' => $response->id
            ];
        });
    }

    /**
     * Record approval action in audit trail
     *
     * SECURITY CRITICAL: Immutable audit log
     *
     * @param DataApprovalRequest $approvalRequest
     * @param User $approver
     * @param string $action
     * @param int $level
     * @param array $data
     * @return ApprovalAction
     */
    protected function recordApprovalAction(
        DataApprovalRequest $approvalRequest,
        User $approver,
        string $action,
        int $level,
        array $data
    ): ApprovalAction {
        return ApprovalAction::create([
            'approval_request_id' => $approvalRequest->id,
            'approver_id' => $approver->id,
            'approval_level' => $level,
            'action' => $action,
            'comments' => $data['comments'] ?? null,
            'action_metadata' => $data['metadata'] ?? null,
            'action_taken_at' => now(),
        ]);
    }

    /**
     * Check if approval chain is complete
     *
     * @param ApprovalWorkflow $workflow
     * @param int $currentLevel
     * @return bool
     */
    protected function isApprovalChainComplete(ApprovalWorkflow $workflow, int $currentLevel): bool
    {
        // Check if workflow considers this level as fully approved
        if ($workflow->isFullyApproved($currentLevel)) {
            return true;
        }

        // Check if there's a next required level
        $nextLevel = $this->getNextRequiredApprovalLevel($workflow, $currentLevel);
        return $nextLevel === null;
    }

    /**
     * Complete approval process
     *
     * @param DataApprovalRequest $approvalRequest
     * @param SurveyResponse $response
     * @param User $approver
     * @return array
     */
    protected function completeApproval(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver
    ): array {
        // Update approval request
        $approvalRequest->update([
            'current_status' => 'approved',
            'current_approval_level' => $approvalRequest->current_approval_level,
            'completed_at' => now(),
        ]);

        // Update response
        $response->update([
            'status' => 'approved',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        // Clear cache
        $this->clearApprovalCache($response->survey_id);

        return [
            'status' => 'completed',
            'message' => 'Response fully approved',
            'response_id' => $response->id
        ];
    }

    /**
     * Move approval to next level
     *
     * @param DataApprovalRequest $approvalRequest
     * @param ApprovalWorkflow $workflow
     * @param int $currentLevel
     * @return array
     */
    protected function moveToNextLevel(
        DataApprovalRequest $approvalRequest,
        ApprovalWorkflow $workflow,
        int $currentLevel
    ): array {
        $nextLevel = $this->getNextRequiredApprovalLevel($workflow, $currentLevel);

        if ($nextLevel === null) {
            // No further levels, complete approval
            $approvalRequest->update([
                'current_status' => 'approved',
                'current_approval_level' => $currentLevel,
                'completed_at' => now(),
            ]);

            return [
                'status' => 'completed',
                'message' => 'Response fully approved'
            ];
        }

        // Move to next level
        $approvalRequest->update([
            'current_approval_level' => $nextLevel,
            'current_status' => 'in_progress',
        ]);

        return [
            'status' => 'in_progress',
            'message' => 'Moved to next approval level',
            'next_level' => $nextLevel
        ];
    }

    /**
     * Get next required approval level
     *
     * @param ApprovalWorkflow $workflow
     * @param int $currentLevel
     * @return int|null
     */
    protected function getNextRequiredApprovalLevel(ApprovalWorkflow $workflow, int $currentLevel): ?int
    {
        $workflowSteps = $workflow->workflow_steps ?? [];

        // Find the next required level after current
        foreach ($workflowSteps as $step) {
            $level = $step['level'] ?? 0;
            $required = $step['required'] ?? true;

            if ($level > $currentLevel && $required) {
                return $level;
            }
        }

        return null;
    }

    /**
     * Clear approval cache
     *
     * @param int $surveyId
     * @return void
     */
    protected function clearApprovalCache(int $surveyId): void
    {
        Cache::forget("approval_stats_{$surveyId}");
        Cache::forget("pending_approvals_{$surveyId}");
    }
}
