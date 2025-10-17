/**
 * Curriculum Service
 *
 * API service for managing grade curriculum (grade-subject assignments)
 * with teaching activities, extracurricular activities, clubs, and group splitting.
 */

import { apiClient as api } from './apiOptimized';
import type {
  GradeSubject,
  AvailableSubject,
  CurriculumMeta,
  CurriculumStatistics,
  CreateGradeSubjectDTO,
  UpdateGradeSubjectDTO,
  CurriculumListResponse,
  AvailableSubjectsResponse,
  GradeSubjectResponse,
  CurriculumStatisticsResponse,
  DeleteGradeSubjectResponse,
} from '../types/curriculum';

class CurriculumService {
  private baseUrl = '/grades';

  /**
   * Get all curriculum subjects for a grade
   */
  async getCurriculumSubjects(gradeId: number): Promise<{
    subjects: GradeSubject[];
    meta: CurriculumMeta;
  }> {
    const response = await api.get<CurriculumListResponse>(
      `${this.baseUrl}/${gradeId}/subjects`
    );
    return {
      subjects: response.data.data,
      meta: response.data.meta,
    };
  }

  /**
   * Get available subjects for a grade (not yet assigned)
   */
  async getAvailableSubjects(gradeId: number): Promise<AvailableSubject[]> {
    const response = await api.get<AvailableSubjectsResponse>(
      `${this.baseUrl}/${gradeId}/subjects/available`
    );
    return response.data.data;
  }

  /**
   * Add a subject to grade curriculum
   */
  async addSubjectToCurriculum(
    gradeId: number,
    data: CreateGradeSubjectDTO
  ): Promise<GradeSubject> {
    const response = await api.post<GradeSubjectResponse>(
      `${this.baseUrl}/${gradeId}/subjects`,
      data
    );
    return response.data.data;
  }

  /**
   * Update a grade subject
   */
  async updateGradeSubject(
    gradeId: number,
    gradeSubjectId: number,
    data: UpdateGradeSubjectDTO
  ): Promise<GradeSubject> {
    const response = await api.put<GradeSubjectResponse>(
      `${this.baseUrl}/${gradeId}/subjects/${gradeSubjectId}`,
      data
    );
    return response.data.data;
  }

  /**
   * Remove a subject from grade curriculum
   */
  async removeSubjectFromCurriculum(
    gradeId: number,
    gradeSubjectId: number
  ): Promise<string> {
    const response = await api.delete<DeleteGradeSubjectResponse>(
      `${this.baseUrl}/${gradeId}/subjects/${gradeSubjectId}`
    );
    return response.data.message;
  }

  /**
   * Get curriculum statistics for a grade
   */
  async getCurriculumStatistics(
    gradeId: number
  ): Promise<CurriculumStatistics> {
    const response = await api.get<CurriculumStatisticsResponse>(
      `${this.baseUrl}/${gradeId}/subjects/statistics`
    );
    return response.data.data;
  }

  /**
   * Calculate total hours for a subject based on group splitting
   */
  calculateTotalHours(weeklyHours: number, groupCount: number): number {
    return weeklyHours * groupCount;
  }

  /**
   * Format hours display string
   */
  formatHours(
    weeklyHours: number,
    groupCount: number,
    isSplitGroups: boolean
  ): string {
    if (isSplitGroups && groupCount > 1) {
      const total = this.calculateTotalHours(weeklyHours, groupCount);
      return `${weeklyHours} saat × ${groupCount} qrup = ${total} saat`;
    }
    return `${weeklyHours} saat`;
  }

  /**
   * Get activity types array from flags
   */
  getActivityTypes(
    isTeachingActivity: boolean,
    isExtracurricular: boolean,
    isClub: boolean
  ): string[] {
    const types: string[] = [];
    if (isTeachingActivity) types.push('Tədris fəaliyyəti');
    if (isExtracurricular) types.push('Dərsdənkənar məşğələ');
    if (isClub) types.push('Dərnək');
    return types;
  }

  /**
   * Validate subject data before submission
   */
  validateSubjectData(data: CreateGradeSubjectDTO | UpdateGradeSubjectDTO): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if ('subject_id' in data && !data.subject_id) {
      errors.push('Fənn seçilməlidir');
    }

    if (data.weekly_hours < 1 || data.weekly_hours > 10) {
      errors.push('Həftəlik saat sayı 1-10 arasında olmalıdır');
    }

    if (data.group_count < 1 || data.group_count > 4) {
      errors.push('Qrup sayı 1-4 arasında olmalıdır');
    }

    if (data.is_split_groups && data.group_count < 2) {
      errors.push('Qruplara bölünən fənn üçün ən azı 2 qrup seçilməlidir');
    }

    if (
      !data.is_teaching_activity &&
      !data.is_extracurricular &&
      !data.is_club
    ) {
      errors.push('Ən azı bir fəaliyyət növü seçilməlidir');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const curriculumService = new CurriculumService();
export default curriculumService;
