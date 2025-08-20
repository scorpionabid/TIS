import { createSettingsService } from './GenericSettingsService';
import type { NotificationSettings } from './types';

// Mock data
const mockNotificationSettings: NotificationSettings = {
  id: 1,
  email_notifications: true,
  sms_notifications: false,
  push_notifications: true,
  in_app_notifications: true,
  system_alerts: true,
  survey_notifications: true,
  task_notifications: true,
  approval_notifications: true,
  document_notifications: true,
  performance_alerts: true,
  security_alerts: true,
  notification_frequency: 'immediate',
  notification_time: '09:00',
  digest_enabled: false,
  digest_frequency: 'weekly',
  digest_time: '08:00',
  quiet_hours_enabled: false,
  emergency_override: true,
  notification_retention_days: 90,
  unsubscribe_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString()
};

// Create notification settings service using generic factory
export const notificationSettingsService = createSettingsService<NotificationSettings>({
  endpoint: '/notifications',
  section: 'notifications',
  mockData: mockNotificationSettings,
  hasTestConnection: false
});

// Export class for backward compatibility
export class NotificationSettingsService {
  getSettings = () => notificationSettingsService.getSettings();
  updateSettings = (data: any) => notificationSettingsService.updateSettings(data);
  resetSettings = () => notificationSettingsService.resetSettings();
  getMockSettings = () => notificationSettingsService.getMockSettings();
}

export { NotificationSettings };