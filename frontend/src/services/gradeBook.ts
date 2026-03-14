import { apiClient } from './api';

export interface GradeBookSession {
  id: number;
  institution_id: number;
  grade_id: number;
  subject_id: number;
  academic_year_id: number;
  created_by: number;
  title: string | null;
  status: 'active' | 'archived' | 'closed';
  created_at: string;
  updated_at: string;
  grade?: {
    id: number;
    name: string;
    class_level: number;
  };
  subject?: {
    id: number;
    name: string;
  };
  academic_year?: {
    id: number;
    name: string;
  };
  teachers?: GradeBookTeacher[];
}

export interface GradeBookTeacher {
  id: number;
  grade_book_session_id: number;
  teacher_id: number;
  group_label: string | null;
  is_primary: boolean;
  teacher?: {
    id: number;
    first_name: string;
    last_name: string;
    father_name: string;
    utsi_code?: string;
  };
}

export interface GradeBookColumn {
  id: number;
  grade_book_session_id: number;
  assessment_type_id: number;
  assessment_stage_id: number | null;
  semester: 'I' | 'II';
  column_label: string;
  assessment_date: string;
  max_score: number;
  display_order: number;
  column_type: 'input' | 'calculated';
  is_archived: boolean;
  assessment_type?: {
    id: number;
    name: string;
    category: string;
  };
}

export interface GradeBookCell {
  id: number;
  grade_book_column_id: number;
  student_id: number;
  teacher_id: number | null;
  group_label: string | null;
  score: number | null;
  percentage: number | null;
  grade_mark: string | null;
  is_present: boolean;
  notes: string | null;
  recorded_by: number | null;
  recorded_at: string | null;
}

export interface StudentWithScores {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  father_name: string;
  full_name: string;
  teacher_id?: number | null;
  scores: Record<number, {
    score: number | null;
    percentage: number | null;
    grade_mark: string | null;
    is_present: boolean;
  }>;
}

export interface CreateGradeBookRequest {
  institution_id: number;
  grade_id: number;
  subject_id: number;
  academic_year_id: number;
  title?: string;
}

export interface CreateColumnRequest {
  assessment_type_id: number;
  assessment_stage_id?: number;
  semester: 'I' | 'II';
  column_label: string;
  assessment_date: string;
  max_score?: number;
}

export interface UpdateColumnRequest {
  assessment_type_id?: number;
  assessment_stage_id?: number | null;
  semester?: 'I' | 'II';
  column_label?: string;
  assessment_date?: string;
  max_score?: number;
}

export interface UpdateCellRequest {
  score?: number | null;
  is_present?: boolean;
  notes?: string;
}

export interface BulkUpdateCellsRequest {
  cells: {
    cell_id: number;
    score?: number | null;
    is_present?: boolean;
  }[];
}

export interface AssignTeacherRequest {
  teacher_id: number;
  group_label?: string;
  is_primary?: boolean;
}

class GradeBookService {
  private baseUrl = '/grade-books';

  // Get all grade books
  async getGradeBooks(params?: {
    institution_id?: number;
    academic_year_id?: number;
    grade_id?: number;
    subject_id?: number;
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ data: GradeBookSession[]; meta: any }> {
    const response = await apiClient.get(this.baseUrl, { params });
    // Handle different response formats
    const responseData = response.data;
    
    // If backend returns { success: true, data: [...], meta: {...} }
    if (responseData.success && Array.isArray(responseData.data)) {
      return { data: responseData.data, meta: responseData.meta || {} };
    }
    
    // If backend returns { data: [...], meta: {...} } directly
    if (Array.isArray(responseData.data)) {
      return { data: responseData.data, meta: responseData.meta || {} };
    }
    
    // Direct array response
    if (Array.isArray(responseData)) {
      return { data: responseData, meta: {} };
    }
    
    return { data: [], meta: {} };
  }

  // Create new grade book
  async createGradeBook(data: CreateGradeBookRequest): Promise<{ data: GradeBookSession }> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  // Get grade book details
  async getGradeBook(id: number): Promise<{
    data: {
      grade_book: GradeBookSession;
      students: StudentWithScores[];
      columns_by_semester: Record<string, GradeBookColumn[]>;
      input_columns: GradeBookColumn[];
      calculated_columns: GradeBookColumn[];
    }
  }> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    // Handle different response formats
    const responseData = response.data;
    
    // If backend returns { success: true, data: {...} }
    if (responseData.success && responseData.data) {
      return { data: responseData.data };
    }
    
    // If backend returns { data: {...} } directly
    if (responseData.data && responseData.data.grade_book) {
      return responseData;
    }
    
    // Direct response
    return { data: responseData as any };
  }

