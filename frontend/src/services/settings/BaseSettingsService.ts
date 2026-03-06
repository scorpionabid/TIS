import { apiClient } from '../api';

export class BaseSettingsService {
  protected baseUrl = '/settings';

  protected async getSettings<T>(endpoint: string): Promise<{ success: boolean; data: T }> {
    console.log(`🔍 SettingsService.get${endpoint} called`);
    try {
      const response = await apiClient.get<T>(`${this.baseUrl}${endpoint}`);
      console.log(`✅ SettingsService.get${endpoint} successful:`, response);
      return response as { success: boolean; data: T };
    } catch (error) {
      console.error(`❌ SettingsService.get${endpoint} failed:`, error);
      throw error;
    }
  }

  protected async updateSettings<T>(
    endpoint: string, 
    data: Partial<T>
  ): Promise<{ success: boolean; message: string }> {
    console.log(`🔍 SettingsService.update${endpoint} called with:`, data);
    try {
      const response = await apiClient.put<void>(`${this.baseUrl}${endpoint}`, data);
      console.log(`✅ SettingsService.update${endpoint} successful:`, response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error(`❌ SettingsService.update${endpoint} failed:`, error);
      throw error;
    }
  }

  protected async resetSettings(
    section: string
  ): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.resetSettings called for section:', section);
    try {
      const response = await apiClient.post<void>(`${this.baseUrl}/${section}/reset`, {});
      console.log('✅ SettingsService.resetSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.resetSettings failed:', error);
      throw error;
    }
  }

  protected async testConnection<T>(
    endpoint: string, 
    payload = {}
  ): Promise<{ success: boolean; data: T }> {
    console.log(`🔍 SettingsService.test${endpoint} called`);
    try {
      const response = await apiClient.post<T>(`${this.baseUrl}${endpoint}/test`, payload);
      console.log(`✅ SettingsService.test${endpoint} successful:`, response);
      return response as { success: boolean; data: T };
    } catch (error) {
      console.error(`❌ SettingsService.test${endpoint} failed:`, error);
      throw error;
    }
  }
}
