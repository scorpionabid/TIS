import { BaseService } from './BaseService';

export interface SystemSettings {
  id: number;
  app_name: string;
  app_url: string;
  app_version: string;
  timezone: string;
  language: string;
  date_format: string;
  time_format: string;
  currency: string;
  debug_mode: boolean;
  maintenance_mode: boolean;
  auto_backup: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_retention_days: number;
  system_monitoring: boolean;
  performance_tracking: boolean;
  error_logging: boolean;
  audit_logging: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSettings {
  id: number;
  driver: 'mysql' | 'postgresql' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  charset: string;
  collation: string;
  prefix: string;
  pool_min: number;
  pool_max: number;
  connection_timeout: number;
  query_timeout: number;
  ssl_enabled: boolean;
  ssl_cert_path?: string;
  backup_enabled: boolean;
  backup_schedule: string;
  connection_status: 'connected' | 'disconnected' | 'error';
  last_connection_test: string;
  created_at: string;
  updated_at: string;
}

export interface MailSettings {
  id: number;
  driver: 'smtp' | 'mailgun' | 'sendgrid' | 'ses';
  host: string;
  port: number;
  username: string;
  encryption: 'tls' | 'ssl' | 'none';
  from_address: string;
  from_name: string;
  reply_to?: string;
  timeout: number;
  local_domain?: string;
  verify_peer: boolean;
  verify_peer_name: boolean;
  allow_self_signed: boolean;
  email_notifications_enabled: boolean;
  daily_email_limit: number;
  rate_limit_per_minute: number;
  bounce_handling: boolean;
  complaint_handling: boolean;
  test_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecuritySettings {
  id: number;
  session_timeout: number; // in minutes
  max_login_attempts: number;
  lockout_duration: number; // in minutes
  password_min_length: number;
  password_max_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  password_history_limit: number;
  password_expiry_days?: number;
  two_factor_enabled: boolean;
  two_factor_required_roles: string[];
  ip_whitelist_enabled: boolean;
  allowed_ips: string[];
  rate_limiting_enabled: boolean;
  api_rate_limit: number;
  brute_force_protection: boolean;
  csrf_protection: boolean;
  secure_cookies: boolean;
  same_site_cookies: 'strict' | 'lax' | 'none';
  content_security_policy: string;
  encryption_algorithm: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  system_alerts: boolean;
  survey_notifications: boolean;
  task_notifications: boolean;
  approval_notifications: boolean;
  document_notifications: boolean;
  performance_alerts: boolean;
  security_alerts: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  notification_time: string; // HH:mm format
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
  digest_day_of_week?: number; // 0-6, Sunday = 0
  digest_time: string;
  quiet_hours_enabled: boolean;
  quiet_start_time?: string;
  quiet_end_time?: string;
  emergency_override: boolean;
  notification_retention_days: number;
  unsubscribe_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SettingsUpdateData {
  general?: Partial<Pick<SystemSettings, 
    'app_name' | 'app_url' | 'timezone' | 'language' | 'debug_mode' | 
    'auto_backup' | 'system_monitoring' | 'maintenance_mode'
  >>;
  database?: Partial<Pick<DatabaseSettings, 
    'host' | 'port' | 'database' | 'username' | 'pool_min' | 'pool_max' | 
    'connection_timeout' | 'ssl_enabled' | 'backup_enabled'
  >>;
  mail?: Partial<Pick<MailSettings, 
    'host' | 'port' | 'username' | 'from_address' | 'from_name' | 
    'email_notifications_enabled' | 'daily_email_limit'
  >>;
  security?: Partial<Pick<SecuritySettings, 
    'session_timeout' | 'max_login_attempts' | 'lockout_duration' | 
    'password_min_length' | 'two_factor_enabled' | 'ip_whitelist_enabled'
  >>;
  notifications?: Partial<Pick<NotificationSettings, 
    'email_notifications' | 'system_alerts' | 'survey_notifications' | 
    'task_notifications' | 'performance_alerts' | 'notification_frequency' | 'notification_time'
  >>;
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    response_time: number;
    connections: {
      active: number;
      idle: number;
      max: number;
    };
    disk_usage: {
      used_gb: number;
      total_gb: number;
      percentage: number;
    };
  };
  cache: {
    status: 'healthy' | 'warning' | 'critical';
    hit_rate: number;
    memory_usage: {
      used_mb: number;
      total_mb: number;
      percentage: number;
    };
  };
  mail: {
    status: 'healthy' | 'warning' | 'critical';
    queue_size: number;
    failed_jobs: number;
    last_successful_send?: string;
  };
  storage: {
    status: 'healthy' | 'warning' | 'critical';
    disk_usage: {
      used_gb: number;
      total_gb: number;
      percentage: number;
    };
    backup_status: 'current' | 'outdated' | 'failed';
    last_backup?: string;
  };
  performance: {
    avg_response_time: number;
    memory_usage_percentage: number;
    cpu_usage_percentage: number;
    uptime_hours: number;
  };
}

export interface BackupConfiguration {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retention_days: number;
  include_files: boolean;
  include_database: boolean;
  compression: boolean;
  encryption: boolean;
  storage_location: 'local' | 's3' | 'ftp';
  storage_config: Record<string, any>;
}

class SettingsService extends BaseService {
  constructor() {
    super('/settings');
  }

