import { apiClient } from './api';

export interface DelegateTaskRequest {
  new_assignee_id: number;
  delegation_reason?: string;
}

export interface EligibleDelegate {
  id: number;
  name: string;
  email: string;
  role: string;
  role_display: string;
  institution: {
    id: number;
    name: string;
  };
}

export interface DelegationHistoryItem {
  id: number;
  task_id: number;
  assignment_id: number;
  delegated_from_user: {
    id: number;
    name: string;
  };
  delegated_to_user: {
    id: number;
    name: string;
  };
  delegated_by_user: {
    id: number;
    name: string;
  };
  delegation_reason: string | null;
  delegated_at: string;
  delegation_metadata: Record<string, any> | null;
}

class TaskDelegationService {
  async getEligibleDelegates(taskId: number): Promise<EligibleDelegate[]> {
    const response = await apiClient.get(`/tasks/${taskId}/eligible-delegates`);
    return response.users || [];
  }

  async delegate(taskId: number, data: DelegateTaskRequest) {
    const response = await apiClient.post(`/tasks/${taskId}/delegate`, data);
    return response;
  }

  async getDelegationHistory(taskId: number): Promise<DelegationHistoryItem[]> {
    const response = await apiClient.get(`/tasks/${taskId}/delegation-history`);
    return response.history || [];
  }
}

export const taskDelegationService = new TaskDelegationService();
