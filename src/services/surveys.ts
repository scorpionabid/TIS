import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';

export interface Survey extends BaseEntity {
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  target_roles?: string[];
  target_institutions?: number[];
  created_by: number;
  responses_count?: number;
  max_responses?: number;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  creator?: {
    id: number;
    name: string;
  };
}

export interface SurveyQuestion {
  id?: number;
  question: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'rating' | 'date';
  options?: string[];
  required: boolean;
  order: number;
  validation?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
  };
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

  async getResponse(responseId: number) {
    const response = await apiClient.get(`/survey-responses/${responseId}`);
    return response.data;
  }

  async deleteResponse(responseId: number) {
    const response = await apiClient.delete(`/survey-responses/${responseId}`);
    return response.data;
  }

  async getStats(id: number) {
    const response = await apiClient.get<SurveyStats>(`${this.baseEndpoint}/${id}/stats`);
    return response.data;
  }

  async exportResponses(id: number, format: 'xlsx' | 'csv' = 'xlsx') {
    const response = await fetch(`${(apiClient as any).baseURL}/surveys/${id}/export?format=${format}`, {
      method: 'GET',
      headers: (apiClient as any).getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  async getAvailableTargets() {
    const response = await apiClient.get(`${this.baseEndpoint}/targets`);
    return response.data;
  }
}

export const surveyService = new SurveyService();