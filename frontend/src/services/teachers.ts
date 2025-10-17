import { apiClient } from './api';
import { schoolAdminService, SchoolTeacher, ImportResult } from './schoolAdmin';

export type Teacher = SchoolTeacher;

export interface TeacherFilters {
  subject_id?: number;
  department_id?: number;
  institution_id?: number;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface TeacherExportStats {
  total_teachers: number;
  active_teachers: number;
  inactive_teachers: number;
  by_subject: Record<string, number>;
  by_institution: Record<string, number>;
  by_department: Record<string, number>;
}

export interface Department {
  id: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
}

class TeacherService {
  private baseURL = '/teachers';

  /**
   * Download teacher import template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/bulk/download-template?user_type=teachers`, {
      method: 'GET',
      headers: apiClient['getHeaders'](),
    });

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  /**
   * Import teachers from file (delegating to schoolAdminService)
   */
  async importTeachers(file: File): Promise<ImportResult> {
    return schoolAdminService.importTeachers(file);
  }

  /**
   * Export teachers with filters
   */
  async exportTeachers(filters?: any): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/users/bulk/export`, {
      method: 'POST',
      headers: apiClient['getHeaders'](),
      body: JSON.stringify({
        user_type: 'teachers',
        filters: filters || {}
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Get export statistics
   */
  async getExportStats(filters?: any): Promise<TeacherExportStats> {
    try {
      const response = await apiClient.get('/users/bulk/statistics', {
        user_type: 'teachers',
        ...filters
      });
      
      const data = response.data?.data || response.data;
      
      if (data) {
        return {
          total_teachers: data.teachers || data.total_users || 0,
          active_teachers: data.active_users || 0,
          inactive_teachers: data.inactive_users || 0,
          by_subject: data.by_subject || {},
          by_institution: data.by_institution || {},
          by_department: data.by_department || {}
        };
      }
      
      return {
        total_teachers: 0,
        active_teachers: 0,
        inactive_teachers: 0,
        by_subject: {},
        by_institution: {},
        by_department: {}
      };
    } catch (error) {
      console.error('Error fetching teacher export stats:', error);
      return {
        total_teachers: 0,
        active_teachers: 0,
        inactive_teachers: 0,
        by_subject: {},
        by_institution: {},
        by_department: {}
      };
    }
  }

  /**
   * Get available departments
   */
  async getDepartments(): Promise<Department[]> {
    try {
      const response = await apiClient.get('/departments');
      
      if (response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  /**
   * Get available subjects
   */
  async getSubjects(): Promise<Subject[]> {
    try {
      const response = await apiClient.get('/subjects');
      
      if (response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }
  }

  /**
   * Get teachers (delegating to schoolAdminService)
   */
  async getTeachers(filters?: TeacherFilters): Promise<Teacher[]> {
    return schoolAdminService.getTeachers(filters);
  }

  /**
   * Get teacher by ID (delegating to schoolAdminService)
   */
  async getTeacher(id: number): Promise<Teacher> {
    return schoolAdminService.getTeacher(id);
  }

  /**
   * Create teacher (delegating to schoolAdminService)
   */
  async createTeacher(data: Partial<Teacher>): Promise<Teacher> {
    return schoolAdminService.createTeacher(data);
  }

  /**
   * Update teacher (delegating to schoolAdminService)
   */
  async updateTeacher(id: number, data: Partial<Teacher>): Promise<Teacher> {
    return schoolAdminService.updateTeacher(id, data);
  }

  /**
   * Delete teacher (delegating to schoolAdminService)
   */
  async deleteTeacher(id: number): Promise<void> {
    return schoolAdminService.deleteTeacher(id);
  }
}

export const teacherService = new TeacherService();
