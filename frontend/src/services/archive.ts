import { BaseService } from './BaseService';

export interface ArchivedSurvey {
  id: number;
  title: string;
  description?: string;
  category: 'teacher' | 'student' | 'parent' | 'staff' | 'general';
  status: 'completed' | 'archived' | 'expired';
  created_by: number;
  archived_by?: number;
  archived_at: string;
  total_responses: number;
  target_responses: number;
  response_rate: number;
  institutions_count: number;
  start_date: string;
  end_date: string;
  completion_rate: number;
  average_completion_time: number; // in minutes
  questions_count: number;
  creator: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    institution: string;
  };
  archiver?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ArchiveStatistics {
  total_archived: number;
  by_year: Array<{
    year: number;
    count: number;
    total_responses: number;
  }>;
  by_category: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  by_status: Array<{
    status: string;
    count: number;
  }>;
  response_summary: {
    total_responses: number;
    average_response_rate: number;
    most_responsive_year: number;
    most_responsive_category: string;
  };
  storage_metrics: {
    total_size_mb: number;
    average_size_per_survey: number;
    largest_survey_size: number;
  };
}

export interface ArchiveFilters {
  year?: number;
  category?: string;
  status?: string;
  institution_id?: number;
  creator_id?: number;
  date_from?: string;
  date_to?: string;
  min_responses?: number;
  max_responses?: number;
  search?: string;
  tags?: string[];
  sort_by?: 'created_at' | 'archived_at' | 'total_responses' | 'response_rate' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface ArchiveRestoreData {
  survey_id: number;
  restore_type: 'full' | 'template_only' | 'data_only';
  new_title?: string;
  new_start_date?: string;
  new_end_date?: string;
  preserve_responses?: boolean;
  preserve_metadata?: boolean;
}

export interface ArchiveExportData {
  survey_ids: number[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  include_responses: boolean;
  include_analytics: boolean;
  include_metadata: boolean;
  group_by?: 'category' | 'year' | 'institution';
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  respondent_id: number;
  institution_id: number;
  started_at: string;
  completed_at?: string;
  completion_time?: number; // in minutes
  is_complete: boolean;
  progress_percentage: number;
  responses: Array<{
    question_id: number;
    question_text: string;
    question_type: string;
    answer_value: any;
    answer_text?: string;
  }>;
  respondent_info: {
    role: string;
    institution: string;
    department?: string;
  };
  metadata?: Record<string, any>;
}

class ArchiveService extends BaseService {
  constructor() {
    super('/archives');
  }

  async getArchivedSurveys(filters?: ArchiveFilters): Promise<{ success: boolean; data: ArchivedSurvey[] }> {
    console.log('🔍 ArchiveService.getArchivedSurveys called with filters:', filters);
    try {
      const response = await this.get<ArchivedSurvey[]>(this.baseUrl, filters);
      console.log('✅ ArchiveService.getArchivedSurveys successful:', response);
      return response as { success: boolean; data: ArchivedSurvey[] };
    } catch (error) {
      console.error('❌ ArchiveService.getArchivedSurveys failed:', error);
      throw error;
    }
  }

  async getArchivedSurvey(id: number): Promise<{ success: boolean; data: ArchivedSurvey }> {
    console.log('🔍 ArchiveService.getArchivedSurvey called for ID:', id);
    try {
      const response = await this.get<ArchivedSurvey>(`${this.baseUrl}/${id}`);
      console.log('✅ ArchiveService.getArchivedSurvey successful:', response);
      return response as { success: boolean; data: ArchivedSurvey };
    } catch (error) {
      console.error('❌ ArchiveService.getArchivedSurvey failed:', error);
      throw error;
    }
  }

  async getSurveyResponses(survey_id: number, filters?: {
    page?: number;
    limit?: number;
    institution_id?: number;
    completed_only?: boolean;
  }): Promise<{ success: boolean; data: SurveyResponse[]; meta: { total: number; pages: number } }> {
    console.log('🔍 ArchiveService.getSurveyResponses called for survey ID:', survey_id);
    try {
      const response = await this.get<{ 
        responses: SurveyResponse[]; 
        meta: { total: number; pages: number } 
      }>(`${this.baseUrl}/${survey_id}/responses`, filters);
      console.log('✅ ArchiveService.getSurveyResponses successful:', response);
      return {
        success: true,
        data: (response as any).data.responses,
        meta: (response as any).data.meta
      };
    } catch (error) {
      console.error('❌ ArchiveService.getSurveyResponses failed:', error);
      throw error;
    }
  }

  async archiveSurvey(survey_id: number, data: {
    reason?: string;
    preserve_data?: boolean;
    notify_participants?: boolean;
  }): Promise<{ success: boolean; message: string; data: ArchivedSurvey }> {
    console.log('🔍 ArchiveService.archiveSurvey called for survey ID:', survey_id);
    try {
      const response = await this.post<ArchivedSurvey>(`${this.baseUrl}/archive/${survey_id}`, data);
      console.log('✅ ArchiveService.archiveSurvey successful:', response);
      return response as { success: boolean; message: string; data: ArchivedSurvey };
    } catch (error) {
      console.error('❌ ArchiveService.archiveSurvey failed:', error);
      throw error;
    }
  }

