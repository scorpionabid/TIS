import { apiClient } from './api';
import { schoolAdminService, SchoolTeacher, ImportResult } from './schoolAdmin';
import { TeacherWorkplace, WorkplaceFormData } from '@/types/teacher';

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

export interface TeacherSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  grade_levels: number[];
  specialization_level: string;
  is_primary_subject: boolean;
  max_hours_per_week: number;
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

  /**
   * Get teacher's assigned subjects with details
   */
  async getTeacherSubjects(teacherId: number): Promise<TeacherSubject[]> {
    try {
      const response = await apiClient.get(`/teaching-loads/teacher/${teacherId}/subjects`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('❌ TeacherService.getTeacherSubjects failed:', error);
      // Return empty array if teacher has no subjects
      return [];
    }
  }

  /**
   * Get all school teachers (delegating to schoolAdminService)
   */
  async getSchoolTeachers(): Promise<Teacher[]> {
    try {
      const teachers = await schoolAdminService.getTeachers();
      return teachers;
    } catch (error) {
      console.error('❌ TeacherService.getSchoolTeachers failed:', error);
      throw error;
    }
  }

  // ==================== WORKPLACE MANAGEMENT ====================

  /**
   * Get all workplaces for a teacher
   */
  async getTeacherWorkplaces(teacherId: number): Promise<TeacherWorkplace[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${teacherId}/workplaces`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching teacher workplaces:', error);
      throw error;
    }
  }

  /**
   * Get a specific workplace
   */
  async getWorkplace(workplaceId: number): Promise<TeacherWorkplace> {
    try {
      const response = await apiClient.get(`/teacher-workplaces/${workplaceId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching workplace:', error);
      throw error;
    }
  }

  /**
   * Create a new workplace for a teacher
   */
  async createWorkplace(teacherId: number, data: WorkplaceFormData): Promise<TeacherWorkplace> {
    try {
      const response = await apiClient.post(`${this.baseURL}/${teacherId}/workplaces`, data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating workplace:', error);
      throw error;
    }
  }

  /**
   * Update a workplace
   */
  async updateWorkplace(workplaceId: number, data: Partial<WorkplaceFormData>): Promise<TeacherWorkplace> {
    try {
      const response = await apiClient.put(`/teacher-workplaces/${workplaceId}`, data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating workplace:', error);
      throw error;
    }
  }

  /**
   * Delete a workplace
   */
  async deleteWorkplace(workplaceId: number): Promise<void> {
    try {
      await apiClient.delete(`/teacher-workplaces/${workplaceId}`);
    } catch (error) {
      console.error('Error deleting workplace:', error);
      throw error;
    }
  }

  /**
   * Activate a workplace
   */
  async activateWorkplace(workplaceId: number): Promise<void> {
    try {
      await apiClient.post(`/teacher-workplaces/${workplaceId}/activate`);
    } catch (error) {
      console.error('Error activating workplace:', error);
      throw error;
    }
  }

  /**
   * Deactivate a workplace
   */
  async deactivateWorkplace(workplaceId: number): Promise<void> {
    try {
      await apiClient.post(`/teacher-workplaces/${workplaceId}/deactivate`);
    } catch (error) {
      console.error('Error deactivating workplace:', error);
      throw error;
    }
  }
}

export const teacherService = new TeacherService();
