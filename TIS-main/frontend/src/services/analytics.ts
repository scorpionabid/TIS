import { BaseService } from './BaseService';

export interface AnalyticsOverview {
  total_users: number;
  active_users_today: number;
  total_surveys: number;
  active_surveys: number;
  completed_surveys: number;
  total_responses: number;
  responses_today: number;
  total_institutions: number;
  total_documents: number;
  documents_uploaded_today: number;
  avg_response_rate: number;
  user_growth_rate: number;
  survey_completion_rate: number;
}

export interface UserAnalytics {
  total_count: number;
  active_count: number;
  new_registrations_today: number;
  by_role: Array<{
    role: string;
    count: number;
    percentage: number;
    active_percentage: number;
  }>;
  by_institution_type: Array<{
    institution_type: string;
    count: number;
    percentage: number;
  }>;
  login_activity: Array<{
    date: string;
    logins: number;
    unique_users: number;
  }>;
  geographic_distribution: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
  engagement_metrics: {
    avg_session_duration: number;
    avg_sessions_per_user: number;
    bounce_rate: number;
    retention_rate_7day: number;
    retention_rate_30day: number;
  };
}

export interface SurveyAnalytics {
  total_count: number;
  published_count: number;
  draft_count: number;
  completed_count: number;
  archived_count: number;
  by_category: Array<{
    category: string;
    count: number;
    avg_response_rate: number;
    avg_completion_time: number;
  }>;
  by_institution_level: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  response_trends: Array<{
    date: string;
    survey_count: number;
    response_count: number;
    completion_rate: number;
  }>;
  popular_question_types: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  performance_metrics: {
    avg_response_rate: number;
    avg_completion_time: number;
    avg_questions_per_survey: number;
    top_performing_survey_id: number;
    lowest_performing_survey_id: number;
  };
}

export interface InstitutionAnalytics {
  total_count: number;
  by_type: Array<{
    type: string;
    count: number;
    percentage: number;
    user_count: number;
    survey_count: number;
  }>;
  by_region: Array<{
    region: string;
    institution_count: number;
    user_count: number;
    survey_count: number;
    document_count: number;
  }>;
  hierarchy_distribution: Array<{
    level: number;
    level_name: string;
    count: number;
    percentage: number;
  }>;
  activity_metrics: {
    most_active_institution_id: number;
    most_active_institution_name: string;
    avg_users_per_institution: number;
    avg_surveys_per_institution: number;
    institutions_with_recent_activity: number;
  };
}

export interface DocumentAnalytics {
  total_count: number;
  total_size_mb: number;
  uploaded_today: number;
  downloaded_today: number;
  shared_count: number;
  by_type: Array<{
    file_type: string;
    count: number;
    total_size_mb: number;
    percentage: number;
  }>;
  by_institution_type: Array<{
    institution_type: string;
    document_count: number;
    total_size_mb: number;
    avg_size_per_document: number;
  }>;
  upload_trends: Array<{
    date: string;
    upload_count: number;
    download_count: number;
    total_size_mb: number;
  }>;
  storage_metrics: {
    total_quota_mb: number;
    used_storage_mb: number;
    available_storage_mb: number;
    usage_percentage: number;
    approaching_limit_users: number;
  };
  popular_documents: Array<{
    id: number;
    title: string;
    download_count: number;
    view_count: number;
    shared_count: number;
    institution: string;
  }>;
}

export interface PerformanceAnalytics {
  system_metrics: {
    avg_response_time_ms: number;
    uptime_percentage: number;
    error_rate: number;
    cpu_usage_avg: number;
    memory_usage_avg: number;
    disk_usage_percentage: number;
  };
  api_metrics: {
    total_requests: number;
    requests_per_minute: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time: number;
    slowest_endpoint: string;
    fastest_endpoint: string;
  };
  database_metrics: {
    query_count: number;
    slow_queries: number;
    avg_query_time: number;
    connection_pool_usage: number;
    deadlocks: number;
    index_usage_efficiency: number;
  };
  user_activity_patterns: Array<{
    hour: number;
    active_users: number;
    requests_count: number;
    response_time_avg: number;
  }>;
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  institution_id?: number;
  institution_type?: string;
  region?: string;
  user_role?: string;
  survey_category?: string;
  time_period?: '7d' | '30d' | '90d' | '1y' | 'custom';
  granularity?: 'hour' | 'day' | 'week' | 'month';
  include_archived?: boolean;
}

