import { apiClient } from '../api';
import { SchoolTeacher } from '../schoolAdmin';
import { PaginationParams } from '../BaseService';
import { handleApiResponse, handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Teacher Management Service for SuperAdmin
 * Handles all teacher-related operations including analytics
 */
class TeacherManagementService {
  async getTeachers(params?: PaginationParams): Promise<SchoolTeacher[]> {
    try {
      logger.debug('SuperAdmin fetching teachers', {
        component: 'TeacherManagementService',
        action: 'getTeachers',
        data: { params }
      });

      const endpoint = '/teachers';
      const response = await apiClient.get<SchoolTeacher[]>(endpoint, params);
      return handleArrayResponse<SchoolTeacher>(response, 'TeacherManagementService.getTeachers');

    } catch (error) {
      logger.error('Failed to fetch teachers as SuperAdmin', error);
      throw error;
    }
  }

  async getTeacher(teacherId: number): Promise<SchoolTeacher> {
    try {
      const response = await apiClient.get<SchoolTeacher>(`/teachers/${teacherId}`);
      return handleApiResponseWithError<SchoolTeacher>(response, `TeacherManagementService.getTeacher(${teacherId})`, 'TeacherManagementService');
    } catch (error) {
      logger.error(`Failed to fetch teacher ${teacherId}`, error);
      throw error;
    }
  }

  async createTeacher(data: any): Promise<SchoolTeacher> {
    try {
      const response = await apiClient.post<SchoolTeacher>('/teachers', data);
      return handleApiResponseWithError<SchoolTeacher>(response, 'TeacherManagementService.createTeacher', 'TeacherManagementService');
    } catch (error) {
      logger.error('Failed to create teacher as SuperAdmin', error);
      throw error;
    }
  }

  async updateTeacher(teacherId: number, data: any): Promise<SchoolTeacher> {
    try {
      const response = await apiClient.put<SchoolTeacher>(`/teachers/${teacherId}`, data);
      return handleApiResponseWithError<SchoolTeacher>(response, `TeacherManagementService.updateTeacher(${teacherId})`, 'TeacherManagementService');
    } catch (error) {
      logger.error(`Failed to update teacher ${teacherId}`, error);
      throw error;
    }
  }

  async deleteTeacher(teacherId: number): Promise<void> {
    try {
      await apiClient.delete(`/teachers/${teacherId}`);
      logger.info(`Successfully deleted teacher ${teacherId}`, {
        component: 'TeacherManagementService',
        action: 'deleteTeacher'
      });
    } catch (error) {
      logger.error(`Failed to delete teacher ${teacherId}`, error);
      throw error;
    }
  }

  async assignTeacherToClasses(teacherId: number, classIds: number[]): Promise<SchoolTeacher> {
    try {
      logger.debug('SuperAdmin assigning teacher to classes', {
        component: 'TeacherManagementService',
        action: 'assignTeacherToClasses',
        data: { teacherId, classIds }
      });

      const response = await apiClient.post<SchoolTeacher>(`/teachers/${teacherId}/assign-classes`, { class_ids: classIds });
      return handleApiResponseWithError<SchoolTeacher>(response, `TeacherManagementService.assignTeacherToClasses(${teacherId})`, 'TeacherManagementService');
    } catch (error) {
      logger.error(`Failed to assign teacher ${teacherId} to classes`, error);
      throw error;
    }
  }

  async getTeacherPerformance(teacherId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching teacher performance', {
        component: 'TeacherManagementService',
        action: 'getTeacherPerformance',
        data: { teacherId }
      });

      const response = await apiClient.get(`/teachers/${teacherId}/performance`);
      return handleApiResponse(response, `TeacherManagementService.getTeacherPerformance(${teacherId})`);
    } catch (error) {
      logger.error(`Failed to fetch teacher ${teacherId} performance`, error);
      throw error;
    }
  }

  async bulkCreateTeachers(teachers: any[]): Promise<any> {
    try {
      logger.debug('SuperAdmin bulk creating teachers', {
        component: 'TeacherManagementService',
        action: 'bulkCreateTeachers',
        data: { count: teachers.length }
      });

      const response = await apiClient.post('/teachers/bulk-create', { teachers });
      return handleApiResponse(response, 'TeacherManagementService.bulkCreateTeachers');
    } catch (error) {
      logger.error('Failed to bulk create teachers', error);
      throw error;
    }
  }

  async getTeachersAnalytics(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching teachers analytics', {
        component: 'TeacherManagementService',
        action: 'getTeachersAnalytics'
      });

      const response = await apiClient.get('/teachers/analytics/overview');
      return handleApiResponse(response, 'TeacherManagementService.getTeachersAnalytics');
    } catch (error) {
      logger.error('Failed to fetch teachers analytics', error);
      throw error;
    }
  }
}

export const teacherManagementService = new TeacherManagementService();
export { TeacherManagementService };
