/**
 * RegionAdmin Teacher Management Service
 * Handles teacher operations across multiple institutions (sectors/schools)
 */

import { BaseService } from './BaseService';
import { apiClient } from './api';
import type { PaginationParams, PaginationMeta } from '../types/api';
import type { EnhancedTeacherProfile } from '../types/teacher';

// Filter interfaces
export interface RegionTeacherFilters extends PaginationParams {
  sector_ids?: number[];
  school_ids?: number[];
  department_id?: number;
  position_type?: string;
  employment_status?: string;
  is_active?: boolean;
  search?: string;
  sort_by?: 'name' | 'email' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// Statistics interface
export interface RegionTeacherStatistics {
  total_teachers: number;
  active_teachers: number;
  inactive_teachers: number;
  by_position: Record<string, number>;
  by_employment_status: Record<string, number>;
  by_institution: Record<string, number>;
}

// Result interface
export interface RegionTeacherResult {
  data: EnhancedTeacherProfile[];
  pagination: PaginationMeta;
  statistics: RegionTeacherStatistics;
}

// Institution interface (simplified)
export interface Institution {
  id: number;
  name: string;
  level: number;
  parent_id?: number;
}

// Bulk operation response
export interface BulkOperationResponse {
  success: boolean;
  message: string;
  updated_count?: number;
  deleted_count?: number;
}

export interface RegionTeacherCreateInput {
  email: string;
  first_name: string;
  last_name: string;
  institution_id: number;
  phone?: string;
  position_type?: string;
  employment_status?: string;
  password?: string;
}

export interface RegionTeacherUpdateInput extends Partial<RegionTeacherCreateInput> {
  is_active?: boolean;
}

class RegionAdminTeacherService extends BaseService {
  constructor() {
    super('/regionadmin/teachers');
  }
  /**
   * Get all teachers in region with filters and statistics
   */
  async getTeachers(filters: RegionTeacherFilters): Promise<RegionTeacherResult> {
    try {
      console.log('🌐 RegionAdminTeacherService - API call starting', {
        url: this.baseUrl,
        filters: filters,
      });

      const response = await apiClient.get(this.baseUrl, {
        params: filters,
      });

      console.log('📡 RegionAdminTeacherService - API response received:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataLength: response.data?.length,
        hasPagination: !!response.pagination,
        hasStatistics: !!response.statistics,
        rawResponse: response,
      });

      if (!response.success) {
        console.error('❌ API returned success: false', response);
        throw new Error(response.message || 'Failed to fetch teachers');
      }

      const result = {
        data: response.data,
        pagination: response.pagination,
        statistics: response.statistics,
      };

      console.log('✅ RegionAdminTeacherService - Returning result:', {
        dataCount: result.data?.length,
        firstTeacher: result.data?.[0],
      });

      return result;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - getTeachers error:', error);
      throw error;
    }
  }

  /**
   * Bulk update teacher status (activate/deactivate)
   */
  async bulkUpdateStatus(
    teacherIds: number[],
    isActive: boolean
  ): Promise<BulkOperationResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk-update-status`, {
        teacher_ids: teacherIds,
        is_active: isActive,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update status');
      }

      return response;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - bulkUpdateStatus error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete teachers
   */
  async bulkDelete(teacherIds: number[]): Promise<BulkOperationResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk-delete`, {
        teacher_ids: teacherIds,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete teachers');
      }

