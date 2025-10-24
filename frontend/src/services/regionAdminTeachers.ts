/**
 * RegionAdmin Teacher Management Service
 * Handles teacher operations across multiple institutions (sectors/schools)
 */

import { BaseService } from './base';
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
  /**
   * Get all teachers in region with filters and statistics
   */
  async getTeachers(filters: RegionTeacherFilters): Promise<RegionTeacherResult> {
    try {
      const response = await this.apiClient.get('/regionadmin/teachers', {
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
      const response = await this.apiClient.post('/regionadmin/teachers/bulk-update-status', {
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
      const response = await this.apiClient.post('/regionadmin/teachers/bulk-delete', {
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
      const response = await this.apiClient.get('/regionadmin/teachers/export', {
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
      const response = await this.apiClient.get('/regionadmin/teachers/sectors');

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
      const response = await this.apiClient.get('/regionadmin/teachers/schools', {
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
}

// Export singleton instance
export const regionAdminTeacherService = new RegionAdminTeacherService();
