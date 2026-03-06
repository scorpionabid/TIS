import { apiClient, ApiResponse, PaginatedResponse } from '../api';
import type { Survey, SurveyStats, SurveyQuestionRestrictions } from './types';

type UnknownRecord = Record<string, unknown>;

export type SurveyAnalyticsOverview = UnknownRecord;
export type SurveyTrendResponse = UnknownRecord;

class SurveyAnalyticsService {
  async getStats(surveyId: number): Promise<SurveyStats> {
    const response = await apiClient.get<SurveyStats>(`/surveys/${surveyId}/statistics`);
    return response.data;
  }

  async getOverview(): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>('/surveys/analytics/overview');
    return response.data ?? {};
  }

  async getSurveyAnalytics(surveyId: number): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/analytics`);
    return response.data ?? {};
  }

  async getInstitutionBreakdown(surveyId: number): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/institution-breakdown`);
    return response.data ?? {};
  }

  async getHierarchicalBreakdown(surveyId: number): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/hierarchical-breakdown`);
    return response.data ?? {};
  }

  async getSurveyAnalyticsOverview(surveyId: number): Promise<SurveyAnalyticsOverview> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/analytics/overview`);
    return response.data ?? {};
  }

  async getResponseTrends(surveyId: number, days: number = 30): Promise<SurveyTrendResponse> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/analytics/trends`, { days });
    return response.data ?? {};
  }

  async getHierarchicalInstitutionsAnalytics(surveyId: number): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/analytics/hierarchical-institutions`);
    return response.data ?? {};
  }

  async getNonRespondingInstitutions(surveyId: number): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>(`/surveys/${surveyId}/analytics/non-responding-institutions`);
    return response.data ?? {};
  }

  async getAvailableTargets(): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>('/surveys/targets');
    return response.data ?? {};
  }

  async getQuestionRestrictions(surveyId: number): Promise<SurveyQuestionRestrictions> {
    const response = await apiClient.get<SurveyQuestionRestrictions>(`/surveys/${surveyId}/question-restrictions`);
    return response.data;
  }
}

export const surveyAnalyticsService = new SurveyAnalyticsService();