      return response;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - bulkDelete error:', error);
      throw error;
    }
  }

  /**
   * Export teachers to Excel (Optimized for large datasets)
   * Supports 10000+ teachers with streaming response
   */
  async exportTeachers(filters: RegionTeacherFilters): Promise<Blob> {
    console.log('🎯 Starting teacher export', { filters });

    try {
      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';
      const fullURL = `${baseURL}/regionadmin/teachers/export`;

      console.log('🌐 Export request:', {
        url: fullURL,
        filters,
        hasAuthHeader: !!apiClient.getAuthorizationHeader()
      });

      // Use fetch for blob response (better for large files)
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'X-Requested-With': 'XMLHttpRequest',
          ...apiClient.getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ filters }),
      });

      console.log('📥 Export response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Export error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });

        // Try to parse JSON error
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || errorText;

          if (errorJson.errors) {
            console.error('🔍 Validation errors:', errorJson.errors);
          }
        } catch (e) {
          // Not JSON, use as-is
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('İcazə yoxdur. Zəhmət olmasa yenidən daxil olun.');
        }

        throw new Error(`Export uğursuz oldu (${response.status}): ${errorDetails}`);
      }

      const blob = await response.blob();
      console.log('📦 Export blob received:', {
        size: blob.size,
        type: blob.type,
        sizeMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB'
      });

      return blob;
    } catch (error: any) {
      console.error('💥 Export error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Export xətası: ${error.message}`);
    }
  }

  /**
   * Get sectors for the region
   */
  async getSectors(): Promise<Institution[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/sectors`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch sectors');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - getSectors error:', error);
      throw error;
    }
  }

  /**
   * Get schools for selected sectors or entire region
   */
  async getSchools(sectorIds?: number[]): Promise<Institution[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/schools`, {
        params: sectorIds && sectorIds.length > 0 ? { sector_ids: sectorIds } : {},
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch schools');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - getSchools error:', error);
      throw error;
    }
  }

  /**
   * Get single teacher details
   */
  async getTeacher(id: number): Promise<EnhancedTeacherProfile> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch teacher');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - getTeacher error:', error);
      throw error;
    }
  }

  /**
   * Create new teacher
   */
  async createTeacher(data: RegionTeacherCreateInput): Promise<EnhancedTeacherProfile> {
    try {
      const response = await apiClient.post(this.baseUrl, data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to create teacher');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - createTeacher error:', error);
      throw error;
    }
  }

  /**
   * Update teacher
   */
  async updateTeacher(id: number, data: RegionTeacherUpdateInput): Promise<EnhancedTeacherProfile> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${id}`, data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update teacher');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - updateTeacher error:', error);
      throw error;
    }
  }

  /**
   * Soft delete teacher
   */
  async softDeleteTeacher(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${id}/soft`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete teacher');
      }
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - softDeleteTeacher error:', error);
      throw error;
    }
  }

  /**
   * Hard delete teacher
   */
  async hardDeleteTeacher(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${id}/hard`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to hard delete teacher');
      }
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - hardDeleteTeacher error:', error);
      throw error;
    }
  }

  /**
   * Import teachers from Excel file (Enhanced with detailed error reporting)
   */
  async importTeachers(
    file: File,
    options?: {
      skip_duplicates?: boolean;
      update_existing?: boolean;
      onUploadProgress?: (progress: { loaded: number; total: number }) => void;
    }
  ): Promise<ImportResult> {
    console.log('🎯 Starting teacher import', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      options
    });

    try {
      // Validate file
      if (!file) {
        throw new Error('Fayl seçilməyib');
      }

      // Check file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Yalnız Excel faylları (.xlsx, .xls) yüklənə bilər');
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Fayl ölçüsü 10MB-dan çox ola bilməz');
      }

      // Prepare FormData
      const formData = new FormData();
      formData.append('file', file);

      if (options?.skip_duplicates) {
        formData.append('skip_duplicates', '1');
      }
      if (options?.update_existing) {
        formData.append('update_existing', '1');
      }

      console.log('📤 FormData prepared:', {
        fileName: file.name,
        skipDuplicates: options?.skip_duplicates,
        updateExisting: options?.update_existing
      });

      // Get baseURL from apiClient
      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';
      const fullURL = `${baseURL}/regionadmin/teachers/import`;

      // Use XMLHttpRequest for progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Upload progress tracking
        if (options?.onUploadProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              options.onUploadProgress?.({
                loaded: e.loaded,
                total: e.total,
              });
            }
          });
        }

        // Load complete
        xhr.addEventListener('load', () => {
          resolve(new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((acc, line) => {
              const [key, value] = line.split(': ');
              if (key && value) acc[key] = value;
              return acc;
            }, {} as Record<string, string>)),
          }));
        });

        // Error handling
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        // Open and send
        xhr.open('POST', fullURL);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        // Set auth headers
        const authHeaders = apiClient.getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(formData);
      });

      console.log('📥 Import response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        ok: response.ok
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Import failed:', {
          status: response.status,
          result
        });

        // Handle different error types
        if (response.status === 422) {
          // Validation errors
          const errorMessage = result.errors ? result.errors.join(', ') : result.message;
          throw new Error(errorMessage || 'Doğrulama xətası');
        } else if (response.status === 404) {
          throw new Error(result.message || 'API endpoint tapılmadı');
        } else if (response.status === 400) {
          throw new Error(result.message || 'Fayl məlumatları düzgün deyil');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('İcazə yoxdur. Zəhmət olmasa yenidən daxil olun.');
        } else {
          throw new Error(result.message || 'İdxal xətası baş verdi');
        }
      }

      console.log('✅ Import successful:', result);

      return {
        success: result.success || false,
        imported: result.success_count || result.imported || 0,
        errors: result.error_count || result.errors || 0,
        details: result.details || { success: [], errors: [] },
      };
    } catch (error: any) {
      console.error('💥 Import error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`İdxal xətası: ${error.message}`);
    }
  }

  /**
   * Download Excel import template
   * Using same working pattern as institutions.ts
   */
  async downloadImportTemplate(): Promise<Blob> {
    console.log('🎯 Starting template download for RegionAdmin teachers');

    try {
      const baseURL = (apiClient as any).baseURL || 'http://localhost:8000/api';
      const fullURL = `${baseURL}/regionadmin/teachers/import-template`;

      console.log('🌐 Request details:', {
        baseURL,
        fullURL,
        hasAuthHeader: !!apiClient.getAuthorizationHeader()
      });

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Requested-With': 'XMLHttpRequest',
        ...apiClient.getAuthHeaders(),
      };

      console.log('📋 Request headers:', headers);

      const response = await fetch(fullURL, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      console.log('📥 Template download response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        url: response.url,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Template download error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Try to parse JSON error response
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || errorText;

          // Log detailed validation errors if available
          if (errorJson.errors) {
            console.error('🔍 Validation errors:', errorJson.errors);
          }
        } catch (e) {
          // Not JSON, use as-is
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('İcazə yoxdur. Zəhmət olmasa yenidən daxil olun.');
        }

        throw new Error(`Template download failed (${response.status}): ${errorDetails}`);
      }

      const blob = await response.blob();
      console.log('📦 Template blob received:', {
        size: blob.size,
        type: blob.type
      });

      return blob;
    } catch (error: any) {
      console.error('💥 Template download error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      throw new Error(`Template download failed: ${error.message}`);
    }
  }
}

// Import result interface
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: number;
  details: {
    success: string[];
    errors: string[];
  };
}

// Export singleton instance
export const regionAdminTeacherService = new RegionAdminTeacherService();
