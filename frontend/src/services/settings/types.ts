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
  driver: 'postgresql';
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
