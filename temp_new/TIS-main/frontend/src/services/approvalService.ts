import { apiClient } from './api';
import { ApiResponse } from '../types/api';

export interface ApprovalRequest {
  id: number;
  workflow_id: number;
  approvable_type: string;
  approvable_id: number;
  submitter_id: number;
  current_approval_level: number;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  priority: 'low' | 'medium' | 'high';
  submission_data: any;
  comments: string | null;
  deadline: string | null;
  is_overdue?: boolean;
  overdue_flagged_at?: string | null;
  created_at: string;
  updated_at: string;
  workflow: ApprovalWorkflow;
  submitter: User;
  approvable: any;
  actions: ApprovalAction[];
}

export interface ApprovalWorkflow {
  id: number;
  name: string;
  workflow_type: string;
  approval_chain: ApprovalLevel[];
  workflow_config: any;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLevel {
  level: number;
  role: string;
  required: boolean;
  title: string;
}

export interface ApprovalAction {
  id: number;
  approval_request_id: number;
  approver_id: number;
  action: 'approved' | 'rejected' | 'returned' | 'delegated';
  level: number;
  comments: string | null;
  action_metadata: any;
  created_at: string;
  approver: User;
}

export interface ApprovalTemplate {
  id: number;
  name: string;
  template_type: string;
  default_approval_chain: ApprovalLevel[];
  template_config: any;
  description: string | null;
  is_system_template: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
  total: number;
  my_pending: number;
  overdue?: number;
}

export interface CreateApprovalRequest {
  workflow_id: number;
  approvable_type: string;
  approvable_id: number;
  submission_data: any;
  comments?: string;
  priority?: 'low' | 'medium' | 'high';
  deadline?: string;
}

export interface ApprovalActionRequest {
  action: 'approve' | 'reject' | 'return';
  comments?: string;
  return_to_level?: number;
}

export interface BulkApprovalRequest {
  approval_ids: number[];
  action: 'approve' | 'reject';
  comments?: string;
}

class ApprovalService {
  // Get approval requests with filtering
  async getApprovals(params?: {
    status?: string;
    priority?: string;
    workflow_type?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<{ data: ApprovalRequest[]; pagination: any }>> {
    const response = await apiClient.get('/approvals', { params });
    return response.data;
  }

  // Get pending approvals for current user
  async getPendingApprovals(): Promise<ApiResponse<ApprovalRequest[]>> {
    const response = await apiClient.get('/approvals/pending');
    return response.data;
  }

  // Get my approval requests (submitted by me)
  async getMyApprovals(): Promise<ApiResponse<ApprovalRequest[]>> {
    const response = await apiClient.get('/approvals/my-approvals');
    return response.data;
  }

  // Get specific approval request
  async getApproval(id: number): Promise<ApiResponse<ApprovalRequest>> {
    const response = await apiClient.get(`/approvals/${id}`);
    return response.data;
  }

  // Create approval request
  async createApprovalRequest(data: CreateApprovalRequest): Promise<ApiResponse<ApprovalRequest>> {
    const response = await apiClient.post('/approvals', data);
    return response.data;
  }

  // Approve request
  async approveRequest(id: number, data: ApprovalActionRequest): Promise<ApiResponse<ApprovalRequest>> {
    const response = await apiClient.post(`/approvals/${id}/approve`, data);
    return response.data;
  }

  // Reject request
  async rejectRequest(id: number, data: ApprovalActionRequest): Promise<ApiResponse<ApprovalRequest>> {
    const response = await apiClient.post(`/approvals/${id}/reject`, data);
    return response.data;
  }

  // Return for revision
  async returnRequest(id: number, data: ApprovalActionRequest): Promise<ApiResponse<ApprovalRequest>> {
    const response = await apiClient.post(`/approvals/${id}/return`, data);
    return response.data;
  }

  // Bulk approve
  async bulkApprove(data: BulkApprovalRequest): Promise<ApiResponse<{ approved: number; failed: number }>> {
    const response = await apiClient.post('/approvals/bulk-approve', data);
    return response.data;
  }

  // Bulk reject
  async bulkReject(data: BulkApprovalRequest): Promise<ApiResponse<{ rejected: number; failed: number }>> {
    const response = await apiClient.post('/approvals/bulk-reject', data);
    return response.data;
  }

  // Get approval templates
  async getTemplates(): Promise<ApiResponse<ApprovalTemplate[]>> {
    const response = await apiClient.get('/approvals/templates');
    return response.data;
  }

  // Get approval analytics
  async getAnalytics(): Promise<ApiResponse<ApprovalStats>> {
    const response = await apiClient.get('/approvals/analytics');
    return response.data;
  }

  // Get approval notifications
  async getNotifications(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/approvals/notifications');
    return response.data;
  }

  // Mark notification as read
  async markNotificationRead(notificationId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`/approvals/notifications/${notificationId}/mark-read`);
    return response.data;
  }

  // Helper methods for status formatting
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'returned': return 'secondary';
      default: return 'secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Gözləyir';
      case 'approved': return 'Təsdiqləndi';
      case 'rejected': return 'Rədd edildi';
      case 'returned': return 'Geri qaytarıldı';
      default: return status;
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return priority;
    }
  }

