import { apiClient } from './api';

export interface ApprovalHistoryItem {
  id: number;
  action: 'submitted_for_approval' | 'approved' | 'rejected';
  action_label: string;
  user: {
    id: number;
    name: string;
  } | null;
  notes?: string;
  created_at: string;
}

export interface AuditHistoryItem {
  id: number;
  action: string;
  action_label: string;
  user: {
    id: number;
    name: string;
  } | null;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes_summary?: Record<string, { old: any; new: any }>;
  notes?: string;
  created_at: string;
}

export interface SubmitForApprovalResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface ApproveTaskResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface RejectTaskResponse {
  success: boolean;
  message: string;
  data: any;
}

export const taskApprovalService = {
  /**
   * Submit a completed task for approval
   */
  async submitForApproval(taskId: number): Promise<SubmitForApprovalResponse> {
    const response = await apiClient.post(`/tasks/${taskId}/submit-for-approval`);
    return response.data;
  },

  /**
   * Approve a pending task
   */
  async approve(taskId: number, notes?: string): Promise<ApproveTaskResponse> {
    const response = await apiClient.post(`/tasks/${taskId}/approve`, {
      notes: notes || undefined,
    });
    return response.data;
  },

  /**
   * Reject a pending task with mandatory notes
   */
  async reject(taskId: number, notes: string): Promise<RejectTaskResponse> {
    const response = await apiClient.post(`/tasks/${taskId}/reject`, {
      notes,
    });
    return response.data;
  },

  /**
   * Get approval history for a task
   */
  async getApprovalHistory(taskId: number): Promise<{ success: boolean; history: ApprovalHistoryItem[] }> {
    const response = await apiClient.get(`/tasks/${taskId}/approval-history`);
    return response.data;
  },

  /**
   * Get complete audit history for a task
   */
  async getAuditHistory(taskId: number): Promise<{ success: boolean; history: AuditHistoryItem[] }> {
    const response = await apiClient.get(`/tasks/${taskId}/audit-history`);
    return response.data;
  },
};
