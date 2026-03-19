import { apiClient, ApiResponse } from './api';
import { logger } from '@/utils/logger';
import { PaginationMeta } from '@/types/api';

export interface GradeSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code?: string;
  weekly_hours: number;
  is_teaching_activity: boolean;
  teacher_id?: number;
  teacher_name?: string;
  has_grade_book: boolean;
  grade_book_id?: number;
  grade_book_status?: string;
}

export interface Grade {
  id: number;
  name: string;
  full_name: string;
  display_name: string;
  class_level: number;
  class_type?: string | null;
  class_profile?: string | null;
  teaching_shift?: string | null;
  academic_year_id: number;
  institution_id: number;
  room_id?: number;
  homeroom_teacher_id?: number;
  student_count: number;
  male_student_count?: number;
  female_student_count?: number;
  assigned_student_count?: number; // Students assigned from Students page
  specialty?: string;
  description?: string;
  education_program?: string;
  is_active: boolean;
  teacher_assigned_at?: string;
  teacher_removed_at?: string;
  deactivated_at?: string;
  deactivated_by?: number;
  
  // Related data
  academic_year?: {
    id: number;
    name: string;
    is_active: boolean;
  };
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  room?: {
    id: number;
    name: string;
    full_identifier: string;
    capacity: number;
    room_type: string;
  };
  homeroom_teacher?: {
    id: number;
    full_name: string;
    email: string;
  };
  grade_subjects?: GradeSubject[];
  
  // Computed attributes
  capacity_status: 'available' | 'near_capacity' | 'full' | 'over_capacity' | 'no_room';
  utilization_rate: number;
  available_spots: number;

  // Tags (eager-loaded when included)
  tags?: Array<{ id: number; name: string; color?: string; category?: string }>;

  created_at: string;
  updated_at: string;
}

export interface GradeStudent {
  id: number;
  full_name: string;
  email: string;
  enrollment_date?: string;
  enrollment_status: 'active' | 'inactive' | 'transferred' | 'graduated';
  enrollment_notes?: string;
}

export interface GradeFilters {
  institution_id?: number;
  class_level?: number;
  academic_year_id?: number;
  room_id?: number;
  homeroom_teacher_id?: number;
  specialty?: string;
  is_active?: boolean;
  has_room?: boolean;
  has_teacher?: boolean;
  capacity_status?: string;
  search?: string;
  page?: number;
  per_page?: number;
  include?: string;
}

interface GradeListResult {
  items: Grade[];
  pagination?: PaginationMeta | null;
}

export interface GradeCreateData {
  name: string;
  class_level: number;
  academic_year_id: number;
  institution_id: number;
  room_id?: number;
  homeroom_teacher_id?: number;
  specialty?: string;
  grade_category?: string;
  grade_type?: string;
  class_type?: string;
  class_profile?: string;
  teaching_shift?: string;
  education_program?: string;
  description?: string;
  student_count?: number;
  male_student_count?: number;
  female_student_count?: number;
  tag_ids?: number[];
  metadata?: Record<string, any>;
}

export interface GradeUpdateData {
  name?: string;
  room_id?: number | null;
  homeroom_teacher_id?: number | null;
  class_level?: number;
  specialty?: string;
  grade_category?: string;
  grade_type?: string;
  class_type?: string;
  class_profile?: string;
  teaching_shift?: string;
  education_program?: string;
  description?: string;
  student_count?: number;
  male_student_count?: number;
  female_student_count?: number;
  tag_ids?: number[];
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface GradeStatistics {
  overview: {
    total_grades: number;
    active_grades: number;
    inactive_grades: number;
    grades_with_rooms: number;
    grades_without_rooms: number;
    grades_with_teachers: number;
    grades_without_teachers: number;
  };
  students: {
    total_students: number;
    average_per_grade: number;
    min_per_grade: number;
    max_per_grade: number;
  };
  class_level_distribution: Array<{
    class_level: number;
    count: number;
  }>;
}

export interface EnrollmentData {
  student_id: number;
  enrollment_date?: string;
  enrollment_notes?: string;
}

export interface TransferData {
  target_grade_id: number;
  transfer_date?: string;
  transfer_reason?: string;
  notes?: string;
}

class GradeService {
  private readonly baseURL = '/grades';

