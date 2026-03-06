import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Report Service for SuperAdmin
 * Handles all reporting and analytics operations
 */
class ReportService {
  async getReports(params?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching reports', {
        component: 'ReportService',
        action: 'getReports',
        data: { params }
      });

      const response = await apiClient.get('/reports', params);
      return handleApiResponse(response, 'ReportService.getReports');
    } catch (error) {
      logger.error('Failed to fetch reports', error);
      throw error;
    }
  }

  async getOverviewStats(filters?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching overview stats', {
        component: 'ReportService',
        action: 'getOverviewStats',
        data: { filters }
      });

      const response = await apiClient.get('/reports/overview', filters);
      return handleApiResponse(response, 'ReportService.getOverviewStats');
    } catch (error) {
      logger.error('Failed to fetch overview stats', error);
      throw error;
    }
  }

  async getInstitutionalPerformance(filters?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching institutional performance', {
        component: 'ReportService',
        action: 'getInstitutionalPerformance',
        data: { filters }
      });

      const response = await apiClient.get('/reports/institutional', filters);
      return handleApiResponse(response, 'ReportService.getInstitutionalPerformance');
    } catch (error) {
      logger.error('Failed to fetch institutional performance', error);
      throw error;
    }
  }

  async getUserActivityReport(filters?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching user activity report', {
        component: 'ReportService',
        action: 'getUserActivityReport',
        data: { filters }
      });

      const response = await apiClient.get('/reports/user-activity', filters);
      return handleApiResponse(response, 'ReportService.getUserActivityReport');
    } catch (error) {
      logger.error('Failed to fetch user activity report', error);
      throw error;
    }
  }
}

export const reportService = new ReportService();
export { ReportService };
