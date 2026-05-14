import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Hierarchy Service for SuperAdmin
 * Handles institutional hierarchy operations
 */
class HierarchyService {
  async getHierarchy(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching hierarchy', {
        component: 'HierarchyService',
        action: 'getHierarchy'
      });

      const response = await apiClient.get('/hierarchy');
      return handleApiResponse(response, 'HierarchyService.getHierarchy');
    } catch (error) {
      logger.error('Failed to fetch hierarchy', error);
      throw error;
    }
  }

  async getInstitutionsHierarchy(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching institutions hierarchy', {
        component: 'HierarchyService',
        action: 'getInstitutionsHierarchy'
      });

      const response = await apiClient.get('/institutions-hierarchy');
      return handleApiResponse(response, 'HierarchyService.getInstitutionsHierarchy');
    } catch (error) {
      logger.error('Failed to fetch institutions hierarchy', error);
      throw error;
    }
  }
}

export const hierarchyService = new HierarchyService();
export { HierarchyService };
