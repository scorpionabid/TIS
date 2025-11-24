<?php

namespace App\Services\SurveyApproval\Domains\Query;

use App\Models\ApprovalAction;
use App\Models\DataApprovalRequest;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Services\SurveyApproval\Domains\Security\ApprovalSecurityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Approval Query Service
 *
 * CRITICAL QUERY COMPONENT
 * Handles all read operations for approval data.
 *
 * RESPONSIBILITIES:
 * - Get responses for approval with filters
 * - Get pending approvals list
 * - Get approval statistics
 * - Get approval history
 * - Check approval permissions
 *
 * SECURITY FEATURES:
 * - All queries filtered by user access control
 * - Caching for performance optimization
 * - Permission checks before data access
 *
 * LOGIC PRESERVED FROM: SurveyApprovalService (lines 30-109, 570-604)
 *
 * SECURITY AUDIT: 2025-11-14
 */
class ApprovalQueryService
{
    protected ApprovalSecurityService $securityService;

    protected int $cacheMinutes = 3; // Short cache for approval data

    public function __construct(ApprovalSecurityService $securityService)
    {
        $this->securityService = $securityService;
    }

    /**
     * Get survey responses that need approval for a specific survey
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::getResponsesForApproval() (lines 30-109)
     *
     * @return array ['responses' => array, 'pagination' => array, 'stats' => array]
     */
    public function getResponsesForApproval(Survey $survey, Request $request, User $user): array
    {
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
        $this->securityService->applyUserAccessControl($query, $user);

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

        // Ensure respondent names are properly loaded
        foreach ($responses->items() as $response) {
            if ($response->respondent) {
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
     * Get approval statistics for a survey
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::getApprovalStats() (lines 570-604)
     */
    public function getApprovalStats(Survey $survey, User $user): array
    {
        $cacheKey = $this->getCacheKey('approval_stats', [
            'survey_id' => $survey->id,
            'user_id' => $user->id,
            'user_role' => $user->role?->name ?? 'unknown',
        ]);

        return Cache::remember($cacheKey, now()->addMinutes($this->cacheMinutes), function () use ($survey, $user) {
            $baseQuery = SurveyResponse::where('survey_id', $survey->id);
            $this->securityService->applyUserAccessControl($baseQuery, $user);

            // Single query to get all stats with aggregation
            $stats = $baseQuery->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(CASE WHEN status = "submitted" THEN 1 END) as pending'),
                DB::raw('COUNT(CASE WHEN status = "approved" THEN 1 END) as approved'),
                DB::raw('COUNT(CASE WHEN status = "rejected" THEN 1 END) as rejected'),
                DB::raw('COUNT(CASE WHEN status = "draft" THEN 1 END) as draft')
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
        });
    }

    /**
     * Get pending approvals for a user
     *
     * Returns list of approval requests waiting for user's action
     */
    public function getPendingApprovals(User $user, int $limit = 50): array
    {
        $cacheKey = $this->getCacheKey('pending_approvals', [
            'user_id' => $user->id,
            'user_role' => $user->role?->name ?? 'unknown',
            'limit' => $limit,
        ]);

        return Cache::remember($cacheKey, now()->addMinutes($this->cacheMinutes), function () use ($user, $limit) {
            $query = DataApprovalRequest::with([
                'approvalable',
                'institution',
                'submitter',
                'workflow',
            ])
                ->whereIn('current_status', ['pending', 'in_progress'])
                ->orderBy('submitted_at', 'desc')
                ->limit($limit);

            // Apply user access control
            $this->applyApprovalRequestAccessControl($query, $user);

            return $query->get()->map(function ($request) {
                return [
                    'id' => $request->id,
                    'workflow_type' => $request->workflow->workflow_type ?? 'unknown',
                    'institution' => $request->institution->name ?? 'N/A',
                    'submitter' => $request->submitter->name ?? 'Unknown',
                    'current_status' => $request->current_status,
                    'current_level' => $request->current_approval_level,
                    'submitted_at' => $request->submitted_at,
                    'deadline' => $request->deadline,
                    'metadata' => $request->request_metadata,
                ];
            })->toArray();
        });
    }

    /**
     * Get approval history for a response
     */
    public function getApprovalHistory(SurveyResponse $response): array
    {
        $approvalRequest = $response->approvalRequest;

        if (! $approvalRequest) {
            return [];
        }

        $actions = ApprovalAction::where('approval_request_id', $approvalRequest->id)
            ->with('approver:id,username,email')
            ->orderBy('action_taken_at', 'desc')
            ->get();

        return $actions->map(function ($action) {
            return [
                'id' => $action->id,
                'approver' => [
                    'id' => $action->approver->id ?? null,
                    'name' => $action->approver->name ?? 'Unknown',
                    'email' => $action->approver->email ?? null,
                ],
                'approval_level' => $action->approval_level,
                'action' => $action->action,
                'comments' => $action->comments,
                'action_taken_at' => $action->action_taken_at,
                'metadata' => $action->action_metadata,
            ];
        })->toArray();
    }

    /**
     * Check if user can approve a specific response
     *
     * SECURITY CHECK: Verifies user has permission to approve
     */
    public function canUserApprove(SurveyResponse $response, User $user): bool
    {
        $approvalRequest = $response->approvalRequest;

        if (! $approvalRequest) {
            return false;
        }

        // Must be submitted status
        if ($response->status !== 'submitted') {
            return false;
        }

        $workflow = $approvalRequest->workflow;

        if (! $workflow) {
            return false;
        }

        try {
            // Use security service to determine if user can approve at any level
            $this->securityService->determineApprovalLevelForApprover(
                $approvalRequest,
                $workflow,
                $user
            );

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get responses organized for table editing interface
     *
     * LOGIC PRESERVED FROM: SurveyApprovalService::getResponsesForTableView() (lines 890-927)
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
                'can_edit' => $this->canUserEditInstitution($user, $institution),
                'can_approve' => $this->canUserApproveInstitution($user, $institution),
            ];
        }

        return [
            'institutions' => $institutionMatrix,
            'questions' => $questions,
            'stats' => $baseData['stats'] ?? [],
        ];
    }

    /**
     * Apply access control to approval request query
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     */
    protected function applyApprovalRequestAccessControl($query, User $user): void
    {
        $roleName = $user->role->name ?? null;

        if ($roleName === 'SuperAdmin') {
            return; // See all
        }

        if ($roleName === 'RegionAdmin') {
            $institutionIds = $this->getRegionInstitutionIds($user);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        if ($roleName === 'SektorAdmin') {
            $institutionIds = $this->getSectorInstitutionIds($user);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        // Default: only own institution
        if ($user->institution_id) {
            $query->where('institution_id', $user->institution_id);
        }
    }

    /**
     * Build response matrix for table display
     *
     * @param \Illuminate\Support\Collection $institutionResponses
     * @param \Illuminate\Support\Collection $questions
     */
    protected function buildResponseMatrix($institutionResponses, $questions): array
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
     * Check if user can edit institution responses
     *
     * @param mixed $institution
     */
    protected function canUserEditInstitution(User $user, $institution): bool
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
     *
     * @param mixed $institution
     */
    protected function canUserApproveInstitution(User $user, $institution): bool
    {
        // Same logic as edit for now
        return $this->canUserEditInstitution($user, $institution);
    }

    /**
     * Get region institution IDs
     */
    protected function getRegionInstitutionIds(User $user): array
    {
        if (! $user->institution) {
            return [];
        }

        $regionId = $user->institution_id;

        return \App\Models\Institution::where('parent_id', $regionId)
            ->orWhere('id', $regionId)
            ->orWhereIn('parent_id', function ($query) use ($regionId) {
                $query->select('id')
                    ->from('institutions')
                    ->where('parent_id', $regionId);
            })
            ->pluck('id')
            ->toArray();
    }

    /**
     * Get sector institution IDs
     */
    protected function getSectorInstitutionIds(User $user): array
    {
        if (! $user->institution) {
            return [$user->institution_id];
        }

        $sectorId = $user->institution_id;

        return \App\Models\Institution::where('parent_id', $sectorId)
            ->orWhere('id', $sectorId)
            ->pluck('id')
            ->toArray();
    }

    /**
     * Get cache key
     */
    protected function getCacheKey(string $prefix, array $params): string
    {
        $key = $prefix;
        foreach ($params as $paramKey => $paramValue) {
            $key .= "_{$paramKey}_{$paramValue}";
        }

        return $key;
    }
}
