import { apiClient } from '../api';
import { PaginationParams } from '../BaseService';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Institution Management Service for SuperAdmin
 * Handles all institution-related operations
 */
class InstitutionService {
  async getInstitutions(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching institutions', {
        component: 'InstitutionService',
        action: 'getInstitutions',
        data: { params }
      });

      const response = await apiClient.get('/institutions', params);
      return handleArrayResponse(response, 'InstitutionService.getInstitutions');
    } catch (error) {
      logger.error('Failed to fetch institutions', error);
      throw error;
    }
  }

  async getInstitution(institutionId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching institution', {
        component: 'InstitutionService',
        action: 'getInstitution',
        data: { institutionId }
      });

      const response = await apiClient.get(`/institutions/${institutionId}`);
      return handleApiResponseWithError(response, `InstitutionService.getInstitution(${institutionId})`, 'InstitutionService');
    } catch (error) {
      logger.error(`Failed to fetch institution ${institutionId}`, error);
      throw error;
    }
  }

  async createInstitution(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating institution', {
        component: 'InstitutionService',
        action: 'createInstitution',
        data: { name: data.name }
      });

      const response = await apiClient.post('/institutions', data);
      return handleApiResponseWithError(response, 'InstitutionService.createInstitution', 'InstitutionService');
    } catch (error) {
      logger.error('Failed to create institution', error);
      throw error;
    }
  }

  async updateInstitution(institutionId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating institution', {
        component: 'InstitutionService',
        action: 'updateInstitution',
        data: { institutionId }
      });

      const response = await apiClient.put(`/institutions/${institutionId}`, data);
      return handleApiResponseWithError(response, `InstitutionService.updateInstitution(${institutionId})`, 'InstitutionService');
    } catch (error) {
      logger.error(`Failed to update institution ${institutionId}`, error);
      throw error;
    }
  }

  async deleteInstitution(institutionId: number): Promise<void> {
    try {
      await apiClient.delete(`/institutions/${institutionId}`);
      logger.info(`Successfully deleted institution ${institutionId}`, {
        component: 'InstitutionService',
        action: 'deleteInstitution'
      });
    } catch (error) {
      logger.error(`Failed to delete institution ${institutionId}`, error);
      throw error;
    }
  }
}

export const institutionService = new InstitutionService();
export { InstitutionService };
