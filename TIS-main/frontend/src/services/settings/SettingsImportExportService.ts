import { BaseSettingsService } from './BaseSettingsService';

export interface ExportResult {
  success: boolean;
  file_url: string;
  file_size: number;
  export_date: string;
}

export interface ImportResult {
  success: boolean;
  imported_sections: string[];
  skipped_sections: string[];
  errors: string[];
}

class SettingsImportExportService extends BaseSettingsService {
  async exportSettings(): Promise<{ success: boolean; data: ExportResult }> {
    return this.testConnection<ExportResult>('/export');
  }

  async importSettings(file: File): Promise<{ success: boolean; data: ImportResult }> {
    const formData = new FormData();
    formData.append('settings_file', file);
    
    return this.testConnection<ImportResult>('/import', formData);
  }

  async updateSettings(data: any): Promise<{ success: boolean; message: string }> {
    return this.updateSettings('/bulk', data);
  }

  // Mock data for development/fallback
  getMockExportResult(): ExportResult {
    return {
      success: true,
      file_url: '/downloads/settings-export-2024.json',
      file_size: 15420,
      export_date: new Date().toISOString()
    };
  }

  getMockImportResult(): ImportResult {
    return {
      success: true,
      imported_sections: ['system', 'mail', 'security'],
      skipped_sections: ['database'],
      errors: []
    };
  }
}

export const settingsImportExportService = new SettingsImportExportService();
export { SettingsImportExportService };

// For compatibility, also export types
export type { ExportResult, ImportResult };