  /**
   * Get grades - alias for getGrades (for compatibility with EntityManagerV2)
   * Handles both { success, data: { grades, pagination } } and direct array formats
   */
  async get(filters?: GradeFilters): Promise<GradeListResult> {
    const response = await this.getGrades(filters);

    // response is already the data from apiClient (axios response.data)
    // Handle different response formats
    if (response && typeof response === 'object') {
      // Check if response has data property (ApiResponse wrapper)
      const responseData = (response as any).data || response;
      
      // Check if data contains grades directly
      if (responseData && 'grades' in responseData && Array.isArray(responseData.grades)) {
        return {
          items: responseData.grades,
          pagination: responseData.pagination || (response as any).meta || null,
        };
      }
      
      // Check if data.data contains grades (double nested from backend)
      if (responseData && responseData.data && typeof responseData.data === 'object' && 'grades' in responseData.data) {
        const nestedData = responseData.data;
        return {
          items: Array.isArray(nestedData.grades) ? nestedData.grades : [],
          pagination: nestedData.pagination || (response as any).meta || null,
        };
      }
      
      // If data is an array directly
      if (Array.isArray(responseData)) {
        return {
          items: responseData,
          pagination: null,
        };
      }
    }

    return {
      items: [],
      pagination: null,
    };
  }

  /**
   * Get grades with filtering and pagination
   */
  async getGrades(filters?: GradeFilters): Promise<ApiResponse<Grade[]>> {
    logger.debug('Fetching grades', { 
      component: 'GradeService',
      action: 'getGrades',
      data: { filters }
    });

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Handle boolean values properly
          if (typeof value === 'boolean') {
            params.append(key, value ? '1' : '0');
          } else {
            params.append(key, value.toString());
          }
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
    logger.debug('Fetching grade details', {
      component: 'GradeService',
      action: 'getGrade', 
      data: { id, include }
    });

    const params = new URLSearchParams();
    if (include && include.length > 0) {
      params.append('include', include.join(','));
    }

    const url = params.toString() ? `${this.baseURL}/${id}?${params}` : `${this.baseURL}/${id}`;
    return apiClient.get<Grade>(url);
  }

  /**
   * Create grade - alias for createGrade (for compatibility with EntityManagerV2)
   */
  async create(data: GradeCreateData): Promise<Grade> {
    const response = await this.createGrade(data);
    return response.data;
  }

  /**
   * Create a new grade
   */
  async createGrade(data: GradeCreateData): Promise<ApiResponse<Grade>> {
    logger.debug('Creating new grade', {
      component: 'GradeService',
      action: 'createGrade',
      data: { name: data.name, class_level: data.class_level, institution_id: data.institution_id }
    });

    return apiClient.post<Grade>(this.baseURL, data);
  }

  /**
   * Update grade - alias for updateGrade (for compatibility with EntityManagerV2)
   */
  async update(id: number, data: GradeUpdateData): Promise<Grade> {
    const response = await this.updateGrade(id, data);
    return response.data;
  }

  /**
   * Update an existing grade
   */
  async updateGrade(id: number, data: GradeUpdateData): Promise<ApiResponse<Grade>> {
    logger.debug('Updating grade', {
      component: 'GradeService',
      action: 'updateGrade',
      data: { id, updates: Object.keys(data) }
    });

    return apiClient.put<Grade>(`${this.baseURL}/${id}`, data);
  }

  /**
   * Deactivate a grade (soft delete) - makes grade inactive but preserves data
   */
  async deactivate(id: number, reason?: string): Promise<ApiResponse<void>> {
    logger.debug('Deactivating grade', {
      component: 'GradeService',
      action: 'deactivate',
      data: { id, reason }
    });

    return apiClient.post<void>(`${this.baseURL}/${id}/deactivate`, { reason });
  }

  /**
   * Delete grade - alias for deleteGrade (for compatibility with EntityManagerV2)
   * WARNING: This performs a HARD DELETE (permanent removal)
   */
  async delete(id: number): Promise<void> {
    const response = await this.deleteGrade(id);
    return response.data;
  }

