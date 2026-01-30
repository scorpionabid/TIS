/**
 * Rating Calculation Service
 *
 * Rating calculation and results API
 */

import { apiClient as api } from '../api';
import type {
  CalculateRatingRequest,
  RatingResult,
  YearComparison,
} from '../../types/teacherRating';

const BASE_URL = '/teacher-rating';

export const ratingCalculationService = {
  /**
   * Calculate rating for single teacher
   */
  async calculateTeacherRating(teacherId: number, data: CalculateRatingRequest) {
    const response = await api.post(`${BASE_URL}/calculate/${teacherId}`, data);
    return response.data;
  },

  /**
   * Calculate ratings for all active teachers
   */
  async calculateAllRatings(data: CalculateRatingRequest) {
    const response = await api.post(`${BASE_URL}/calculate-all`, data);
    return response.data;
  },

  /**
   * Get rating result for a teacher
   */
  async getRatingResult(teacherId: number, academicYearId: number): Promise<{ success: boolean; data: RatingResult }> {
    const response = await api.get(`${BASE_URL}/result/${teacherId}`, {
      params: { academic_year_id: academicYearId },
    });
    return response.data;
  },

  /**
   * Compare teacher ratings across years
   */
  async compareYears(teacherId: number): Promise<{
    success: boolean;
    data: {
      teacher: { id: number; name: string; utis_code: string };
      comparison: YearComparison[];
    };
  }> {
    const response = await api.get(`${BASE_URL}/compare/${teacherId}`);
    return response.data;
  },
};
