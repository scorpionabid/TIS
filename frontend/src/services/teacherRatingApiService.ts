/**
 * PRD: Müəllim Reytinq Sistemi - API Service
 *
 * Bu service müəllim reytinq sisteminin bütün API çağırışlarını ehtiva edir.
 */

import { apiClient } from './api';
import type {
  RatingResult,
  RatingConfig,
  RatingConfigUpdateRequest,
  RatingConfigResponse,
  LeaderboardParams,
  LeaderboardResponse,
  StatisticsParams,
  RatingStatistics,
  CalculateRatingRequest,
  CalculateAllRatingsRequest,
  CalculateAllRatingsResponse,
  YearComparisonResponse,
  DistrictComparison,
  SubjectComparison,
} from '../types/teacherRating';

const BASE_URL = '/teacher-rating';

/**
 * PRD: Teacher Rating API Service
 */
export const teacherRatingApiService = {
  // =============================================
  // RATING CALCULATION
  // =============================================

  /**
   * Calculate rating for a single teacher
   * PRD: Reytinq hesablanması
   */
  async calculateRating(
    teacherId: number,
    data: CalculateRatingRequest
  ): Promise<{ success: boolean; data: { rating: RatingResult }; message: string }> {
    const response = await apiClient.post(`${BASE_URL}/calculate/${teacherId}`, data);
    return response.data;
  },

  /**
   * Calculate ratings for all teachers in scope
   */
  async calculateAllRatings(
    data: CalculateAllRatingsRequest
  ): Promise<CalculateAllRatingsResponse> {
    const response = await apiClient.post(`${BASE_URL}/calculate-all`, data);
    return response.data;
  },

  // =============================================
  // RATING RESULTS
  // =============================================

  /**
   * Get rating result for a teacher
   * PRD: Reytinq breakdown-ın hər müəllim profilində görünməsi
   */
  async getRatingResult(
    teacherId: number,
    academicYearId: number
  ): Promise<{
    success: boolean;
    data: {
      rating: RatingResult;
      breakdown: {
        academic: number;
        observation: number;
        assessment: number;
        certificate: number;
        olympiad: number;
        award: number;
      };
      growth_bonus: number;
      yearly_breakdown: Record<string, Record<string, number>>;
    };
  }> {
    const response = await apiClient.get(`${BASE_URL}/result/${teacherId}`, {
      params: { academic_year_id: academicYearId },
    });
    return response.data;
  },

  /**
   * Compare teacher ratings across years
   * PRD: İllər üzrə müqayisə
   */
  async compareYears(teacherId: number): Promise<YearComparisonResponse> {
    const response = await apiClient.get(`${BASE_URL}/compare/${teacherId}`);
    return response.data;
  },

  // =============================================
  // LEADERBOARD
  // =============================================

  /**
   * Get leaderboard (Top 20)
   * PRD: Top 20 liderbord: məktəb üzrə, rayon üzrə, region üzrə və fənn üzrə
   */
  async getLeaderboard(params: LeaderboardParams): Promise<LeaderboardResponse> {
    const response = await apiClient.get(`${BASE_URL}/leaderboard`, { params });
    return response.data;
  },

  // =============================================
  // STATISTICS
  // =============================================

  /**
   * Get statistics
   * PRD: Rayonlararası müqayisə dashboard
   */
  async getStatistics(
    params: StatisticsParams
  ): Promise<{ success: boolean; data: RatingStatistics }> {
    const response = await apiClient.get(`${BASE_URL}/statistics`, { params });
    return response.data;
  },

  /**
   * Get district comparison
   * PRD: Rayonlararası müqayisə
   */
  async getDistrictComparison(
    academicYearId: number,
    regionId: number
  ): Promise<{
    success: boolean;
    data: {
      comparison: DistrictComparison[];
      region_id: number;
    };
  }> {
    const response = await apiClient.get(`${BASE_URL}/district-comparison`, {
      params: { academic_year_id: academicYearId, region_id: regionId },
    });
    return response.data;
  },

  /**
   * Get subject comparison
   * PRD: Fənn üzrə müqayisə (orta skorlar)
   */
  async getSubjectComparison(
    academicYearId: number,
    institutionId?: number
  ): Promise<{
    success: boolean;
    data: {
      comparison: SubjectComparison[];
    };
  }> {
    const response = await apiClient.get(`${BASE_URL}/subject-comparison`, {
      params: {
        academic_year_id: academicYearId,
        institution_id: institutionId,
      },
    });
    return response.data;
  },

  // =============================================
  // CONFIGURATION
  // =============================================

  /**
   * Get rating configuration
   * PRD: Region Admin konfiqurasiya paneli
   */
  async getConfig(
    institutionId: number,
    academicYearId: number
  ): Promise<RatingConfigResponse> {
    const response = await apiClient.get(`${BASE_URL}/config`, {
      params: {
        institution_id: institutionId,
        academic_year_id: academicYearId,
      },
    });
    return response.data;
  },

  /**
   * Update rating configuration
   * PRD: Komponent çəkiləri (Wi) - dəyişiklik audit log-da saxlanılır
   */
  async updateConfig(
    data: RatingConfigUpdateRequest
  ): Promise<{ success: boolean; data: { config: RatingConfig }; message: string }> {
    const response = await apiClient.put(`${BASE_URL}/config`, data);
    return response.data;
  },
};

export default teacherRatingApiService;
