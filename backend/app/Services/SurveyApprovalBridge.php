<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\DataApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Services\ApprovalWorkflowService;
use App\Services\SurveyApproval\Utilities\SurveyApprovalWorkflowResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Survey Approval Bridge Service
 *
 * Köprü xidməti - mövcud ApprovalWorkflowService və Survey model arasında
 * Mövcud kodu pozmadan survey-specific approval funksionallığı təmin edir
 *
 * REFACTORED: 2025-11-14
 * - Uses SurveyApprovalWorkflowResolver for workflow management
 */
class SurveyApprovalBridge extends ApprovalWorkflowService
{
    protected SurveyApprovalWorkflowResolver $workflowResolver;

    public function __construct()
    {
        // Don't call parent::__construct() as BaseService/ApprovalWorkflowService don't define constructors
        $this->workflowResolver = app(SurveyApprovalWorkflowResolver::class);
    }
    /**
     * Survey response üçün approval workflow başlat
     * 
     * @param SurveyResponse $response
     * @param array $additionalData
     * @return DataApprovalRequest
     */
    public function initiateSurveyResponseApproval(SurveyResponse $response, array $additionalData = []): DataApprovalRequest
    {
        return DB::transaction(function () use ($response, $additionalData) {
            // Survey approval workflow-nu tap və ya yarat (using resolver)
            $workflow = $this->workflowResolver->getOrCreateSurveyApprovalWorkflow();
            
            // Approval request yarat
            $approvalRequest = $this->createApprovalRequest([
                'workflow_type' => 'survey_response',
                'institution_id' => $response->institution_id,
                'request_title' => "Survey Cavabının Təsdiqi: {$response->survey->title}",
                'request_description' => $additionalData['description'] ?? "Müəssisə: {$response->institution->name} tərəfindən təqdim edilən survey cavabının təsdiqi",
                'request_data' => array_merge([
                    'survey_response_id' => $response->id,
                    'survey_id' => $response->survey_id,
                    'respondent_info' => [
                        'id' => $response->respondent_id,
                        'institution' => $response->institution->name,
                        'department' => $response->department->name ?? null,
                    ],
                    'completion_percentage' => $response->progress_percentage,
                    'response_count' => count($response->responses ?? []),
                ], $additionalData['metadata'] ?? []),
                'priority' => $this->determineSurveyPriority($response),
                // Polymorphic relationship data
                'approvalable_type' => SurveyResponse::class,
                'approvalable_id' => $response->id,
            ], auth()->user());

            // Survey response-ı approval request ilə əlaqələndir
            $response->update([
                'status' => 'submitted', // approval gözlənilir
                'submitted_at' => now(),
            ]);

            // Audit log
            Log::info('Survey response approval initiated', [
                'survey_response_id' => $response->id,
                'approval_request_id' => $approvalRequest->id,
                'institution' => $response->institution->name,
            ]);

            return $approvalRequest;
        });
    }

    /**
     * Survey response approval-ını tamamla
     * 
     * @param DataApprovalRequest $approvalRequest
     * @param User $approver
     * @param array $data
     * @return SurveyResponse
     */
    public function completeSurveyResponseApproval(DataApprovalRequest $approvalRequest, User $approver, array $data): SurveyResponse
    {
        return DB::transaction(function () use ($approvalRequest, $approver, $data) {
            // Standard approval workflow-nu işə sal
            $this->approveRequest($approvalRequest->id, $data, $approver);

            // Survey response-ı yenilə
            $surveyResponseId = $approvalRequest->request_data['survey_response_id'];
            $response = SurveyResponse::findOrFail($surveyResponseId);
            
            if ($approvalRequest->current_status === 'approved') {
                $response->approve($approver);
                
                // Survey statistics yenilə
                $this->updateSurveyStatistics($response->survey);
            }

            return $response;
        });
    }

