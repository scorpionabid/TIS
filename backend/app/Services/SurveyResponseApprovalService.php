<?php

namespace App\Services;

use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\DataApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalAction;
use App\Models\User;
use App\Jobs\BulkApprovalJob;
use App\Services\LoggingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class SurveyResponseApprovalService
{
    /**
     * Get survey responses that need approval for a specific survey
     */
    public function getResponsesForApproval(Survey $survey, Request $request, User $user): array
    {
        $query = SurveyResponse::where('survey_id', $survey->id)
            ->with(['institution', 'department', 'respondent', 'approvalRequest.approvalActions']);

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
            $query->whereHas('institution', function($q) use ($request) {
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
            $query->whereHas('institution', function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%");
            });
        }

        // Apply approval status filter
        if ($request->filled('approval_status')) {
            $approvalStatus = $request->get('approval_status');
            $query->whereHas('approvalRequest', function($q) use ($approvalStatus) {
                $q->where('current_status', $approvalStatus);
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 25);
        $responses = $query->orderBy('submitted_at', 'desc')->paginate($perPage);

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
     */
    public function createApprovalRequest(SurveyResponse $response, array $data = []): DataApprovalRequest
    {
        // Check if approval request already exists
        if ($response->approvalRequest) {
            throw new \Exception('Approval request already exists for this response');
        }

        // Find appropriate workflow for survey responses
        $workflow = ApprovalWorkflow::where('workflow_type', 'survey_response')
            ->where('status', 'active')
            ->first();

        if (!$workflow) {
            // Create default workflow if none exists
            $workflow = $this->createDefaultSurveyResponseWorkflow();
        }

        return DB::transaction(function () use ($response, $workflow, $data) {
            $approvalRequest = DataApprovalRequest::create([
                'workflow_id' => $workflow->id,
                'institution_id' => $response->institution_id,
                'approvalable_type' => 'App\Models\SurveyResponse',
                'approvalable_id' => $response->id,
                'submitted_by' => Auth::id(),
                'submitted_at' => now(),
                'current_status' => 'pending',
                'current_approval_level' => 1,
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
            
            if (!$approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            // Create approval action
            $action = ApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'approver_id' => $approver->id,
                'approval_level' => $approvalRequest->current_approval_level,
                'action' => 'approved',
                'comments' => $data['comments'] ?? null,
                'action_metadata' => $data['metadata'] ?? null,
                'action_taken_at' => now(),
            ]);

            // Check if this completes the approval chain
            $workflow = $approvalRequest->workflow;
            $approvalChain = $workflow->approval_chain;
            $currentLevel = $approvalRequest->current_approval_level;

            if ($currentLevel >= count($approvalChain)) {
                // Approval complete
                $approvalRequest->update([
                    'current_status' => 'approved',
                    'completed_at' => now(),
                ]);

                $response->update([
                    'status' => 'approved',
                    'approved_by' => $approver->id,
                    'approved_at' => now(),
                ]);

                return ['status' => 'completed', 'message' => 'Response fully approved'];
            } else {
                // Move to next level
                $approvalRequest->update([
                    'current_approval_level' => $currentLevel + 1,
                    'current_status' => 'in_progress',
                ]);

                return ['status' => 'in_progress', 'message' => 'Moved to next approval level'];
            }
        });
    }

    /**
     * Reject a survey response
     */
    public function rejectResponse(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;
            
            if (!$approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            // Create rejection action
            ApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'approver_id' => $approver->id,
                'approval_level' => $approvalRequest->current_approval_level,
                'action' => 'rejected',
                'comments' => $data['comments'] ?? null,
                'action_metadata' => $data['metadata'] ?? null,
                'action_taken_at' => now(),
            ]);

            // Update request and response status
            $approvalRequest->update([
                'current_status' => 'rejected',
                'completed_at' => now(),
            ]);

            $response->update([
                'status' => 'rejected',
                'rejection_reason' => $data['comments'] ?? 'Response rejected',
            ]);

            return ['status' => 'rejected', 'message' => 'Response rejected'];
        });
    }

    /**
     * Return response for revision
     */
    public function returnForRevision(SurveyResponse $response, User $approver, array $data = []): array
    {
        return DB::transaction(function () use ($response, $approver, $data) {
            $approvalRequest = $response->approvalRequest;
            
            if (!$approvalRequest) {
                throw new \Exception('No approval request found for this response');
            }

            // Create return action
            ApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'approver_id' => $approver->id,
                'approval_level' => $approvalRequest->current_approval_level,
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
            'estimated_completion' => now()->addMinutes(ceil(count($responseIds) / 50))->toISOString()
        ];
    }

    /**
     * Process bulk approval operations synchronously
     */
    public function processBulkApprovalSync(array $responseIds, string $action, User $approver, ?string $comments = null): array
    {
        $results = [];
        $errors = [];

        DB::transaction(function () use ($responseIds, $action, $approver, $comments, &$results, &$errors) {
            foreach ($responseIds as $responseId) {
                try {
                    $result = $this->processIndividualApproval($responseId, $action, $approver, $comments);
                    
                    $results[] = [
                        'response_id' => $responseId,
                        'status' => 'success',
                        'result' => $result,
                    ];
                } catch (\Exception $e) {
                    $errors[] = [
                        'response_id' => $responseId,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        return [
            'successful' => count($results),
            'failed' => count($errors),
            'results' => $results,
            'errors' => $errors,
        ];
    }

    /**
     * Process individual approval operation
     */
    public function processIndividualApproval(int $responseId, string $action, User $approver, ?string $comments = null): bool
    {
        $response = SurveyResponse::findOrFail($responseId);
        
        $result = match ($action) {
            'approve' => $this->approveResponse($response, $approver, ['comments' => $comments]),
            'reject' => $this->rejectResponse($response, $approver, ['comments' => $comments ?? 'Bulk rejection']),
            'return' => $this->returnForRevision($response, $approver, ['comments' => $comments ?? 'Returned for revision']),
            default => throw new \Exception("Invalid action: {$action}")
        };
        
        return $result !== false;
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
        $query = SurveyResponse::where('survey_id', $survey->id);
        $this->applyUserAccessControl($query, $user);

        $total = $query->count();
        $pending = $query->where('status', 'submitted')->count();
        $approved = $query->where('status', 'approved')->count();
        $rejected = $query->where('status', 'rejected')->count();
        $draft = $query->where('status', 'draft')->count();

        return [
            'total' => $total,
            'pending' => $pending,
            'approved' => $approved,
            'rejected' => $rejected,
            'draft' => $draft,
            'completion_rate' => $total > 0 ? round(($approved + $rejected) / $total * 100, 2) : 0,
        ];
    }

    /**
     * Apply user access control based on role hierarchy
     */
    private function applyUserAccessControl($query, User $user): void
    {
        $role = $user->role ?? $user->roles->pluck('name')->first();

        switch ($role) {
            case 'superadmin':
                // SuperAdmin can see everything
                break;
            case 'regionadmin':
                // RegionAdmin can see responses from their region
                if ($user->institution && $user->institution->parent_id) {
                    $query->whereHas('institution', function($q) use ($user) {
                        $q->where('parent_id', $user->institution->id)
                          ->orWhere('id', $user->institution->id);
                    });
                }
                break;
            case 'sektoradmin':
                // SektorAdmin can see responses from their sector
                if ($user->institution) {
                    $query->whereHas('institution', function($q) use ($user) {
                        $q->where('parent_id', $user->institution->id)
                          ->orWhere('id', $user->institution->id);
                    });
                }
                break;
            case 'schooladmin':
            case 'deputy':
            default:
                // School level users can only see their own institution
                if ($user->institution_id) {
                    $query->where('institution_id', $user->institution_id);
                }
                break;
        }
    }

    /**
     * Create default survey response approval workflow
     */
    private function createDefaultSurveyResponseWorkflow(): ApprovalWorkflow
    {
        return ApprovalWorkflow::create([
            'name' => 'Survey Response Approval',
            'workflow_type' => 'survey_response',
            'status' => 'active',
            'approval_chain' => [
                ['level' => 1, 'role' => 'schooladmin', 'required' => true, 'title' => 'School Admin Review'],
                ['level' => 2, 'role' => 'sektoradmin', 'required' => true, 'title' => 'Sector Admin Approval'],
                ['level' => 3, 'role' => 'regionadmin', 'required' => false, 'title' => 'Regional Review'],
            ],
            'workflow_config' => [
                'auto_approve_after' => '7_days',
                'require_all_levels' => false,
                'allow_skip_levels' => true,
            ],
            'description' => 'Default workflow for survey response approvals',
            'created_by' => Auth::id() ?? 1,
        ]);
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
}