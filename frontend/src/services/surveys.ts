import { BaseService, PaginationParams } from './BaseService';
import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { fetchBlob } from './utils/downloadBlob';
import { surveyAnalyticsService } from './surveys/analytics';
import { surveyNotificationService } from './surveys/notifications';
import type {
  Survey,
  SurveyQuestion,
  CreateSurveyData,
  SurveyFilters,
  SurveyResponse,
  SurveyAnswer,
  SurveyStats,
  SurveyQuestionRestrictions,
  SurveyFormSchema,
} from './surveys/types';

type UnknownRecord = Record<string, unknown>;

export type SurveyListResponse = ApiResponse<PaginatedResponse<Survey>>;
export type SurveyResponseListResponse = ApiResponse<PaginatedResponse<SurveyResponse>>;

interface SurveyActionResponsePayload {
  response: SurveyResponse;
  message?: string;
}

type SurveyActionResponse = ApiResponse<SurveyActionResponsePayload>;

class SurveyService extends BaseService<Survey> {
  constructor() {
    super('/surveys');
  }

  // Override getAll to expose the raw API response with pagination metadata
  async getAll(params?: SurveyFilters, useCache: boolean = true): Promise<SurveyListResponse> {
    return apiClient.get<PaginatedResponse<Survey>>(this.baseEndpoint, params, {
      cache: useCache,
    });
  }

  async publish(id: number): Promise<UnknownRecord> {
    const response = await apiClient.post<UnknownRecord>(`${this.baseEndpoint}/${id}/publish`);
    return response.data ?? {};
  }

  async pause(id: number): Promise<UnknownRecord> {
    const response = await apiClient.post<UnknownRecord>(`${this.baseEndpoint}/${id}/pause`);
    return response.data ?? {};
  }

  async resume(id: number): Promise<UnknownRecord> {
    const response = await apiClient.post<UnknownRecord>(`${this.baseEndpoint}/${id}/resume`);
    return response.data ?? {};
  }

  async archive(id: number): Promise<UnknownRecord> {
    const response = await apiClient.post<UnknownRecord>(`${this.baseEndpoint}/${id}/archive`);
    return response.data ?? {};
  }

  async duplicate(id: number): Promise<UnknownRecord> {
    const response = await apiClient.post<UnknownRecord>(`${this.baseEndpoint}/${id}/duplicate`);
    return response.data ?? {};
  }

  async getResponses(id: number, params?: PaginationParams): Promise<SurveyResponseListResponse> {
    return apiClient.get<PaginatedResponse<SurveyResponse>>(
      `${this.baseEndpoint}/${id}/responses`,
      params
    );
  }

  async getSurveyForResponse(id: number): Promise<SurveyFormSchema> {
    const response = await apiClient.get<SurveyFormSchema>(`${this.baseEndpoint}/${id}/form`);
    return response.data;
  }

  async startResponse(surveyId: number, departmentId?: number): Promise<SurveyActionResponsePayload> {
    const response = await apiClient.post(`${this.baseEndpoint}/${surveyId}/responses/start`, {
      department_id: departmentId
    });
    return response.data;
  }

  async saveResponse(
    responseId: number,
    responses: Record<string, unknown>,
    autoSubmit: boolean = false
  ): Promise<SurveyActionResponsePayload> {
    const response = await apiClient.put(`/survey-responses/${responseId}/save`, {
      responses,
      auto_submit: autoSubmit
    });
    return response.data;
  }

  async submitResponse(responseId: number): Promise<SurveyActionResponsePayload> {
    const response = await apiClient.post(`/survey-responses/${responseId}/submit`);
    return response.data;
  }

  async reopenAsDraft(responseId: number): Promise<SurveyActionResponsePayload> {
    const response = await apiClient.post(`/survey-responses/${responseId}/reopen`);
    return response.data;
  }

  async getResponse(responseId: number): Promise<SurveyActionResponsePayload> {
    const response = await apiClient.get(`/survey-responses/${responseId}`);
    return response.data;
  }

