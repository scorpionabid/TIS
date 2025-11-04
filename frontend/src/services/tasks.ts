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
}

export const taskService = new TaskService();