  /**
   * Permanently delete a grade (hard delete)
   * WARNING: This permanently removes the grade and cannot be undone
   */
  async deleteGrade(id: number): Promise<ApiResponse<void>> {
    logger.debug('Permanently deleting grade', {
      component: 'GradeService',
      action: 'deleteGrade',
      data: { id }
    });

    return apiClient.delete<void>(`${this.baseURL}/${id}`);
  }

  /**
   * Get subjects for a specific grade
   */
  async getGradeSubjects(gradeId: number): Promise<ApiResponse<GradeSubject[]>> {
    logger.debug('Fetching grade subjects', {
      component: 'GradeService',
      action: 'getGradeSubjects',
      data: { gradeId }
    });

    return apiClient.get<GradeSubject[]>(`${this.baseURL}/${gradeId}/subjects`);
  }

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
      component: 'GradeService',
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
      component: 'GradeService',
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
      component: 'GradeService',
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
  async unenrollStudent(gradeId: number, studentId: number, data?: {
    unenrollment_reason?: string;
    unenrollment_date?: string;
    notes?: string;
  }): Promise<ApiResponse<void>> {
    logger.debug('Unenrolling student from grade', {
      component: 'GradeService',
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
      component: 'GradeService',
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
      component: 'GradeService',
      action: 'updateEnrollmentStatus',
      data: { gradeId, studentId, status: data.enrollment_status }
    });

    return apiClient.put<void>(`${this.baseURL}/${gradeId}/students/${studentId}/status`, data);
  }

  /**
   * Assign homeroom teacher to a grade
   */
  async assignTeacher(gradeId: number, teacherId: number): Promise<ApiResponse<void>> {
    logger.debug('Assigning teacher to grade', {
      component: 'GradeService',
      action: 'assignTeacher',
      data: { gradeId, teacherId }
    });

    return apiClient.post<void>(`${this.baseURL}/${gradeId}/assign-teacher`, { teacher_id: teacherId });
  }

  /**
   * Remove homeroom teacher from a grade
   */
  async removeTeacher(gradeId: number): Promise<ApiResponse<void>> {
    logger.debug('Removing teacher from grade', {
      component: 'GradeService',
      action: 'removeTeacher',
      data: { gradeId }
    });

    return apiClient.delete(`${this.baseURL}/${gradeId}/remove-teacher`);
  }

