import { apiClient } from './api';

export interface SchoolAssessment {
  id: number;
  assessment_type_id: number;
  assessment_stage_id: number;
  institution_id: number;
  created_by: number;
  scheduled_date?: string | null;
  title?: string | null;
  generated_title?: string;
  subjects: string[];
  grade_levels: string[];
  total_students?: number | null;
  participants_count?: number | null;
  status: 'draft' | 'in_progress' | 'completed' | 'submitted';
  notes?: string | null;
  assessment_type?: any;
  stage?: any;
  class_results?: ClassAssessmentResult[];
}

export interface ClassAssessmentResult {
  id: number;
  school_assessment_id: number;
  class_label: string;
  grade_level?: string | null;
  subject?: string | null;
  student_count?: number | null;
  participant_count?: number | null;
  metadata: Record<string, any>;
  recorded_at?: string;
}

export interface SchoolAssessmentFilters {
  assessment_type_id?: number;
  status?: string;
  per_page?: number;
  page?: number;
}

export interface CreateSchoolAssessmentPayload {
  assessment_type_id: number;
  assessment_stage_id: number;
  scheduled_date?: string;
  title?: string;
  subjects: string[];
  grade_levels: string[];
  notes?: string;
  total_students?: number | string;
  participants_count?: number | string;
  institution_id?: number;
}

export interface ClassResultPayload {
  class_label: string;
  grade_level?: string;
  subject?: string;
  student_count?: number | string;
  participant_count?: number | string;
  results: Record<string, any>;
}

class SchoolAssessmentService {
  async getAssessments(filters: SchoolAssessmentFilters = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const query = params.toString();
    const response = await apiClient.get(`/school-assessments${query ? `?${query}` : ''}`);
    return response.data ?? response;
  }

  async createAssessment(payload: CreateSchoolAssessmentPayload): Promise<SchoolAssessment> {
    const response = await apiClient.post('/school-assessments', payload);
    return response.data?.data ?? response.data ?? response;
  }

  async getAssessment(id: number): Promise<SchoolAssessment> {
    const response = await apiClient.get(`/school-assessments/${id}`);
    return response.data?.data ?? response.data ?? response;
  }

  async saveClassResult(assessmentId: number, payload: ClassResultPayload): Promise<ClassAssessmentResult> {
    const response = await apiClient.post(`/school-assessments/${assessmentId}/class-results`, payload);
    return response.data?.data ?? response.data ?? response;
  }

  async completeAssessment(assessmentId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/school-assessments/${assessmentId}/complete`, {});
    return response.data ?? response;
  }

  async deleteClassResult(assessmentId: number, resultId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/school-assessments/${assessmentId}/class-results/${resultId}`);
    return response.data ?? response;
  }

  async getSummaryReport(params: { assessment_type_id: number; assessment_stage_id: number; institution_id?: number; class_label?: string; subject?: string; }): Promise<any> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const query = searchParams.toString();
    const response = await apiClient.get(`/school-assessments/reports/summary${query ? `?${query}` : ''}`);
    return response.data?.data ?? response.data ?? response;
  }

  async exportToExcel(assessmentId: number): Promise<Blob> {
    const response = await apiClient.get(`/school-assessments/${assessmentId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportSummaryReport(params: {
    assessment_type_id: number;
    assessment_stage_id: number;
    institution_id?: number;
    class_label?: string;
    subject?: string;
  }): Promise<Blob> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const query = searchParams.toString();
    const response = await apiClient.get(`/school-assessments/reports/summary/export${query ? `?${query}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const schoolAssessmentService = new SchoolAssessmentService();
export default schoolAssessmentService;