  async restoreSurvey(id: number, data: ArchiveRestoreData): Promise<{ success: boolean; message: string; data: { survey_id: number } }> {
    console.log('🔍 ArchiveService.restoreSurvey called for ID:', id);
    try {
      const response = await this.post<{ survey_id: number }>(`${this.baseUrl}/${id}/restore`, data);
      console.log('✅ ArchiveService.restoreSurvey successful:', response);
      return response as { success: boolean; message: string; data: { survey_id: number } };
    } catch (error) {
      console.error('❌ ArchiveService.restoreSurvey failed:', error);
      throw error;
    }
  }

  async deleteArchivedSurvey(id: number, data: {
    confirmation_text: string;
    delete_permanently: boolean;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ArchiveService.deleteArchivedSurvey called for ID:', id);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${id}/delete`, data);
      console.log('✅ ArchiveService.deleteArchivedSurvey successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ArchiveService.deleteArchivedSurvey failed:', error);
      throw error;
    }
  }

  async exportArchive(data: ArchiveExportData): Promise<{ success: boolean; data: { download_url: string; file_name: string; expires_at: string } }> {
    console.log('🔍 ArchiveService.exportArchive called with:', data);
    try {
      const response = await this.post<{ download_url: string; file_name: string; expires_at: string }>(`${this.baseUrl}/export`, data);
      console.log('✅ ArchiveService.exportArchive successful:', response);
      return response as { success: boolean; data: { download_url: string; file_name: string; expires_at: string } };
    } catch (error) {
      console.error('❌ ArchiveService.exportArchive failed:', error);
      throw error;
    }
  }

  async getArchiveStatistics(): Promise<{ 
    success: boolean; 
    data: ArchiveStatistics 
  }> {
    console.log('🔍 ArchiveService.getArchiveStatistics called');
    try {
      const response = await this.get<ArchiveStatistics>(`${this.baseUrl}/statistics`);
      console.log('✅ ArchiveService.getArchiveStatistics successful:', response);
      return response as { 
        success: boolean; 
        data: ArchiveStatistics 
      };
    } catch (error) {
      console.error('❌ ArchiveService.getArchiveStatistics failed:', error);
      // Return mock data if API not available
      return {
        success: true,
        data: {
          total_archived: 0,
          by_year: [],
          by_category: [],
          by_status: [],
          response_summary: {
            total_responses: 0,
            average_response_rate: 0,
            most_responsive_year: new Date().getFullYear(),
            most_responsive_category: 'general'
          },
          storage_metrics: {
            total_size_mb: 0,
            average_size_per_survey: 0,
            largest_survey_size: 0
          }
        }
      };
    }
  }

  async searchArchive(query: string, filters?: {
    category?: string;
    year?: number;
    min_responses?: number;
  }): Promise<{ success: boolean; data: ArchivedSurvey[] }> {
    console.log('🔍 ArchiveService.searchArchive called with query:', query);
    try {
      const searchParams = { search: query, ...filters };
      const response = await this.get<ArchivedSurvey[]>(`${this.baseUrl}/search`, searchParams);
      console.log('✅ ArchiveService.searchArchive successful:', response);
      return response as { success: boolean; data: ArchivedSurvey[] };
    } catch (error) {
      console.error('❌ ArchiveService.searchArchive failed:', error);
      throw error;
    }
  }

  async getSurveyAnalytics(survey_id: number): Promise<{ 
    success: boolean; 
    data: {
      response_rate_by_day: Array<{ date: string; responses: number }>;
      completion_rate_by_question: Array<{ question_id: number; completion_rate: number }>;
      demographic_breakdown: Array<{ category: string; data: Array<{ label: string; count: number }> }>;
      response_time_analysis: {
        average_time: number;
        median_time: number;
        fastest_time: number;
        slowest_time: number;
      };
      quality_metrics: {
        complete_responses: number;
        partial_responses: number;
        abandoned_responses: number;
        quality_score: number;
      };
    }
  }> {
    console.log('🔍 ArchiveService.getSurveyAnalytics called for survey ID:', survey_id);
    try {
      const response = await this.get(`${this.baseUrl}/${survey_id}/analytics`);
      console.log('✅ ArchiveService.getSurveyAnalytics successful:', response);
      return response as any;
    } catch (error) {
      console.error('❌ ArchiveService.getSurveyAnalytics failed:', error);
      throw error;
    }
  }

