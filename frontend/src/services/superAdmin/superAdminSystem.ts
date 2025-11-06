/**
 * SuperAdmin System Service
 */

import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { SystemConfig, SystemHealth } from './types';

export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const response = await apiClient.get<SystemConfig>('/system/config');
    return handleApiResponse<SystemConfig>(response, 'SuperAdminSystemService.getSystemConfig');
  } catch (error) {
    logger.error('Failed to fetch system config', error);
    throw error;
  }
};

export const updateSystemConfig = async (config: any): Promise<SystemConfig> => {
  try {
    const response = await apiClient.put<SystemConfig>('/system/config', config);
    return handleApiResponse<SystemConfig>(response, 'SuperAdminSystemService.updateSystemConfig');
  } catch (error) {
    logger.error('Failed to update system config', error);
    throw error;
  }
};

export const getSystemInfo = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/system/info');
    return handleApiResponse(response, 'SuperAdminSystemService.getSystemInfo');
  } catch (error) {
    logger.error('Failed to fetch system info', error);
    throw error;
  }
};

export const checkSystemHealth = async (): Promise<SystemHealth> => {
  try {
    const response = await apiClient.get<SystemHealth>('/system/health');
    return handleApiResponse<SystemHealth>(response, 'SuperAdminSystemService.checkSystemHealth');
  } catch (error) {
    logger.error('Failed to check system health', error);
    throw error;
  }
};

export const exportData = async (endpoint: string, params?: any): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/export/${endpoint}`, params, { responseType: 'blob' });
    return response.data;
  } catch (error) {
    logger.error(`Failed to export data from ${endpoint}`, error);
    throw error;
  }
};
