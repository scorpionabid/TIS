/**
 * SuperAdmin Institutions Service
 *
 * Handles institution management operations for SuperAdmin role
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { Institution, PaginationParams } from './types';

export const getInstitutions = async (params?: PaginationParams): Promise<Institution[]> => {
  try {
    const response = await apiClient.get<Institution[]>('/institutions', params);
    return handleArrayResponse<Institution>(response, 'SuperAdminInstitutionsService.getInstitutions');
  } catch (error) {
    logger.error('Failed to fetch institutions', error);
    throw error;
  }
};

export const getInstitution = async (institutionId: number): Promise<Institution> => {
  try {
    const response = await apiClient.get<Institution>(`/institutions/${institutionId}`);
    return handleApiResponseWithError<Institution>(response, `SuperAdminInstitutionsService.getInstitution(${institutionId})`, 'SuperAdminInstitutionsService');
  } catch (error) {
    logger.error(`Failed to fetch institution ${institutionId}`, error);
    throw error;
  }
};

export const createInstitution = async (data: any): Promise<Institution> => {
  try {
    const response = await apiClient.post<Institution>('/institutions', data);
    return handleApiResponseWithError<Institution>(response, 'SuperAdminInstitutionsService.createInstitution', 'SuperAdminInstitutionsService');
  } catch (error) {
    logger.error('Failed to create institution', error);
    throw error;
  }
};

export const updateInstitution = async (institutionId: number, data: any): Promise<Institution> => {
  try {
    const response = await apiClient.put<Institution>(`/institutions/${institutionId}`, data);
    return handleApiResponseWithError<Institution>(response, `SuperAdminInstitutionsService.updateInstitution(${institutionId})`, 'SuperAdminInstitutionsService');
  } catch (error) {
    logger.error(`Failed to update institution ${institutionId}`, error);
    throw error;
  }
};

export const deleteInstitution = async (institutionId: number): Promise<void> => {
  try {
    await apiClient.delete(`/institutions/${institutionId}`);
    logger.info(`Successfully deleted institution ${institutionId}`);
  } catch (error) {
    logger.error(`Failed to delete institution ${institutionId}`, error);
    throw error;
  }
};
