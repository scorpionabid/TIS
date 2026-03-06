import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Dashboard Service for SuperAdmin
 * Handles dashboard statistics and overview operations
 */
class DashboardService {
  async getDashboardStats(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching dashboard stats', {
        component: 'DashboardService',
        action: 'getDashboardStats'
      });

      // SuperAdmin can access all dashboard endpoints
      const response = await apiClient.get('/dashboard/stats');
      return handleApiResponse(response, 'DashboardService.getDashboardStats');
    } catch (error) {
      logger.error('Failed to fetch dashboard stats', error);
      throw error;
    }
  }

  async getDashboardOverview(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching dashboard overview', {
        component: 'DashboardService',
        action: 'getDashboardOverview'
      });

      const response = await apiClient.get('/dashboard/overview');
      return handleApiResponse(response, 'DashboardService.getDashboardOverview');
    } catch (error) {
      logger.error('Failed to fetch dashboard overview', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
export { DashboardService };
