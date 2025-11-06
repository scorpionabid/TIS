/**
 * SuperAdmin Teachers Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { SchoolTeacher, PaginationParams } from './types';

export const getTeachers = async (params?: PaginationParams): Promise<SchoolTeacher[]> => {
  try {
    const response = await apiClient.get<SchoolTeacher[]>('/teachers', params);
    return handleArrayResponse<SchoolTeacher>(response, 'SuperAdminTeachersService.getTeachers');
  } catch (error) {
    logger.error('Failed to fetch teachers', error);
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
    const response = await apiClient.post<SchoolTeacher>(`/teachers/${teacherId}/classes`, { class_ids: classIds });
    return handleApiResponseWithError<SchoolTeacher>(response, 'SuperAdminTeachersService.assignTeacherToClasses', 'SuperAdminTeachersService');
  } catch (error) {
    logger.error('Failed to assign teacher to classes', error);
    throw error;
  }
};

export const getTeacherPerformance = async (teacherId: number): Promise<any> => {
  try {
    const response = await apiClient.get(`/teachers/${teacherId}/performance`);
    return handleApiResponseWithError(response, 'SuperAdminTeachersService.getTeacherPerformance', 'SuperAdminTeachersService');
  } catch (error) {
    logger.error('Failed to fetch teacher performance', error);
    throw error;
  }
};

export const bulkCreateTeachers = async (teachers: any[]): Promise<any> => {
  try {
    const response = await apiClient.post('/teachers/bulk', { teachers });
    return handleApiResponseWithError(response, 'SuperAdminTeachersService.bulkCreateTeachers', 'SuperAdminTeachersService');
  } catch (error) {
    logger.error('Failed to bulk create teachers', error);
    throw error;
  }
};

export const getTeachersAnalytics = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/teachers/analytics');
    return handleApiResponseWithError(response, 'SuperAdminTeachersService.getTeachersAnalytics', 'SuperAdminTeachersService');
  } catch (error) {
    logger.error('Failed to fetch teachers analytics', error);
    throw error;
  }
};
