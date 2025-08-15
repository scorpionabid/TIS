import { BaseService } from './BaseService';

export interface ReportOverviewStats {
  user_statistics: {
    total_users: number;
    active_users: number;
    new_users: number;
    user_growth_rate: number;
    users_by_role: Array<{
      role: string;
      count: number;
      percentage: number;
    }>;
  };
  institution_statistics: {
    total_institutions: number;
    active_institutions: number;
    institutions_by_type: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    regional_distribution: Array<{
      region: string;
      count: number;
    }>;
  };
  survey_statistics: {
    total_surveys: number;
    active_surveys: number;
    completed_surveys: number;
    total_responses: number;
    response_rate: number;
  };
  system_activity: {
    daily_active_users: number;
    total_sessions: number;
    average_session_duration: number;
    most_active_hours: Array<{
      hour: number;
      activity_count: number;
    }>;
  };
  performance_metrics: {
    average_response_time: number;
    system_uptime: number;
    error_rate: number;
    user_satisfaction_score: number;
  };
  growth_trends: {
    user_growth: Array<{
      date: string;
      count: number;
    }>;
    activity_trends: Array<{
      date: string;
      activity_count: number;
    }>;
  };
}

export interface InstitutionalPerformanceReport {
  institution_id: number;
  institution_name: string;
  type: string;
  performance_score: number;
  metrics: {
    survey_participation_rate: number;
    task_completion_rate: number;
    user_engagement_score: number;
    response_quality_score: number;
  };
  trends: Array<{
    date: string;
    score: number;
  }>;
  comparison_data: {
    regional_average: number;
    national_average: number;
    ranking: number;
  };
}

export interface SurveyAnalyticsReport {
  survey_id: number;
  survey_title: string;
  total_responses: number;
  completion_rate: number;
  average_completion_time: number;
  response_distribution: Array<{
    question_id: number;
    question_text: string;
    responses: Array<{
      option: string;
      count: number;
      percentage: number;
    }>;
  }>;
  demographic_breakdown: Array<{
    category: string;
    data: Array<{
      label: string;
      count: number;
      percentage: number;
    }>;
  }>;
  trends: Array<{
    date: string;
    response_count: number;
  }>;
}

export interface UserActivityReport {
  total_users: number;
  active_users: number;
  user_activities: Array<{
    user_id: number;
    username: string;
    full_name: string;
    role: string;
    institution: string;
    last_login: string;
    total_sessions: number;
    average_session_duration: number;
    activities_count: number;
  }>;
  activity_summary: {
    most_active_users: Array<{
      user_id: number;
      username: string;
      activity_count: number;
    }>;
    activity_by_role: Array<{
      role: string;
      user_count: number;
      total_activities: number;
    }>;
    daily_activity: Array<{
      date: string;
      unique_users: number;
      total_activities: number;
    }>;
  };
}

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  institution_id?: number;
  institution_type?: string;
  region?: string;
  user_role?: string;
  survey_id?: number;
}

export interface ExportReportRequest {
  report_type: 'overview' | 'institutional' | 'survey' | 'user_activity';
  format: 'pdf' | 'excel' | 'csv';
  filters?: ReportFilters;
  include_charts?: boolean;
  include_raw_data?: boolean;
}

class ReportsService extends BaseService {
  constructor() {
    super('/reports');
  }

  async getOverviewStats(filters?: ReportFilters): Promise<{ 
    status: string; 
    data: ReportOverviewStats;
    date_range: { start_date: string; end_date: string };
    generated_at: string;
  }> {
    console.log('🔍 ReportsService.getOverviewStats called with filters:', filters);
    try {
      const response = await this.get<{
        status: string; 
        data: ReportOverviewStats;
        date_range: { start_date: string; end_date: string };
        generated_at: string;
      }>(`${this.baseUrl}/overview`, filters);
      console.log('✅ ReportsService.getOverviewStats successful:', response);
      return response;
    } catch (error) {
      console.error('❌ ReportsService.getOverviewStats failed:', error);
      throw error;
    }
  }

  async getInstitutionalPerformance(filters?: ReportFilters): Promise<{ 
    success: boolean;
    data: InstitutionalPerformanceReport[];
  }> {
    console.log('🔍 ReportsService.getInstitutionalPerformance called with filters:', filters);
    try {
      const response = await this.get<InstitutionalPerformanceReport[]>(`${this.baseUrl}/institutional-performance`, filters);
      console.log('✅ ReportsService.getInstitutionalPerformance successful:', response);
      return response as { success: boolean; data: InstitutionalPerformanceReport[] };
    } catch (error) {
      console.error('❌ ReportsService.getInstitutionalPerformance failed:', error);
      throw error;
    }
  }

  async getSurveyAnalytics(filters?: ReportFilters & { survey_id?: number }): Promise<{ 
    success: boolean;
    data: SurveyAnalyticsReport[];
  }> {
    console.log('🔍 ReportsService.getSurveyAnalytics called with filters:', filters);
    try {
      const response = await this.get<SurveyAnalyticsReport[]>(`${this.baseUrl}/survey-analytics`, filters);
      console.log('✅ ReportsService.getSurveyAnalytics successful:', response);
      return response as { success: boolean; data: SurveyAnalyticsReport[] };
    } catch (error) {
      console.error('❌ ReportsService.getSurveyAnalytics failed:', error);
      throw error;
    }
  }

