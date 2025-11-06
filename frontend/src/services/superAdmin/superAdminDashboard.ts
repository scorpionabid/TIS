/**
 * SuperAdmin Dashboard Service
 */

import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { DashboardStats } from './types';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get<DashboardStats>('/super-admin/dashboard/stats');
    return handleApiResponse<DashboardStats>(response, 'SuperAdminDashboardService.getDashboardStats');
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', error);
    throw error;
  }
};

export const getDashboardOverview = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/super-admin/dashboard/overview');
    return handleApiResponse(response, 'SuperAdminDashboardService.getDashboardOverview');
  } catch (error) {
    logger.error('Failed to fetch dashboard overview', error);
    throw error;
  }
};

export const getOverviewStats = async (filters?: any): Promise<any> => {
  try {
    const response = await apiClient.get('/super-admin/overview-stats', filters);
    return handleApiResponse(response, 'SuperAdminDashboardService.getOverviewStats');
  } catch (error) {
    logger.error('Failed to fetch overview stats', error);
    throw error;
  }
};
