import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  category: 'report' | 'maintenance' | 'event' | 'audit' | 'instruction' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  progress: number;
  deadline?: string;
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
  approved_by?: number;
  approved_at?: string;
  
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
  }>;
}

export interface TaskAttachment {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: Task['category'];
  priority: Task['priority'];
  deadline?: string;
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
  status?: Task['status'];
  priority?: Task['priority'];
  deadline?: string;
  progress?: number;
  notes?: string;
}

export interface TaskFilters extends PaginationParams {
  status?: Task['status'];
  priority?: Task['priority'];
  category?: Task['category'];
  assigned_to?: number;
  created_by?: number;
  search?: string;
  deadline_filter?: 'approaching' | 'overdue' | 'all';
  sort_by?: 'created_at' | 'deadline' | 'priority' | 'status';
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

class TaskService extends BaseService<Task> {
  constructor() {
    super('/tasks');
  }

  async create(data: CreateTaskData): Promise<Task> {
    console.log('🔥 TaskService.create called', data);
    
    try {
      const response = await apiClient.post(this.baseEndpoint, data);
      console.log('📤 API response for task create:', response);
      
      // Backend returns: { success: true, message: '...', data: {...} }
      if (!response.data) {
        console.error('❌ No data in response:', response);
        throw new Error('Tapşırıq yaratma əməliyyatı uğursuz oldu');
      }
      
      console.log('✅ Task create successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Task create failed:', error);
      throw error;
    }
  }

  async updateStatus(id: number, status: Task['status'], notes?: string) {
    const response = await apiClient.put(`${this.baseEndpoint}/${id}/status`, {
      status,
      notes
    });
    return response.data;
  }

  async updateProgress(id: number, progress: number, notes?: string) {
    const response = await apiClient.put(`${this.baseEndpoint}/${id}/progress`, {
      progress,
      notes
    });
    return response.data;
  }

  async addComment(id: number, comment: string) {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/comments`, {
      comment
    });
    return response.data;
  }

  async getComments(id: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/comments`);
    return response.data || [];
  }

  async bulkAssign(taskData: Omit<CreateTaskData, 'assigned_to'> & { assigned_to: number[] }) {
    const response = await apiClient.post(`${this.baseEndpoint}/bulk-assign`, taskData);
    return response.data;
  }

  async bulkUpdateStatus(taskIds: number[], status: Task['status']) {
    const response = await apiClient.put(`${this.baseEndpoint}/bulk-status`, {
      task_ids: taskIds,
      status
    });
    return response.data;
  }

  async getMyTasks(filters?: Omit<TaskFilters, 'assigned_to'>) {
    const response = await apiClient.get<Task[]>(`${this.baseEndpoint}/my-tasks`, filters);
    return response as any; // PaginatedResponse
  }

  async getAssignedByMe(filters?: Omit<TaskFilters, 'assigned_by'>) {
    const response = await apiClient.get<Task[]>(`${this.baseEndpoint}/assigned-by-me`, filters);
    return response as any; // PaginatedResponse
  }

  async getCreationContext(): Promise<TaskCreationContext> {
    const response = await apiClient.get(`${this.baseEndpoint}/creation-context`);
    return (response.data?.data ?? response.data) as TaskCreationContext;
  }

  async getAssignableUsers(params?: {
    role?: string;
    institution_id?: number;
    search?: string;
    per_page?: number;
    origin_scope?: 'region' | 'sector';
  }): Promise<AssignableUser[]> {
    const response = await apiClient.get<{ success?: boolean; data?: AssignableUser[] }>(`${this.baseEndpoint}/assignable-users`, params);
    console.log('[TaskService] getAssignableUsers response', response);

    const payload = response.data ?? (response as any)?.data ?? [];

    if (Array.isArray(payload)) {
      return payload as AssignableUser[];
    }

    if (Array.isArray((payload as any)?.data)) {
      return (payload as any).data as AssignableUser[];
    }

    return [];
  }

  async getAssignedToMe(filters?: TaskFilters) {
    const response = await apiClient.get<Task[]>(`${this.baseEndpoint}/assigned-to-me`, filters);
    return response as any; // PaginatedResponse
  }

  async getStats(filters?: Partial<TaskFilters>, userRole?: string) {
    console.log('🔍 TaskService.getStats called', { filters, userRole });
    try {
      const tasksResponse = await this.getAll(filters, false);
      const tasksArray = Array.isArray(tasksResponse.data)
        ? tasksResponse.data
        : (tasksResponse as any)?.data;

      if (!Array.isArray(tasksArray)) {
        console.warn('⚠️ TaskService.getStats received unexpected response structure');
        return {
          total: 0,
          pending: 0,
          in_progress: 0,
          completed: 0,
          overdue: 0,
          by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
          completion_rate: 0,
          average_completion_time: 0,
        };
      }

      const stats: TaskStats = {
        total: tasksArray.length,
        pending: tasksArray.filter(t => t.status === 'pending').length,
        in_progress: tasksArray.filter(t => t.status === 'in_progress').length,
        completed: tasksArray.filter(t => t.status === 'completed').length,
        overdue: tasksArray.filter(t => {
          if (!t.deadline) return false;
          return new Date(t.deadline) < new Date() && t.status !== 'completed';
        }).length,
        by_priority: {
          low: tasksArray.filter(t => t.priority === 'low').length,
          medium: tasksArray.filter(t => t.priority === 'medium').length,
          high: tasksArray.filter(t => t.priority === 'high').length,
          urgent: tasksArray.filter(t => t.priority === 'urgent').length,
        },
        completion_rate: tasksArray.length > 0
          ? (tasksArray.filter(t => t.status === 'completed').length / tasksArray.length) * 100
          : 0,
        average_completion_time: 0,
      };

      console.log('✅ TaskService.getStats calculated from tasks:', stats);
      return stats;
    } catch (error) {
      console.error('❌ TaskService.getStats failed:', error);
      throw error;
    }
  }

  async downloadAttachment(taskId: number, attachmentId: number) {
    const response = await fetch(`${(apiClient as any).baseURL}${this.baseEndpoint}/${taskId}/attachments/${attachmentId}`, {
      method: 'GET',
      headers: (apiClient as any).getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }
}

export const taskService = new TaskService();
