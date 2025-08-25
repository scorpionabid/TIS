import { apiClient } from './api';
import { ImportResult, TemplateInfo } from './schoolAdmin';

class ImportService {
  private baseEndpoint = '/import';

  // Template methods
  async getTemplateInfo(type: 'students' | 'teachers' | 'institutions'): Promise<TemplateInfo> {
    const response = await apiClient.get<TemplateInfo>(`${this.baseEndpoint}/template`, {
      params: { type }
    });
    return response.data || response as any;
  }

  async downloadTemplate(type: 'students' | 'teachers' | 'institutions'): Promise<Blob> {
    const response = await apiClient.get(`${this.baseEndpoint}/template/download/${type}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Import methods for institutions (SuperAdmin only)
  async importInstitutions(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ImportResult>(`${this.baseEndpoint}/institutions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data || response as any;
  }

  // Generate missing UTIS codes (SuperAdmin only)
  async generateMissingUtisCode(type: 'users' | 'institutions' | 'both' = 'both'): Promise<{
    message: string;
    users_updated: number;
    institutions_updated: number;
    total_updated: number;
  }> {
    const response = await apiClient.post(`${this.baseEndpoint}/generate-utis-codes`, { type });
    return response.data || response as any;
  }

  // Export institutions (SuperAdmin only)
  async exportInstitutions(filters: {
    type?: string;
    level?: number;
    parent_id?: number;
    region_code?: string;
    is_active?: string;
    search?: string;
    format?: 'xlsx' | 'csv';
  } = {}): Promise<Blob> {
    const response = await apiClient.get(`${this.baseEndpoint}/export/institutions`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  // Get export statistics (SuperAdmin only)
  async getExportStats(filters: {
    type?: string;
    level?: number;
    parent_id?: number;
    region_code?: string;
    is_active?: string;
    search?: string;
  } = {}): Promise<{
    filters_applied: Record<string, any>;
    total_institutions: number;
    active_institutions: number;
    inactive_institutions: number;
    level_breakdown: Record<number, number>;
    type_breakdown: Record<string, number>;
    export_ready: boolean;
  }> {
    const response = await apiClient.get(`${this.baseEndpoint}/export/stats`, {
      params: filters
    });
    return response.data || response as any;
  }

  // Utility method to download file blob
  downloadFileBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Validate file before upload
  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return {
        valid: false,
        error: 'Yalnız Excel (.xlsx, .xls) və ya CSV faylları dəstəklənir'
      };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return {
        valid: false,
        error: 'Fayl ölçüsü 10MB-dan çox ola bilməz'
      };
    }

    return { valid: true };
  }

  // Format import result for display
  formatImportResult(result: ImportResult): string {
    const { success_count, errors, total_processed } = result;
    
    let message = `${success_count}/${total_processed} qeyd uğurla idxal edildi.`;
    
    if (errors.length > 0) {
      message += `\n\nXətalar (${errors.length}):\n` + errors.join('\n');
    }
    
    return message;
  }
}

export const importService = new ImportService();
export default importService;