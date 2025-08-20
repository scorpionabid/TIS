import { createSettingsService } from './GenericSettingsService';
import type { MailSettings } from './types';

// Test result type
export interface EmailTestResult {
  status: 'sent' | 'failed';
  message: string;
  error?: string;
}

// Mock data
const mockMailSettings: MailSettings = {
  id: 1,
  driver: 'smtp',
  host: 'smtp.gmail.com',
  port: 587,
  username: 'noreply@atis.edu.az',
  encryption: 'tls',
  from_address: 'noreply@atis.edu.az',
  from_name: 'ATİS Sistemi',
  timeout: 60,
  verify_peer: true,
  verify_peer_name: true,
  allow_self_signed: false,
  email_notifications_enabled: true,
  daily_email_limit: 1000,
  rate_limit_per_minute: 10,
  bounce_handling: false,
  complaint_handling: false,
  test_mode: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString()
};

// Create mail settings service using generic factory
export const mailSettingsService = createSettingsService<MailSettings, EmailTestResult>({
  endpoint: '/mail',
  section: 'mail',
  mockData: mockMailSettings,
  hasTestConnection: true,
  testPayload: {}
});

// Export class for backward compatibility
export class MailSettingsService {
  getSettings = () => mailSettingsService.getSettings();
  updateSettings = (data: any) => mailSettingsService.updateSettings(data);
  resetSettings = () => mailSettingsService.resetSettings();
  getMockSettings = () => mailSettingsService.getMockSettings();
  testConnection = () => mailSettingsService.testConnection();
}

export { MailSettings, EmailTestResult };