/**
 * SuperAdmin Assessments Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { Assessment, PaginationParams } from './types';

export const getAssessments = async (classId?: number, params?: PaginationParams): Promise<Assessment[]> => {
  try {
    const endpoint = classId ? `/classes/${classId}/assessments` : '/assessments';
    const response = await apiClient.get<Assessment[]>(endpoint, params);
    return handleArrayResponse<Assessment>(response, 'SuperAdminAssessmentsService.getAssessments');
  } catch (error) {
    logger.error('Failed to fetch assessments', error);
    throw error;
  }
};

export const getAssessment = async (assessmentId: number): Promise<Assessment> => {
  try {
    const response = await apiClient.get<Assessment>(`/assessments/${assessmentId}`);
    return handleApiResponseWithError<Assessment>(response, `SuperAdminAssessmentsService.getAssessment(${assessmentId})`, 'SuperAdminAssessmentsService');
  } catch (error) {
    logger.error(`Failed to fetch assessment ${assessmentId}`, error);
    throw error;
  }
};

export const createAssessment = async (data: Partial<Assessment>): Promise<Assessment> => {
  try {
    const response = await apiClient.post<Assessment>('/assessments', data);
    return handleApiResponseWithError<Assessment>(response, 'SuperAdminAssessmentsService.createAssessment', 'SuperAdminAssessmentsService');
  } catch (error) {
    logger.error('Failed to create assessment', error);
    throw error;
  }
};

export const updateAssessment = async (assessmentId: number, data: Partial<Assessment>): Promise<Assessment> => {
  try {
    const response = await apiClient.put<Assessment>(`/assessments/${assessmentId}`, data);
    return handleApiResponseWithError<Assessment>(response, `SuperAdminAssessmentsService.updateAssessment(${assessmentId})`, 'SuperAdminAssessmentsService');
  } catch (error) {
    logger.error(`Failed to update assessment ${assessmentId}`, error);
    throw error;
  }
};

export const deleteAssessment = async (assessmentId: number): Promise<void> => {
  try {
    await apiClient.delete(`/assessments/${assessmentId}`);
    logger.info(`Successfully deleted assessment ${assessmentId}`);
  } catch (error) {
    logger.error(`Failed to delete assessment ${assessmentId}`, error);
    throw error;
  }
};
