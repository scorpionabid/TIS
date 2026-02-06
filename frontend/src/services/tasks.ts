import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient, PaginatedResponse } from './api';

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  category: 'report' | 'maintenance' | 'event' | 'audit' | 'instruction' | 'other';
  source?: 'dms' | 'email' | 'whatsapp' | 'other';
  source_label?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  progress: number;
  deadline?: string;
  deadline_time?: string;
  started_at?: string;
  completed_at?: string;
  created_by: number;
  assigned_to: number | null;
  assigned_institution_id?: number | null;
  target_institution_id?: number | null;
  target_institutions?: number[];
  target_departments?: number[];
  target_roles?: string[];
  target_scope: 'specific' | 'regional' | 'sector' | 'institutional' | 'all';
  notes?: string;
  completion_notes?: string;
  attachments?: TaskAttachment[];
  requires_approval: boolean;
  origin_scope?: 'region' | 'sector' | null;
  origin_scope_label?: string | null;
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
  approved_by?: number;
  approved_at?: string;
  approval_notes?: string;

  // Subtask support
  parent_id?: number | null;
  position?: number;
  is_milestone?: boolean;
  subtasks?: Task[];
  subtask_stats?: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    completion_percentage: number;
  };

  // Relations
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  assignedInstitution?: {
    id: number;
    name: string;
    type: string;
  };
  approver?: {
    id: number;
    name: string;
  };
  assignments?: Array<{
    id: number;
    assigned_user_id: number | null;
    assigned_role?: string | null;
    assignedUser?: {
      id: number;
      name: string;
      email?: string;
    } | null;
    assigned_user?: {
      id: number;
      name: string;
      email?: string;
    } | null;
  }>;
  user_assignment?: UserAssignmentSummary | null;
}

export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface UserAssignmentSummary {
  id: number;
  status: AssignmentStatus;
  progress: number | null;
  due_date?: string | null;
  completion_notes?: string | null;
  completion_data?: Record<string, unknown> | null;
  institution?: {
    id: number;
    name: string;
    type?: string;
  } | null;
  can_update: boolean;
  can_delegate: boolean;
  allowed_transitions: AssignmentStatus[];
}

export interface TaskAttachment {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  assignedInstitution?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface TaskSubDelegation {
  id: number;
  task_id: number;
  parent_assignment_id: number;
  delegated_to_user_id: number;
  delegated_to_institution_id?: number;
  delegated_by_user_id: number;
  status: AssignmentStatus;
  progress: number;
  deadline?: string;
  delegation_notes?: string;
  completion_notes?: string;
  completion_data?: Record<string, unknown>;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;

  // Relations
  delegatedToUser?: {
    id: number;
    name: string;
    email: string;
  };
  delegatedByUser?: {
    id: number;
    name: string;
    email: string;
  };
  delegatedToInstitution?: {
    id: number;
    name: string;
    type: string;
  };
  task?: Task;
  parentAssignment?: {
    id: number;
    user_id: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export interface CreateSubDelegationRequest {
  delegations: Array<{
    user_id: number;
    institution_id?: number;
    deadline?: string;
    notes?: string;
  }>;
}

export interface UpdateSubDelegationStatusRequest {
  status: AssignmentStatus;
  progress?: number;
  completion_notes?: string;
  completion_data?: Record<string, unknown>;
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: Task['category'];
  source?: Task['source'];
  priority: Task['priority'];
  deadline?: string;
  deadline_time?: string;
  assigned_to?: number | null;
  assigned_institution_id?: number | null;
  target_institution_id?: number | null;
  target_institutions?: number[];
  specific_institutions?: number[]; // Backend expects this field for hierarchical tasks
  target_departments?: number[];
  target_roles?: string[];
  assigned_user_ids?: number[];
  target_scope?: Task['target_scope'];
  origin_scope?: Task['origin_scope'];
  notes?: string;
  assignment_notes?: string;
  requires_approval?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  category?: Task['category'];
  source?: Task['source'];
  status?: Task['status'];
  priority?: Task['priority'];
  deadline?: string;
  deadline_time?: string;
  progress?: number;
  notes?: string;
  completion_notes?: string;
}

export interface TaskFilters extends PaginationParams {
  status?: Task['status'];
  priority?: Task['priority'];
  category?: Task['category'];
  assigned_to?: number;
  created_by?: number;
  search?: string;
  deadline_filter?: 'approaching' | 'overdue' | 'all';
  sort_by?: 'created_at' | 'deadline' | 'priority' | 'status' | 'title' | 'category' | 'progress';
  sort_direction?: 'asc' | 'desc';
  origin_scope?: 'region' | 'sector';
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  by_priority: Record<string, number>;
  completion_rate: number;
  average_completion_time: number;
}

export interface TaskCreationContext {
  can_create_basic_task: boolean;
  can_create_hierarchical_task: boolean;
  targetable_institutions: Array<{
    id: number;
    name: string;
    level: number | null;
    type?: string | null;
    parent_id?: number | null;
  }>;
  allowed_target_roles: string[];
  institution_scope: number[];
  targetable_institutions_count?: number;
  allowed_target_roles_count?: number;
  user_role: string[];
  user_institution?: {
    id: number;
    name: string;
    level: number;
    type: string;
  } | null;
}

export interface AssignableUser {
  id: number;
  name: string;
  email: string | null;
  role?: string | null;
  is_active: boolean;
  institution?: {
    id: number;
    name: string;
    level?: number | null;
    parent_id?: number | null;
    hierarchy_path?: Array<{ id: number; name: string; level: number | null }>;
    depth?: number;
  } | null;
}

export interface AssignableUsersFilters {
  role?: string | null;
  institution_id?: number | null;
  search?: string | null;
  origin_scope?: 'region' | 'sector' | null;
}

export interface AssignableUsersMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  filters?: AssignableUsersFilters;
}

export interface AssignableUsersLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface AssignableUsersResponse {
  success?: boolean;
  data: AssignableUser[];
  meta?: AssignableUsersMeta;
  links?: AssignableUsersLinks;
}

export interface AssignableUsersRequestParams {
  role?: string;
  institution_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
  origin_scope?: 'region' | 'sector';
}

class TaskService extends BaseService<Task> {
  constructor() {
    super('/tasks');
  }