export interface CustomReport {
  id: number;
  name: string;
  description?: string;
  report_type: 'user' | 'survey' | 'institution' | 'document' | 'performance' | 'custom';
  filters: AnalyticsFilters;
  metrics: string[];
  chart_types: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
  };
  created_by: number;
  is_public: boolean;
  last_generated: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsExport {
  report_type: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters: AnalyticsFilters;
  include_charts: boolean;
  include_raw_data: boolean;
  email_recipients?: string[];
}

class AnalyticsService extends BaseService {
  constructor() {
    super('/analytics');
  }

  async getAnalyticsOverview(filters?: AnalyticsFilters): Promise<{ success: boolean; data: AnalyticsOverview }> {
    console.log('🔍 AnalyticsService.getAnalyticsOverview called with filters:', filters);
    try {
      const response = await this.get<AnalyticsOverview>(`${this.baseUrl}/overview`, filters);
      console.log('✅ AnalyticsService.getAnalyticsOverview successful:', response);
      return response as { success: boolean; data: AnalyticsOverview };
    } catch (error) {
      console.error('❌ AnalyticsService.getAnalyticsOverview failed:', error);
      throw error;
    }
  }

  async getUserAnalytics(filters?: AnalyticsFilters): Promise<{ success: boolean; data: UserAnalytics }> {
    console.log('🔍 AnalyticsService.getUserAnalytics called with filters:', filters);
    try {
      const response = await this.get<UserAnalytics>(`${this.baseUrl}/users`, filters);
      console.log('✅ AnalyticsService.getUserAnalytics successful:', response);
      return response as { success: boolean; data: UserAnalytics };
    } catch (error) {
      console.error('❌ AnalyticsService.getUserAnalytics failed:', error);
      throw error;
    }
  }

  async getSurveyAnalytics(filters?: AnalyticsFilters): Promise<{ success: boolean; data: SurveyAnalytics }> {
    console.log('🔍 AnalyticsService.getSurveyAnalytics called with filters:', filters);
    try {
      const response = await this.get<SurveyAnalytics>(`${this.baseUrl}/surveys`, filters);
      console.log('✅ AnalyticsService.getSurveyAnalytics successful:', response);
      return response as { success: boolean; data: SurveyAnalytics };
    } catch (error) {
      console.error('❌ AnalyticsService.getSurveyAnalytics failed:', error);
      throw error;
    }
  }

  async getInstitutionAnalytics(filters?: AnalyticsFilters): Promise<{ success: boolean; data: InstitutionAnalytics }> {
    console.log('🔍 AnalyticsService.getInstitutionAnalytics called with filters:', filters);
    try {
      const response = await this.get<InstitutionAnalytics>(`${this.baseUrl}/institutions`, filters);
      console.log('✅ AnalyticsService.getInstitutionAnalytics successful:', response);
      return response as { success: boolean; data: InstitutionAnalytics };
    } catch (error) {
      console.error('❌ AnalyticsService.getInstitutionAnalytics failed:', error);
      throw error;
    }
  }

  async getDocumentAnalytics(filters?: AnalyticsFilters): Promise<{ success: boolean; data: DocumentAnalytics }> {
    console.log('🔍 AnalyticsService.getDocumentAnalytics called with filters:', filters);
    try {
      const response = await this.get<DocumentAnalytics>(`${this.baseUrl}/documents`, filters);
      console.log('✅ AnalyticsService.getDocumentAnalytics successful:', response);
      return response as { success: boolean; data: DocumentAnalytics };
    } catch (error) {
      console.error('❌ AnalyticsService.getDocumentAnalytics failed:', error);
      throw error;
    }
  }

  async getPerformanceAnalytics(filters?: AnalyticsFilters): Promise<{ success: boolean; data: PerformanceAnalytics }> {
    console.log('🔍 AnalyticsService.getPerformanceAnalytics called with filters:', filters);
    try {
      const response = await this.get<PerformanceAnalytics>(`${this.baseUrl}/performance`, filters);
      console.log('✅ AnalyticsService.getPerformanceAnalytics successful:', response);
      return response as { success: boolean; data: PerformanceAnalytics };
    } catch (error) {
      console.error('❌ AnalyticsService.getPerformanceAnalytics failed:', error);
      throw error;
    }
  }

  async getCustomReports(): Promise<{ success: boolean; data: CustomReport[] }> {
    console.log('🔍 AnalyticsService.getCustomReports called');
    try {
      const response = await this.get<CustomReport[]>(`${this.baseUrl}/reports`);
      console.log('✅ AnalyticsService.getCustomReports successful:', response);
      return response as { success: boolean; data: CustomReport[] };
    } catch (error) {
      console.error('❌ AnalyticsService.getCustomReports failed:', error);
      throw error;
    }
  }

