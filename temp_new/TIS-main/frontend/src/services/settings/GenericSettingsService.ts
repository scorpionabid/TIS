import { BaseSettingsService } from './BaseSettingsService';

export interface SettingsServiceConfig<T, TTestResult = any> {
  endpoint: string;
  section: string;
  mockData: T;
  hasTestConnection?: boolean;
  testPayload?: any;
}

export class GenericSettingsService<T, TTestResult = any> extends BaseSettingsService {
  private config: SettingsServiceConfig<T, TTestResult>;

  constructor(config: SettingsServiceConfig<T, TTestResult>) {
    super();
    this.config = config;
  }

  async getSettings(): Promise<{ success: boolean; data: T }> {
    return super.getSettings<T>(this.config.endpoint);
  }

  async updateSettings(data: Partial<T>): Promise<{ success: boolean; message: string }> {
    return super.updateSettings<T>(this.config.endpoint, data);
  }

  async resetSettings(): Promise<{ success: boolean; message: string }> {
    return super.resetSettings(this.config.section);
  }

  getMockSettings(): T {
    return this.config.mockData;
  }

  async testConnection(): Promise<{ success: boolean; data: TTestResult }> {
    if (!this.config.hasTestConnection) {
      throw new Error('Test connection not available for this settings service');
    }
    return super.testConnection<TTestResult>(this.config.endpoint, this.config.testPayload);
  }
}

// Factory function to create settings services
export function createSettingsService<T, TTestResult = any>(
  config: SettingsServiceConfig<T, TTestResult>
) {
  return new GenericSettingsService<T, TTestResult>(config);
}