  async create(data: CreateTaskData): Promise<Task> {
    try {
      const response = await apiClient.post(this.baseEndpoint, data);

      // Backend returns: { success: true, message: '...', data: {...} }
      if (!response.data) {
        throw new Error('Tapşırıq yaratma əməliyyatı uğursuz oldu');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCreationContext(): Promise<TaskCreationContext> {
    const response = await apiClient.get(`${this.baseEndpoint}/creation-context`);
    return (response.data?.data ?? response.data) as TaskCreationContext;
  }

  async getAssignableUsers(params?: AssignableUsersRequestParams): Promise<AssignableUsersResponse> {
    const response = await apiClient.get<AssignableUsersResponse>(`${this.baseEndpoint}/assignable-users`, params);

    const payload = (response as AssignableUsersResponse) ?? { data: [] };
    const primaryData = Array.isArray((payload as any)?.data)
      ? payload.data
      : Array.isArray((payload as any))
        ? (payload as unknown as AssignableUser[])
        : Array.isArray((payload as any)?.data?.data)
          ? (payload as any).data.data as AssignableUser[]
          : [];

    const meta = (payload.meta ?? (payload as any)?.data?.meta) as AssignableUsersMeta | undefined;
    const links = (payload.links ?? (payload as any)?.data?.links) as AssignableUsersLinks | undefined;

    return {
      success: payload.success ?? true,
      data: primaryData,
      meta,
      links,
    };
  }

  async getAssignedToMe(filters?: TaskFilters) {
    const response = await apiClient.get<Task[]>(`${this.baseEndpoint}/assigned-to-me`, filters);
    return response as any; // PaginatedResponse
  }

  async updateAssignmentStatus(
    assignmentId: number,
    data: {
      status: Task['status'];
      progress?: number;
      completion_notes?: string;
      completion_data?: Record<string, unknown>;
    }
  ) {
    const response = await apiClient.post(`/tasks/assignments/${assignmentId}/status`, data);
    return response.data ?? response;
  }

  /**
   * Submit a completed task for approval/review by the creator
   */
  async submitForReview(taskId: number, notes?: string): Promise<Task> {
    const response = await apiClient.post<{ data: Task }>(`${this.baseEndpoint}/${taskId}/submit-for-approval`, {
      notes,
    });
    return response.data ?? response as unknown as Task;
  }

  /**
   * Approve a task (for approvers/creators)
   */
  async approveTask(taskId: number, notes?: string): Promise<Task> {
    const response = await apiClient.post<{ data: Task }>(`${this.baseEndpoint}/${taskId}/approve`, {
      notes,
    });
    return response.data ?? response as unknown as Task;
  }

  /**
   * Reject a task (for approvers/creators)
   */
  async rejectTask(taskId: number, notes: string): Promise<Task> {
    const response = await apiClient.post<{ data: Task }>(`${this.baseEndpoint}/${taskId}/reject`, {
      notes,
    });
    return response.data ?? response as unknown as Task;
  }

  // === SUB-DELEGATION METHODS ===

  /**
   * Get sub-delegations for a task
   */
  async getSubDelegations(taskId: number): Promise<TaskSubDelegation[]> {
    const response = await apiClient.get(`${this.baseEndpoint}/${taskId}/sub-delegations`);
    return (response.data as any)?.data || (response.data as any) || [];
  }

  /**
   * Create multiple sub-delegations for a task
   */
  async createSubDelegations(taskId: number, data: CreateSubDelegationRequest): Promise<TaskSubDelegation[]> {
    const response = await apiClient.post(`${this.baseEndpoint}/${taskId}/sub-delegations`, data);
    return (response.data as any)?.data || (response.data as any) || [];
  }

  /**
   * Update sub-delegation status
   */
  async updateSubDelegationStatus(
    taskId: number, 
    delegationId: number, 
    data: UpdateSubDelegationStatusRequest
  ): Promise<TaskSubDelegation> {
    const response = await apiClient.post(`${this.baseEndpoint}/${taskId}/sub-delegations/${delegationId}/status`, data);
    return (response.data as any)?.data || (response.data as any);
  }

  /**
   * Get current user's received delegations
   */
  async getMyDelegations(params?: PaginationParams): Promise<PaginatedResponse<TaskSubDelegation>> {
    const response = await apiClient.get('my-delegations', params);
    return (response.data as any) || response;
  }

  /**
   * Get current user's delegation statistics
   */
  async getMyDelegationStats(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    average_progress: number;
  }> {
    const response = await apiClient.get('my-delegations/stats');
    return (response.data as any)?.data || (response.data as any);
  }

  /**
   * Delete a sub-delegation
   */
  async deleteSubDelegation(taskId: number, delegationId: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/${taskId}/sub-delegations/${delegationId}`);
  }
}

export const taskService = new TaskService();
