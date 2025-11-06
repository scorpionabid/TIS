/**
 * SuperAdmin Surveys Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { Survey, PaginationParams } from './types';

export const getSurveys = async (params?: PaginationParams): Promise<Survey[]> => {
  try {
    const response = await apiClient.get<Survey[]>('/surveys', params);
    return handleArrayResponse<Survey>(response, 'SuperAdminSurveysService.getSurveys');
  } catch (error) {
    logger.error('Failed to fetch surveys', error);
    throw error;
  }
};

export const getSurvey = async (surveyId: number): Promise<Survey> => {
  try {
    const response = await apiClient.get<Survey>(`/surveys/${surveyId}`);
    return handleApiResponseWithError<Survey>(response, `SuperAdminSurveysService.getSurvey(${surveyId})`, 'SuperAdminSurveysService');
  } catch (error) {
    logger.error(`Failed to fetch survey ${surveyId}`, error);
    throw error;
  }
};

export const createSurvey = async (data: any): Promise<Survey> => {
  try {
    const response = await apiClient.post<Survey>('/surveys', data);
    return handleApiResponseWithError<Survey>(response, 'SuperAdminSurveysService.createSurvey', 'SuperAdminSurveysService');
  } catch (error) {
    logger.error('Failed to create survey', error);
    throw error;
  }
};

export const updateSurvey = async (surveyId: number, data: any): Promise<Survey> => {
  try {
    const response = await apiClient.put<Survey>(`/surveys/${surveyId}`, data);
    return handleApiResponseWithError<Survey>(response, `SuperAdminSurveysService.updateSurvey(${surveyId})`, 'SuperAdminSurveysService');
  } catch (error) {
    logger.error(`Failed to update survey ${surveyId}`, error);
    throw error;
  }
};

export const deleteSurvey = async (surveyId: number): Promise<void> => {
  try {
    await apiClient.delete(`/surveys/${surveyId}`);
    logger.info(`Successfully deleted survey ${surveyId}`);
  } catch (error) {
    logger.error(`Failed to delete survey ${surveyId}`, error);
    throw error;
  }
};
