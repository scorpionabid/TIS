import { BaseService } from '../BaseService';
import { apiClient } from '../api';
import type { 
  RegionTeacherFilters, 
  RegionTeacherResult, 
  BulkOperationResponse, 
  Institution, 
  RegionTeacherCreateInput, 
  RegionTeacherUpdateInput 
} from './types';
import type { EnhancedTeacherProfile } from '../../types/teacher';
import { logger } from '@/utils/logger';

/**
 * Service for core teacher CRUD operations
 */
export class TeacherService extends BaseService<any> {
  constructor() {
    super('/regionadmin/teachers');
  }

  /**
   * Get all teachers in region with filters and statistics
   */
  async getTeachers(filters: RegionTeacherFilters): Promise<RegionTeacherResult> {
    try {
      logger.log('TeacherService - API call starting', { 
        component: 'TeacherService', 
        action: 'getTeachers', 
        data: { url: this.baseEndpoint, filters } 
      });

      const response = await apiClient.get<RegionTeacherResult>(this.baseEndpoint, filters);

      if (!response.success) {
        throw new Error(response.message || 'Müəllim siyahısını yükləmək mümkün olmadı');
      }

      return {
        data: (response as any).data,
        pagination: (response as any).pagination,
        statistics: (response as any).statistics,
      };
    } catch (error: any) {
      logger.error('TeacherService - getTeachers error:', error);
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
      const response = await apiClient.post<BulkOperationResponse>(`${this.baseEndpoint}/bulk-update-status`, {
        teacher_ids: teacherIds,
        is_active: isActive,
      });

      if (!response.success) {
        throw new Error(response.message || 'Statusu yeniləmək mümkün olmadı');
      }

      return (response as any);
    } catch (error: any) {
      logger.error('TeacherService - bulkUpdateStatus error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete teachers
   */
  async bulkDelete(teacherIds: number[]): Promise<BulkOperationResponse> {
    try {
      const response = await apiClient.post<BulkOperationResponse>(`${this.baseEndpoint}/bulk-delete`, {
        teacher_ids: teacherIds,
      });

      if (!response.success) {
        throw new Error(response.message || 'Müəllimləri silmək mümkün olmadı');
      }

      return (response as any);
    } catch (error: any) {
      logger.error('TeacherService - bulkDelete error:', error);
      throw error;
    }
  }

  /**
   * Get sectors for the region
   */
  async getSectors(): Promise<Institution[]> {
    try {
      const response = await apiClient.get<Institution[]>(`${this.baseEndpoint}/sectors`);

      if (!response.success) {
        throw new Error(response.message || 'Sektorları yükləmək mümkün olmadı');
      }

      return (response as any).data;
    } catch (error: any) {
      logger.error('TeacherService - getSectors error:', error);
      throw error;
    }
  }

  /**
   * Get schools for selected sectors or entire region
   */
  async getSchools(sectorIds?: number[]): Promise<Institution[]> {
    try {
      const response = await apiClient.get<Institution[]>(
        `${this.baseEndpoint}/schools`,
        sectorIds && sectorIds.length > 0 ? { sector_ids: sectorIds } : undefined,
      );

      if (!response.success) {
        throw new Error(response.message || 'Məktəbləri yükləmək mümkün olmadı');
      }

      return (response as any).data;
    } catch (error: any) {
      logger.error('TeacherService - getSchools error:', error);
      throw error;
    }
  }

  /**
   * Get single teacher details
   */
  async getTeacher(id: number): Promise<EnhancedTeacherProfile> {
    try {
      const response = await apiClient.get<EnhancedTeacherProfile>(`${this.baseEndpoint}/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Müəllim məlumatlarını yükləmək mümkün olmadı');
      }

      return (response as any).data;
    } catch (error: any) {
      logger.error('TeacherService - getTeacher error:', error);
      throw error;
    }
  }

  /**
   * Create new teacher
   */
  async createTeacher(data: RegionTeacherCreateInput): Promise<EnhancedTeacherProfile> {
    try {
      const response = await apiClient.post<EnhancedTeacherProfile>(this.baseEndpoint, data);

      if (!response.success) {
        throw new Error(response.message || 'Müəllim yaratmaq mümkün olmadı');
      }

      return (response as any).data;
    } catch (error: any) {
      logger.error('TeacherService - createTeacher error:', error);
      throw error;
    }
  }

  /**
   * Update teacher
   */
  async updateTeacher(id: number, data: RegionTeacherUpdateInput): Promise<EnhancedTeacherProfile> {
    try {
      const response = await apiClient.put<EnhancedTeacherProfile>(`${this.baseEndpoint}/${id}`, data);

      if (!response.success) {
        throw new Error(response.message || 'Müəllim məlumatlarını yeniləmək mümkün olmadı');
      }

      return (response as any).data;
    } catch (error: any) {
      logger.error('TeacherService - updateTeacher error:', error);
      throw error;
    }
  }

  /**
   * Soft delete teacher
   */
  async softDeleteTeacher(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.baseEndpoint}/${id}/soft`);

      if (!response.success) {
        throw new Error(response.message || 'Müəllimi silmək mümkün olmadı');
      }
    } catch (error: any) {
      logger.error('TeacherService - softDeleteTeacher error:', error);
      throw error;
    }
  }

  /**
   * Hard delete teacher
   */
  async hardDeleteTeacher(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.baseEndpoint}/${id}/hard`);

      if (!response.success) {
        throw new Error(response.message || 'Müəllimi tamamilə silmək mümkün olmadı');
      }
    } catch (error: any) {
      logger.error('TeacherService - hardDeleteTeacher error:', error);
      throw error;
    }
  }

  /**
   * Export teachers with filters
   */
  async exportTeachers(filters?: RegionTeacherFilters): Promise<Blob> {
    try {
      logger.log('TeacherService - Starting export', { 
        component: 'TeacherService',
        action: 'exportTeachers',
        data: { filters }
      });
      
      const response = await apiClient.post<Blob>(`${this.baseEndpoint}/export`, {
        filters,
      }, {
        responseType: 'blob'
      });

      if (!response || !response.data) {
        throw new Error('İxrac faylı yaradıla bilmədi');
      }

      return response.data;
    } catch (error: any) {
      logger.error('TeacherService - exportTeachers error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const regionTeacherService = new TeacherService();

// Backward compatibility alias
export const regionAdminTeacherService = regionTeacherService;
