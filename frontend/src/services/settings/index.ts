// Export all types
export * from './types';
export type { 
  SystemSettings, 
  DatabaseSettings, 
  MailSettings, 
  SecuritySettings, 
  NotificationSettings, 
  SystemHealth, 
  BackupConfiguration, 
  SettingsUpdateData 
} from './types';

// Export all services
export { systemSettingsService, SystemSettingsService } from './SystemSettingsService';
export { databaseSettingsService, DatabaseSettingsService } from './DatabaseSettingsService';
export { mailSettingsService, MailSettingsService } from './MailSettingsService';
export { securitySettingsService, SecuritySettingsService } from './SecuritySettingsService';
export { notificationSettingsService, NotificationSettingsService } from './NotificationSettingsService';
export { systemHealthService, SystemHealthService } from './SystemHealthService';
export { backupService, BackupService } from './BackupService';
export { settingsImportExportService, SettingsImportExportService } from './SettingsImportExportService';

// Export additional types
export type { DatabaseConnectionTestResult } from './DatabaseSettingsService';
export type { EmailTestResult } from './MailSettingsService';
export type { BackupCreateResult } from './BackupService';
export type { ExportResult, ImportResult } from './SettingsImportExportService';

// Composite service that provides a unified interface
import { systemSettingsService } from './SystemSettingsService';
import { databaseSettingsService } from './DatabaseSettingsService';
import { mailSettingsService } from './MailSettingsService';
import { securitySettingsService } from './SecuritySettingsService';
import { notificationSettingsService } from './NotificationSettingsService';
import { systemHealthService } from './SystemHealthService';
import { backupService } from './BackupService';
import { settingsImportExportService } from './SettingsImportExportService';

class SettingsService {
  // System settings
  readonly system = systemSettingsService;
  
  // Database settings
  readonly database = databaseSettingsService;
  
  // Mail settings
  readonly mail = mailSettingsService;
  
  // Security settings
  readonly security = securitySettingsService;
  
  // Notification settings
  readonly notifications = notificationSettingsService;
  
  // System health
  readonly health = systemHealthService;
  
  // Backup operations
  readonly backup = backupService;
  
  // Import/Export operations
  readonly importExport = settingsImportExportService;

  // Legacy methods for backward compatibility
  async getSystemSettings() {
    return this.system.getSettings();
  }

  async getDatabaseSettings() {
    return this.database.getSettings();
  }

  async getMailSettings() {
    return this.mail.getSettings();
  }

  async getSecuritySettings() {
    return this.security.getSettings();
  }

  async getNotificationSettings() {
    return this.notifications.getSettings();
  }

  async updateSettings(data: any) {
    return this.importExport.updateSettings(data);
  }

  async updateSystemSettings(data: any) {
    return this.system.updateSettings(data);
  }

  async updateDatabaseSettings(data: any) {
    return this.database.updateSettings(data);
  }

  async updateMailSettings(data: any) {
    return this.mail.updateSettings(data);
  }

  async updateSecuritySettings(data: any) {
    return this.security.updateSettings(data);
  }

  async updateNotificationSettings(data: any) {
    return this.notifications.updateSettings(data);
  }

  async testDatabaseConnection() {
    return this.database.testConnection();
  }

  async testEmailConfiguration() {
    return this.mail.testConnection();
  }

  async getSystemHealth() {
    return this.health.getSettings();
  }

  async resetSettings(section: string) {
    switch (section) {
      case 'general':
        return this.system.resetSettings();
      case 'database':
        return this.database.resetSettings();
      case 'mail':
        return this.mail.resetSettings();
      case 'security':
        return this.security.resetSettings();
      case 'notifications':
        return this.notifications.resetSettings();
      default:
        throw new Error(`Unknown settings section: ${section}`);
    }
  }

  async exportSettings() {
    return this.importExport.exportSettings();
  }

  async importSettings(file: File) {
    return this.importExport.importSettings(file);
  }

  async getBackupConfiguration() {
    return this.backup.getBackupConfiguration();
  }

  async updateBackupConfiguration(data: any) {
    return this.backup.updateBackupConfiguration(data);
  }

  async createBackup(manual = true) {
    return this.backup.createBackup(manual);
  }

  // Mock data methods
  getMockSystemSettings() {
    return this.system.getMockSettings();
  }

  getMockDatabaseSettings() {
    return this.database.getMockSettings();
  }

  getMockMailSettings() {
    return this.mail.getMockSettings();
  }

  getMockSecuritySettings() {
    return this.security.getMockSettings();
  }

  getMockNotificationSettings() {
    return this.notifications.getMockSettings();
  }

  getMockSystemHealth() {
    return this.health.getMockSettings();
  }
}

// Export the main service instance
export const settingsService = new SettingsService();
export { SettingsService };