  /**
   * Get grade statistics
   */
  async getStatistics(filters?: {
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<ApiResponse<GradeStatistics>> {
    logger.debug('Fetching grade statistics', {
      component: 'GradeService',
      action: 'getStatistics',
      data: { filters }
    });

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString() 
      ? `${this.baseURL}/statistics/overview?${params}`
      : `${this.baseURL}/statistics/overview`;
    
    return apiClient.get<GradeStatistics>(url);
  }

  /**
   * Get capacity report
   */
  async getCapacityReport(filters?: {
    institution_id?: number;
    academic_year_id?: number;
    capacity_status?: string;
  }): Promise<ApiResponse<{
    grades: Array<Grade & {
      capacity_issues: string[];
      recommendations: string[];
    }>;
    summary: {
      total_capacity: number;
      total_enrolled: number;
      available_spots: number;
      utilization_rate: number;
    };
  }>> {
    logger.debug('Fetching capacity report', {
      component: 'GradeService',
      action: 'getCapacityReport',
      data: { filters }
    });

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString()
      ? `${this.baseURL}/reports/capacity?${params}`
      : `${this.baseURL}/reports/capacity`;
    
    return apiClient.get<{
      grades: Array<Grade & {
        capacity_issues: string[];
        recommendations: string[];
      }>;
      summary: any;
    }>(url);
  }

  /**
   * Get available rooms for a grade
   */
  async getAvailableRooms(institutionId: number, academicYearId: number, excludeGradeId?: number): Promise<ApiResponse<Array<{
    id: number;
    name: string;
    capacity: number;
    room_type: string;
    is_available: boolean;
  }>>> {
    const params = new URLSearchParams({
      institution_id: institutionId.toString(),
      academic_year_id: academicYearId.toString()
    });
    
    if (excludeGradeId) {
      params.append('exclude_grade_id', excludeGradeId.toString());
    }

    return apiClient.get<Array<any>>(`/rooms/available?${params}`);
  }

  /**
   * Get grade analytics and performance metrics
   */
  async getGradeAnalytics(gradeId: number): Promise<ApiResponse<any>> {
    logger.debug('Fetching grade analytics', {
      component: 'GradeService',
      action: 'getGradeAnalytics',
      data: { gradeId }
    });

    return apiClient.get<any>(`${this.baseURL}/${gradeId}/analytics`);
  }

  /**
   * Get available teachers for a grade
   */
  async getAvailableTeachers(institutionId: number, excludeGradeId?: number): Promise<ApiResponse<Array<{
    id: number;
    full_name: string;
    email: string;
    is_available: boolean;
    current_grade?: string;
  }>>> {
    const params = new URLSearchParams({
      institution_id: institutionId.toString(),
      role: 'müəllim'
    });
    
    if (excludeGradeId) {
      params.append('exclude_grade_id', excludeGradeId.toString());
    }

    return apiClient.get<Array<any>>(`/teachers/available?${params}`);
  }

  /**
   * Get naming options for grade creation dropdown (NEW - Standardized)
   */
  async getNamingOptions(
    institutionId: number,
    academicYearId: number,
    classLevel?: number,
    extendedLetters: boolean = false
  ): Promise<ApiResponse<{
    class_levels: Array<{ value: number; label: string; stage: string }>;
    letters: Array<{ value: string; label: string; available: boolean; used: boolean }>;
    specialties: Array<{ value: string; label: string; recommended_for: number[] }>;
    existing_names: string[];
    capacity_recommendation: { min: number; recommended: number; max: number } | null;
    should_show_specialty: boolean;
    naming_pattern: string;
    naming_patterns: Record<string, string>;
  }>> {
    logger.debug('Fetching grade naming options', {
      component: 'GradeService',
      action: 'getNamingOptions',
      data: { institutionId, classLevel, academicYearId }
    });

    const params = new URLSearchParams({
      institution_id: institutionId.toString(),
      academic_year_id: academicYearId.toString(),
      extended_letters: extendedLetters ? '1' : '0',
    });

    if (classLevel !== undefined) {
      params.append('class_level', classLevel.toString());
    }

    return apiClient.get<any>(`${this.baseURL}/naming/options?${params}`);
  }

  /**
   * Get smart naming suggestions for grade creation
   */
  async getNamingSuggestions(
    institutionId: number,
    classLevel: number,
    academicYearId: number
  ): Promise<ApiResponse<any>> {
    logger.debug('Fetching grade naming suggestions', {
      component: 'GradeService',
      action: 'getNamingSuggestions',
      data: { institutionId, classLevel, academicYearId }
    });

    const params = new URLSearchParams({
      institution_id: institutionId.toString(),
      class_level: classLevel.toString(),
      academic_year_id: academicYearId.toString()
    });

    return apiClient.get<any>(`${this.baseURL}/naming/suggestions?${params}`);
  }

  /**
   * Get naming system statistics
   */
  async getNamingSystemStats(): Promise<ApiResponse<any>> {
    logger.debug('Fetching naming system statistics', {
      component: 'GradeService',
      action: 'getNamingSystemStats'
    });

    return apiClient.get<any>(`${this.baseURL}/naming/system-stats`);
  }

  /**
   * Duplicate/Copy a grade with its curriculum
   */
  async duplicateGrade(
    gradeId: number,
    data: {
      name: string;
      class_level?: number;
      copy_subjects?: boolean;
      academic_year_id?: number;
    }
  ): Promise<ApiResponse<Grade>> {
    logger.debug('Duplicating grade', {
      component: 'GradeService',
      action: 'duplicateGrade',
      data: {
        gradeId,
        newName: data.name,
        newClassLevel: data.class_level,
        copySubjects: data.copy_subjects
      }
    });

    return apiClient.post<Grade>(`${this.baseURL}/${gradeId}/duplicate`, data);
  }
}

export const gradeService = new GradeService();
