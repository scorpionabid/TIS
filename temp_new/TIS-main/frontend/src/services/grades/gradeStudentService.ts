import { apiClient, ApiResponse } from '../api';
import { logger } from '@/utils/logger';
import { 
  GradeStudent, 
  EnrollmentData, 
  TransferData 
} from '@/types/grades';

export class GradeStudentService {
  private readonly baseURL = '/grades';

  /**
   * Get students for a grade
   */
  async getGradeStudents(gradeId: number, filters?: {
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<{
    students: GradeStudent[];
    pagination: any;
  }>> {
    logger.debug('Fetching grade students', {
      component: 'GradeStudentService',
      action: 'getGradeStudents',
      data: { gradeId, filters }
    });

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString() 
      ? `${this.baseURL}/${gradeId}/students?${params}`
      : `${this.baseURL}/${gradeId}/students`;
    
    return apiClient.get<{
      students: GradeStudent[];
      pagination: any;
    }>(url);
  }

  /**
   * Enroll a student in a grade
   */
  async enrollStudent(gradeId: number, data: EnrollmentData): Promise<ApiResponse<void>> {
    logger.debug('Enrolling student in grade', {
      component: 'GradeStudentService',
      action: 'enrollStudent',
      data: { gradeId, student_id: data.student_id }
    });

    return apiClient.post<void>(`${this.baseURL}/${gradeId}/students/enroll`, data);
  }

  /**
   * Enroll multiple students in a grade
   */
  async enrollMultipleStudents(gradeId: number, data: {
    student_ids: number[];
    enrollment_date?: string;
    enrollment_notes?: string;
  }): Promise<ApiResponse<{
    enrolled: number;
    failed: Array<{
      student_id: number;
      error: string;
    }>;
  }>> {
    logger.debug('Enrolling multiple students in grade', {
      component: 'GradeStudentService',
      action: 'enrollMultipleStudents',
      data: { gradeId, count: data.student_ids.length }
    });

    return apiClient.post<{
      enrolled: number;
      failed: Array<{
        student_id: number;
        error: string;
      }>;
    }>(`${this.baseURL}/${gradeId}/students/enroll-multiple`, data);
  }

  /**
   * Remove a student from a grade
   */
  async unenrollStudent(gradeId: number, studentId: number): Promise<ApiResponse<void>> {
    logger.debug('Unenrolling student from grade', {
      component: 'GradeStudentService',
      action: 'unenrollStudent',
      data: { gradeId, studentId }
    });

    return apiClient.delete(`${this.baseURL}/${gradeId}/students/${studentId}`);
  }

  /**
   * Transfer a student to another grade
   */
  async transferStudent(gradeId: number, studentId: number, data: TransferData): Promise<ApiResponse<void>> {
    logger.debug('Transferring student to another grade', {
      component: 'GradeStudentService',
      action: 'transferStudent',
      data: { gradeId, studentId, targetGradeId: data.target_grade_id }
    });

    return apiClient.post<void>(`${this.baseURL}/${gradeId}/students/${studentId}/transfer`, data);
  }

  /**
   * Update student enrollment status
   */
  async updateEnrollmentStatus(gradeId: number, studentId: number, data: {
    enrollment_status: string;
    notes?: string;
  }): Promise<ApiResponse<void>> {
    logger.debug('Updating student enrollment status', {
      component: 'GradeStudentService',
      action: 'updateEnrollmentStatus',
      data: { gradeId, studentId, status: data.enrollment_status }
    });

    return apiClient.put<void>(`${this.baseURL}/${gradeId}/students/${studentId}/status`, data);
  }
}
