/**
 * Teacher Rating Service
 *
 * CRUD operations for teacher rating profiles
 */

import { apiClient as api } from '../api';
import type {
  TeacherRatingProfile,
  TeacherRatingListParams,
  TeacherRatingCreateRequest,
  TeacherRatingUpdateRequest,
} from '../../types/teacherRating';

const BASE_URL = '/teacher-rating/teachers';

export const teacherRatingService = {
  /**
   * Get list of teacher rating profiles with filters
   */
  async getAll(params?: TeacherRatingListParams) {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  /**
   * Get single teacher rating profile
   */
  async getById(id: number) {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Create new teacher rating profile
   */
  async create(data: TeacherRatingCreateRequest) {
    const response = await api.post(BASE_URL, data);
    return response.data;
  },

  /**
   * Update teacher rating profile
   */
  async update(id: number, data: TeacherRatingUpdateRequest) {
    const response = await api.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Delete teacher rating profile (soft delete)
   */
  async delete(id: number) {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Restore soft-deleted teacher rating profile
   */
  async restore(id: number) {
    const response = await api.post(`${BASE_URL}/${id}/restore`);
    return response.data;
  },

  /**
   * Bulk update teacher status
   */
  async bulkUpdateStatus(teacherIds: number[], isActive: boolean) {
    const response = await api.post(`${BASE_URL}/bulk-update-status`, {
      teacher_ids: teacherIds,
      is_active: isActive,
    });
    return response.data;
  },
};
