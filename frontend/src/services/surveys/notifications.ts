import { apiClient } from '../api';

type UnknownRecord = Record<string, unknown>;

class SurveyNotificationService {
  async getNotifications(params?: { limit?: number; only_unread?: boolean }): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>('/survey-notifications', params);
    return response.data ?? {};
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/survey-notifications/unread-count');
    return response.data?.count ?? 0;
  }

  async getStats(): Promise<UnknownRecord> {
    const response = await apiClient.get<UnknownRecord>('/survey-notifications/stats');
    return response.data ?? {};
  }

  async markAsRead(surveyId: number): Promise<UnknownRecord> {
    const response = await apiClient.post<UnknownRecord>(`/survey-notifications/${surveyId}/mark-read`);
    return response.data ?? {};
  }
}

export const surveyNotificationService = new SurveyNotificationService();
