/**
 * SuperAdmin Hierarchy Service
 */

import { apiClient } from '../api';
import { handleApiResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { HierarchyNode } from './types';

export const getHierarchy = async (): Promise<HierarchyNode[]> => {
  try {
    const response = await apiClient.get<HierarchyNode[]>('/hierarchy');
    return handleApiResponse<HierarchyNode[]>(response, 'SuperAdminHierarchyService.getHierarchy');
  } catch (error) {
    logger.error('Failed to fetch hierarchy', error);
    throw error;
  }
};

export const getInstitutionsHierarchy = async (): Promise<HierarchyNode[]> => {
  try {
    const response = await apiClient.get<HierarchyNode[]>('/institutions/hierarchy');
    return handleApiResponse<HierarchyNode[]>(response, 'SuperAdminHierarchyService.getInstitutionsHierarchy');
  } catch (error) {
    logger.error('Failed to fetch institutions hierarchy', error);
    throw error;
  }
};
