import { createSettingsService } from './GenericSettingsService';
import type { SecuritySettings } from './types';

// Mock data
const mockSecuritySettings: SecuritySettings = {
  id: 1,
  session_timeout: 120,
  max_login_attempts: 5,
  lockout_duration: 30,
  password_min_length: 8,
  password_max_length: 128,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_symbols: false,
  password_history_limit: 5,
  two_factor_enabled: false,
  two_factor_required_roles: [],
  ip_whitelist_enabled: false,
  allowed_ips: [],
  rate_limiting_enabled: true,
  api_rate_limit: 60,
  brute_force_protection: true,
  csrf_protection: true,
  secure_cookies: true,
  same_site_cookies: 'lax',
  content_security_policy: "default-src 'self'",
  encryption_algorithm: 'AES-256',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString()
};

// Create security settings service using generic factory
export const securitySettingsService = createSettingsService<SecuritySettings>({
  endpoint: '/security',
  section: 'security',
  mockData: mockSecuritySettings,
  hasTestConnection: false
});

// Export class for backward compatibility
export class SecuritySettingsService {
  getSettings = () => securitySettingsService.getSettings();
  updateSettings = (data: any) => securitySettingsService.updateSettings(data);
  resetSettings = () => securitySettingsService.resetSettings();
  getMockSettings = () => securitySettingsService.getMockSettings();
}

export { SecuritySettings };