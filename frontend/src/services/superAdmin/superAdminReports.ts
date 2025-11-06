/**
 * SuperAdmin Reports Service
 */

import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { Report } from './types';

export const getReports = async (params?: any): Promise<Report[]> => {
  try {
    const response = await apiClient.get<Report[]>('/reports', params);
    return handleApiResponse<Report[]>(response, 'SuperAdminReportsService.getReports');
  } catch (error) {
    logger.error('Failed to fetch reports', error);
    throw error;
  }
};

export const getInstitutionalPerformance = async (filters?: any): Promise<any> => {
  try {
    const response = await apiClient.get('/reports/institutional-performance', filters);
    return handleApiResponse(response, 'SuperAdminReportsService.getInstitutionalPerformance');
  } catch (error) {
    logger.error('Failed to fetch institutional performance', error);
    throw error;
  }
};

export const getUserActivityReport = async (filters?: any): Promise<any> => {
  try {
    const response = await apiClient.get('/reports/user-activity', filters);
    return handleApiResponse(response, 'SuperAdminReportsService.getUserActivityReport');
  } catch (error) {
    logger.error('Failed to fetch user activity report', error);
    throw error;
  }
};
