/**
 * RegionAdmin Teacher Management Service
 * Handles teacher operations across multiple institutions (sectors/schools)
 */

import { BaseService } from './BaseService';
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

class RegionAdminTeacherService extends BaseService {
  constructor() {
    super('/regionadmin/teachers');
  }
  /**
   * Get all teachers in region with filters and statistics
   */
  async getTeachers(filters: RegionTeacherFilters): Promise<RegionTeacherResult> {
    try {
      const response = await this.apiClient.get(this.baseUrl, {
        params: filters,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch teachers');
      }

      return {
        data: response.data,
        pagination: response.pagination,
        statistics: response.statistics,
      };
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
      const response = await this.apiClient.post(`${this.baseUrl}/bulk-update-status`, {
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
      const response = await this.apiClient.post(`${this.baseUrl}/bulk-delete`, {
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
   * Export teachers to Excel/CSV
   */
  async exportTeachers(filters: RegionTeacherFilters): Promise<any[]> {
    try {
      const response = await this.apiClient.get(`${this.baseUrl}/export`, {
        params: filters,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to export teachers');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - exportTeachers error:', error);
      throw error;
    }
  }

  /**
   * Get sectors for the region
   */
  async getSectors(): Promise<Institution[]> {
    try {
      const response = await this.apiClient.get(`${this.baseUrl}/sectors`);

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
      const response = await this.apiClient.get(`${this.baseUrl}/schools`, {
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
      const response = await this.apiClient.get(`${this.baseUrl}/${id}`);

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
  async createTeacher(data: Partial<EnhancedTeacherProfile>): Promise<EnhancedTeacherProfile> {
    try {
      const response = await this.apiClient.post(this.baseUrl, data);

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
  async updateTeacher(id: number, data: Partial<EnhancedTeacherProfile>): Promise<EnhancedTeacherProfile> {
    try {
      const response = await this.apiClient.put(`${this.baseUrl}/${id}`, data);

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
      const response = await this.apiClient.delete(`${this.baseUrl}/${id}/soft`);

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
      const response = await this.apiClient.delete(`${this.baseUrl}/${id}/hard`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to hard delete teacher');
      }
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - hardDeleteTeacher error:', error);
      throw error;
    }
  }

  /**
   * Import teachers from CSV/Excel file (🔥 KEY FEATURE)
   */
  async importTeachers(
    file: File,
    options?: {
      skip_duplicates?: boolean;
      update_existing?: boolean;
    }
  ): Promise<ImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (options?.skip_duplicates) {
        formData.append('skip_duplicates', '1');
      }
      if (options?.update_existing) {
        formData.append('update_existing', '1');
      }

      const response = await this.apiClient.post(`${this.baseUrl}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to import teachers');
      }

      return {
        success: response.success,
        imported: response.imported || 0,
        errors: response.errors || 0,
        details: response.details || { success: [], errors: [] },
      };
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - importTeachers error:', error);
      throw error;
    }
  }

  /**
   * Download Excel import template
   */
  async downloadImportTemplate(): Promise<void> {
    try {
      // Get API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

      // Get token from localStorage (ATIS uses 'atis_auth_token' key)
      const token = localStorage.getItem('atis_auth_token');

      if (!token) {
        throw new Error('Authentication token tapılmadı. Zəhmət olmasa yenidən daxil olun.');
      }

      // Use fetch API directly for blob download
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/import-template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Excel template download failed:', response.status, errorText.substring(0, 200));

        if (response.status === 401 || response.status === 403) {
          throw new Error('İcazə yoxdur. Zəhmət olmasa yenidən daxil olun.');
        }

        throw new Error(`Excel şablon yüklənmədi (${response.status})`);
      }

      // Get blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'teacher_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Excel template downloaded successfully');
    } catch (error: any) {
      console.error('❌ RegionAdminTeacherService - downloadImportTemplate error:', error);
      throw error;
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
