import { apiClient } from '@/services/api';

import type {
  AiSettingsResponse,
  SaveAiSettingsRequest,
  TestConnectionResponse,
} from '@/types/aiAnalysis';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

class AiSettingsService {
  private readonly baseUrl = '/ai-analysis/settings';

  async getSettings(): Promise<AiSettingsResponse> {
    const response = await apiClient.get<ApiWrapper<AiSettingsResponse>>(this.baseUrl);
    return (response as unknown as ApiWrapper<AiSettingsResponse>).data;
  }

  async saveSettings(payload: SaveAiSettingsRequest): Promise<void> {
    await apiClient.post(this.baseUrl, payload as unknown as Record<string, unknown>);
  }

  async testConnection(): Promise<TestConnectionResponse> {
    const response = await apiClient.post<ApiWrapper<TestConnectionResponse>>(
      `${this.baseUrl}/test`
    );
    return (response as unknown as ApiWrapper<TestConnectionResponse>).data;
  }
}

export const aiSettingsService = new AiSettingsService();
