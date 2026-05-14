import { BaseService } from '../BaseService';
import { apiClient } from '../api';
import type { 
  RegionTeacherFilters, 
  ImportResult, 
  ValidationResult, 
  EnhancedImportOptions 
} from './types';
import { logger } from '@/utils/logger';

/**
 * Service for teacher data import, export, and validation
 */
export class TeacherImportService extends BaseService<any> {
  constructor() {
    super('/regionadmin/teachers');
  }


  /**
   * Download Excel import template
   */
  async downloadImportTemplate(): Promise<Blob> {
    try {
      logger.log('TeacherImportService - Downloading template', {
        component: 'TeacherImportService',
        action: 'downloadImportTemplate'
      });
      
      const response = await apiClient.get<Blob>(`${this.baseEndpoint}/import-template`, undefined, {
        responseType: 'blob'
      });

      if (!response || !response.data) {
        throw new Error('Şablon faylı yüklənə bilmədi');
      }

      return response.data;
    } catch (error: any) {
      logger.error('TeacherImportService - downloadImportTemplate error:', error);
      throw new Error(`Şablon yükləmə xətası: ${error.message}`);
    }
  }

  /**
   * Pre-validate import file
   */
  async validateImportFile(file: File): Promise<ValidationResult> {
    try {
      logger.log('TeacherImportService - Pre-validating file', { 
        component: 'TeacherImportService',
        action: 'validateImportFile',
        data: { fileName: file.name }
      });
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<ValidationResult>(`${this.baseEndpoint}/import/validate`, formData);

      if (!response.success) {
        throw new Error(response.message || 'Faylın doğrulanması mümkün olmadı');
      }

      return (response as any);
    } catch (error: any) {
      logger.error('TeacherImportService - validateImportFile error:', error);
      throw new Error(`Doğrulama xətası: ${error.message}`);
    }
  }

  /**
   * Export validation errors to Excel
   */
  async exportValidationErrors(validationResult: ValidationResult): Promise<Blob> {
    try {
      logger.log('TeacherImportService - Exporting validation errors', {
        component: 'TeacherImportService',
        action: 'exportValidationErrors'
      });
      
      const response = await apiClient.post<Blob>(`${this.baseEndpoint}/import/export-errors`, {
        invalid_rows: validationResult.invalid_rows,
        errors: validationResult.errors,
        summary: validationResult.summary,
      }, {
        responseType: 'blob'
      });

      if (!response || !response.data) {
        throw new Error('Xəta faylı yaradıla bilmədi');
      }

      return response.data;
    } catch (error: any) {
      logger.error('TeacherImportService - exportValidationErrors error:', error);
      throw new Error(`Xəta faylı ixrac edilə bilmədi: ${error.message}`);
    }
  }

  /**
   * Unified Import Method with Progress Tracking
   */
  async importTeachers(file: File, options?: EnhancedImportOptions): Promise<ImportResult> {
    logger.log('TeacherImportService - Starting import', { 
      component: 'TeacherImportService',
      action: 'importTeachers',
      data: { fileName: file.name, strategy: options?.strategy || 'strict' }
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options?.skip_duplicates) formData.append('skip_duplicates', '1');
      if (options?.update_existing) formData.append('update_existing', '1');
      if (options?.strategy) formData.append('strategy', options.strategy);

      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';
      const fullURL = `${baseURL}/regionadmin/teachers/import`;

      return await new Promise<ImportResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (options?.onUploadProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              options.onUploadProgress?.({ loaded: e.loaded, total: e.total });
            }
          });
        }

        xhr.addEventListener('load', () => {
          try {
            const result = JSON.parse(xhr.response);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                success: result.success || false,
                imported: result.success_count || result.imported || 0,
                errors: result.error_count || result.errors || 0,
                details: result.details || { success: [], errors: [] },
              });
            } else {
              reject(new Error(result.message || `İdxal xətası (${xhr.status})` ));
            }
          } catch (e) {
            reject(new Error('Server cavabı emal edilə bilmədi'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Şəbəkə xətası baş verdi')));
        xhr.addEventListener('abort', () => reject(new Error('Yükləmə ləğv edildi')));

        xhr.open('POST', fullURL);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        const authHeaders = apiClient.getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(formData);
      });
    } catch (error: any) {
      logger.error('TeacherImportService - importTeachers error:', error);
      throw new Error(`İdxal xətası: ${error.message}`);
    }
  }
}

// Export singleton instance
export const teacherImportService = new TeacherImportService();

// Backward compatibility alias
export const regionAdminTeacherImportService = teacherImportService;
