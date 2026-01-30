/**
 * Configuration Service
 *
 * Rating configuration API (weights, bonus rules)
 * Note: Backend API not yet implemented - placeholder for future
 */

import { apiClient as api } from '../api';
import type { RatingConfiguration } from '../../types/teacherRating';

const BASE_URL = '/teacher-rating/configuration';

export const configurationService = {
  /**
   * Get all rating configurations
   * TODO: Backend endpoint needs to be created
   */
  async getAll(): Promise<{
    success: boolean;
    data: RatingConfiguration[];
  }> {
    const response = await api.get(BASE_URL);
    return response.data;
  },

  /**
   * Update rating configuration
   * TODO: Backend endpoint needs to be created
   */
  async update(id: number, data: Partial<RatingConfiguration>): Promise<{
    success: boolean;
    message: string;
    data: RatingConfiguration;
  }> {
    const response = await api.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Reset configuration to defaults
   * TODO: Backend endpoint needs to be created
   */
  async reset(): Promise<{
    success: boolean;
    message: string;
    data: RatingConfiguration[];
  }> {
    const response = await api.post(`${BASE_URL}/reset`);
    return response.data;
  },
};