  async deleteResponse(responseId: number): Promise<UnknownRecord> {
    const response = await apiClient.delete(`/survey-responses/${responseId}`);
    return response.data ?? {};
  }

  async getStats(id: number): Promise<SurveyStats> {
    return surveyAnalyticsService.getStats(id);
  }

  async exportResponses(id: number, format: 'xlsx' | 'csv' = 'xlsx') {
    return fetchBlob(`${this.baseEndpoint}/${id}/export`, {
      params: { format },
      errorMessage: 'Export failed',
    });
  }

  async getAnalyticsOverview(): Promise<UnknownRecord> {
    return surveyAnalyticsService.getOverview();
  }

  async getSurveyAnalytics(id: number): Promise<UnknownRecord> {
    return surveyAnalyticsService.getSurveyAnalytics(id);
  }

  async getInstitutionBreakdown(id: number): Promise<UnknownRecord> {
    return surveyAnalyticsService.getInstitutionBreakdown(id);
  }

  async getHierarchicalBreakdown(id: number): Promise<UnknownRecord> {
    return surveyAnalyticsService.getHierarchicalBreakdown(id);
  }

  // NEW: Survey Results Analytics API Methods
  async getSurveyAnalyticsOverview(id: number): Promise<UnknownRecord> {
    return surveyAnalyticsService.getSurveyAnalyticsOverview(id);
  }

  async getResponseTrends(id: number, days: number = 30): Promise<UnknownRecord> {
    return surveyAnalyticsService.getResponseTrends(id, days);
  }

  async getHierarchicalInstitutionsAnalytics(id: number): Promise<UnknownRecord> {
    return surveyAnalyticsService.getHierarchicalInstitutionsAnalytics(id);
  }

  async getNonRespondingInstitutions(id: number): Promise<UnknownRecord> {
    return surveyAnalyticsService.getNonRespondingInstitutions(id);
  }

  async getAvailableTargets(): Promise<UnknownRecord> {
    return surveyAnalyticsService.getAvailableTargets();
  }

  async getQuestionRestrictions(id: number): Promise<SurveyQuestionRestrictions> {
    return surveyAnalyticsService.getQuestionRestrictions(id);
  }

  // Survey notification methods
  async getSurveyNotifications(params?: { limit?: number; only_unread?: boolean }): Promise<UnknownRecord> {
    return surveyNotificationService.getNotifications(params);
  }

  async getUnreadSurveyCount(): Promise<number> {
    return surveyNotificationService.getUnreadCount();
  }

  async getSurveyNotificationStats(): Promise<UnknownRecord> {
    return surveyNotificationService.getStats();
  }

  async markSurveyNotificationAsRead(surveyId: number): Promise<UnknownRecord> {
    return surveyNotificationService.markAsRead(surveyId);
  }

  // Dashboard and user-facing survey methods
  async getDashboardStats(): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>('/my-surveys/dashboard-stats');
    return response.data ?? {};
  }

  async getAssignedSurveys(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Survey>>> {
    return apiClient.get<PaginatedResponse<Survey>>('/my-surveys/assigned', params);
  }

  async getMyResponses(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<SurveyResponse>>> {
    return apiClient.get<PaginatedResponse<SurveyResponse>>('/my-surveys/responses', params);
  }

  async getRecentAssignedSurveys(limit: number = 5): Promise<ApiResponse<Survey[]>> {
    return apiClient.get<Survey[]>('/my-surveys/recent', { limit });
  }

  async downloadResponseReport(responseId: number): Promise<Blob> {
    return fetchBlob(`/survey-responses/${responseId}/report`, {
      errorMessage: 'Server error occurred',
    });
  }
}

export const surveyService = new SurveyService();
export { surveyAnalyticsService } from './surveys/analytics';
export { surveyNotificationService } from './surveys/notifications';
export * from './surveys/types';