    /**
     * Survey delegation xüsusiyyəti
     * 
     * @param DataApprovalRequest $approvalRequest
     * @param User $currentApprover
     * @param User $delegateeTo
     * @param string $reason
     * @return bool
     */
    public function delegateSurveyApproval(DataApprovalRequest $approvalRequest, User $currentApprover, User $delegateeTo, string $reason): bool
    {
        return DB::transaction(function () use ($approvalRequest, $currentApprover, $delegateeTo, $reason) {
            // Delegation qeydiyyatı
            $delegationData = [
                'approval_request_id' => $approvalRequest->id,
                'delegator_id' => $currentApprover->id,
                'delegate_id' => $delegateeTo->id,
                'delegation_reason' => $reason,
                'include_comment' => true,
                'status' => 'pending',
                'delegation_expires_at' => now()->addDays(7), // 7 gün müddət
            ];

            // Yeni ApprovalDelegation model istifadə et (artıq mövcuddur)
            \App\Models\ApprovalDelegation::create($delegationData);

            // Notification göndər
            $this->sendDelegationNotification($approvalRequest, $delegateeTo, $currentApprover, $reason);

            // Audit log
            Log::info('Survey approval delegated', [
                'approval_request_id' => $approvalRequest->id,
                'from' => $currentApprover->name,
                'to' => $delegateeTo->name,
                'reason' => $reason,
            ]);

            return true;
        });
    }