  async updateArchiveMetadata(id: number, metadata: {
    tags?: string[];
    category?: string;
    notes?: string;
    importance_level?: 'low' | 'medium' | 'high';
  }): Promise<{ success: boolean; message: string }> {
    console.log('🔍 ArchiveService.updateArchiveMetadata called for ID:', id);
    try {
      const response = await this.put<void>(`${this.baseUrl}/${id}/metadata`, metadata);
      console.log('✅ ArchiveService.updateArchiveMetadata successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ ArchiveService.updateArchiveMetadata failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
  getMockArchivedSurveys(): ArchivedSurvey[] {
    return [
      {
        id: 1,
        title: '2023 İl Sonu Müəllim Qiymətləndirməsi',
        description: 'İllik müəllim performansı və məmnuniyyət səviyyəsinin qiymətləndirilməsi',
        category: 'teacher',
        status: 'archived',
        created_by: 1,
        archived_by: 2,
        archived_at: '2023-12-31T10:00:00Z',
        total_responses: 1234,
        target_responses: 1500,
        response_rate: 82.3,
        institutions_count: 45,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-25T23:59:59Z',
        completion_rate: 94.5,
        average_completion_time: 18.5,
        questions_count: 35,
        creator: {
          id: 1,
          first_name: 'Aydın',
          last_name: 'Əliyev',
          role: 'RegionAdmin',
          institution: 'Bakı Regional Mərkəz'
        },
        archiver: {
          id: 2,
          first_name: 'Nizami',
          last_name: 'Həsənov'
        },
        tags: ['annual', 'teacher-evaluation', 'performance'],
        created_at: '2023-11-15T09:00:00Z',
        updated_at: '2023-12-31T10:00:00Z'
      },
      {
        id: 2,
        title: 'Şagird Məmnuniyyəti Sorğusu - Yaz',
        description: 'Yaz dönəmində şagirdlərin təhsil keyfiyyətindən məmnuniyyəti',
        category: 'student',
        status: 'completed',
        created_by: 3,
        archived_by: 1,
        archived_at: '2023-06-01T15:30:00Z',
        total_responses: 2567,
        target_responses: 3000,
        response_rate: 85.6,
        institutions_count: 78,
        start_date: '2023-05-01T00:00:00Z',
        end_date: '2023-05-15T23:59:59Z',
        completion_rate: 91.2,
        average_completion_time: 12.3,
        questions_count: 25,
        creator: {
          id: 3,
          first_name: 'Səbinə',
          last_name: 'Məmmədova',
          role: 'SektorAdmin',
          institution: 'Gəncə Sektor Mərkəzi'
        },
        archiver: {
          id: 1,
          first_name: 'Aydın',
          last_name: 'Əliyev'
        },
        tags: ['student-satisfaction', 'spring-term', 'quality'],
        created_at: '2023-04-20T10:00:00Z',
        updated_at: '2023-06-01T15:30:00Z'
      },
      {
        id: 3,
        title: 'Valideyn Rəyi - İnfrastruktur',
        description: 'Məktəb infrastrukturu və fiziki şəraitin qiymətləndirilməsi',
        category: 'parent',
        status: 'archived',
        created_by: 4,
        archived_by: 2,
        archived_at: '2023-04-01T12:00:00Z',
        total_responses: 856,
        target_responses: 1200,
        response_rate: 71.3,
        institutions_count: 23,
        start_date: '2023-03-01T00:00:00Z',
        end_date: '2023-03-10T23:59:59Z',
        completion_rate: 88.7,
        average_completion_time: 8.2,
        questions_count: 15,
        creator: {
          id: 4,
          first_name: 'Rəşad',
          last_name: 'Quliyev',
          role: 'SchoolAdmin',
          institution: '15 saylı tam orta məktəb'
        },
        archiver: {
          id: 2,
          first_name: 'Nizami',
          last_name: 'Həsənov'
        },
        tags: ['parent-feedback', 'infrastructure', 'facilities'],
        created_at: '2023-02-25T14:00:00Z',
        updated_at: '2023-04-01T12:00:00Z'
      }
    ];
  }

  getMockStatistics(): ArchiveStatistics {
    return {
      total_archived: 156,
      by_year: [
        { year: 2024, count: 47, total_responses: 12840 },
        { year: 2023, count: 63, total_responses: 18650 },
        { year: 2022, count: 46, total_responses: 14230 }
      ],
      by_category: [
        { category: 'teacher', count: 68, percentage: 43.6 },
        { category: 'student', count: 45, percentage: 28.8 },
        { category: 'parent', count: 28, percentage: 17.9 },
        { category: 'staff', count: 15, percentage: 9.6 }
      ],
      by_status: [
        { status: 'archived', count: 142 },
        { status: 'completed', count: 14 }
      ],
      response_summary: {
        total_responses: 45720,
        average_response_rate: 76.8,
        most_responsive_year: 2023,
        most_responsive_category: 'teacher'
      },
      storage_metrics: {
        total_size_mb: 2847.5,
        average_size_per_survey: 18.3,
        largest_survey_size: 156.8
      }
    };
  }
}

export const archiveService = new ArchiveService();