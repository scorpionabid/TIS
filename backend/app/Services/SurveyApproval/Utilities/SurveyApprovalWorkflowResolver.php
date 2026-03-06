<?php

namespace App\Services\SurveyApproval\Utilities;

use App\Models\ApprovalWorkflow;
use Illuminate\Support\Facades\Auth;

/**
 * Survey Approval Workflow Resolver
 *
 * SINGLE SOURCE OF TRUTH for survey approval workflow creation and retrieval.
 *
 * REPLACES:
 * - SurveyApprovalService::createDefaultSurveyResponseWorkflow() (lines 850-869)
 * - SurveyApprovalBridge::getOrCreateSurveyApprovalWorkflow() (lines 272-301)
 *
 * RESPONSIBILITIES:
 * - Get or create survey response approval workflow
 * - Ensure consistent workflow configuration across system
 * - Prevent duplicate workflow creation
 *
 * USAGE:
 * ```php
 * $resolver = app(SurveyApprovalWorkflowResolver::class);
 * $workflow = $resolver->getOrCreateSurveyApprovalWorkflow();
 * ```
 *
 * REFACTORED: 2025-11-14
 */
class SurveyApprovalWorkflowResolver
{
    /**
     * Get or create survey approval workflow
     *
     * SINGLE SOURCE OF TRUTH: All survey approval workflows use this method
     *
     * @param string $workflowType Default: 'survey_response'
     */
    public function getOrCreateSurveyApprovalWorkflow(string $workflowType = 'survey_response'): ApprovalWorkflow
    {
        // Try to find existing active workflow
        $workflow = ApprovalWorkflow::where('workflow_type', $workflowType)
            ->where('status', 'active')
            ->first();

        if ($workflow) {
            return $workflow;
        }

        // Create new workflow with standard configuration
        return $this->createDefaultWorkflow($workflowType);
    }

    /**
     * Create default survey approval workflow
     *
     * UNIFIED CONFIGURATION: Standard approval chain for all surveys
     */
    protected function createDefaultWorkflow(string $workflowType): ApprovalWorkflow
    {
        // Standard approval chain configuration
        $approvalChain = $this->getStandardApprovalChain();
        $workflowConfig = $this->getStandardWorkflowConfig();

        return ApprovalWorkflow::create([
            'name' => $this->getWorkflowName($workflowType),
            'workflow_type' => $workflowType,
            'status' => 'active',
            'approval_chain' => $approvalChain,
            'workflow_config' => $workflowConfig,
            'description' => $this->getWorkflowDescription($workflowType),
            'created_by' => Auth::id() ?? 1,
        ]);
    }

    /**
     * Get standard approval chain
     *
     * HIERARCHY: SchoolAdmin → SektorAdmin → RegionAdmin
     */
    protected function getStandardApprovalChain(): array
    {
        return [
            [
                'level' => 1,
                'role' => 'schooladmin',
                'allowed_roles' => ['schooladmin', 'preschooladmin'],
                'required' => false,
                'title' => 'School Admin Review',
            ],
            [
                'level' => 2,
                'role' => 'sektoradmin',
                'allowed_roles' => ['sektoradmin'],
                'required' => true,
                'title' => 'Sector Admin Approval',
            ],
            [
                'level' => 3,
                'role' => 'regionadmin',
                'allowed_roles' => ['regionadmin', 'regionoperator'],
                'required' => true,
                'title' => 'Regional Admin Approval',
            ],
        ];
    }

    /**
     * Get standard workflow configuration
     *
     * DEFAULTS:
     * - Auto-approve after 7 days
     * - Not all levels required
     * - Skip levels allowed
     */
    protected function getStandardWorkflowConfig(): array
    {
        return [
            'auto_approve_after' => '7_days',
            'require_all_levels' => false,
            'allow_skip_levels' => true,
            'first_approver_role' => 'sektoradmin',
            'approval_hierarchy' => ['schooladmin', 'sektoradmin', 'regionadmin'],
        ];
    }

    /**
     * Get workflow name based on type
     */
    protected function getWorkflowName(string $workflowType): string
    {
        return match ($workflowType) {
            'survey_response' => 'Survey Response Approval',
            'survey_template' => 'Survey Template Approval',
            default => 'Survey Approval Workflow',
        };
    }

    /**
     * Get workflow description based on type
     */
    protected function getWorkflowDescription(string $workflowType): string
    {
        return match ($workflowType) {
            'survey_response' => 'Default workflow for survey response approvals',
            'survey_template' => 'Workflow for survey template approvals',
            default => 'Standard survey approval workflow',
        };
    }

    /**
     * Get workflow by type (without creating)
     */
    public function findWorkflowByType(string $workflowType): ?ApprovalWorkflow
    {
        return ApprovalWorkflow::where('workflow_type', $workflowType)
            ->where('status', 'active')
            ->first();
    }

    /**
     * Check if workflow exists for type
     */
    public function workflowExists(string $workflowType): bool
    {
        return ApprovalWorkflow::where('workflow_type', $workflowType)
            ->where('status', 'active')
            ->exists();
    }

    /**
     * Get initial approval level for workflow
     */
    public function getInitialApprovalLevel(ApprovalWorkflow $workflow): int
    {
        $chain = $workflow->approval_chain ?? [];

        // Find first required level
        foreach ($chain as $step) {
            $level = $step['level'] ?? null;
            $required = $step['required'] ?? true;

            if ($level && $required) {
                return (int) $level;
            }
        }

        // Fallback to first level if no required level found
        return (int) ($chain[0]['level'] ?? 1);
    }
}
