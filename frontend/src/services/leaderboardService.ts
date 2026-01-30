/**
 * Leaderboard Service
 *
 * Leaderboard and statistics API
 */

import { apiClient as api } from '../api';
import type {
  LeaderboardParams,
  StatisticsParams,
  RatingResult,
  RatingStatistics,
} from '../../types/teacherRating';

const BASE_URL = '/teacher-rating';

export const leaderboardService = {
  /**
   * Get leaderboard (top 20 teachers)
   */
  async getLeaderboard(params: LeaderboardParams): Promise<{
    success: boolean;
    data: {
      leaderboard: RatingResult[];
      academic_year_id: number;
      scope: string;
      scope_id: number | null;
    };
  }> {
    const response = await api.get(`${BASE_URL}/leaderboard`, { params });
    return response.data;
  },

  /**
   * Get rating statistics for academic year
   */
  async getStatistics(params: StatisticsParams): Promise<{
    success: boolean;
    data: RatingStatistics;
  }> {
    const response = await api.get(`${BASE_URL}/statistics`, { params });
    return response.data;
  },
};
