/**
 * SuperAdmin Teachers Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { SchoolTeacher, PaginationParams } from './types';

export const getTeachers = async (params?: PaginationParams): Promise<SchoolTeacher[]> => {
  try {
    logger.debug('SuperAdmin fetching teachers', {
      component: 'SuperAdminTeachersService',
      action: 'getTeachers',
      data: { params }
    });

    const endpoint = '/teachers';
    const response = await apiClient.get<SchoolTeacher[]>(endpoint, params);
    return handleArrayResponse<SchoolTeacher>(response, 'SuperAdminTeachersService.getTeachers');

  } catch (error) {
    logger.error('Failed to fetch teachers as SuperAdmin', error);
    throw error;
  }
};

export const getTeacher = async (teacherId: number): Promise<SchoolTeacher> => {
  try {
    const response = await apiClient.get<SchoolTeacher>(`/teachers/${teacherId}`);
    return handleApiResponseWithError<SchoolTeacher>(response, `SuperAdminTeachersService.getTeacher(${teacherId})`, 'SuperAdminTeachersService');
  } catch (error) {
    logger.error(`Failed to fetch teacher ${teacherId}`, error);
    throw error;
  }
};

export const createTeacher = async (data: any): Promise<SchoolTeacher> => {
  try {
    const response = await apiClient.post<SchoolTeacher>('/teachers', data);
    return handleApiResponseWithError<SchoolTeacher>(response, 'SuperAdminTeachersService.createTeacher', 'SuperAdminTeachersService');
  } catch (error) {
    logger.error('Failed to create teacher', error);
    throw error;
  }
};

export const updateTeacher = async (teacherId: number, data: any): Promise<SchoolTeacher> => {
  try {
    const response = await apiClient.put<SchoolTeacher>(`/teachers/${teacherId}`, data);
    return handleApiResponseWithError<SchoolTeacher>(response, `SuperAdminTeachersService.updateTeacher(${teacherId})`, 'SuperAdminTeachersService');
  } catch (error) {
    logger.error(`Failed to update teacher ${teacherId}`, error);
    throw error;
  }
};

export const deleteTeacher = async (teacherId: number): Promise<void> => {
  try {
    await apiClient.delete(`/teachers/${teacherId}`);
    logger.info(`Successfully deleted teacher ${teacherId}`);
  } catch (error) {
    logger.error(`Failed to delete teacher ${teacherId}`, error);
    throw error;
  }
};

export const assignTeacherToClasses = async (teacherId: number, classIds: number[]): Promise<SchoolTeacher> => {
  try {
    logger.debug('SuperAdmin assigning teacher to classes', {
      component: 'SuperAdminTeachersService',
      action: 'assignTeacherToClasses',
      data: { teacherId, classIds }
    });

    const response = await apiClient.post<SchoolTeacher>(`/teachers/${teacherId}/assign-classes`, { class_ids: classIds });
    return handleApiResponseWithError<SchoolTeacher>(response, `SuperAdminTeachersService.assignTeacherToClasses(${teacherId})`, 'SuperAdminTeachersService');
  } catch (error) {
    logger.error(`Failed to assign teacher ${teacherId} to classes`, error);
    throw error;
  }
};

export const getTeacherPerformance = async (teacherId: number): Promise<any> => {
  try {
    logger.debug('SuperAdmin fetching teacher performance', {
      component: 'SuperAdminTeachersService',
      action: 'getTeacherPerformance',
      data: { teacherId }
    });

    const response = await apiClient.get(`/teachers/${teacherId}/performance`);
    return handleApiResponse(response, `SuperAdminTeachersService.getTeacherPerformance(${teacherId})`);
  } catch (error) {
    logger.error(`Failed to fetch teacher ${teacherId} performance`, error);
    throw error;
  }
};

export const bulkCreateTeachers = async (teachers: any[]): Promise<any> => {
  try {
    logger.debug('SuperAdmin bulk creating teachers', {
      component: 'SuperAdminTeachersService',
      action: 'bulkCreateTeachers',
      data: { count: teachers.length }
    });

    const response = await apiClient.post('/teachers/bulk-create', { teachers });
    return handleApiResponse(response, 'SuperAdminTeachersService.bulkCreateTeachers');
  } catch (error) {
    logger.error('Failed to bulk create teachers', error);
    throw error;
  }
};

export const getTeachersAnalytics = async (): Promise<any> => {
  try {
    logger.debug('SuperAdmin fetching teachers analytics', {
      component: 'SuperAdminTeachersService',
      action: 'getTeachersAnalytics'
    });

    const response = await apiClient.get('/teachers/analytics/overview');
    return handleApiResponse(response, 'SuperAdminTeachersService.getTeachersAnalytics');
  } catch (error) {
    logger.error('Failed to fetch teachers analytics', error);
    throw error;
  }
};
