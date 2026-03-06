import { apiClient } from './api';

export interface AssessmentEntryData {
  student_id: number;
  score: number;
  notes?: string;
}

export interface AssessmentEntryForm {
  assessment_type_id: number;
  institution_id: number;
  assessment_date: string;
  grade_level?: string;
  subject?: string;
  entries: AssessmentEntryData[];
}

export interface AssessmentEntryResponse {
  created_count: number;
  error_count: number;
  entries: any[];
}

export interface AssessmentEntrySubmitResponse {
  success: boolean;
  data: AssessmentEntryResponse;
  warnings?: string[];
  message: string;
}

class AssessmentEntryService {
  private baseURL = '/assessment-entries';

  /**
   * Submit assessment entries
   */
  async submitAssessmentEntries(data: AssessmentEntryForm): Promise<AssessmentEntrySubmitResponse> {
    try {
      const response = await apiClient.post(this.baseURL, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmələr saxlanılarkən xəta baş verdi');
    }
  }

  /**
   * Get assessment entries
   */
  async getAssessmentEntries(filters: any = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key].toString());
        }
      });

      const url = `${this.baseURL}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə qeydləri yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get single assessment entry
   */
  async getAssessmentEntry(id: number): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${id}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə qeydi yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Update assessment entry
   */
  async updateAssessmentEntry(id: number, data: Partial<AssessmentEntryData>): Promise<any> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə qeydi yenilənərkən xəta baş verdi');
    }
  }

  /**
   * Delete assessment entry
   */
  async deleteAssessmentEntry(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə qeydi silinərkən xəta baş verdi');
    }
  }

  /**
   * Submit assessment entry for approval
   */
  async submitForApproval(id: number): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseURL}/${id}/submit`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə təsdiqə göndərilərkən xəta baş verdi');
    }
  }

  /**
   * Approve assessment entry
   */
  async approveAssessmentEntry(id: number, notes?: string): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseURL}/${id}/approve`, { notes });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə təsdiqləmərkən xəta baş verdi');
    }
  }

  /**
   * Reject assessment entry
   */
  async rejectAssessmentEntry(id: number, notes: string): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseURL}/${id}/reject`, { notes });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Qiymətləndirmə rədd edilərkən xəta baş verdi');
    }
  }
}

export const assessmentEntryService = new AssessmentEntryService();