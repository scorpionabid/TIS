import { BaseService, BaseEntity } from './BaseService';
import { apiClient } from './api';

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  total_goal?: string;
  created_by: number;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  creator?: {
    id: number;
    name: string;
  };
  employees?: Array<{
    id: number;
    name: string;
  }>;
  activities?: ProjectActivity[];
}

export interface ProjectAssignment extends BaseEntity {
  project_id: number;
  user_id: number;
  assigned_at: string;
}

export interface ProjectActivity extends BaseEntity {
  project_id: number;
  parent_id?: number | null;
  user_id?: number | null;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  planned_hours: number;
  actual_hours: number;
  budget: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'checking' | 'completed' | 'stuck';
  category?: string;
  notes?: string;
  goal_contribution_percentage?: number;
  goal_target?: string;
  comments_count: number;
  attachments?: ProjectAttachment[];
  employee?: {
    id: number;
    name: string;
  };
  sub_activities?: ProjectActivity[];
}

export interface ProjectActivityLog {
  id: number;
  type: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  message?: string;
  created_at: string;
  user: {
    id: number;
    name: string;
  };
}

export interface ProjectAttachment {
  id: number;
  original_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface ProjectStats {
  total_activities: number;
  completed_activities: number;
  in_progress_activities: number;
  stuck_activities: number;
  progress_percentage: number;
  planned_hours: number;
  actual_hours: number;
  total_budget: number;
  efficiency: number;
  status_breakdown: Record<string, number>;
  owner_breakdown: Array<{ name: string, count: number }>;
  overdue_count: number;
}

export interface AdminDashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_budget: number;
  delayed_activities: number;
  weekly_activities: number;
}

class ProjectService extends BaseService<Project> {
  constructor() {
    super('/projects');
  }

  private unwrapResponseData<T>(response: any): T {
    return (response?.data ?? response) as T;
  }

  async getProjects(): Promise<Project[]> {
    const response = await apiClient.get<any>(this.baseEndpoint);
    return this.unwrapResponseData<Project[]>(response);
  }

  async createProject(data: Partial<Project> & { employee_ids?: number[] }): Promise<Project> {
    const response = await apiClient.post<Project>(this.baseEndpoint, data);
    return this.unwrapResponseData<Project>(response);
  }

  async updateProject(id: number, data: Partial<Project> & { employee_ids?: number[] }): Promise<Project> {
    const response = await apiClient.put<Project>(`${this.baseEndpoint}/${id}`, data);
    return this.unwrapResponseData<Project>(response);
  }

  async getProjectDetails(id: number): Promise<Project> {
    const response = await apiClient.get<Project>(`${this.baseEndpoint}/${id}`);
    return this.unwrapResponseData<Project>(response);
  }

  async addActivity(projectId: number, data: Partial<ProjectActivity>): Promise<ProjectActivity> {
    const response = await apiClient.post<ProjectActivity>(`${this.baseEndpoint}/${projectId}/activities`, data);
    return this.unwrapResponseData<ProjectActivity>(response);
  }

  async updateActivity(activityId: number, data: Partial<ProjectActivity>): Promise<ProjectActivity> {
    const response = await apiClient.put<ProjectActivity>(`${this.baseEndpoint}/activities/${activityId}`, data);
    return this.unwrapResponseData<ProjectActivity>(response);
  }

  async getComments(activityId: number): Promise<any[]> {
    const response = await apiClient.get(`${this.baseEndpoint}/activities/${activityId}/comments`);
    return this.unwrapResponseData<any[]>(response);
  }

  async getActivityLogs(activityId: number): Promise<ProjectActivityLog[]> {
    const response = await apiClient.get(`${this.baseEndpoint}/activities/${activityId}/logs`);
    return this.unwrapResponseData<ProjectActivityLog[]>(response);
  }

  async uploadAttachment(activityId: number, file: File): Promise<ProjectAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`${this.baseEndpoint}/activities/${activityId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return this.unwrapResponseData<ProjectAttachment>(response);
  }

  async addComment(activityId: number, data: { comment: string, type?: string, attachments?: any[] }): Promise<any> {
    const response = await apiClient.post(`${this.baseEndpoint}/activities/${activityId}/comments`, data);
    return this.unwrapResponseData<any>(response);
  }

  async getStats(projectId?: number): Promise<ProjectStats | AdminDashboardStats> {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<any>(`${this.baseEndpoint}/stats`, params);
    return this.unwrapResponseData<ProjectStats | AdminDashboardStats>(response);
  }
}

export const projectService = new ProjectService();