  async getUserActivityReport(filters?: ReportFilters): Promise<{ 
    success: boolean;
    data: UserActivityReport;
  }> {
    console.log('🔍 ReportsService.getUserActivityReport called with filters:', filters);
    try {
      const response = await this.get<UserActivityReport>(`${this.baseUrl}/user-activity`, filters);
      console.log('✅ ReportsService.getUserActivityReport successful:', response);
      return response as { success: boolean; data: UserActivityReport };
    } catch (error) {
      console.error('❌ ReportsService.getUserActivityReport failed:', error);
      throw error;
    }
  }

  async exportReport(request: ExportReportRequest): Promise<{ 
    success: boolean;
    data: { 
      download_url: string;
      file_name: string;
      file_size: number;
      expires_at: string;
    };
    message: string;
  }> {
    console.log('🔍 ReportsService.exportReport called with request:', request);
    try {
      const response = await this.post<{ 
        download_url: string;
        file_name: string;
        file_size: number;
        expires_at: string;
      }>(`${this.baseUrl}/export`, request);
      console.log('✅ ReportsService.exportReport successful:', response);
      return response as { 
        success: boolean;
        data: { 
          download_url: string;
          file_name: string;
          file_size: number;
          expires_at: string;
        };
        message: string;
      };
    } catch (error) {
      console.error('❌ ReportsService.exportReport failed:', error);
      throw error;
    }
  }

  // Convenience methods for specific report types
  async exportOverviewReport(format: 'pdf' | 'excel' | 'csv', filters?: ReportFilters): Promise<{ 
    success: boolean;
    data: { download_url: string };
    message: string;
  }> {
    return this.exportReport({
      report_type: 'overview',
      format,
      filters,
      include_charts: true,
      include_raw_data: format !== 'pdf'
    });
  }

  async exportInstitutionalReport(format: 'pdf' | 'excel' | 'csv', filters?: ReportFilters): Promise<{ 
    success: boolean;
    data: { download_url: string };
    message: string;
  }> {
    return this.exportReport({
      report_type: 'institutional',
      format,
      filters,
      include_charts: true,
      include_raw_data: true
    });
  }

  async exportSurveyReport(format: 'pdf' | 'excel' | 'csv', filters?: ReportFilters): Promise<{ 
    success: boolean;
    data: { download_url: string };
    message: string;
  }> {
    return this.exportReport({
      report_type: 'survey',
      format,
      filters,
      include_charts: true,
      include_raw_data: format === 'excel'
    });
  }

  async exportUserActivityReport(format: 'pdf' | 'excel' | 'csv', filters?: ReportFilters): Promise<{ 
    success: boolean;
    data: { download_url: string };
    message: string;
  }> {
    return this.exportReport({
      report_type: 'user_activity',
      format,
      filters,
      include_charts: format === 'pdf',
      include_raw_data: true
    });
  }

  // Mock data for development/fallback
  getMockOverviewStats(): ReportOverviewStats {
    return {
      user_statistics: {
        total_users: 1250,
        active_users: 945,
        new_users: 85,
        user_growth_rate: 12.5,
        users_by_role: [
          { role: 'Müəllim', count: 650, percentage: 52 },
          { role: 'Məktəb Admini', count: 280, percentage: 22.4 },
          { role: 'Sektor Admini', count: 150, percentage: 12 },
          { role: 'Region Admini', count: 85, percentage: 6.8 },
          { role: 'SuperAdmin', count: 85, percentage: 6.8 }
        ]
      },
      institution_statistics: {
        total_institutions: 485,
        active_institutions: 465,
        institutions_by_type: [
          { type: 'Tam orta məktəb', count: 285, percentage: 58.8 },
          { type: 'İbtidai məktəb', count: 95, percentage: 19.6 },
          { type: 'Lisey', count: 65, percentage: 13.4 },
          { type: 'Gimnaziya', count: 40, percentage: 8.2 }
        ],
        regional_distribution: [
          { region: 'Bakı', count: 125 },
          { region: 'Gəncə-Qazax', count: 85 },
          { region: 'Şəki-Zaqatala', count: 75 },
          { region: 'Lənkəran', count: 65 }
        ]
      },
      survey_statistics: {
        total_surveys: 156,
        active_surveys: 24,
        completed_surveys: 132,
        total_responses: 12480,
        response_rate: 78.5
      },
      system_activity: {
        daily_active_users: 1245,
        total_sessions: 8650,
        average_session_duration: 45.5,
        most_active_hours: [
          { hour: 9, activity_count: 1250 },
          { hour: 10, activity_count: 1180 },
          { hour: 14, activity_count: 1050 }
        ]
      },
      performance_metrics: {
        average_response_time: 285,
        system_uptime: 99.7,
        error_rate: 0.03,
        user_satisfaction_score: 4.6
      },
      growth_trends: {
        user_growth: [
          { date: '2024-01', count: 1050 },
          { date: '2024-02', count: 1120 },
          { date: '2024-03', count: 1185 },
          { date: '2024-04', count: 1250 }
        ],
        activity_trends: [
          { date: '2024-01', activity_count: 15240 },
          { date: '2024-02', activity_count: 16890 },
          { date: '2024-03', activity_count: 18560 },
          { date: '2024-04', activity_count: 19750 }
        ]
      }
    };
  }
}

export const reportsService = new ReportsService();