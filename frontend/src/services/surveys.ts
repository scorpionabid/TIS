import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Survey extends BaseEntity {
  title: string;
  description?: string;
  questions?: SurveyQuestion[];
  status: 'draft' | 'published' | 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  target_roles?: string[];
  target_institutions?: number[];
  response_count?: number;
  questions_count?: number;
  max_responses?: number;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  creator?: {
    id: number;
    username: string;
    full_name: string;
  };
  institution?: {
    id: number;
    name: string;
  };
  survey_type?: string;
  published_at?: string;
}

export interface SurveyQuestion {
  id?: number;
  title: string;
  description?: string;
  type: 'text' | 'number' | 'date' | 'single_choice' | 'multiple_choice' | 'file_upload' | 'rating' | 'table_matrix';
  options?: string[];
  required?: boolean;
  is_required?: boolean;
  order?: number;
  order_index?: number;
  is_active?: boolean;
  validation_rules?: any;
  metadata?: any;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  allowed_file_types?: string[];
  max_file_size?: number;
  rating_min?: number;
  rating_max?: number;
  rating_min_label?: string;
  rating_max_label?: string;
  table_headers?: string[];
  table_rows?: string[];
  translations?: any;
  created_at?: string;
  updated_at?: string;
  survey_id?: number;
}

export interface CreateSurveyData {
  title: string;
  description?: string;
  questions: Omit<SurveyQuestion, 'id'>[];
  start_date?: string;
  end_date?: string;
  target_roles?: string[];
  target_institutions?: number[];
  is_anonymous?: boolean;
  allow_multiple_responses?: boolean;
  max_responses?: number;
}

export interface SurveyFilters extends PaginationParams {
  status?: Survey['status'];
  created_by?: number;
  target_role?: string;
  target_institution?: number;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  institution_id: number;
  department_id?: number;
  respondent_id: number;
  respondent_role?: string;
  responses: Record<string, any>;
  progress_percentage: number;
  is_complete: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  started_at: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: number;
  rejection_reason?: string;
  survey?: {
    id: number;
    title: string;
    survey_type: string;
    is_anonymous: boolean;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  respondent?: {
    id: number;
    username: string;
    name: string;
  };
}

export interface SurveyAnswer {
  question_id: number;
  answer: string | string[];
}

export interface SurveyStats {
  total_responses: number;
  completion_rate: number;
  average_completion_time: number;
  responses_by_day: Array<{ date: string; count: number }>;
  demographic_breakdown?: Record<string, number>;
}

class SurveyService extends BaseService<Survey> {
  constructor() {
    super('/surveys');
  }

  // Override getAll to handle API response structure correctly
  async getAll(params?: PaginationParams, useCache: boolean = true): Promise<any> {
    const response = await apiClient.get(this.baseEndpoint, params);
    return response;
  }

  async publish(id: number) {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/publish`);
    return response.data;
  }

  async pause(id: number) {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/pause`);
    return response.data;
  }

  async resume(id: number) {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/resume`);
    return response.data;
  }

  async archive(id: number) {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/archive`);
    return response.data;
  }

  async duplicate(id: number) {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/duplicate`);
    return response.data;
  }

  async getResponses(id: number, params?: PaginationParams) {
    const response = await apiClient.get<SurveyResponse[]>(`${this.baseEndpoint}/${id}/responses`, params);
    return response as any; // PaginatedResponse
  }

  async getSurveyForResponse(id: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/form`);
    return response.data;
  }

  async startResponse(surveyId: number, departmentId?: number) {
    const response = await apiClient.post(`${this.baseEndpoint}/${surveyId}/responses/start`, {
      department_id: departmentId
    });
    return response.data;
  }

  async saveResponse(responseId: number, responses: Record<string, any>, autoSubmit: boolean = false) {
    const response = await apiClient.put(`/survey-responses/${responseId}/save`, {
      responses,
      auto_submit: autoSubmit
    });
    return response.data;
  }

  async submitResponse(responseId: number) {
    const response = await apiClient.post(`/survey-responses/${responseId}/submit`);
    return response.data;
  }

  async reopenAsDraft(responseId: number) {
    const response = await apiClient.post(`/survey-responses/${responseId}/reopen`);
    return response.data;
  }

  async getResponse(responseId: number) {
    const response = await apiClient.get(`/survey-responses/${responseId}`);
    return response.data;
  }

  async deleteResponse(responseId: number) {
    const response = await apiClient.delete(`/survey-responses/${responseId}`);
    return response.data;
  }

  async getStats(id: number) {
    const response = await apiClient.get<SurveyStats>(`${this.baseEndpoint}/${id}/statistics`);
    return response.data;
  }

  async exportResponses(id: number, format: 'xlsx' | 'csv' = 'xlsx') {
    try {
      const response = await apiClient.get(`${this.baseEndpoint}/${id}/export`, {
        format,
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Export failed');
    }
  }

  async getAnalyticsOverview() {
    const response = await apiClient.get(`${this.baseEndpoint}/analytics/overview`);
    return response.data;
  }

  async getSurveyAnalytics(id: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/analytics`);
    return response.data;
  }

  async getAvailableTargets() {
    const response = await apiClient.get(`${this.baseEndpoint}/targets`);
    return response.data;
  }

  // Survey notification methods
  async getSurveyNotifications(params?: { limit?: number; only_unread?: boolean }) {
    const response = await apiClient.get('/survey-notifications', params);
    return response.data;
  }

  async getUnreadSurveyCount() {
    const response = await apiClient.get('/survey-notifications/unread-count');
    return response.data;
  }

  async getSurveyNotificationStats() {
    const response = await apiClient.get('/survey-notifications/stats');
    return response.data;
  }

  async markSurveyNotificationAsRead(surveyId: number) {
    const response = await apiClient.post(`/survey-notifications/${surveyId}/mark-read`);
    return response.data;
  }

  // Dashboard and user-facing survey methods
  async getDashboardStats() {
    const response = await apiClient.get('/my-surveys/dashboard-stats');
    return response.data;
  }

  async getAssignedSurveys(params?: PaginationParams) {
    const response = await apiClient.get('/my-surveys/assigned', params);
    return response.data;
  }

  async getMyResponses(params?: PaginationParams) {
    const response = await apiClient.get('/my-surveys/responses', params);
    return response.data;
  }

  async getRecentAssignedSurveys(limit: number = 5) {
    const response = await apiClient.get('/my-surveys/recent', { limit });
    return response.data;
  }

  async downloadResponseReport(responseId: number) {
    const response = await apiClient.get(`/survey-responses/${responseId}/report`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const surveyService = new SurveyService();