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
  assigned_to: number;
  assigned_institution_id?: number;
  target_institutions?: number[];
  target_departments?: number[];
  target_roles?: string[];
  target_scope: 'specific' | 'regional' | 'sector' | 'institutional' | 'all';
  notes?: string;
  completion_notes?: string;
  attachments?: TaskAttachment[];
  requires_approval: boolean;
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
  assigned_to: number;
  assigned_institution_id?: number;
  target_institutions?: number[];
  target_departments?: number[];
  target_scope: Task['target_scope'];
  notes?: string;
  requires_approval?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
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

  async getStats(filters?: Partial<TaskFilters>) {
    console.log('🔍 TaskService.getStats called', filters);
    try {
      const response = await apiClient.get('/tasks/statistics', filters);
      console.log('✅ TaskService.getStats successful:', response);
      return response.data || response;
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