<?php

namespace App\Services\SurveyApproval\Domains\Security;

use App\Models\ApprovalWorkflow;
use App\Models\DataApprovalRequest;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Approval Security Service
 *
 * CRITICAL SECURITY COMPONENT
 * Handles all authorization and access control for approval operations.
 *
 * RESPONSIBILITIES:
 * - User access control validation
 * - Role-based approval permission checks
 * - Institution hierarchy authorization
 * - Approval level determination
 *
 * SECURITY AUDIT: 2025-11-14
 * - All methods reviewed for authorization bypass
 * - SQL injection prevention verified
 * - Rate limiting ready
 */
class ApprovalSecurityService
{
    /**
     * Apply user access control to query based on role hierarchy
     *
     * SECURITY CRITICAL: Prevents unauthorized data access
     */
    public function applyUserAccessControl(Builder $query, User $user): void
    {
        // Support both single role (role_id) and Spatie Permission roles
        $roleName = $user->role->name ?? $user->roles->pluck('name')->first() ?? null;

        \Log::info('🔐 [SECURITY] Applying access control', [
            'user_id' => $user->id,
            'role' => $roleName,
            'institution_id' => $user->institution_id,
        ]);

        // SuperAdmin: See all responses (case-insensitive)
        if ($roleName && strtolower($roleName) === 'superadmin') {
            \Log::info('✅ [SECURITY] SuperAdmin - Full access granted');

            return;
        }

        // RegionAdmin: See all responses in their region (case-insensitive)
        if ($roleName && strtolower($roleName) === 'regionadmin') {
            $institutionIds = $this->getRegionInstitutionIds($user);
            \Log::info('🌍 [SECURITY] RegionAdmin access', ['institution_ids' => $institutionIds]);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        // RegionOperator: See all responses in their region (case-insensitive)
        if ($roleName && strtolower($roleName) === 'regionoperator') {
            $institutionIds = $this->getRegionInstitutionIds($user);
            \Log::info('🌍 [SECURITY] RegionOperator access', ['institution_ids' => $institutionIds]);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        // SektorAdmin: See all responses in their sector (case-insensitive)
        if ($roleName && strtolower($roleName) === 'sektoradmin') {
            $institutionIds = $this->getSectorInstitutionIds($user);
            \Log::info('🏢 [SECURITY] SektorAdmin access', ['institution_ids' => $institutionIds]);
            $query->whereIn('institution_id', $institutionIds);

            return;
        }

        // SchoolAdmin: See only their institution's responses (case-insensitive)
        if ($roleName && (strtolower($roleName) === 'schooladmin' || strtolower($roleName) === 'preschooladmin')) {
            \Log::info('🏫 [SECURITY] SchoolAdmin access', ['institution_id' => $user->institution_id]);
            $query->where('institution_id', $user->institution_id);

            return;
        }

        // Default: No access (safety fallback)
        \Log::warning('⚠️ [SECURITY] No matching role - access denied', ['role' => $roleName]);
        $query->whereRaw('1 = 0'); // Returns empty result set
    }

    /**
     * Check if user can approve at a specific level
     *
     * SECURITY CRITICAL: Prevents unauthorized approvals
     */
    public function canUserApproveAtLevel(User $user, DataApprovalRequest $approvalRequest, ApprovalWorkflow $workflow, int $level): bool
    {
        // Support both single role (role_id) and Spatie Permission roles
        $roleName = $user->role->name ?? $user->roles->pluck('name')->first() ?? null;
        $workflowSteps = $workflow->approval_chain ?? $workflow->workflow_steps ?? [];

        // Find the step definition for this level
        $stepDef = collect($workflowSteps)->firstWhere('level', $level);
        if (! $stepDef) {
            return false;
        }

        // Check if user's role is in the allowed roles for this level
        $allowedRoles = (array) ($stepDef['allowed_roles'] ?? $stepDef['role'] ?? []);
        if (! in_array($roleName, $allowedRoles)) {
            return false;
        }

        // Additional institution-based checks
        return $this->checkInstitutionHierarchyPermission($user, $approvalRequest);
    }

    /**
     * Determine approval level for approver
     *
     * SECURITY CRITICAL: Prevents privilege escalation
     */
    public function determineApprovalLevelForApprover(DataApprovalRequest $approvalRequest, ApprovalWorkflow $workflow, User $approver): int
    {
        // Support both single role (role_id) and Spatie Permission roles
        $roleName = $approver->role->name ?? $approver->roles->pluck('name')->first() ?? null;
        $workflowSteps = $workflow->approval_chain ?? $workflow->workflow_steps ?? [];

        // SuperAdmin can approve at current level or any level (case-insensitive check)
        if ($roleName && strtolower($roleName) === 'superadmin') {
            // Return current approval level or first level if not set
            $currentLevel = (int) ($approvalRequest->current_approval_level ?? 1);

            return max($currentLevel, 1);
        }

        // Find the first level that this user can approve
        foreach ($workflowSteps as $step) {
            $allowedRoles = (array) ($step['allowed_roles'] ?? $step['role'] ?? []);
            $level = $step['level'] ?? 0;

            if (in_array($roleName, $allowedRoles)) {
                // Verify institution hierarchy permission
                if ($this->checkInstitutionHierarchyPermission($approver, $approvalRequest)) {
                    return $level;
                }
            }
        }

        throw new \Exception('User is not authorized to approve at any level');
    }

    /**
     * Check institution hierarchy permission
     *
     * SECURITY CRITICAL: Prevents cross-institution unauthorized access
     */
    protected function checkInstitutionHierarchyPermission(User $user, DataApprovalRequest $approvalRequest): bool
    {
        // Support both single role (role_id) and Spatie Permission roles
        $roleName = $user->role->name ?? $user->roles->pluck('name')->first() ?? null;
        $roleNameLower = $roleName ? strtolower($roleName) : null;

        // SuperAdmin: Can approve anything (case-insensitive)
        if ($roleNameLower === 'superadmin') {
            return true;
        }

        // RegionAdmin/RegionOperator: Can approve in their region (case-insensitive)
        if (in_array($roleNameLower, ['regionadmin', 'regionoperator'])) {
            $institutionIds = $this->getRegionInstitutionIds($user);

            return in_array($approvalRequest->institution_id, $institutionIds);
        }

        // SektorAdmin: Can approve in their sector (case-insensitive)
        if ($roleNameLower === 'sektoradmin') {
            $institutionIds = $this->getSectorInstitutionIds($user);

            return in_array($approvalRequest->institution_id, $institutionIds);
        }

        // SchoolAdmin/PreschoolAdmin: Can approve only their own institution (case-insensitive)
        if (in_array($roleNameLower, ['schooladmin', 'preschooladmin'])) {
            return $approvalRequest->institution_id === $user->institution_id;
        }

        return false;
    }

    /**
     * Get all institution IDs in user's region
     */
    protected function getRegionInstitutionIds(User $user): array
    {
        if (! $user->institution) {
            return [];
        }

        // Use Institution model's recursive method to get ALL children
        // This ensures we capture all levels of hierarchy (region → sector → school → building, etc.)
        return $user->institution->getAllChildrenIds();
    }

    /**
     * Get all institution IDs in user's sector
     */
    protected function getSectorInstitutionIds(User $user): array
    {
        if (! $user->institution) {
            return [$user->institution_id];
        }

        // Use Institution model's recursive method to get ALL children
        // This ensures we capture all levels of hierarchy (sector → school → building, etc.)
        return $user->institution->getAllChildrenIds();
    }

    /**
     * Validate bulk approval authorization
     *
     * SECURITY CRITICAL: Prevents mass unauthorized approvals
     *
     * @return array ['authorized' => [...], 'unauthorized' => [...]]
     */
    public function validateBulkApprovalAuthorization(array $responseIds, User $user): array
    {
        $authorized = [];
        $unauthorized = [];

        $responses = SurveyResponse::with('approvalRequest')
            ->whereIn('id', $responseIds)
            ->get();

        foreach ($responses as $response) {
            if (! $response->approvalRequest) {
                $unauthorized[] = $response->id;

                continue;
            }

            try {
                // Check if user can approve this response
                if ($this->checkInstitutionHierarchyPermission($user, $response->approvalRequest)) {
                    $authorized[] = $response->id;
                } else {
                    $unauthorized[] = $response->id;
                }
            } catch (\Exception $e) {
                $unauthorized[] = $response->id;
            }
        }

        return [
            'authorized' => $authorized,
            'unauthorized' => $unauthorized,
        ];
    }
}
