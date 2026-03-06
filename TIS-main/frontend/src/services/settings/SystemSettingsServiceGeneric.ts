import { createSettingsService } from './GenericSettingsService';
import type { SystemSettings } from './types';

// Mock data
const mockSystemSettings: SystemSettings = {
  id: 1,
  app_name: 'ATİS - Təhsil İdarəetmə Sistemi',
  app_url: 'https://atis.edu.az',
  app_version: '1.0.0',
  timezone: 'Asia/Baku',
  language: 'az',
  date_format: 'DD.MM.YYYY',
  time_format: '24',
  currency: 'AZN',
  debug_mode: false,
  maintenance_mode: false,
  auto_backup: true,
  backup_frequency: 'daily',
  backup_retention_days: 30,
  system_monitoring: true,
  performance_tracking: true,
  error_logging: true,
  audit_logging: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString()
};

// Create system settings service using generic factory
export const systemSettingsService = createSettingsService<SystemSettings>({
  endpoint: '/general',
  section: 'general',
  mockData: mockSystemSettings,
  hasTestConnection: false
});

// Export class for backward compatibility
export class SystemSettingsService {
  getSettings = () => systemSettingsService.getSettings();
  updateSettings = (data: any) => systemSettingsService.updateSettings(data);
  resetSettings = () => systemSettingsService.resetSettings();
  getMockSettings = () => systemSettingsService.getMockSettings();
}

export { SystemSettings };