  // Get students with scores
  async getStudentsWithScores(id: number): Promise<{ data: StudentWithScores[] }> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/students`);
    return response.data;
  }

  // Add new column (exam)
  async addColumn(gradeBookId: number, data: CreateColumnRequest): Promise<{ data: GradeBookColumn }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/columns`, data);
    return response.data;
  }

  // Update column (exam)
  async updateColumn(columnId: number, data: UpdateColumnRequest): Promise<{ data: GradeBookColumn }> {
    const response = await apiClient.patch(`${this.baseUrl}/columns/${columnId}`, data);
    return response.data;
  }

  // Archive column
  async archiveColumn(columnId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/columns/${columnId}`);
  }

  // Update cell (score)
  async updateCell(cellId: number, data: UpdateCellRequest): Promise<{ data: GradeBookCell }> {
    const response = await apiClient.patch(`${this.baseUrl}/cells/${cellId}`, data);
    return response.data;
  }

  // Bulk update cells
  async bulkUpdateCells(gradeBookId: number, data: BulkUpdateCellsRequest): Promise<{ message: string; updated_count: number }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/cells/bulk-update`, data);
    return response.data;
  }

  // Assign teacher
  async assignTeacher(gradeBookId: number, data: AssignTeacherRequest): Promise<{ data: GradeBookTeacher }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/teachers`, data);
    return response.data;
  }

  // Remove teacher assignment
  async removeTeacher(teacherAssignmentId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/teachers/${teacherAssignmentId}`);
  }

  // Assign teacher to specific student
  async assignStudentTeacher(gradeBookId: number, studentId: number, teacherId: number | null): Promise<{ message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/students/${studentId}/teacher`, {
      teacher_id: teacherId,
    });
    return response.data;
  }

  // Recalculate all scores
  async recalculate(gradeBookId: number): Promise<{ message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/recalculate`);
    return response.data;
  }

  // Helper: Get score color based on value
  getScoreColor(score: number | null): string {
    if (score === null) return 'gray';
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 30) return 'orange';
    return 'red';
  }

  // Helper: Get score background class
  getScoreBackgroundClass(score: number | null): string {
    if (score === null) return 'bg-white';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 30) return 'bg-orange-100';
    return 'bg-red-100';
  }

  // Helper: Convert score to grade mark (2-5)
  convertScoreToGrade(score: number | null): number | null {
    if (score === null) return null;
    if (score >= 80) return 5;
    if (score >= 60) return 4;
    if (score >= 30) return 3;
    return 2;
  }

  // Export template
  async exportTemplate(gradeBookId: number): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${gradeBookId}/export-template`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Export grade book with scores
  async exportGradeBook(gradeBookId: number): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${gradeBookId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Import scores from Excel
  async importScores(gradeBookId: number, file: File): Promise<{ message: string; data: { imported: number; updated: number; errors: string[] } }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Find orphaned grade books (without corresponding subjects)
   */
  async findOrphaned(params?: {
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<{
    data: {
      orphaned_count: number;
      orphaned_grade_books: Array<{
        id: number;
        grade_id: number;
        grade_name: string;
        subject_id: number;
        subject_name: string;
        academic_year_id: number;
        academic_year_name: string;
        institution_id: number;
        created_at: string;
        has_data: boolean;
      }>;
    };
    message: string;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.institution_id) {
      queryParams.append('institution_id', params.institution_id.toString());
    }
    if (params?.academic_year_id) {
      queryParams.append('academic_year_id', params.academic_year_id.toString());
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/grade-books/orphaned${query}`);
    return response.data;
  }

  /**
   * Clean up orphaned grade books
   */
  async cleanupOrphaned(params?: {
    institution_id?: number;
    academic_year_id?: number;
    dry_run?: boolean;
    force?: boolean;
  }): Promise<{
    data: {
      dry_run: boolean;
      found_count: number;
      deleted_count: number;
      skipped_count: number;
      details: Array<{
        id: number;
        grade_name: string;
        subject_name: string;
        status: string;
        reason?: string;
      }>;
    };
    message: string;
  }> {
    const response = await apiClient.post('/grade-books/cleanup-orphaned', params || {});
    return response.data;
  }

  /**
   * Sync grade books with grade_subjects (create missing grade books)
   */
  async sync(params?: {
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<{
    data: {
      created_count: number;
      details: Array<{
        grade_book_id: number;
        grade_id: number;
        grade_name: string;
        subject_id: number;
        subject_name: string;
        status: string;
      }>;
    };
    message: string;
  }> {
    const response = await apiClient.post('/grade-books/sync', params || {});
    return response.data;
  }

  // Export analysis data
  async exportAnalysis(params?: {
    type?: string;
    format?: 'excel' | 'pdf';
    filters?: Record<string, any>;
  }): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  // Get hierarchy data for admin dashboard
  async getHierarchy(params?: {
    level?: string;
    region_id?: number;
    sector_id?: number;
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<{
    success: boolean;
    data: {
      summary: {
        total_institutions: number;
        total_sectors?: number;
        total_grade_books: number;
        total_students: number;
        average_score: number;
      };
      items: Array<{
        id: number;
        name: string;
        type: string;
        stats: Record<string, number>;
        children?: any[];
      }>;
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/hierarchy`, { params });
    return response.data;
  }

  // Get multi-level analysis data
  async getMultiLevelAnalysis(params?: {
    view_type?: string;
    compare_by?: string;
    metrics?: string[];
    region_id?: number;
    sector_id?: number;
    academic_year_id?: number;
  }): Promise<{
    success: boolean;
    data: {
      chart_data?: any[];
      metrics?: Record<string, number>;
      comparison_data?: any[];
      rankings?: any[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/multi-level`, { params });
    return response.data;
  }

  // Get overview statistics
  async getOverviewStats(params?: {
    institution_id?: number;
    academic_year_id?: number;
    grade_id?: number;
    subject_id?: number;
    status?: string;
  }): Promise<{
    totalStudents: number;
    totalJournals: number;
    activeJournals: number;
    archivedJournals: number;
    examCount: number;
    completionRate: number;
    gradeDistribution: { grade: string; count: number; percentage: number }[];
    subjectAverages: { subject: string; average: number }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/overview`, { params });
    return response.data;
  }
}

export const gradeBookService = new GradeBookService();
export default gradeBookService;
