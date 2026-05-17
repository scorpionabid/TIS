import { apiClient, ApiResponse } from './api';
import { logger } from '@/utils/logger';
import { PaginationMeta } from '@/types/api';
import {
  Grade,
  GradeSubject,
  GradeFilters,
  GradeCreateData,
  GradeUpdateData,
  GradeStatistics,
  GradeStudent,
  EnrollmentData,
  TransferData
} from '@/types/grades';

// Split services
import { GradeStudentService } from './grades/gradeStudentService';
import { GradeNamingService } from './grades/gradeNamingService';
import { GradeAnalyticsService } from './grades/gradeAnalyticsService';

interface GradeListResult {
  items: Grade[];
  pagination?: PaginationMeta | null;
}

class GradeService {
  private readonly baseURL = '/grades';
  private readonly students: GradeStudentService;
  private readonly naming: GradeNamingService;
  private readonly analytics: GradeAnalyticsService;

  constructor() {
    this.students = new GradeStudentService();
    this.naming = new GradeNamingService();
    this.analytics = new GradeAnalyticsService();
  }

  /**
   * Get grades - alias for getGrades (for compatibility with EntityManagerV2)
   */
  async get(filters?: GradeFilters): Promise<GradeListResult> {
    const response = await this.getGrades(filters);
    const responseData = (response as any).data || response;
    
    if (responseData && 'grades' in responseData && Array.isArray(responseData.grades)) {
      return {
        items: responseData.grades,
        pagination: responseData.pagination || (response as any).meta || null,
      };
    }
    
    if (responseData && responseData.data && typeof responseData.data === 'object' && 'grades' in responseData.data) {
      const nestedData = responseData.data;
      return {
        items: Array.isArray(nestedData.grades) ? nestedData.grades : [],
        pagination: nestedData.pagination || (response as any).meta || null,
      };
    }
    
    if (Array.isArray(responseData)) {
      return { items: responseData, pagination: null };
    }

    return { items: [], pagination: null };
  }

