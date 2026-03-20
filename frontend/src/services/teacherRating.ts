/**
 * Teacher Rating Service
 *
 * Birləşdirilmiş servis: CRUD əməliyyatları + hesablama + liderboard + statistika + konfiqurasiya
 * (teacherRatingService + teacherRatingApiService birləşdirilmişdir)
 */

import { apiClient } from './api';
import type {
  TeacherRatingProfile,
  TeacherRatingListParams,
  TeacherRatingCreateRequest,
  TeacherRatingUpdateRequest,
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
} from '../../types/teacherRating';

const TEACHERS_URL = '/teacher-rating/teachers';
const BASE_URL = '/teacher-rating';

// =============================================
// TEACHER RATING PROFILE CRUD
// =============================================

export const teacherRatingService = {
  /**
   * Get list of teacher rating profiles with filters
   */
  async getAll(params?: TeacherRatingListParams) {
    const response = await apiClient.get(TEACHERS_URL, { params });
    return response.data;
  },

  /**
   * Get single teacher rating profile
   */
  async getById(id: number) {
    const response = await apiClient.get(`${TEACHERS_URL}/${id}`);
    return response.data;
  },

  /**
   * Create new teacher rating profile
   */
  async create(data: TeacherRatingCreateRequest) {
    const response = await apiClient.post(TEACHERS_URL, data);
    return response.data;
  },

  /**
   * Update teacher rating profile
   */
  async update(id: number, data: TeacherRatingUpdateRequest) {
    const response = await apiClient.put(`${TEACHERS_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Delete teacher rating profile (soft delete)
   */
  async delete(id: number) {
    const response = await apiClient.delete(`${TEACHERS_URL}/${id}`);
    return response.data;
  },

  /**
   * Restore soft-deleted teacher rating profile
   */
  async restore(id: number) {
    const response = await apiClient.post(`${TEACHERS_URL}/${id}/restore`);
    return response.data;
  },

  /**
   * Bulk update teacher status
   */
  async bulkUpdateStatus(teacherIds: number[], isActive: boolean) {
    const response = await apiClient.post(`${TEACHERS_URL}/bulk-update-status`, {
      teacher_ids: teacherIds,
      is_active: isActive,
    });
    return response.data;
  },
};

// =============================================
// RATING CALCULATION
// =============================================

export const teacherRatingApiService = {
  /**
   * Calculate rating for a single teacher
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
   */
  async getStatistics(
    params: StatisticsParams
  ): Promise<{ success: boolean; data: RatingStatistics }> {
    const response = await apiClient.get(`${BASE_URL}/statistics`, { params });
    return response.data;
  },

  /**
   * Get district comparison
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
   */
  async updateConfig(
    data: RatingConfigUpdateRequest
  ): Promise<{ success: boolean; data: { config: RatingConfig }; message: string }> {
    const response = await apiClient.put(`${BASE_URL}/config`, data);
    return response.data;
  },
};

export default teacherRatingApiService;
