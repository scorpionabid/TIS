import { apiClient } from '../api';
import { PaginationParams } from '../BaseService';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Survey Management Service for SuperAdmin
 * Handles all survey-related operations
 */
class SurveyManagementService {
  async getSurveys(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching surveys', {
        component: 'SurveyManagementService',
        action: 'getSurveys',
        data: { params }
      });

      const response = await apiClient.get('/surveys', params);
      return handleArrayResponse(response, 'SurveyManagementService.getSurveys');
    } catch (error) {
      logger.error('Failed to fetch surveys', error);
      throw error;
    }
  }

  async getSurvey(surveyId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching survey', {
        component: 'SurveyManagementService',
        action: 'getSurvey',
        data: { surveyId }
      });

      const response = await apiClient.get(`/surveys/${surveyId}`);
      return handleApiResponseWithError(response, `SurveyManagementService.getSurvey(${surveyId})`, 'SurveyManagementService');
    } catch (error) {
      logger.error(`Failed to fetch survey ${surveyId}`, error);
      throw error;
    }
  }

  async createSurvey(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating survey', {
        component: 'SurveyManagementService',
        action: 'createSurvey',
        data: { title: data.title }
      });

      const response = await apiClient.post('/surveys', data);
      return handleApiResponseWithError(response, 'SurveyManagementService.createSurvey', 'SurveyManagementService');
    } catch (error) {
      logger.error('Failed to create survey', error);
      throw error;
    }
  }

  async updateSurvey(surveyId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating survey', {
        component: 'SurveyManagementService',
        action: 'updateSurvey',
        data: { surveyId }
      });

      const response = await apiClient.put(`/surveys/${surveyId}`, data);
      return handleApiResponseWithError(response, `SurveyManagementService.updateSurvey(${surveyId})`, 'SurveyManagementService');
    } catch (error) {
      logger.error(`Failed to update survey ${surveyId}`, error);
      throw error;
    }
  }

  async deleteSurvey(surveyId: number): Promise<void> {
    try {
      await apiClient.delete(`/surveys/${surveyId}`);
      logger.info(`Successfully deleted survey ${surveyId}`, {
        component: 'SurveyManagementService',
        action: 'deleteSurvey'
      });
    } catch (error) {
      logger.error(`Failed to delete survey ${surveyId}`, error);
      throw error;
    }
  }
}

export const surveyManagementService = new SurveyManagementService();
export { SurveyManagementService };