  getActionText(action: string): string {
    switch (action) {
      case 'approved': return 'Təsdiqləndi';
      case 'rejected': return 'Rədd edildi';
      case 'returned': return 'Geri qaytarıldı';
      case 'delegated': return 'Həvalə edildi';
      default: return action;
    }
  }

  // Survey Approval Methods
  
  // Get surveys available for approval
  async getSurveysForApproval(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/approvals/surveys');
    return response.data;
  }

  // Get survey responses for approval
  async getSurveyResponses(surveyId: number, status: string = 'submitted'): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/approvals/survey-responses', {
      params: { survey_id: surveyId, status }
    });
    return response.data;
  }

  // Get survey responses with hierarchical filtering (new enhanced method)
  async getSurveyResponsesHierarchical(status: string = 'submitted', surveyId?: number): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/approvals/survey-responses', {
      params: { 
        status,
        survey_id: surveyId,
        per_page: 50 
      }
    });
    return response.data;
  }

  // Approve a survey response
  async approveSurveyResponse(responseId: number, comments?: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`/approvals/survey-responses/${responseId}/approve`, {
      comments
    });
    return response.data;
  }

  // Reject a survey response
  async rejectSurveyResponse(responseId: number, rejectionReason: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`/approvals/survey-responses/${responseId}/reject`, {
      rejection_reason: rejectionReason
    });
    return response.data;
  }

  // Bulk approve survey responses
  async bulkApproveSurveyResponses(responseIds: number[], comments?: string): Promise<ApiResponse<{ approved_count: number; failed_count: number }>> {
    const response = await apiClient.post('/approvals/survey-responses/bulk-approve', {
      response_ids: responseIds,
      comments
    });
    return response.data;
  }

  async bulkRejectSurveyResponses(responseIds: number[], reason: string): Promise<ApiResponse<{ rejected_count: number; failed_count: number }>> {
    const response = await apiClient.post('/approvals/survey-responses/bulk-reject', {
      response_ids: responseIds,
      reason
    });
    return response.data;
  }

  // New Table Editing Methods

  /**
   * Get survey responses in table editing format
   */
  async getTableEditingView(surveyId: number, params?: any): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/survey-response-approval/surveys/${surveyId}/table-view`, {
      params
    });
    return response.data;
  }

  /**
   * Batch update multiple survey responses
   */
  async batchUpdateResponses(updates: Array<{
    response_id: number;
    responses: Record<string, any>;
  }>): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/survey-responses/batch-update', {
      updates
    });
    return response.data;
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
