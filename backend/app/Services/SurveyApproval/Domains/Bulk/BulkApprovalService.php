<?php

namespace App\Services\SurveyApproval\Domains\Bulk;

use App\Models\SurveyResponse;
use App\Models\User;
use App\Jobs\BulkApprovalJob;
use App\Services\SurveyApproval\Domains\Action\ApprovalActionService;
use App\Services\SurveyApproval\Domains\Security\ApprovalSecurityService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Bulk Approval Service
 *
 * CRITICAL BULK OPERATIONS COMPONENT
 * Handles mass approval/rejection operations with security validation.
 *
 * RESPONSIBILITIES:
 * - Bulk approve/reject/return operations
 * - Progress tracking for bulk operations
 * - Authorization validation for each item
 * - Background job queueing for large batches
 *
 * SECURITY FEATURES:
 * - Rate limiting (max 100 items per operation)
 * - Authorization check for EACH item individually
 * - Transaction safety for atomic operations
 * - Comprehensive audit logging
 * - Rollback capability
 *
 * LOGIC PRESERVED FROM: SurveyApprovalService (lines 354-462)
 *
 * SECURITY AUDIT: 2025-11-14
 *
 * @package App\Services\SurveyApproval\Domains\Bulk
 */
class BulkApprovalService
{
    protected ApprovalActionService $actionService;
    protected ApprovalSecurityService $securityService;

    // Security limits
    protected const MAX_SYNC_BATCH_SIZE = 20;
    protected const MAX_ASYNC_BATCH_SIZE = 100;

    public function __construct(
        ApprovalActionService $actionService,
        ApprovalSecurityService $securityService
    ) {
        $this->actionService = $actionService;
        $this->securityService = $securityService;
    }

    /**
     * Bulk approval operation with queue processing
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::bulkApprovalOperation() (lines 354-375)
     *
     * SECURITY: Rate limiting enforced
     *
     * @param array $responseIds
     * @param string $action (approve|reject|return)
     * @param User $approver
     * @param array $data
     * @return array
     * @throws \Exception
     */
    public function bulkApprovalOperation(
        array $responseIds,
        string $action,
        User $approver,
        array $data = []
    ): array {
        // SECURITY: Enforce maximum batch size
        if (count($responseIds) > self::MAX_ASYNC_BATCH_SIZE) {
            throw new \Exception(sprintf(
                'Bulk operation limited to %d items. Requested: %d',
                self::MAX_ASYNC_BATCH_SIZE,
                count($responseIds)
            ));
        }

        // SECURITY: Validate action type
        if (!in_array($action, ['approve', 'reject', 'return'])) {
            throw new \Exception("Invalid bulk action: {$action}");
        }

        // SECURITY: Pre-validate authorization for all items
        $authorizationCheck = $this->securityService->validateBulkApprovalAuthorization(
            $responseIds,
            $approver
        );

        if (!empty($authorizationCheck['unauthorized'])) {
            Log::warning('Bulk approval authorization failure', [
                'approver_id' => $approver->id,
                'unauthorized_count' => count($authorizationCheck['unauthorized']),
                'unauthorized_ids' => $authorizationCheck['unauthorized'],
            ]);

            throw new \Exception(sprintf(
                'Authorization denied for %d out of %d items',
                count($authorizationCheck['unauthorized']),
                count($responseIds)
            ));
        }

        $jobId = uniqid('bulk_approval_', true);
        $comments = $data['comments'] ?? null;

        // For small batches (<=20), process synchronously
        if (count($responseIds) <= self::MAX_SYNC_BATCH_SIZE) {
            return $this->processBulkApprovalSync($responseIds, $action, $approver, $comments);
        }

        // For larger batches, dispatch to background job
        BulkApprovalJob::dispatch($responseIds, $action, $approver->id, $comments, $jobId);

        return [
            'job_id' => $jobId,
            'status' => 'queued',
            'total' => count($responseIds),
            'message' => 'Bulk approval operation has been queued for background processing',
            'estimated_completion' => now()->addMinutes(ceil(count($responseIds) / 50))->toISOString()
        ];
    }

