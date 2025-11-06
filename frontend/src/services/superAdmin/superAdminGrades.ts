/**
 * SuperAdmin Grades Service
 *
 * Handles class/grade management operations for SuperAdmin role
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { Grade, PaginationParams } from './types';

/**
 * Get all classes with optional pagination
 */
export const getClasses = async (params?: PaginationParams): Promise<Grade[]> => {
  try {
    logger.debug('SuperAdmin fetching classes', {
      component: 'SuperAdminGradesService',
      action: 'getClasses',
      data: { params }
    });

    const endpoint = '/classes';
    const response = await apiClient.get<Grade[]>(endpoint, params);
    return handleArrayResponse<Grade>(response, 'SuperAdminGradesService.getClasses');

  } catch (error) {
    logger.error('Failed to fetch classes as SuperAdmin', error);
    throw error;
  }
};

/**
 * Get a single class by ID
 */
export const getClass = async (classId: number): Promise<Grade> => {
  try {
    const response = await apiClient.get<Grade>(`/classes/${classId}`);
    return handleApiResponseWithError<Grade>(
      response,
      `SuperAdminGradesService.getClass(${classId})`,
      'SuperAdminGradesService'
    );
  } catch (error) {
    logger.error(`Failed to fetch class ${classId}`, error);
    throw error;
  }
};

/**
 * Create a new class
 */
export const createClass = async (data: Partial<Grade>): Promise<Grade> => {
  try {
    const response = await apiClient.post<Grade>('/classes', data);
    return handleApiResponseWithError<Grade>(
      response,
      'SuperAdminGradesService.createClass',
      'SuperAdminGradesService'
    );
  } catch (error) {
    logger.error('Failed to create class as SuperAdmin', error);
    throw error;
  }
};

/**
 * Update an existing class
 */
export const updateClass = async (classId: number, data: Partial<Grade>): Promise<Grade> => {
  try {
    const response = await apiClient.put<Grade>(`/classes/${classId}`, data);
    return handleApiResponseWithError<Grade>(
      response,
      `SuperAdminGradesService.updateClass(${classId})`,
      'SuperAdminGradesService'
    );
  } catch (error) {
    logger.error(`Failed to update class ${classId}`, error);
    throw error;
  }
};

/**
 * Delete a class
 */
export const deleteClass = async (classId: number): Promise<void> => {
  try {
    await apiClient.delete(`/classes/${classId}`);
    logger.info(`Successfully deleted class ${classId}`, {
      component: 'SuperAdminGradesService',
      action: 'deleteClass'
    });
  } catch (error) {
    logger.error(`Failed to delete class ${classId}`, error);
    throw error;
  }
};

/**
 * Get students in a class
 */
export const getClassStudents = async (classId: number): Promise<any[]> => {
  try {
    const response = await apiClient.get<any[]>(`/classes/${classId}/students`);
    return handleArrayResponse<any>(
      response,
      `SuperAdminGradesService.getClassStudents(${classId})`
    );
  } catch (error) {
    logger.error(`Failed to fetch students for class ${classId}`, error);
    throw error;
  }
};

/**
 * Get teachers assigned to a class
 */
export const getClassTeachers = async (classId: number): Promise<any[]> => {
  try {
    const response = await apiClient.get<any[]>(`/classes/${classId}/teachers`);
    return handleArrayResponse<any>(
      response,
      `SuperAdminGradesService.getClassTeachers(${classId})`
    );
  } catch (error) {
    logger.error(`Failed to fetch teachers for class ${classId}`, error);
    throw error;
  }
};