    /**
     * Survey-specific bulk approval
     * 
     * @param array $surveyResponseIds
     * @param User $approver
     * @param array $data
     * @return array
     */
    public function bulkApproveSurveyResponses(array $surveyResponseIds, User $approver, array $data = []): array
    {
        $results = [
            'approved' => 0,
            'failed' => 0,
            'errors' => [],
            'details' => []
        ];

        foreach ($surveyResponseIds as $responseId) {
            try {
                $response = SurveyResponse::findOrFail($responseId);

                // Ensure approval request exists for this response
                $response->ensureApprovalRequestExists();

                // Find approval request using polymorphic relationship
                $approvalRequest = DataApprovalRequest::where('approvalable_type', SurveyResponse::class)
                    ->where('approvalable_id', $responseId)
                    ->where('current_status', 'pending')
                    ->first();

                if ($approvalRequest) {
                    $this->completeSurveyResponseApproval($approvalRequest, $approver, $data);
                    $results['approved']++;
                    $results['details'][] = [
                        'response_id' => $responseId,
                        'status' => 'approved',
                        'survey_title' => $response->survey->title,
                        'institution' => $response->institution->name,
                    ];
                } else {
                    // If still no approval request, log detailed error
                    $results['failed']++;
                    $results['errors'][] = "Response ID {$responseId}: Approval request could not be created or found";

                    Log::warning('Bulk approval failed - no approval request', [
                        'response_id' => $responseId,
                        'response_status' => $response->status,
                        'institution_id' => $response->institution_id,
                        'survey_id' => $response->survey_id
                    ]);
                }

            } catch (Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Response ID {$responseId}: " . $e->getMessage();

                Log::error('Bulk approval exception', [
                    'response_id' => $responseId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        // Bulk approval audit log
        Log::info('Bulk survey approval completed', [
            'approver' => $approver->name,
            'approved_count' => $results['approved'],
            'failed_count' => $results['failed'],
        ]);

        return $results;
    }

    /**
     * Survey template approval workflow
     * 
     * @param Survey $templateSurvey
     * @param User $submitter
     * @return DataApprovalRequest
     */
    public function submitSurveyTemplateForApproval(Survey $templateSurvey, User $submitter): DataApprovalRequest
    {
        return $this->createApprovalRequest([
            'workflow_type' => 'survey_template',
            'institution_id' => $submitter->institution_id,
            'request_title' => "Survey Şablonunun Təsdiqi: {$templateSurvey->title}",
            'request_description' => "Yeni survey şablonunun sistem üzrə istifadə üçün təsdiqi",
            'request_data' => [
                'survey_template_id' => $templateSurvey->id,
                'template_category' => $templateSurvey->category,
                'questions_count' => $templateSurvey->current_questions_count,
                'template_scope' => 'system_wide',
            ],
            'priority' => 'normal',
        ], $submitter);
    }

    /**
     * Survey analytics approval üçün extended analytics
     * 
     * @param string $period
     * @param User $user
     * @return array
     */
    public function getSurveyApprovalAnalytics(string $period = '30days', ?User $user = null): array
    {
        $baseAnalytics = $this->getAnalytics(request()->merge([
            'date_from' => now()->sub($period)->format('Y-m-d'),
            'date_to' => now()->format('Y-m-d')
        ]), $user ?? auth()->user());

        // Survey-specific metrics əlavə et
        $surveySpecificMetrics = [
            'survey_response_approvals' => $this->getSurveyResponseApprovalStats($period),
            'template_approvals' => $this->getSurveyTemplateApprovalStats($period),
            'institution_performance' => $this->getInstitutionApprovalPerformance($period),
            'approval_bottlenecks' => $this->identifyApprovalBottlenecks($period),
        ];

        return array_merge($baseAnalytics, ['survey_metrics' => $surveySpecificMetrics]);
    }

    /**
     * Survey approval workflow-nu tap və ya yarat
     *
     * REFACTORED: Delegated to SurveyApprovalWorkflowResolver (2025-11-14)
     * DEPRECATED: Use $this->workflowResolver->getOrCreateSurveyApprovalWorkflow() directly
     *
     * @deprecated 2025-11-14
     */
    private function getOrCreateSurveyApprovalWorkflow(): ApprovalWorkflow
    {
        return $this->workflowResolver->getOrCreateSurveyApprovalWorkflow();
    }

    /**
     * Survey priority müəyyən et
     */
    private function determineSurveyPriority(SurveyResponse $response): string
    {
        $survey = $response->survey;
        
        // Təcili sorğular
        if ($survey->category === 'urgent') {
            return 'high';
        }
        
        // Maliyyə sorğuları
        if ($survey->category === 'finance') {
            return 'high';
        }
        
        // Deadline yaxın olan sorğular
        if ($survey->end_date && $survey->end_date->diffInDays(now()) <= 3) {
            return 'medium';
        }
        
        return 'normal';
    }

    /**
     * Survey statistikalarını yenilə
     */
    private function updateSurveyStatistics(Survey $survey): void
    {
        $approvedResponses = $survey->responses()->approved()->count();
        $survey->update([
            'actual_responses' => $approvedResponses,
        ]);
    }

    /**
     * Delegation notification göndər
     */
    private function sendDelegationNotification(DataApprovalRequest $approvalRequest, User $delegateeTo, User $delegatedBy, string $reason): void
    {
        // Notification service istifadə et (mövcud sistem)
        \App\Models\Notification::create([
            'user_id' => $delegateeTo->id,
            'type' => 'survey_approval_delegated',
            'title' => 'Survey Təsdiq Səlahiyyəti Həvalə Edildi',
            'message' => "{$delegatedBy->name} tərəfindən sizə survey təsdiq səlahiyyəti həvalə edildi. Səbəb: {$reason}",
            'data' => [
                'approval_request_id' => $approvalRequest->id,
                'survey_title' => $approvalRequest->request_data['survey_response_id'] ?? 'N/A',
                'delegated_by' => $delegatedBy->name,
                'reason' => $reason,
                'action_url' => "/surveys/approval/{$approvalRequest->id}",
            ],
            'is_read' => false,
        ]);
    }

    /**
     * Survey response approval stats
     */
    private function getSurveyResponseApprovalStats(string $period): array
    {
        // Detailed implementation placeholder
        return [
            'total_submissions' => 0,
            'pending_approvals' => 0,
            'approved_responses' => 0,
            'rejection_rate' => 0,
            'average_approval_time_hours' => 0,
        ];
    }

    /**
     * Survey template approval stats  
     */
    private function getSurveyTemplateApprovalStats(string $period): array
    {
        return [
            'templates_submitted' => 0,
            'templates_approved' => 0,
            'templates_in_review' => 0,
        ];
    }

    /**
     * Institution approval performance
     */
    private function getInstitutionApprovalPerformance(string $period): array
    {
        return [
            'top_performing_institutions' => [],
            'institutions_with_delays' => [],
            'average_response_time_by_institution' => [],
        ];
    }

    /**
     * Approval bottlenecks müəyyən et
     */
    private function identifyApprovalBottlenecks(string $period): array
    {
        return [
            'bottleneck_levels' => [],
            'slow_approvers' => [],
            'recommendations' => [],
        ];
    }
}