  /**
   * Get grades with filtering and pagination
   */
  async getGrades(filters?: GradeFilters): Promise<ApiResponse<Grade[]>> {
    logger.debug('Fetching grades', { component: 'GradeService', action: 'getGrades', data: { filters } });
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'boolean') params.append(key, value ? '1' : '0');
          else params.append(key, value.toString());
        }
      });
    }
    const url = params.toString() ? `${this.baseURL}?${params}` : this.baseURL;
    return apiClient.get<Grade[]>(url);
  }

  /**
   * Get a specific grade by ID
   */
  async getGrade(id: number, include?: string[]): Promise<ApiResponse<Grade>> {
    const params = new URLSearchParams();
    if (include && include.length > 0) params.append('include', include.join(','));
    const url = params.toString() ? `${this.baseURL}/${id}?${params}` : `${this.baseURL}/${id}`;
    return apiClient.get<Grade>(url);
  }

  /**
   * Create grade - alias for createGrade
   */
  async create(data: GradeCreateData): Promise<Grade> {
    const response = await this.createGrade(data);
    return response.data;
  }

  /**
   * Create a new grade
   */
  async createGrade(data: GradeCreateData): Promise<ApiResponse<Grade>> {
    return apiClient.post<Grade>(this.baseURL, data);
  }

  /**
   * Update grade - alias for updateGrade
   */
  async update(id: number, data: GradeUpdateData): Promise<Grade> {
    const response = await this.updateGrade(id, data);
    return response.data;
  }

  /**
   * Update an existing grade
   */
  async updateGrade(id: number, data: GradeUpdateData): Promise<ApiResponse<Grade>> {
    return apiClient.put<Grade>(`${this.baseURL}/${id}`, data);
  }

  /**
   * Deactivate a grade (soft delete)
   */
  async deactivate(id: number, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.baseURL}/${id}/deactivate`, { reason });
  }

  /**
   * Delete grade - alias for deleteGrade
   */
  async delete(id: number): Promise<void> {
    const response = await this.deleteGrade(id);
    return response.data;
  }

  /**
   * Permanently delete a grade
   */
  async deleteGrade(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.baseURL}/${id}`);
  }

  /**
   * Get subjects for a specific grade
   */
  async getGradeSubjects(gradeId: number): Promise<ApiResponse<GradeSubject[]>> {
    return apiClient.get<GradeSubject[]>(`${this.baseURL}/${gradeId}/subjects`);
  }

  /**
   * Duplicate/Copy a grade with its curriculum
   */
  async duplicateGrade(gradeId: number, data: { name: string; class_level?: number; copy_subjects?: boolean; academic_year_id?: number; }): Promise<ApiResponse<Grade>> {
    return apiClient.post<Grade>(`${this.baseURL}/${gradeId}/duplicate`, data);
  }

  /**
   * Get available rooms for a grade
   */
  async getAvailableRooms(institutionId: number, academicYearId: number, excludeGradeId?: number): Promise<ApiResponse<Array<any>>> {
    const params = new URLSearchParams({ institution_id: institutionId.toString(), academic_year_id: academicYearId.toString() });
    if (excludeGradeId) params.append('exclude_grade_id', excludeGradeId.toString());
    return apiClient.get<Array<any>>(`/rooms/available?${params}`);
  }

  /**
   * Get available teachers for a grade
   */
  async getAvailableTeachers(institutionId: number, excludeGradeId?: number): Promise<ApiResponse<Array<any>>> {
    const params = new URLSearchParams({ institution_id: institutionId.toString(), role: 'müəllim' });
    if (excludeGradeId) params.append('exclude_grade_id', excludeGradeId.toString());
    return apiClient.get<Array<any>>(`/teachers/available?${params}`);
  }

  /**
   * Assign homeroom teacher to a grade
   */
  async assignTeacher(gradeId: number, teacherId: number): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.baseURL}/${gradeId}/assign-teacher`, { teacher_id: teacherId });
  }

  /**
   * Remove homeroom teacher from a grade
   */
  async removeTeacher(gradeId: number): Promise<ApiResponse<void>> {
    return apiClient.delete(`${this.baseURL}/${gradeId}/remove-teacher`);
  }

  // Delegate to GradeStudentService
  getGradeStudents(...args: Parameters<GradeStudentService['getGradeStudents']>) {
    return this.students.getGradeStudents(...args);
  }
  enrollStudent(...args: Parameters<GradeStudentService['enrollStudent']>) {
    return this.students.enrollStudent(...args);
  }
  enrollMultipleStudents(...args: Parameters<GradeStudentService['enrollMultipleStudents']>) {
    return this.students.enrollMultipleStudents(...args);
  }
  unenrollStudent(...args: Parameters<GradeStudentService['unenrollStudent']>) {
    return this.students.unenrollStudent(...args);
  }
  transferStudent(...args: Parameters<GradeStudentService['transferStudent']>) {
    return this.students.transferStudent(...args);
  }
  updateEnrollmentStatus(...args: Parameters<GradeStudentService['updateEnrollmentStatus']>) {
    return this.students.updateEnrollmentStatus(...args);
  }

  // Delegate to GradeNamingService
  getNamingOptions(...args: Parameters<GradeNamingService['getNamingOptions']>) {
    return this.naming.getNamingOptions(...args);
  }
  getNamingSuggestions(...args: Parameters<GradeNamingService['getNamingSuggestions']>) {
    return this.naming.getNamingSuggestions(...args);
  }
  getNamingSystemStats(...args: Parameters<GradeNamingService['getNamingSystemStats']>) {
    return this.naming.getNamingSystemStats(...args);
  }

  // Delegate to GradeAnalyticsService
  getStatistics(...args: Parameters<GradeAnalyticsService['getStatistics']>) {
    return this.analytics.getStatistics(...args);
  }
  getCapacityReport(...args: Parameters<GradeAnalyticsService['getCapacityReport']>) {
    return this.analytics.getCapacityReport(...args);
  }
  getGradeAnalytics(...args: Parameters<GradeAnalyticsService['getGradeAnalytics']>) {
    return this.analytics.getGradeAnalytics(...args);
  }
}

export const gradeService = new GradeService();
export default gradeService;