  async getSystemSettings(): Promise<{ success: boolean; data: SystemSettings }> {
    console.log('🔍 SettingsService.getSystemSettings called');
    try {
      const response = await this.get<SystemSettings>(`${this.baseUrl}/general`);
      console.log('✅ SettingsService.getSystemSettings successful:', response);
      return response as { success: boolean; data: SystemSettings };
    } catch (error) {
      console.error('❌ SettingsService.getSystemSettings failed:', error);
      throw error;
    }
  }

  async getDatabaseSettings(): Promise<{ success: boolean; data: DatabaseSettings }> {
    console.log('🔍 SettingsService.getDatabaseSettings called');
    try {
      const response = await this.get<DatabaseSettings>(`${this.baseUrl}/database`);
      console.log('✅ SettingsService.getDatabaseSettings successful:', response);
      return response as { success: boolean; data: DatabaseSettings };
    } catch (error) {
      console.error('❌ SettingsService.getDatabaseSettings failed:', error);
      throw error;
    }
  }

  async getMailSettings(): Promise<{ success: boolean; data: MailSettings }> {
    console.log('🔍 SettingsService.getMailSettings called');
    try {
      const response = await this.get<MailSettings>(`${this.baseUrl}/mail`);
      console.log('✅ SettingsService.getMailSettings successful:', response);
      return response as { success: boolean; data: MailSettings };
    } catch (error) {
      console.error('❌ SettingsService.getMailSettings failed:', error);
      throw error;
    }
  }

  async getSecuritySettings(): Promise<{ success: boolean; data: SecuritySettings }> {
    console.log('🔍 SettingsService.getSecuritySettings called');
    try {
      const response = await this.get<SecuritySettings>(`${this.baseUrl}/security`);
      console.log('✅ SettingsService.getSecuritySettings successful:', response);
      return response as { success: boolean; data: SecuritySettings };
    } catch (error) {
      console.error('❌ SettingsService.getSecuritySettings failed:', error);
      throw error;
    }
  }

  async getNotificationSettings(): Promise<{ success: boolean; data: NotificationSettings }> {
    console.log('🔍 SettingsService.getNotificationSettings called');
    try {
      const response = await this.get<NotificationSettings>(`${this.baseUrl}/notifications`);
      console.log('✅ SettingsService.getNotificationSettings successful:', response);
      return response as { success: boolean; data: NotificationSettings };
    } catch (error) {
      console.error('❌ SettingsService.getNotificationSettings failed:', error);
      throw error;
    }
  }

  async updateSettings(data: SettingsUpdateData): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.updateSettings called with:', data);
    try {
      const response = await this.put<void>(this.baseUrl, data);
      console.log('✅ SettingsService.updateSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateSettings failed:', error);
      throw error;
    }
  }

