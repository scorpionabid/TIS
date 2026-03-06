import { apiClient, ApiResponse } from './api';
import type { GradeTag, GradeTagGroup, EducationProgram } from '@/types/gradeTag';

/**
 * Grade Tag Service
 *
 * Handles API calls for grade tags and education programs
 */
class GradeTagService {
  /**
   * Get all grade tags grouped by category
   */
  async getTagsGrouped(activeOnly: boolean = true): Promise<GradeTagGroup[]> {
    const response = await apiClient.get<ApiResponse<GradeTagGroup[]>>('/grades/tags', {
      params: { active_only: activeOnly },
    });
    return response.data.data;
  }

  /**
   * Get all grade tags as flat list
   */
  async getTagsList(activeOnly: boolean = true): Promise<GradeTag[]> {
    const response = await apiClient.get<ApiResponse<GradeTag[]>>('/grades/tags/list', {
      params: { active_only: activeOnly },
    });
    return response.data.data;
  }

  /**
   * Get tags by specific category
   */
  async getTagsByCategory(category: string, activeOnly: boolean = true): Promise<GradeTag[]> {
    const response = await apiClient.get<ApiResponse<GradeTag[]>>('/grades/tags/list', {
      params: {
        category,
        active_only: activeOnly
      },
    });
    return response.data.data;
  }

  /**
   * Get all available categories with tag counts
   */
  async getCategories(): Promise<Array<{ key: string; name: string; tag_count: number }>> {
    const response = await apiClient.get<ApiResponse<Array<{ key: string; name: string; tag_count: number }>>>('/grades/tags/categories');
    return response.data.data;
  }

  /**
   * Get all education program options
   */
  async getEducationPrograms(): Promise<EducationProgram[]> {
    const response = await apiClient.get<ApiResponse<EducationProgram[]>>('/grades/education-programs');
    return response.data.data;
  }
}

export const gradeTagService = new GradeTagService();
