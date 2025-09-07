import { apiClient } from './api';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_this_month: number;
    by_role: Record<string, number>;
  };
  institutions: {
    total: number;
    by_type: Record<string, number>;
    active: number;
  };
  surveys: {
    total: number;
    active: number;
    completed: number;
    total_responses: number;
    recent: Survey[];
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
    my_tasks: number;
    recent: Task[];
  };
  documents: {
    total: number;
    shared_this_month: number;
    storage_used: number;
    storage_limit: number;
  };
}

export interface RecentActivity {
  id: number;
  type: 'user_created' | 'survey_created' | 'task_assigned' | 'task_completed' | 'document_shared' | 'login';
  title: string;
  description: string;
  user: {
    id: number;
    name: string;
  };
  created_at: string;
  metadata?: Record<string, any>;
}

export interface SystemNotification {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
  description: string;
}

// Basic types from other services
interface Survey {
  id: number;
  title: string;
  status: string;
  responses_count: number;
  created_at: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to: number;
  assignee?: { name: string };
}

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats');
    if (!response.data) {
      throw new Error('Failed to get dashboard stats');
    }
    return response.data;
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const response = await apiClient.get<RecentActivity[]>('/dashboard/recent-activity', { limit });
    return response.data || [];
  }

  async getNotifications(unread_only: boolean = false): Promise<SystemNotification[]> {
    const response = await apiClient.get<SystemNotification[]>('/dashboard/notifications', { unread_only });
    return response.data || [];
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await apiClient.put(`/dashboard/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await apiClient.put('/dashboard/notifications/mark-all-read');
  }

  async getPerformanceMetrics(): Promise<PerformanceMetric[]> {
    const response = await apiClient.get<PerformanceMetric[]>('/dashboard/performance');
    return response.data || [];
  }

  async getQuickStats() {
    const response = await apiClient.get('/dashboard/quick-stats');
    return response.data;
  }

  async getChartData(chart: 'users' | 'surveys' | 'tasks', period: '7d' | '30d' | '90d' | '1y' = '30d') {
    const response = await apiClient.get(`/dashboard/charts/${chart}`, { period });
    return response.data;
  }

  // Role-specific dashboard data
  async getSuperAdminDashboard() {
    const response = await apiClient.get('/dashboard/superadmin-analytics');
    return response.data;
  }

  async getRegionAdminDashboard() {
    const response = await apiClient.get('/dashboard/region-admin');
    return response.data;
  }

  async getSchoolAdminDashboard() {
    const response = await apiClient.get('/dashboard/school-admin');
    return response.data;
  }

  async getTeacherDashboard() {
    const response = await apiClient.get('/dashboard/teacher');
    return response.data;
  }

  // New role-specific dashboard methods
  async getSektorAdminStats() {
    console.log('🔍 DashboardService.getSektorAdminStats called');
    try {
      const response = await apiClient.get('/sektoradmin/dashboard');
      console.log('✅ DashboardService.getSektorAdminStats successful:', response);
      return response;
    } catch (error) {
      console.error('❌ DashboardService.getSektorAdminStats failed:', error);
      throw error;
    }
  }

  async getSchoolAdminStats() {
    console.log('🔍 DashboardService.getSchoolAdminStats called');
    try {
      const response = await apiClient.get('/mektebadmin/dashboard');
      console.log('✅ DashboardService.getSchoolAdminStats successful:', response);
      return response;
    } catch (error) {
      console.error('❌ DashboardService.getSchoolAdminStats failed:', error);
      throw error;
    }
  }

  async getTeacherStats() {
    console.log('🔍 DashboardService.getTeacherStats called');
    try {
      const response = await apiClient.get('/teacher/dashboard');
      console.log('✅ DashboardService.getTeacherStats successful:', response);
      return response;
    } catch (error) {
      console.error('❌ DashboardService.getTeacherStats failed:', error);
      throw error;
    }
  }

  // Additional detailed endpoints
  async getSektorSchools() {
    const response = await apiClient.get('/sektoradmin/schools');
    return response;
  }

  async getSektorAnalytics() {
    const response = await apiClient.get('/sektoradmin/analytics');
    return response;
  }

  async getSchoolClasses() {
    const response = await apiClient.get('/mektebadmin/classes');
    return response;
  }

  async getSchoolTeachers() {
    const response = await apiClient.get('/mektebadmin/teachers');
    return response;
  }
}

export const dashboardService = new DashboardService();