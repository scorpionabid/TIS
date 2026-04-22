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
    const response = await api.get<any>(
      `${this.baseUrl}/${gradeId}/subjects`
    );

    // Backend returns: {success: true, data: [...], meta: {...}}
    // ApiClient returns this structure as-is
    return {
      subjects: response.data || [],
      meta: (response as any).meta || {},
    };
  }

  /**
   * Get available subjects for a grade (not yet assigned)
   */
  async getAvailableSubjects(gradeId: number, educationType?: string): Promise<AvailableSubject[]> {
    const response = await api.get<AvailableSubjectsResponse>(
      `${this.baseUrl}/${gradeId}/subjects/available`,
      { education_type: educationType }
    );
    // API client already unwraps the response, so response.data is the array
    return response.data as unknown as AvailableSubject[];
  }

   /**
   * Get the master curriculum plan for an institution and academic year
   */
  async getMasterPlan(institutionId: number, academicYearId: number): Promise<{ 
    items: any[], 
    assignedHours: any[],
    approval?: {
      status: 'draft' | 'submitted' | 'approved' | 'returned';
      return_comment?: string;
      submitted_at?: string;
      approved_at?: string;
      returned_at?: string;
    };
    deadline?: string | null;
    is_locked?: boolean;
  }> {
    const response = await api.get<any>(`/curriculum-plans`, {
      institution_id: institutionId,
      academic_year_id: academicYearId,
    });
    
    const data = response as any;
    return {
      items: data.items || [],
      assignedHours: data.assigned_hours || [],
      approval: data.approval,
      deadline: data.deadline,
      is_locked: data.is_locked,
    };
  }

  /**
   * Submit plan for approval
   */
  async submitPlan(institutionId: number, academicYearId: number): Promise<void> {
    await api.post(`/curriculum-plans/submit`, {
      institution_id: institutionId,
      academic_year_id: academicYearId
    });
  }

  /**
   * Approve plan (Sector Admin)
   */
  async approvePlan(institutionId: number, academicYearId: number): Promise<void> {
    await api.post(`/curriculum-plans/approve`, {
      institution_id: institutionId,
      academic_year_id: academicYearId
    });
  }

  /**
   * Return plan with comment (Sector Admin)
   */
  async returnPlan(institutionId: number, academicYearId: number, comment: string): Promise<void> {
    await api.post(`/curriculum-plans/return`, {
      institution_id: institutionId,
      academic_year_id: academicYearId,
      comment
    });
  }

  /**
   * Reset plan (Region Admin)
   */
  async resetPlan(institutionId: number, academicYearId: number): Promise<void> {
    await api.post(`/curriculum-plans/reset`, {
      institution_id: institutionId,
      academic_year_id: academicYearId
    });
  }

  /**
   * Get regional curriculum settings
   */
  async getSettings(): Promise<{ 
    deadline: string | null; 
    is_locked: boolean;
    can_sektor_edit: boolean;
    can_operator_edit: boolean;
  }> {
    const response = await api.get<any>(`/curriculum-plans/settings`);
    return response as any;
  }

  /**
   * Update regional curriculum settings
   */
  async updateSettings(data: { 
    deadline: string | null; 
    is_locked: boolean;
    can_sektor_edit: boolean;
    can_operator_edit: boolean;
  }): Promise<void> {
    await api.post(`/curriculum-plans/settings`, data);
  }

  /**
   * Get detailed teaching workload for an institution
   */
  async getDetailedWorkload(institutionId: number, academicYearId: number): Promise<any[]> {
    const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
    const response = await api.get<any>(`/teaching-loads/institution/${institutionId}${params}`);
    return (response as any)?.data || [];
  }

  /**
   * Save/Update bulk curriculum plan entries
   */
  async saveMasterPlan(institutionId: number, academicYearId: number, items: any[]): Promise<void> {
    await api.post(`/curriculum-plans`, {
      institution_id: institutionId,
      academic_year_id: academicYearId,
      items
    });
  }

  /**
   * Delete a whole subject row from the master plan
   */
  async deleteMasterPlanSubject(institutionId: number, academicYearId: number, subjectId: number, educationType: string): Promise<void> {
    await api.post(`/curriculum-plans/delete`, {
      institution_id: institutionId,
      academic_year_id: academicYearId,
      subject_id: subjectId,
      education_type: educationType
    });
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
    // Clear ALL cache for this grade to ensure available subjects and lists are refreshed
    api.clearCache(`/grades/${gradeId}`);
    return response.data as unknown as GradeSubject;
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
    // Clear grades list + individual grade cache
    api.clearCache('/grades');
    return response.data as unknown as GradeSubject;
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
    // Clear ALL cache for this grade
    api.clearCache(`/grades/${gradeId}`);
    return response.message || '';
  }

  /**
   * Bulk remove subjects from grade curriculum
   */
  async bulkRemoveSubjectsFromCurriculum(
    gradeId: number,
    gradeSubjectIds: number[]
  ): Promise<string> {
    const response = await api.delete<DeleteGradeSubjectResponse>(
      `${this.baseUrl}/${gradeId}/subjects/bulk`,
      { ids: gradeSubjectIds }
    );
    // Clear ALL cache for this grade
    api.clearCache(`/grades/${gradeId}`);
    return response.message || '';
  }

  /**
   * Get curriculum statistics for a grade
   */
  async getCurriculumStatistics(
    gradeId: number
  ): Promise<CurriculumStatistics> {
    const response = await api.get<any>(
      `${this.baseUrl}/${gradeId}/subjects/statistics`
    );
    // Backend returns: {success: true, data: {...}}
    return response.data || {};
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

    if (data.weekly_hours < 0.5 || data.weekly_hours > 10) {
      errors.push('Həftəlik saat sayı 0.5-10 arasında olmalıdır');
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