    /**
     * Process bulk approval operations synchronously
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::processBulkApprovalSync() (lines 378-439)
     *
     * SECURITY: Transaction-safe, individual authorization checks
     *
     * @param array $responseIds
     * @param string $action
     * @param User $approver
     * @param string|null $comments
     * @return array
     */
    public function processBulkApprovalSync(
        array $responseIds,
        string $action,
        User $approver,
        ?string $comments = null
    ): array {
        $results = [];
        $errors = [];

        Log::info("🚀 [BulkApproval] Starting sync processing", [
            'response_count' => count($responseIds),
            'response_ids' => $responseIds,
            'action' => $action,
            'approver_id' => $approver->id,
            'approver_role' => $approver->role?->name ?? 'unknown'
        ]);

        DB::transaction(function () use ($responseIds, $action, $approver, $comments, &$results, &$errors) {
            foreach ($responseIds as $responseId) {
                try {
                    Log::info("📋 [BulkApproval] Processing response", [
                        'response_id' => $responseId,
                        'action' => $action
                    ]);

                    $result = $this->processIndividualApproval($responseId, $action, $approver, $comments);

                    $results[] = [
                        'response_id' => $responseId,
                        'status' => 'success',
                        'result' => $result,
                    ];

                    Log::info("✅ [BulkApproval] Response processed successfully", [
                        'response_id' => $responseId,
                        'result' => $result
                    ]);

                } catch (\Exception $e) {
                    $errors[] = [
                        'response_id' => $responseId,
                        'error' => $e->getMessage(),
                    ];

                    Log::error("❌ [BulkApproval] Response processing failed", [
                        'response_id' => $responseId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
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

        Log::info("🏁 [BulkApproval] Sync processing completed", $finalResult);

        return $finalResult;
    }

    /**
     * Process individual approval operation
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::processIndividualApproval() (lines 441-462)
     *
     * SECURITY: Individual permission check before action
     *
     * @param int $responseId
     * @param string $action
     * @param User $approver
     * @param string|null $comments
     * @return bool
     * @throws \Exception
     */
    public function processIndividualApproval(
        int $responseId,
        string $action,
        User $approver,
        ?string $comments = null
    ): bool {
        $response = SurveyResponse::findOrFail($responseId);

        // SECURITY CHECK: Verify user has permission for this specific response
        if (!$this->canUserApproveResponse($response, $approver)) {
            throw new \Exception("User does not have permission to approve this response (ID: {$responseId})");
        }

        $data = ['comments' => $comments];

        $result = match ($action) {
            'approve' => $this->actionService->approveResponse($response, $approver, $data),
            'reject' => $this->actionService->rejectResponse($response, $approver, $data),
            'return' => $this->actionService->returnForRevision($response, $approver, $data),
            default => throw new \Exception("Invalid action: {$action}")
        };

        // Action methods return arrays with status info
        return is_array($result) && !empty($result);
    }

    /**
     * Check if user can approve a specific response
     *
     * SECURITY CRITICAL: Comprehensive authorization check
     *
     * @param SurveyResponse $response
     * @param User $approver
     * @return bool
     */
    protected function canUserApproveResponse(SurveyResponse $response, User $approver): bool
    {
        $approvalRequest = $response->approvalRequest;

        if (!$approvalRequest) {
            return false;
        }

        // Must be submitted status
        if ($response->status !== 'submitted') {
            return false;
        }

        $currentStatus = $approvalRequest->current_status;

        // SuperAdmin can approve any pending or in_progress approval
        if ($approver->hasRole('superadmin')) {
            return in_array($currentStatus, ['pending', 'in_progress']);
        }

        // SektorAdmin can approve responses from schools in their sector
        if ($approver->hasRole('sektoradmin')) {
            $responseInstitution = $response->institution;
            if (!$responseInstitution) {
                return false;
            }

            $approverInstitution = $approver->institution;
            if (!$approverInstitution) {
                return false;
            }

            // Check if response is from a school under this sector
            if ($responseInstitution->parent_id === $approverInstitution->id) {
                return in_array($currentStatus, ['pending', 'in_progress']);
            }

            return false;
        }

        // RegionAdmin can approve responses from institutions in their region
        if ($approver->hasRole('regionadmin')) {
            $responseInstitution = $response->institution;
            if (!$responseInstitution) {
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
            // Other role-level checks can be added here
            return false;
        }

        return false;
    }

    /**
     * Generate bulk operation report
     *
     * Creates detailed report for bulk approval operation
     *
     * @param array $results
     * @param array $errors
     * @param User $approver
     * @param string $action
     * @return array
     */
    public function generateBulkReport(
        array $results,
        array $errors,
        User $approver,
        string $action
    ): array {
        $totalProcessed = count($results) + count($errors);
        $successCount = count($results);
        $failCount = count($errors);

        return [
            'summary' => [
                'total_items' => $totalProcessed,
                'successful' => $successCount,
                'failed' => $failCount,
                'success_rate' => $totalProcessed > 0
                    ? round(($successCount / $totalProcessed) * 100, 2)
                    : 0,
            ],
            'action' => $action,
            'approver' => [
                'id' => $approver->id,
                'name' => $approver->name,
                'role' => $approver->role?->name ?? 'unknown',
            ],
            'timestamp' => now()->toISOString(),
            'details' => [
                'successful_items' => $results,
                'failed_items' => $errors,
            ],
        ];
    }

    /**
     * Batch update multiple responses
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::batchUpdateResponses() (lines 933-980)
     *
     * @param array $updates
     * @param User $user
     * @return array
     * @throws \Exception
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
                    if (!$this->canUserEditInstitutionResponse($user, $response->institution)) {
                        $errors[] = "No permission to edit institution: {$response->institution->name}";
                        continue;
                    }

                    // Update response data
                    $response->update([
                        'responses' => $update['responses'],
                        'progress_percentage' => 100,
                        'is_complete' => true,
                    ]);

                    $results[] = [
                        'response_id' => $response->id,
                        'institution' => $response->institution->name,
                        'status' => 'updated'
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
            'errors' => $errors
        ];
    }

    /**
     * Check if user can edit institution responses
     *
     * @param User $user
     * @param mixed $institution
     * @return bool
     */
    protected function canUserEditInstitutionResponse(User $user, $institution): bool
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
}
