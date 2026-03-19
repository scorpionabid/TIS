import { apiClient } from '@/services/api';

import type {
  SchemaResponse,
  EnhancePromptResponse,
  ExecuteRequest,
  QueryResult,
  AiAnalysisLog,
} from '@/types/aiAnalysis';

/**
 * apiClient.get/post → raw JSON body qaytarır (as unknown as T pattern).
 * Backend cavabları `{ success: boolean, data: T }` strukturundadır.
 * Komponentlər yalnız unwrap edilmiş `T`-ni alır.
 */

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

interface PaginatedWrapper<T> {
  success: boolean;
  data: {
    data: T[];
  };
}

class AiAnalysisService {
  private readonly baseUrl = '/ai-analysis';

  async getSchema(forceRefresh = false): Promise<SchemaResponse> {
    const suffix = forceRefresh ? '?refresh=true' : '';
    const response = await apiClient.get<ApiWrapper<SchemaResponse>>(
      `${this.baseUrl}/schema${suffix}`
    );
    return (response as unknown as ApiWrapper<SchemaResponse>).data;
  }

  async enhancePrompt(prompt: string): Promise<EnhancePromptResponse> {
    const response = await apiClient.post<ApiWrapper<EnhancePromptResponse>>(
      `${this.baseUrl}/enhance-prompt`,
      { prompt }
    );
    return (response as unknown as ApiWrapper<EnhancePromptResponse>).data;
  }

  async execute(payload: ExecuteRequest): Promise<QueryResult> {
    const response = await apiClient.post<ApiWrapper<QueryResult>>(
      `${this.baseUrl}/execute`,
      payload as unknown as Record<string, unknown>
    );
    return (response as unknown as ApiWrapper<QueryResult>).data;
  }

  async getLogs(): Promise<{ data: AiAnalysisLog[]; meta: Record<string, unknown> }> {
    const response = await apiClient.get<PaginatedWrapper<AiAnalysisLog>>(
      `${this.baseUrl}/logs`
    );
    const wrapper = response as unknown as PaginatedWrapper<AiAnalysisLog>;
    return {
      data: wrapper.data?.data ?? [],
      meta: {},
    };
  }
}

export const aiAnalysisService = new AiAnalysisService();
