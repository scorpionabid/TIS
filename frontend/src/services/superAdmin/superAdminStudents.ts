/**
 * SuperAdmin Students Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { SchoolStudent, CreateStudentData, PaginationParams } from './types';

export const getStudents = async (params?: PaginationParams): Promise<SchoolStudent[]> => {
  try {
    const response = await apiClient.get<SchoolStudent[]>('/students', params);
    return handleArrayResponse<SchoolStudent>(response, 'SuperAdminStudentsService.getStudents');
  } catch (error) {
    logger.error('Failed to fetch students', error);
    throw error;
  }
};

export const getStudent = async (studentId: number): Promise<SchoolStudent> => {
  try {
    const response = await apiClient.get<SchoolStudent>(`/students/${studentId}`);
    return handleApiResponseWithError<SchoolStudent>(response, `SuperAdminStudentsService.getStudent(${studentId})`, 'SuperAdminStudentsService');
  } catch (error) {
    logger.error(`Failed to fetch student ${studentId}`, error);
    throw error;
  }
};

export const createStudent = async (data: CreateStudentData): Promise<SchoolStudent> => {
  try {
    const response = await apiClient.post<SchoolStudent>('/students', data);
    return handleApiResponseWithError<SchoolStudent>(response, 'SuperAdminStudentsService.createStudent', 'SuperAdminStudentsService');
  } catch (error) {
    logger.error('Failed to create student', error);
    throw error;
  }
};

export const updateStudent = async (studentId: number, data: Partial<CreateStudentData>): Promise<SchoolStudent> => {
  try {
    const response = await apiClient.put<SchoolStudent>(`/students/${studentId}`, data);
    return handleApiResponseWithError<SchoolStudent>(response, `SuperAdminStudentsService.updateStudent(${studentId})`, 'SuperAdminStudentsService');
  } catch (error) {
    logger.error(`Failed to update student ${studentId}`, error);
    throw error;
  }
};

export const deleteStudent = async (studentId: number): Promise<void> => {
  try {
    await apiClient.delete(`/students/${studentId}`);
    logger.info(`Successfully deleted student ${studentId}`);
  } catch (error) {
    logger.error(`Failed to delete student ${studentId}`, error);
    throw error;
  }
};
