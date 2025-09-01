import { BaseService, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface ApprovalRequest {
  id: number;
  request_title: string;
  request_description: string;
  current_status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  deadline?: string;
  survey_info?: {
    survey_title: string;
    survey_category: string;
    institution_name: string;
    respondent_name: string;
    progress_percentage: number;
    response_count: number;
  };
  workflow?: {
    id: number;
    name: string;
    workflow_type: string;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  submitter?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface DelegationRequest {
  delegate_to: number;
  reason: string;
  expiration_days: number;
}

export interface BulkApprovalRequest {
  response_ids: number[];
  comments?: string;
  approval_level?: number;
}

export interface ApprovalAnalytics {
  overview: {
    total_approvals: number;
    pending_approvals: number;
    completed_approvals: number;
    rejected_approvals: number;
  };
  survey_metrics: {
    survey_response_approvals: {
      total_submissions: number;
      pending_approvals: number;
      approved_responses: number;
      rejection_rate: number;
      average_approval_time_hours: number;
    };
    template_approvals: {
      templates_submitted: number;
      templates_approved: number;
      templates_in_review: number;
    };
    institution_performance: {
      top_performing_institutions: Array<{
        institution_name: string;
        approval_rate: number;
        average_response_time: number;
      }>;
      institutions_with_delays: Array<{
        institution_name: string;
        pending_count: number;
        average_delay_days: number;
      }>;
    };
    approval_bottlenecks: {
      bottleneck_levels: Array<{
        level: string;
        pending_count: number;
        average_wait_time: number;
      }>;
      slow_approvers: Array<{
        approver_name: string;
        pending_count: number;
        average_response_time: number;
      }>;
      recommendations: string[];
    };
  };
}

class SurveyApprovalService extends BaseService<ApprovalRequest> {
  constructor() {
    super('/survey-approval');
  }

  /**
   * Submit survey response for approval
   */
  async submitResponseForApproval(responseId: number, data?: {
    description?: string;
    priority?: string;
    metadata?: Record<string, any>;
  }) {
    const response = await apiClient.post(`${this.baseEndpoint}/responses/${responseId}/submit`, data);
    return response.data;
  }

  /**
   * Approve survey response
   */
  async approveResponse(approvalRequestId: number, data?: {
    comments?: string;
    approval_level?: number;
  }) {
    const response = await apiClient.post(`${this.baseEndpoint}/requests/${approvalRequestId}/approve`, data);
    return response.data;
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(approvalRequestId: number, data: DelegationRequest) {
    const response = await apiClient.post(`${this.baseEndpoint}/requests/${approvalRequestId}/delegate`, data);
    return response.data;
  }

  /**
   * Bulk approve survey responses
   */
  async bulkApprove(data: BulkApprovalRequest) {
    const response = await apiClient.post(`${this.baseEndpoint}/bulk-approve`, data);
    return response.data;
  }

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(params?: PaginationParams & {
    priority?: string;
    institution_id?: number;
    survey_category?: string;
  }) {
    const response = await apiClient.get(`${this.baseEndpoint}/pending`, { params });
    return response.data;
  }

  /**
   * Submit survey template for approval
   */
  async submitTemplateForApproval(surveyId: number) {
    const response = await apiClient.post(`/survey-templates/${surveyId}/submit-for-approval`);
    return response.data;
  }

  /**
   * Get approval analytics
   */
  async getApprovalAnalytics(params?: {
    period?: string;
    institution_id?: number;
    include_details?: boolean;
  }): Promise<ApprovalAnalytics> {
    const response = await apiClient.get('/survey-approval-analytics', { params });
    return response.data;
  }

  /**
   * Get approval history for a survey
   */
  async getApprovalHistory(surveyId: number, params?: PaginationParams) {
    const response = await apiClient.get(`/survey-approval-analytics/surveys/${surveyId}/history`, { params });
    return response.data;
  }

  /**
   * Check delegation status
   */
  async checkDelegationStatus(approvalRequestId: number) {
    const response = await apiClient.get(`/approval-delegation/requests/${approvalRequestId}/status`);
    return response.data;
  }

  /**
   * Get approval request details
   */
  async getApprovalDetails(approvalRequestId: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/requests/${approvalRequestId}`);
    return response.data;
  }

  /**
   * Reject approval request
   */
  async rejectRequest(approvalRequestId: number, data: {
    comments: string;
    rejection_reason?: string;
  }) {
    const response = await apiClient.post(`${this.baseEndpoint}/requests/${approvalRequestId}/reject`, data);
    return response.data;
  }

  /**
   * Return for revision
   */
  async returnForRevision(approvalRequestId: number, data: {
    comments: string;
    revision_notes?: string;
  }) {
    const response = await apiClient.post(`${this.baseEndpoint}/requests/${approvalRequestId}/return`, data);
    return response.data;
  }

  /**
   * Get approval workflow templates
   */
  async getWorkflowTemplates() {
    const response = await apiClient.get('/approval-workflows/templates');
    return response.data;
  }

  /**
   * Get users available for delegation
   */
  async getUsersForDelegation(params?: {
    role_level?: string;
    search?: string;
    per_page?: number;
  }) {
    const response = await apiClient.get('/users/for-delegation', { params });
    return response.data;
  }

  /**
   * Cancel approval request
   */
  async cancelRequest(approvalRequestId: number, reason?: string) {
    const response = await apiClient.post(`${this.baseEndpoint}/requests/${approvalRequestId}/cancel`, {
      reason
    });
    return response.data;
  }

  /**
   * Get approval statistics for dashboard
   */
  async getDashboardStats() {
    const response = await apiClient.get(`${this.baseEndpoint}/dashboard-stats`);
    return response.data;
  }

  /**
   * Get approval trends over time
   */
  async getApprovalTrends(params?: {
    period?: string;
    group_by?: 'day' | 'week' | 'month';
  }) {
    const response = await apiClient.get(`${this.baseEndpoint}/trends`, { params });
    return response.data;
  }

  /**
   * Get performance metrics by institution
   */
  async getInstitutionPerformance(params?: {
    period?: string;
    institution_type?: string;
  }) {
    const response = await apiClient.get(`${this.baseEndpoint}/institution-performance`, { params });
    return response.data;
  }

  /**
   * Export approval data
   */
  async exportApprovalData(params: {
    format: 'xlsx' | 'csv' | 'pdf';
    date_from?: string;
    date_to?: string;
    status?: string;
    institution_id?: number;
  }) {
    const response = await apiClient.get(`${this.baseEndpoint}/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Get approval workflow configuration
   */
  async getWorkflowConfig(workflowType: string) {
    const response = await apiClient.get(`/approval-workflows/config/${workflowType}`);
    return response.data;
  }

  /**
   * Update approval workflow configuration
   */
  async updateWorkflowConfig(workflowType: string, config: any) {
    const response = await apiClient.put(`/approval-workflows/config/${workflowType}`, config);
    return response.data;
  }
}

export const surveyApprovalService = new SurveyApprovalService();