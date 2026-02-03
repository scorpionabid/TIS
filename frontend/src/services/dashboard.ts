import { apiClient } from './api';

export interface TeacherDashboardStats {
  assignedClasses: number;
  totalStudents: number;
  subjectsTeaching: number;
  attendanceRate: number;
  weeklyHours: number;
  pendingGrades: number;
  activeSurveys: number;
  upcomingTasks: number;
  teacherInfo: {
    name: string;
    subject: string;
    school: string;
    experienceYears: number;
    department: string;
  };
  weeklySchedule: Array<{
    day: string;
    classes: Array<{
      time: string;
      subject: string;
      class: string;
      room: string;
    }>;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    priority: string;
  }>;
  classPerformance: Array<{
    class: string;
    subject: string;
    students: number;
    averageGrade: number;
    attendanceRate: number;
  }>;
}

export interface TeacherProfileData {
  teacherInfo: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    school: string;
    experienceYears: number;
    qualifications: string[];
    photo?: string;
    status?: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    approvedAt?: string;
    approvedBy?: string;
  };
  stats: {
    assignedClasses: number;
    totalStudents: number;
    subjectsTeaching: number;
    attendanceRate: number;
    weeklyHours: number;
    pendingGrades: number;
    activeSurveys: number;
    upcomingTasks: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    type: 'award' | 'certification' | 'milestone' | 'recognition' | 'publication' | 'presentation';
    impactLevel: 'high' | 'medium' | 'low';
    verificationStatus: boolean;
    institution?: string;
    certificateUrl?: string;
    notes?: string;
    category?: string;
    tags?: string[];
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvalRejectionReason?: string;
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    year: string;
    field: string;
    status: 'completed' | 'ongoing' | 'planned';
    type: 'bachelor' | 'master' | 'phd' | 'certificate' | 'diploma' | 'other';
  }>;
  certificates: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
    status: 'active' | 'expired' | 'pending' | 'revoked';
    skills?: string[];
    level?: string;
    category?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvalRejectionReason?: string;
  }>;
  pendingChanges?: Array<{
    id: string;
    modelType: string;
    modelId: string;
    oldData: any;
    newData: any;
    status: string;
    rejectionReason?: string;
    createdAt: string;
  }>;
}

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
  async getTeacherProfile(): Promise<TeacherProfileData> {
    console.log('🔍 DashboardService.getTeacherProfile called');
    try {
      const response = await apiClient.get<TeacherProfileData>('/teacher/profile');
      console.log('✅ DashboardService.getTeacherProfile successful:', response);
      
      // Return response.data directly
      return response.data;
    } catch (error) {
      console.error('❌ DashboardService.getTeacherProfile failed:', error);
      throw error;
    }
  }

  async updateTeacherProfileWithApproval(data: any): Promise<any> {
    console.log('🔍 DashboardService.updateTeacherProfileWithApproval called');
    try {
      const response = await apiClient.put('/teacher/profile/with-approval', data);
      console.log('✅ DashboardService.updateTeacherProfileWithApproval successful:', response);
      
      return response.data;
    } catch (error) {
      console.error('❌ DashboardService.updateTeacherProfileWithApproval failed:', error);
      throw error;
    }
  }

  async getPendingChanges(): Promise<any> {
    console.log('🔍 DashboardService.getPendingChanges called');
    try {
      const response = await apiClient.get('/teacher/profile/pending-changes');
      console.log('✅ DashboardService.getPendingChanges successful:', response);
      
      return response.data;
    } catch (error) {
      console.error('❌ DashboardService.getPendingChanges failed:', error);
      throw error;
    }
  }

  async submitForApproval(): Promise<any> {
    console.log('🔍 DashboardService.submitForApproval called');
    try {
      const response = await apiClient.post('/teacher/profile/submit-for-approval');
      console.log('✅ DashboardService.submitForApproval successful:', response);
      
      return response.data;
    } catch (error) {
      console.error('❌ DashboardService.submitForApproval failed:', error);
      throw error;
    }
  }

  // ... existing methods
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

  // Optimized dashboard data with parallel requests
  async getSuperAdminDashboardBatched() {
    try {
      // Use parallel individual calls for reliability and performance
      const [statsResponse, activityResponse] = await Promise.all([
        apiClient.get('/dashboard/superadmin-analytics', {}, { cache: true, cacheTtl: 5 * 60 * 1000 }),
        apiClient.get('/dashboard/recent-activity', { limit: 5 }, { cache: true, cacheTtl: 2 * 60 * 1000 })
      ]);
      
      return {
        stats: statsResponse.data,
        recentActivity: activityResponse.data,
        systemHealth: { status: 'ok' } // Default fallback
      };
    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
      throw error; // Let React Query handle retries
    }
  }

  // Legacy method for backward compatibility
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
      const response = await apiClient.get('/schooladmin/dashboard');
      console.log('✅ DashboardService.getSchoolAdminStats successful:', response);
      return response;
    } catch (error) {
      console.error('❌ DashboardService.getSchoolAdminStats failed:', error);
      throw error;
    }
  }

  async getTeacherStats(): Promise<TeacherDashboardStats> {
    console.log('🔍 DashboardService.getTeacherStats called');
    try {
      const response = await apiClient.get<TeacherDashboardStats>('/teacher/dashboard');
      console.log('✅ DashboardService.getTeacherStats successful:', response);
      
      // Handle both direct data and ApiResponse format
      let data: TeacherDashboardStats;
      
      if (response && typeof response === 'object') {
        // Check if response is ApiResponse format or direct data
        if ('data' in response && response.data) {
          data = response.data as TeacherDashboardStats;
        } else if ('status' in response || 'errors' in response) {
          // ApiResponse format but data might be nested differently
          data = (response as any).data || response as TeacherDashboardStats;
        } else {
          // Direct data format
          data = response as TeacherDashboardStats;
        }
      } else {
        throw new Error('Invalid response format from teacher dashboard API');
      }
      
      // Ensure we always return valid data
      if (!data || typeof data !== 'object') {
        throw new Error('No valid data received from teacher dashboard API');
      }
      
      console.log('📊 DashboardService.getTeacherStats parsed data:', data);
      return data;
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


  async getSchoolTeachers() {
    const response = await apiClient.get('/schooladmin/teachers');
    return response;
  }
}

export const dashboardService = new DashboardService();