  async createCustomReport(data: Omit<CustomReport, 'id' | 'created_at' | 'updated_at' | 'last_generated'>): Promise<{ 
    success: boolean; 
    message: string; 
    data: CustomReport 
  }> {
    console.log('🔍 AnalyticsService.createCustomReport called');
    try {
      const response = await this.post<CustomReport>(`${this.baseUrl}/reports`, data);
      console.log('✅ AnalyticsService.createCustomReport successful:', response);
      return response as { success: boolean; message: string; data: CustomReport };
    } catch (error) {
      console.error('❌ AnalyticsService.createCustomReport failed:', error);
      throw error;
    }
  }

  async updateCustomReport(id: number, data: Partial<CustomReport>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 AnalyticsService.updateCustomReport called for ID:', id);
    try {
      const response = await this.put<void>(`${this.baseUrl}/reports/${id}`, data);
      console.log('✅ AnalyticsService.updateCustomReport successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ AnalyticsService.updateCustomReport failed:', error);
      throw error;
    }
  }

  async deleteCustomReport(id: number): Promise<{ success: boolean; message: string }> {
    console.log('🔍 AnalyticsService.deleteCustomReport called for ID:', id);
    try {
      const response = await this.delete<void>(`${this.baseUrl}/reports/${id}`);
      console.log('✅ AnalyticsService.deleteCustomReport successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ AnalyticsService.deleteCustomReport failed:', error);
      throw error;
    }
  }

  async generateReport(reportId: number): Promise<{ 
    success: boolean; 
    message: string; 
    data: { download_url: string; expires_at: string } 
  }> {
    console.log('🔍 AnalyticsService.generateReport called for ID:', reportId);
    try {
      const response = await this.post<{ download_url: string; expires_at: string }>(`${this.baseUrl}/reports/${reportId}/generate`, {});
      console.log('✅ AnalyticsService.generateReport successful:', response);
      return response as { success: boolean; message: string; data: { download_url: string; expires_at: string } };
    } catch (error) {
      console.error('❌ AnalyticsService.generateReport failed:', error);
      throw error;
    }
  }

  async exportAnalytics(exportData: AnalyticsExport): Promise<{ 
    success: boolean; 
    data: { download_url: string; file_name: string; expires_at: string }
  }> {
    console.log('🔍 AnalyticsService.exportAnalytics called with:', exportData);
    try {
      const response = await this.post<{ download_url: string; file_name: string; expires_at: string }>(`${this.baseUrl}/export`, exportData);
      console.log('✅ AnalyticsService.exportAnalytics successful:', response);
      return response as { success: boolean; data: { download_url: string; file_name: string; expires_at: string } };
    } catch (error) {
      console.error('❌ AnalyticsService.exportAnalytics failed:', error);
      throw error;
    }
  }