  async updateSystemSettings(data: Partial<SystemSettings>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.updateSystemSettings called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/general`, data);
      console.log('✅ SettingsService.updateSystemSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateSystemSettings failed:', error);
      throw error;
    }
  }

  async updateDatabaseSettings(data: Partial<DatabaseSettings>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.updateDatabaseSettings called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/database`, data);
      console.log('✅ SettingsService.updateDatabaseSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateDatabaseSettings failed:', error);
      throw error;
    }
  }

  async updateMailSettings(data: Partial<MailSettings>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.updateMailSettings called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/mail`, data);
      console.log('✅ SettingsService.updateMailSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateMailSettings failed:', error);
      throw error;
    }
  }

  async updateSecuritySettings(data: Partial<SecuritySettings>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.updateSecuritySettings called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/security`, data);
      console.log('✅ SettingsService.updateSecuritySettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateSecuritySettings failed:', error);
      throw error;
    }
  }

  async updateNotificationSettings(data: Partial<NotificationSettings>): Promise<{ success: boolean; message: string }> {
    console.log('🔍 SettingsService.updateNotificationSettings called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/notifications`, data);
      console.log('✅ SettingsService.updateNotificationSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateNotificationSettings failed:', error);
      throw error;
    }
  }

  async testDatabaseConnection(): Promise<{ 
    success: boolean; 
    data: { 
      status: 'connected' | 'failed'; 
      response_time: number; 
      error?: string 
    } 
  }> {
    console.log('🔍 SettingsService.testDatabaseConnection called');
    try {
      const response = await this.post<{ 
        status: 'connected' | 'failed'; 
        response_time: number; 
        error?: string 
      }>(`${this.baseUrl}/database/test`, {});
      console.log('✅ SettingsService.testDatabaseConnection successful:', response);
      return response as { 
        success: boolean; 
        data: { 
          status: 'connected' | 'failed'; 
          response_time: number; 
          error?: string 
        } 
      };
    } catch (error) {
      console.error('❌ SettingsService.testDatabaseConnection failed:', error);
      throw error;
    }
  }

  async testEmailConfiguration(): Promise<{ 
    success: boolean; 
    data: { 
      status: 'sent' | 'failed'; 
      message: string;
      error?: string 
    } 
  }> {
    console.log('🔍 SettingsService.testEmailConfiguration called');
    try {
      const response = await this.post<{ 
        status: 'sent' | 'failed'; 
        message: string;
        error?: string 
      }>(`${this.baseUrl}/mail/test`, {});
      console.log('✅ SettingsService.testEmailConfiguration successful:', response);
      return response as { 
        success: boolean; 
        data: { 
          status: 'sent' | 'failed'; 
          message: string;
          error?: string 
        } 
      };
    } catch (error) {
      console.error('❌ SettingsService.testEmailConfiguration failed:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<{ success: boolean; data: SystemHealth }> {
    console.log('🔍 SettingsService.getSystemHealth called');
    try {
      const response = await this.get<SystemHealth>(`${this.baseUrl}/health`);
      console.log('✅ SettingsService.getSystemHealth successful:', response);
      return response as { success: boolean; data: SystemHealth };
    } catch (error) {
      console.error('❌ SettingsService.getSystemHealth failed:', error);
      throw error;
    }
  }

  async resetSettings(section: 'general' | 'database' | 'mail' | 'security' | 'notifications'): Promise<{ 
    success: boolean; 
    message: string 
  }> {
    console.log('🔍 SettingsService.resetSettings called for section:', section);
    try {
      const response = await this.post<void>(`${this.baseUrl}/${section}/reset`, {});
      console.log('✅ SettingsService.resetSettings successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.resetSettings failed:', error);
      throw error;
    }
  }

  async exportSettings(): Promise<{ 
    success: boolean; 
    data: { 
      download_url: string; 
      file_name: string; 
      expires_at: string 
    } 
  }> {
    console.log('🔍 SettingsService.exportSettings called');
    try {
      const response = await this.post<{ 
        download_url: string; 
        file_name: string; 
        expires_at: string 
      }>(`${this.baseUrl}/export`, {});
      console.log('✅ SettingsService.exportSettings successful:', response);
      return response as { 
        success: boolean; 
        data: { 
          download_url: string; 
          file_name: string; 
          expires_at: string 
        } 
      };
    } catch (error) {
      console.error('❌ SettingsService.exportSettings failed:', error);
      throw error;
    }
  }

  async importSettings(file: File): Promise<{ 
    success: boolean; 
    message: string;
    data: { imported_sections: string[]; warnings: string[] }
  }> {
    console.log('🔍 SettingsService.importSettings called');
    try {
      const formData = new FormData();
      formData.append('settings_file', file);
      
      const response = await this.post<{ 
        imported_sections: string[]; 
        warnings: string[] 
      }>(`${this.baseUrl}/import`, formData);
      console.log('✅ SettingsService.importSettings successful:', response);
      return response as { 
        success: boolean; 
        message: string;
        data: { imported_sections: string[]; warnings: string[] }
      };
    } catch (error) {
      console.error('❌ SettingsService.importSettings failed:', error);
      throw error;
    }
  }

  async getBackupConfiguration(): Promise<{ success: boolean; data: BackupConfiguration }> {
    console.log('🔍 SettingsService.getBackupConfiguration called');
    try {
      const response = await this.get<BackupConfiguration>(`${this.baseUrl}/backup`);
      console.log('✅ SettingsService.getBackupConfiguration successful:', response);
      return response as { success: boolean; data: BackupConfiguration };
    } catch (error) {
      console.error('❌ SettingsService.getBackupConfiguration failed:', error);
      throw error;
    }
  }

  async updateBackupConfiguration(data: Partial<BackupConfiguration>): Promise<{ 
    success: boolean; 
    message: string 
  }> {
    console.log('🔍 SettingsService.updateBackupConfiguration called');
    try {
      const response = await this.put<void>(`${this.baseUrl}/backup`, data);
      console.log('✅ SettingsService.updateBackupConfiguration successful:', response);
      return response as { success: boolean; message: string };
    } catch (error) {
      console.error('❌ SettingsService.updateBackupConfiguration failed:', error);
      throw error;
    }
  }

  async createBackup(manual = true): Promise<{ 
    success: boolean; 
    message: string;
    data: { backup_id: string; file_size: number; created_at: string }
  }> {
    console.log('🔍 SettingsService.createBackup called');
    try {
      const response = await this.post<{ 
        backup_id: string; 
        file_size: number; 
        created_at: string 
      }>(`${this.baseUrl}/backup/create`, { manual });
      console.log('✅ SettingsService.createBackup successful:', response);
      return response as { 
        success: boolean; 
        message: string;
        data: { backup_id: string; file_size: number; created_at: string }
      };
    } catch (error) {
      console.error('❌ SettingsService.createBackup failed:', error);
      throw error;
    }
  }

  // Mock data for development/fallback
  getMockSystemSettings(): SystemSettings {
    return {
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
  }

  getMockDatabaseSettings(): DatabaseSettings {
    return {
      id: 1,
      driver: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'atis_db',
      username: 'atis_user',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      prefix: '',
      pool_min: 0,
      pool_max: 10,
      connection_timeout: 30,
      query_timeout: 60,
      ssl_enabled: false,
      backup_enabled: true,
      backup_schedule: '0 2 * * *',
      connection_status: 'connected',
      last_connection_test: new Date().toISOString(),
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString()
    };
  }

  getMockMailSettings(): MailSettings {
    return {
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
  }

  getMockSecuritySettings(): SecuritySettings {
    return {
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
  }

  getMockNotificationSettings(): NotificationSettings {
    return {
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
  }

  getMockSystemHealth(): SystemHealth {
    return {
      database: {
        status: 'healthy',
        response_time: 12.5,
        connections: {
          active: 5,
          idle: 3,
          max: 10
        },
        disk_usage: {
          used_gb: 2.3,
          total_gb: 50,
          percentage: 4.6
        }
      },
      cache: {
        status: 'healthy',
        hit_rate: 94.2,
        memory_usage: {
          used_mb: 128,
          total_mb: 512,
          percentage: 25
        }
      },
      mail: {
        status: 'healthy',
        queue_size: 0,
        failed_jobs: 0,
        last_successful_send: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      storage: {
        status: 'healthy',
        disk_usage: {
          used_gb: 15.7,
          total_gb: 100,
          percentage: 15.7
        },
        backup_status: 'current',
        last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      performance: {
        avg_response_time: 89.3,
        memory_usage_percentage: 65.8,
        cpu_usage_percentage: 23.4,
        uptime_hours: 720.5
      }
    };
  }
}

export const settingsService = new SettingsService();