import { apiClient } from '../api';
import { handleApiResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * System Configuration Service for SuperAdmin
 * Handles system-level configuration and health monitoring
 */
class SystemConfigService {
  async getSystemConfig(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching system config', {
        component: 'SystemConfigService',
        action: 'getSystemConfig'
      });

      const response = await apiClient.get('/system/config');
      return handleApiResponse(response, 'SystemConfigService.getSystemConfig');
    } catch (error) {
      logger.error('Failed to fetch system config', error);
      throw error;
    }
  }

  async updateSystemConfig(config: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating system config', {
        component: 'SystemConfigService',
        action: 'updateSystemConfig'
      });

      const response = await apiClient.put('/system/config', config);
      return handleApiResponseWithError(response, 'SystemConfigService.updateSystemConfig', 'SystemConfigService');
    } catch (error) {
      logger.error('Failed to update system config', error);
      throw error;
    }
  }

  async getSystemInfo(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching system info', {
        component: 'SystemConfigService',
        action: 'getSystemInfo'
      });

      const response = await apiClient.get('/system/info');
      return handleApiResponse(response, 'SystemConfigService.getSystemInfo');
    } catch (error) {
      logger.error('Failed to fetch system info', error);
      throw error;
    }
  }

  async checkSystemHealth(): Promise<any> {
    try {
      logger.debug('SuperAdmin checking system health', {
        component: 'SystemConfigService',
        action: 'checkSystemHealth'
      });

      const response = await apiClient.get('/system/health');
      return handleApiResponse(response, 'SystemConfigService.checkSystemHealth');
    } catch (error) {
      logger.error('Failed to check system health', error);
      throw error;
    }
  }
}

export const systemConfigService = new SystemConfigService();
export { SystemConfigService };