  async getRealtimeMetrics(): Promise<{ 
    success: boolean; 
    data: {
      active_users: number;
      requests_per_minute: number;
      avg_response_time: number;
      error_count: number;
      memory_usage: number;
      cpu_usage: number;
    }
  }> {
    console.log('🔍 AnalyticsService.getRealtimeMetrics called');
    try {
      const response = await this.get<{
        active_users: number;
        requests_per_minute: number;
        avg_response_time: number;
        error_count: number;
        memory_usage: number;
        cpu_usage: number;
      }>(`${this.baseUrl}/realtime`);
      console.log('✅ AnalyticsService.getRealtimeMetrics successful:', response);
      return response as { 
        success: boolean; 
        data: {
          active_users: number;
          requests_per_minute: number;
          avg_response_time: number;
          error_count: number;
          memory_usage: number;
          cpu_usage: number;
        }
      };
    } catch (error) {
      console.error('❌ AnalyticsService.getRealtimeMetrics failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
  getMockOverview(): AnalyticsOverview {
    return {
      total_users: 1247,
      active_users_today: 89,
      total_surveys: 342,
      active_surveys: 28,
      completed_surveys: 314,
      total_responses: 15847,
      responses_today: 156,
      total_institutions: 158,
      total_documents: 2341,
      documents_uploaded_today: 23,
      avg_response_rate: 74.3,
      user_growth_rate: 12.8,
      survey_completion_rate: 91.8
    };
  }

  getMockUserAnalytics(): UserAnalytics {
    return {
      total_count: 1247,
      active_count: 892,
      new_registrations_today: 5,
      by_role: [
        { role: 'Teacher', count: 678, percentage: 54.4, active_percentage: 71.2 },
        { role: 'SchoolAdmin', count: 234, percentage: 18.8, active_percentage: 84.6 },
        { role: 'RegionAdmin', count: 156, percentage: 12.5, active_percentage: 92.3 },
        { role: 'SektorAdmin', count: 98, percentage: 7.9, active_percentage: 88.8 },
        { role: 'SuperAdmin', count: 81, percentage: 6.5, active_percentage: 95.1 }
      ],
      by_institution_type: [
        { institution_type: 'Ümumi təhsil məktəbi', count: 567, percentage: 45.5 },
        { institution_type: 'Lisey', count: 234, percentage: 18.8 },
        { institution_type: 'Gimnasium', count: 189, percentage: 15.2 },
        { institution_type: 'Məktəbəqədər təhsil müəssisəsi', count: 134, percentage: 10.7 },
        { institution_type: 'Digər', count: 123, percentage: 9.9 }
      ],
      login_activity: [
        { date: '2024-08-10', logins: 234, unique_users: 189 },
        { date: '2024-08-11', logins: 267, unique_users: 201 },
        { date: '2024-08-12', logins: 198, unique_users: 156 },
        { date: '2024-08-13', logins: 289, unique_users: 234 },
        { date: '2024-08-14', logins: 245, unique_users: 198 },
        { date: '2024-08-15', logins: 156, unique_users: 134 }
      ],
      geographic_distribution: [
        { region: 'Bakı', count: 456, percentage: 36.6 },
        { region: 'Gəncə', count: 234, percentage: 18.8 },
        { region: 'Sumqayıt', count: 189, percentage: 15.2 },
        { region: 'Mingəçevir', count: 134, percentage: 10.7 },
        { region: 'Digər', count: 234, percentage: 18.8 }
      ],
      engagement_metrics: {
        avg_session_duration: 25.6,
        avg_sessions_per_user: 3.4,
        bounce_rate: 12.3,
        retention_rate_7day: 78.9,
        retention_rate_30day: 65.4
      }
    };
  }

  getMockSurveyAnalytics(): SurveyAnalytics {
    return {
      total_count: 342,
      published_count: 28,
      draft_count: 15,
      completed_count: 299,
      archived_count: 156,
      by_category: [
        { category: 'teacher', count: 145, avg_response_rate: 78.4, avg_completion_time: 12.3 },
        { category: 'student', count: 98, avg_response_rate: 82.1, avg_completion_time: 8.7 },
        { category: 'parent', count: 67, avg_response_rate: 65.2, avg_completion_time: 15.2 },
        { category: 'staff', count: 32, avg_response_rate: 74.8, avg_completion_time: 11.1 }
      ],
      by_institution_level: [
        { level: 'School', count: 189, percentage: 55.3 },
        { level: 'Sector', count: 87, percentage: 25.4 },
        { level: 'Region', count: 45, percentage: 13.2 },
        { level: 'Ministry', count: 21, percentage: 6.1 }
      ],
      response_trends: [
        { date: '2024-08-10', survey_count: 5, response_count: 234, completion_rate: 89.2 },
        { date: '2024-08-11', survey_count: 7, response_count: 345, completion_rate: 91.4 },
        { date: '2024-08-12', survey_count: 3, response_count: 167, completion_rate: 87.3 },
        { date: '2024-08-13', survey_count: 8, response_count: 456, completion_rate: 93.1 },
        { date: '2024-08-14', survey_count: 4, response_count: 198, completion_rate: 88.7 }
      ],
      popular_question_types: [
        { type: 'multiple_choice', count: 1234, percentage: 45.2 },
        { type: 'rating_scale', count: 789, percentage: 28.9 },
        { type: 'text', count: 456, percentage: 16.7 },
        { type: 'yes_no', count: 234, percentage: 8.6 },
        { type: 'matrix', count: 56, percentage: 2.1 }
      ],
      performance_metrics: {
        avg_response_rate: 74.3,
        avg_completion_time: 11.8,
        avg_questions_per_survey: 18.4,
        top_performing_survey_id: 245,
        lowest_performing_survey_id: 123
      }
    };
  }

  getMockRealtimeMetrics() {
    return {
      active_users: 89,
      requests_per_minute: 142,
      avg_response_time: 89.3,
      error_count: 2,
      memory_usage: 67.8,
      cpu_usage: 23.4
    };
  }
}

export const analyticsService = new AnalyticsService();