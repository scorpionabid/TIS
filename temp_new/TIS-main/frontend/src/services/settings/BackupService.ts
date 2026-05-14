import { BaseSettingsService } from './BaseSettingsService';
import { BackupConfiguration } from './types';

export interface BackupCreateResult {
  success: boolean;
  backup_id: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

class BackupService extends BaseSettingsService {
  async getBackupConfiguration(): Promise<{ success: boolean; data: BackupConfiguration }> {
    return this.getSettings<BackupConfiguration>('/backup');
  }

  async updateBackupConfiguration(data: Partial<BackupConfiguration>): Promise<{ success: boolean; message: string }> {
    return this.updateSettings<BackupConfiguration>('/backup', data);
  }

  async createBackup(manual = true): Promise<{ success: boolean; data: BackupCreateResult }> {
    return this.testConnection<BackupCreateResult>('/backup/create', { manual });
  }

  // Mock data for development/fallback
  getMockBackupConfiguration(): BackupConfiguration {
    return {
      enabled: true,
      frequency: 'daily',
      time: '02:00',
      retention_days: 30,
      include_files: true,
      include_database: true,
      compression: true,
      encryption: false,
      storage_location: 'local',
      storage_config: {
        path: '/var/backups/atis'
      }
    };
  }
}

export const backupService = new BackupService();
export { BackupService };

// For compatibility, also export types
export type { BackupCreateResult };