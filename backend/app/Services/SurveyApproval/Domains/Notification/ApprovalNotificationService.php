<?php

namespace App\Services\SurveyApproval\Domains\Notification;

use App\Models\DataApprovalRequest;
use App\Models\SurveyResponse;
use App\Models\User;

/**
 * Approval Notification Service
 *
 * NOTIFICATION COMPONENT
 * Handles all notification operations for approval workflows.
 *
 * RESPONSIBILITIES:
 * - Notify submitters about approval decisions
 * - Notify next approvers in the chain
 * - Send rejection notifications with reasons
 * - Bulk notification operations
 *
 * DELEGATION STRATEGY:
 * This service is a lightweight wrapper around SurveyNotificationService.
 * All actual notification logic is delegated to maintain separation of concerns.
 *
 * LOGIC PRESERVED FROM: SurveyApprovalService (lines 796-804)
 *
 * ARCHITECTURE NOTE:
 * We delegate to existing SurveyNotificationService rather than duplicating
 * notification logic. This maintains the single responsibility principle.
 *
 * @package App\Services\SurveyApproval\Domains\Notification
 */
class ApprovalNotificationService
{
    protected \App\Services\SurveyNotificationService $notificationService;

    public function __construct()
    {
        $this->notificationService = app(\App\Services\SurveyNotificationService::class);
    }

    /**
     * Notify submitter about rejection
     *
     * DELEGATED to SurveyNotificationService
     * LOGIC PRESERVED FROM: SurveyApprovalService::notifySubmitterAboutRejection() (lines 796-804)
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

    /**
     * Notify next approver in the approval chain
     *
     * @param DataApprovalRequest $approvalRequest
     * @param int $nextLevel
     * @return void
     */
    public function notifyNextApprover(
        DataApprovalRequest $approvalRequest,
        int $nextLevel
    ): void {
        // Find users who can approve at next level
        $workflow = $approvalRequest->workflow;
        $workflowSteps = $workflow->workflow_steps ?? [];

        $stepDef = collect($workflowSteps)->firstWhere('level', $nextLevel);
        if (!$stepDef) {
            return;
        }

        $allowedRoles = $stepDef['allowed_roles'] ?? [];

        // Get users with these roles in the institution
        $institution = $approvalRequest->institution;
        if (!$institution) {
            return;
        }

        $approvers = \App\Models\User::whereHas('role', function ($query) use ($allowedRoles) {
            $query->whereIn('name', $allowedRoles);
        })
        ->where('institution_id', $institution->id)
        ->get();

        foreach ($approvers as $approver) {
            \App\Models\Notification::create([
                'user_id' => $approver->id,
                'type' => 'approval_required',
                'title' => 'Təsdiq Gözlənilir',
                'message' => "Yeni survey cavabı təsdiqinizi gözləyir",
                'data' => [
                    'approval_request_id' => $approvalRequest->id,
                    'survey_response_id' => $approvalRequest->approvalable_id,
                    'institution' => $institution->name,
                    'level' => $nextLevel,
                    'action_url' => "/surveys/approval/{$approvalRequest->id}",
                ],
                'is_read' => false,
            ]);
        }
    }

    /**
     * Notify submitter about approval success
     *
     * @param DataApprovalRequest $approvalRequest
     * @param SurveyResponse $response
     * @param User $approver
     * @return void
     */
    public function notifySubmitterAboutApproval(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver
    ): void {
        $submitter = $approvalRequest->submitter;

        if (!$submitter) {
            return;
        }

        \App\Models\Notification::create([
            'user_id' => $submitter->id,
            'type' => 'approval_completed',
            'title' => 'Cavab Təsdiqləndi',
            'message' => "{$approver->name} tərəfindən survey cavabınız təsdiqləndi",
            'data' => [
                'approval_request_id' => $approvalRequest->id,
                'survey_response_id' => $response->id,
                'approver' => $approver->name,
                'approved_at' => now()->toISOString(),
                'action_url' => "/surveys/{$response->survey_id}/responses",
            ],
            'is_read' => false,
        ]);
    }

    /**
     * Notify submitter about return for revision
     *
     * @param DataApprovalRequest $approvalRequest
     * @param SurveyResponse $response
     * @param User $approver
     * @param string|null $comments
     * @return void
     */
    public function notifySubmitterAboutRevision(
        DataApprovalRequest $approvalRequest,
        SurveyResponse $response,
        User $approver,
        ?string $comments
    ): void {
        $submitter = $approvalRequest->submitter;

        if (!$submitter) {
            return;
        }

        \App\Models\Notification::create([
            'user_id' => $submitter->id,
            'type' => 'revision_required',
            'title' => 'Düzəliş Tələb Olunur',
            'message' => "{$approver->name} cavabınızı yenidən nəzərdən keçirilməsi üçün göndərdi",
            'data' => [
                'approval_request_id' => $approvalRequest->id,
                'survey_response_id' => $response->id,
                'approver' => $approver->name,
                'comments' => $comments,
                'action_url' => "/surveys/{$response->survey_id}/respond",
            ],
            'is_read' => false,
        ]);
    }

    /**
     * Send bulk notifications after bulk approval operation
     *
     * @param array $results
     * @param string $action
     * @param User $approver
     * @return void
     */
    public function sendBulkNotifications(
        array $results,
        string $action,
        User $approver
    ): void {
        // Group results by submitter
        $submitterGroups = [];

        foreach ($results as $result) {
            $responseId = $result['response_id'] ?? null;
            if (!$responseId) continue;

            $response = SurveyResponse::find($responseId);
            if (!$response || !$response->approvalRequest) continue;

            $submitterId = $response->approvalRequest->submitted_by;
            if (!$submitterId) continue;

            if (!isset($submitterGroups[$submitterId])) {
                $submitterGroups[$submitterId] = [];
            }

            $submitterGroups[$submitterId][] = $response;
        }

        // Send grouped notifications
        foreach ($submitterGroups as $submitterId => $responses) {
            $count = count($responses);

            $actionText = match ($action) {
                'approve' => 'təsdiqləndi',
                'reject' => 'rədd edildi',
                'return' => 'yenidən nəzərdən keçirilməsi üçün göndərildi',
                default => 'işləndi',
            };

            \App\Models\Notification::create([
                'user_id' => $submitterId,
                'type' => 'bulk_approval_result',
                'title' => 'Toplu Təsdiq Nəticəsi',
                'message' => "{$count} survey cavabınız {$approver->name} tərəfindən {$actionText}",
                'data' => [
                    'count' => $count,
                    'action' => $action,
                    'approver' => $approver->name,
                    'response_ids' => collect($responses)->pluck('id')->toArray(),
                ],
                'is_read' => false,
            ]);
        }
    }
}
