import { apiClient } from '../api';
import { Grade } from '../grades';
import { SchoolStudent, SchoolTeacher } from '../schoolAdmin';
import { PaginationParams } from '../BaseService';
import { handleApiResponse, handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Class Management Service for SuperAdmin
 * Handles all class/grade-related operations
 */
class ClassManagementService {
  async getClasses(params?: PaginationParams): Promise<Grade[]> {
    try {
      logger.debug('SuperAdmin fetching classes', {
        component: 'ClassManagementService',
        action: 'getClasses',
        data: { params }
      });

      const endpoint = '/classes';
      const response = await apiClient.get<Grade[]>(endpoint, params);
      return handleArrayResponse<Grade>(response, 'ClassManagementService.getClasses');

    } catch (error) {
      logger.error('Failed to fetch classes as SuperAdmin', error);
      throw error;
    }
  }

  async getClass(classId: number): Promise<Grade> {
    try {
      const response = await apiClient.get<Grade>(`/classes/${classId}`);
      return handleApiResponseWithError<Grade>(response, `ClassManagementService.getClass(${classId})`, 'ClassManagementService');
    } catch (error) {
      logger.error(`Failed to fetch class ${classId}`, error);
      throw error;
    }
  }

  async createClass(data: Partial<Grade>): Promise<Grade> {
    try {
      const response = await apiClient.post<Grade>('/classes', data);
      return handleApiResponseWithError<Grade>(response, 'ClassManagementService.createClass', 'ClassManagementService');
    } catch (error) {
      logger.error('Failed to create class as SuperAdmin', error);
      throw error;
    }
  }

  async updateClass(classId: number, data: Partial<Grade>): Promise<Grade> {
    try {
      const response = await apiClient.put<Grade>(`/classes/${classId}`, data);
      return handleApiResponseWithError<Grade>(response, `ClassManagementService.updateClass(${classId})`, 'ClassManagementService');
    } catch (error) {
      logger.error(`Failed to update class ${classId}`, error);
      throw error;
    }
  }

  async deleteClass(classId: number): Promise<void> {
    try {
      await apiClient.delete(`/classes/${classId}`);
      logger.info(`Successfully deleted class ${classId}`, {
        component: 'ClassManagementService',
        action: 'deleteClass'
      });
    } catch (error) {
      logger.error(`Failed to delete class ${classId}`, error);
      throw error;
    }
  }

  async getClassStudents(classId: number): Promise<SchoolStudent[]> {
    try {
      const response = await apiClient.get<SchoolStudent[]>(`/classes/${classId}/students`);
      return handleArrayResponse<SchoolStudent>(response, `ClassManagementService.getClassStudents(${classId})`);
    } catch (error) {
      logger.error(`Failed to fetch students for class ${classId}`, error);
      throw error;
    }
  }

  async getClassTeachers(classId: number): Promise<SchoolTeacher[]> {
    try {
      const response = await apiClient.get<SchoolTeacher[]>(`/classes/${classId}/teachers`);
      return handleArrayResponse<SchoolTeacher>(response, `ClassManagementService.getClassTeachers(${classId})`);
    } catch (error) {
      logger.error(`Failed to fetch teachers for class ${classId}`, error);
      throw error;
    }
  }
}

export const classManagementService = new ClassManagementService();
export { ClassManagementService };
