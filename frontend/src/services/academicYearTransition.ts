import { apiClient } from './api';

export interface TransitionOptions {
  copy_subjects?: boolean;
  copy_teachers?: boolean;
  promote_students?: boolean;
  copy_homeroom_teachers?: boolean;
  copy_subject_teachers?: boolean;
  copy_teaching_loads?: boolean;
  exclude_student_ids?: number[];
  retain_student_ids?: number[];
}

export interface TransitionPreview {
  source_year: { id: number; name: string };
  target_year: { id: number; name: string };
  institution: { id: number; name: string };
  grades: {
    to_create: GradePreviewItem[];
    already_exist: GradePreviewItem[];
    total_source: number;
  };
  students: {
    total: number;
    to_promote: number;
    to_graduate: number;
    no_target_grade: number;
    by_grade_level: Record<number, number>;
  };
  teachers: {
    homeroom_teachers: TeacherPreviewItem[];
    homeroom_count: number;
    subject_teachers_count: number;
    teaching_loads_count: number;
  };
  warnings: TransitionWarning[];
}

export interface GradePreviewItem {
  id: number;
  name: string;
  class_level: number;
  full_name: string;
  student_count: number;
  specialty?: string;
  existing_id?: number;
}

export interface TeacherPreviewItem {
  grade_id: number;
  grade_name: string;
  teacher_id: number;
  teacher_name: string;
}

export interface TransitionWarning {
  type: string;
  message: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
}

export interface TransitionStatus {
  id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  progress_percentage: number;
  current_step: string | null;
  source_year: string;
  target_year: string;
  institution: string;
  initiated_by: string;
  summary: TransitionSummary;
  can_rollback: boolean;
  rollback_expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface TransitionSummary {
  grades: { created: number; skipped: number };
  students: { promoted: number; graduated: number; retained: number; skipped: number };
  teachers: { assignments_copied: number };
}

export interface TransitionDetail {
  id: number;
  transition_id: number;
  entity_type: string;
  source_entity_id: number | null;
  target_entity_id: number | null;
  action: string;
  reason: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface StudentPreviewItem {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  grade_id: number;
  grade_name: string;
  class_level: number;
  is_graduating: boolean;
  enrollment_type: string;
}

class AcademicYearTransitionService {
  private endpoint = '/academic-year-transitions';

  /**
   * Preview transition without executing
   */
  async preview(
    sourceAcademicYearId: number,
    targetAcademicYearId: number,
    institutionId: number,
    options?: TransitionOptions
  ): Promise<TransitionPreview> {
    const response = await apiClient.post<{ success: boolean; data: TransitionPreview }>(
      `${this.endpoint}/preview`,
      {
        source_academic_year_id: sourceAcademicYearId,
        target_academic_year_id: targetAcademicYearId,
        institution_id: institutionId,
        options,
      }
    );
    return response.data.data;
  }

  /**
   * Preview grades for transition
   */
  async previewGrades(
    sourceAcademicYearId: number,
    targetAcademicYearId: number,
    institutionId: number
  ): Promise<{ to_create: GradePreviewItem[]; already_exist: GradePreviewItem[]; total_source: number }> {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      `${this.endpoint}/grades-preview`,
      {
        params: {
          source_academic_year_id: sourceAcademicYearId,
          target_academic_year_id: targetAcademicYearId,
          institution_id: institutionId,
        },
      }
    );
    return response.data.data;
  }

  /**
   * Preview students for promotion
   */
  async previewStudents(
    sourceAcademicYearId: number,
    institutionId: number,
    gradeId?: number
  ): Promise<StudentPreviewItem[]> {
    const response = await apiClient.get<{ success: boolean; data: StudentPreviewItem[] }>(
      `${this.endpoint}/students-preview`,
      {
        params: {
          source_academic_year_id: sourceAcademicYearId,
          institution_id: institutionId,
          grade_id: gradeId,
        },
      }
    );
    return response.data.data;
  }

  /**
   * Initiate transition
   */
  async initiate(
    sourceAcademicYearId: number,
    targetAcademicYearId: number,
    institutionId: number,
    options: TransitionOptions
  ): Promise<TransitionStatus> {
    const response = await apiClient.post<{ success: boolean; data: TransitionStatus }>(
      `${this.endpoint}/initiate`,
      {
        source_academic_year_id: sourceAcademicYearId,
        target_academic_year_id: targetAcademicYearId,
        institution_id: institutionId,
        options,
      }
    );
    return response.data.data;
  }

  /**
   * Get transition status
   */
  async getStatus(transitionId: number): Promise<TransitionStatus> {
    const response = await apiClient.get<{ success: boolean; data: TransitionStatus }>(
      `${this.endpoint}/${transitionId}`
    );
    return response.data.data;
  }

  /**
   * Get transition progress (for polling)
   */
  async getProgress(transitionId: number): Promise<{
    id: number;
    status: string;
    progress_percentage: number;
    current_step: string | null;
  }> {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      `${this.endpoint}/${transitionId}/progress`
    );
    return response.data.data;
  }

  /**
   * Get transition details
   */
  async getDetails(
    transitionId: number,
    params?: { per_page?: number; entity_type?: string; action?: string }
  ): Promise<{ data: TransitionDetail[]; meta: any; summary: TransitionSummary }> {
    const response = await apiClient.get<{
      success: boolean;
      data: TransitionDetail[];
      meta: any;
      summary: TransitionSummary;
    }>(`${this.endpoint}/${transitionId}/details`, { params });
    return response.data;
  }

  /**
   * Rollback transition
   */
  async rollback(transitionId: number): Promise<void> {
    await apiClient.post(`${this.endpoint}/${transitionId}/rollback`);
  }

  /**
   * Get transition history for institution
   */
  async getHistory(
    institutionId: number,
    perPage = 15
  ): Promise<{ data: TransitionStatus[]; meta: any }> {
    const response = await apiClient.get<{ success: boolean; data: TransitionStatus[]; meta: any }>(
      `${this.endpoint}/institution/${institutionId}/history`,
      { params: { per_page: perPage } }
    );
    return response.data;
  }
}

export const academicYearTransitionService = new AcademicYearTransitionService();
export default academicYearTransitionService;
