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
    real_student_count?: number;
  };
  subject?: {
    id: number;
    name: string;
  };
  academic_year?: {
    id: number;
    name: string;
  };
  institution?: {
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
    id: number;
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

  private invalidateGradeBookCache(gradeBookId: number): void {
    try {
      // ApiClientOptimized caches GET responses by endpoint string.
      // We clear by pattern to force subsequent GETs to fetch fresh data.
      apiClient.clearCache(`${this.baseUrl}/${gradeBookId}`);
    } catch {
      // ignore cache invalidation errors
    }
  }

  private invalidateAllGradeBooksCache(): void {
    try {
      apiClient.clearCache(`${this.baseUrl}/`);
    } catch {
      // ignore cache invalidation errors
    }
  }

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
    const response = await apiClient.get(this.baseUrl, params ?? {});
    // Handle different response formats
    const responseData = response.data;
 
    const toMeta = (paginator: any) => {
      if (!paginator || typeof paginator !== 'object') return {};
      const {
        current_page,
        last_page,
        per_page,
        total,
        from,
        to,
      } = paginator;
      return {
        current_page,
        last_page,
        per_page,
        total,
        from,
        to,
      };
    };
    
    // If backend returns Laravel paginator shape: { success: true, data: { data: [...], ...pagination } }
    if (responseData?.success && responseData?.data && Array.isArray(responseData.data?.data)) {
      return { data: responseData.data.data, meta: toMeta(responseData.data) };
    }

    // If backend returns { success: true, data: [...], meta: {...} }
    if (responseData?.success && Array.isArray(responseData?.data)) {
      return { data: responseData.data, meta: responseData.meta || {} };
    }
    
    // If backend returns paginator directly: { data: [...], ...pagination }
    if (responseData && Array.isArray(responseData?.data) && typeof responseData === 'object') {
      return { data: responseData.data, meta: toMeta(responseData) };
    }

    // If backend returns nested paginator inside data: { data: { data: [...] } }
    if (responseData?.data && Array.isArray(responseData.data?.data)) {
      return { data: responseData.data.data, meta: toMeta(responseData.data) };
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

    const raw = (responseData?.success && responseData?.data)
      ? responseData.data
      : (responseData?.data && responseData.data.grade_book)
        ? responseData.data
        : responseData;

    // Normalize to prevent runtime crashes when fields are missing or null
    let students: StudentWithScores[] = Array.isArray(raw?.students) ? raw.students : [];

    // Normalize scores: ensure all score values are numeric (not strings)
    students = students.map((student: any) => {
      if (!student.scores || typeof student.scores !== 'object') {
        return {
          ...student,
          id: Number(student.id),
          teacher_id: student.teacher_id === null || student.teacher_id === undefined ? null : Number(student.teacher_id),
          scores: {},
        };
      }
      const normalizedScores: StudentWithScores['scores'] = {};
      for (const [columnId, scoreData] of Object.entries(student.scores)) {
        if (!scoreData) continue;
        normalizedScores[Number(columnId)] = {
          id: scoreData.id,
          score: scoreData.score === null ? null : Number(scoreData.score),
          percentage: scoreData.percentage === null ? null : Number(scoreData.percentage),
          grade_mark: scoreData.grade_mark,
          is_present: scoreData.is_present,
        };
      }
      return {
        ...student,
        id: Number(student.id),
        teacher_id: student.teacher_id === null || student.teacher_id === undefined ? null : Number(student.teacher_id),
        scores: normalizedScores,
      };
    });

    let inputColumns: GradeBookColumn[] = [];
    let calculatedColumns: GradeBookColumn[] = [];

    if (Array.isArray(raw?.input_columns)) {
      inputColumns = raw.input_columns;
    }
    if (Array.isArray(raw?.calculated_columns)) {
      calculatedColumns = raw.calculated_columns;
    }

    // Some backends may only provide columns_by_semester; derive columns if needed
    const columnsBySemester: Record<string, GradeBookColumn[]> =
      raw?.columns_by_semester && typeof raw.columns_by_semester === 'object'
        ? raw.columns_by_semester
        : {};

    if (inputColumns.length === 0 || calculatedColumns.length === 0) {
      const allColumnsFromSemester = Object.values(columnsBySemester).flat().filter(Boolean) as GradeBookColumn[];
      if (inputColumns.length === 0) {
        inputColumns = allColumnsFromSemester.filter(c => c.column_type === 'input');
      }
      if (calculatedColumns.length === 0) {
        calculatedColumns = allColumnsFromSemester.filter(c => c.column_type === 'calculated');
      }
    }

    return {
      data: {
        grade_book: raw?.grade_book,
        students,
        columns_by_semester: columnsBySemester,
        input_columns: inputColumns,
        calculated_columns: calculatedColumns,
      }
    };
  }

  // Get students with scores
  async getStudentsWithScores(id: number): Promise<{ data: StudentWithScores[] }> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/students`);
    return response.data;
  }

  // Add new column (exam)
  async addColumn(gradeBookId: number, data: CreateColumnRequest): Promise<{ data: GradeBookColumn }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/columns`, data);
    this.invalidateGradeBookCache(gradeBookId);
    return response.data;
  }

  // Update column (exam)
  async updateColumn(columnId: number, data: UpdateColumnRequest): Promise<{ data: GradeBookColumn }> {
    const response = await apiClient.patch(`${this.baseUrl}/columns/${columnId}`, data);
    // Column update affects gradebook view, invalidate all gradebook caches
    this.invalidateAllGradeBooksCache();
    return response.data;
  }

  // Archive column
  async archiveColumn(columnId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/columns/${columnId}`);
    // Column archive affects gradebook view, invalidate all gradebook caches
    this.invalidateAllGradeBooksCache();
  }

  // Update cell (score)
  async updateCell(cellId: number, data: UpdateCellRequest): Promise<{ data: GradeBookCell }> {
    const response = await apiClient.patch(`${this.baseUrl}/cells/${cellId}`, data);
    // Cell update affects gradebook view, invalidate all gradebook caches
    this.invalidateAllGradeBooksCache();
    return response.data;
  }

  // Bulk update cells
  async bulkUpdateCells(gradeBookId: number, data: BulkUpdateCellsRequest): Promise<{ message: string; updated_count: number }> {
    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/cells/bulk-update`, data);
    this.invalidateGradeBookCache(gradeBookId);
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
    this.invalidateGradeBookCache(gradeBookId);
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
    const response = await apiClient.get(`${this.baseUrl}/${gradeBookId}/export-template`, undefined, {
      responseType: 'blob',
      cache: false,
    });
    return response.data;
  }

  // Export grade book with scores
  async exportGradeBook(gradeBookId: number): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${gradeBookId}/export`, undefined, {
      responseType: 'blob',
      cache: false,
    });
    return response.data;
  }

  // Bulk export all journals for a grade (all subjects as sheets)
  async bulkExportByGrade(gradeId: number, academicYearId?: number): Promise<Blob> {
    const params: Record<string, number> = { grade_id: gradeId };
    if (academicYearId) params.academic_year_id = academicYearId;
    const response = await apiClient.get(`${this.baseUrl}/bulk-export/grade`, params, {
      responseType: 'blob',
      cache: false,
    });
    return response.data;
  }

  // Import scores from Excel
  async importScores(gradeBookId: number, file: File): Promise<{ message: string; data: { imported: number; updated: number; errors: string[] } }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/${gradeBookId}/import`, formData);
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
  async exportAnalysis(params?: Record<string, number | string>): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/export`, params, {
      responseType: 'blob',
      cache: false,
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
    // Ensure we don't send empty strings or nulls that might confuse the backend
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });
    }

    const response = await apiClient.get(`${this.baseUrl}/hierarchy`, cleanParams);
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
    const response = await apiClient.get(`${this.baseUrl}/analysis/multi-level`, params);
    return response.data;
  }

  // Get overview statistics
  async getOverviewStats(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    subject_ids?: number[];
    grade_ids?: number[];
    sector_ids?: number[];
    school_ids?: number[];
    class_levels?: number[];
    teaching_languages?: string[];
    gender?: string;
    status?: string;
  }): Promise<{
    success: boolean;
    data: {
      totalStudents: number;
      totalJournals: number;
      activeJournals: number;
      archivedJournals: number;
      examCount: number;
      completionRate: number;
      averageScore: number;
      highestScore: number;
      gradeDistribution: { grade: string; count: number; percentage: number }[];
      subjectAverages: { subject: string; average: number }[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/overview`, params);
    return response as any;
  }

  // Get comparison data for radar and bar charts
  async getComparisonData(params?: {
    institution_id?: number;
    academic_year_id?: number;
    compare_by?: string;
    grade_id?: number;
    subject_id?: number;
  }): Promise<{
    success: boolean;
    data: {
      radarData: { metric: string; value: number; average: number }[];
      barData: { subject: string; current: number; average: number; max: number }[];
      stats: {
        averageDiff: number;
        strongestSubject: string;
        weakestSubject: string;
        strongestScore: number;
        weakestScore: number;
      };
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/comparison`, params);
    return response as any;
  }

  // Get trends data over time
  async getTrendsData(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    time_range?: string;
  }): Promise<{
    success: boolean;
    data: {
      trendData: { month: string; average: number; target: number }[];
      subjectTrends: { subject: string; data: { month: string; score: number }[] }[];
      stats: {
        averageScore: number;
        growthRate: number;
        highestMonth: string;
        lowestMonth: string;
        highestScore: number;
        lowestScore: number;
      };
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/trends`, params);
    return response as any;
  }

  // Pivot analysis: class_level rows × (year+semester+type) columns
  async getPivotAnalysis(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    subject_ids?: number[];
    group_by?: 'class_level' | 'sector' | 'school' | 'grade' | 'subject' | 'language';
    sector_ids?: number[];
    school_ids?: number[];
    class_levels?: number[];
    grade_ids?: number[];
    teaching_languages?: string[];
    gender?: 'male' | 'female';
  }): Promise<{
    success: boolean;
    data: {
      rows: { id: number | string; name: number | string; type: string }[];
      group_by: string;
      subjects: { id: number; name: string }[];
      available_columns: {
        key: string;
        academic_year_id: number;
        year_name: string;
        semester: string;
        type_id: number;
        type_name: string;
        type_category: string;
      }[];
      cells: Record<string, {
        students: number;
        avg: number;
        min_score: number;
        max_score: number;
        journal_count: number;
        teacher_count: number;
        pass_rate: number;
        institution_count: number;
        male_avg: number;
        female_avg: number;
        male_pass_rate: number;
        female_pass_rate: number;
        r0_30:   { count: number; pct: number };
        r30_60:  { count: number; pct: number };
        r60_80:  { count: number; pct: number };
        r80_100: { count: number; pct: number };
      }>;
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/pivot`, params);
    return response as any;
  }

  // Class level × subject cross-analysis
  async getClassLevelSubjectAnalysis(params?: {
    institution_id?: number;
    academic_year_id?: number;
    class_level?: number;
    subject_id?: number;
    assessment_type_id?: number;
    semester?: string;
  }): Promise<{
    success: boolean;
    data: {
      rows: {
        class_level: number;
        subject_id: number;
        subject_name: string;
        institution_count: number;
        journal_count: number;
        student_count: number;
        total_scores: number;
        avg_score: number;
        min_score: number;
        max_score: number;
        below_30_count: number;
        below_30_pct: number;
        pass_rate: number;
        ranges: { label: string; count: number; pct: number; avg: number }[];
      }[];
      class_levels: number[];
      subjects: { id: number; name: string }[];
      assessment_types: { id: number; name: string; category: string }[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/class-level-subject`, params);
    return response as any;
  }

  // Region/sector/school trend analysis grouped by semester or assessment type
  async getRegionTrends(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    sector_ids?: number[];
    school_ids?: number[];
    class_levels?: number[];
    teaching_languages?: string[];
    group_by?: 'semester' | 'assessment_type';
  }): Promise<{
    success: boolean;
    data: {
      trend_data: {
        period: string;
        avg_score: number;
        student_count: number;
        pass_rate: number;
        below_30_pct: number;
        r0_30_pct: number;
        r30_60_pct: number;
        r60_80_pct: number;
        r80_100_pct: number;
      }[];
      class_trends: {
        class_level: number;
        label: string;
        trend: { period: string; avg_score: number; students: number }[];
      }[];
      subject_trends: {
        subject_id: number;
        subject_name: string;
        trend: { period: string; avg_score: number; students: number }[];
      }[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/region-trends`, params);
    return response as any;
  }

  // Journal completion / fill rate per institution
  async getJournalCompletion(params?: {
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<{
    success: boolean;
    data: {
      rows: {
        institution_id: number;
        institution_name: string;
        sector_name: string;
        total_journals: number;
        active_journals: number;
        journals_with_data: number;
        journals_empty: number;
        cells_filled: number;
        fill_rate: number;
        last_entry_date: string | null;
      }[];
      summary: {
        total_institutions: number;
        avg_fill_rate: number;
        full_count: number;
        partial_count: number;
        empty_count: number;
      };
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/journal-completion`, params);
    return response as any;
  }

  // Comprehensive multi-sheet export
  async exportComprehensive(params?: {
    institution_id?: number;
    academic_year_id?: number;
  }): Promise<Blob> {
    const queryString = params
      ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
      : '';
    const response = await apiClient.get(`${this.baseUrl}/analysis/export-comprehensive${queryString}`, { responseType: 'blob' });
    return response as unknown as Blob;
  }

  // Get deep dive analysis: risk students, top students, subject details
  async getDeepDiveData(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    grade_ids?: number[];
    subject_ids?: number[];
    sector_ids?: number[];
    school_ids?: number[];
    class_levels?: number[];
    teaching_languages?: string[];
    gender?: string;
  }): Promise<{
    success: boolean;
    data: {
      riskStudents: { id: number; name: string; class: string; average: number; failedSubjects: number; attendance: number | null; trend: string }[];
      topStudents: { id: number; name: string; class: string; average: number; bestSubject: string; improvement: number }[];
      subjectAnalysis: { subject: string; average: number; passRate: number; riskCount: number; trend: string }[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/deep-dive`, params);
    return response as any;
  }

  // Available grades (4A, 4B …) for given filter scope
  async getAvailableGrades(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    sector_ids?: number[];
    school_ids?: number[];
  }): Promise<{
    success: boolean;
    data: { id: number; name: string; class_level: number; full_name: string }[];
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/available-grades`, params);
    return response as any;
  }

  // Nested hierarchical pivot: sector → school → class_level
  async getNestedPivotAnalysis(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    subject_ids?: number[];
    group_bys?: string[];
    sector_ids?: number[];
    school_ids?: number[];
    class_levels?: number[];
    grade_ids?: number[];
    teaching_languages?: string[];
    gender?: string;
  }): Promise<{
    success: boolean;
    data: {
      nodes: { nodeId: string; label: string; type: string; level: number; parentId: string | null }[];
      available_columns: {
        key: string;
        academic_year_id: number;
        year_name: string;
        semester: string;
        type_id: number;
        type_name: string;
        type_category: string;
      }[];
      cells: Record<string, {
        students: number; avg: number; min_score: number; max_score: number;
        journal_count: number; teacher_count: number; pass_rate: number; institution_count: number;
        male_avg: number; female_avg: number; male_pass_rate: number; female_pass_rate: number;
        r0_30: { count: number; pct: number };
        r30_60: { count: number; pct: number };
        r60_80: { count: number; pct: number };
        r80_100: { count: number; pct: number };
      }>;
      group_bys: string[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/pivot-nested`, params);
    return response as any;
  }

  // Scoreboard: ranked school/sector performance summary
  async getScoreboardData(params?: {
    institution_id?: number;
    academic_year_ids?: number[];
    subject_ids?: number[];
    sector_ids?: number[];
    school_ids?: number[];
    class_levels?: number[];
    grade_ids?: number[];
    teaching_languages?: string[];
    gender?: string;
  }): Promise<{
    success: boolean;
    data: {
      summary: {
        region_avg: number;
        region_pass_rate: number;
        total_schools: number;
        total_students: number;
        best_school:  { name: string; avg: number; sector: string } | null;
        worst_school: { name: string; avg: number; sector: string } | null;
      };
      schools: {
        rank: number;
        school_id: number;
        school_name: string;
        sector_id: number;
        sector_name: string;
        avg: number;
        pass_rate: number;
        r0_30_pct: number;
        r30_60_pct: number;
        r60_80_pct: number;
        r80_100_pct: number;
        student_count: number;
        journal_count: number;
        teacher_count: number;
        min_score: number;
        max_score: number;
      }[];
      sectors: {
        sector_id: number;
        sector_name: string;
        avg: number;
        pass_rate: number;
        r0_30_pct: number;
        school_count: number;
        student_count: number;
      }[];
    };
  }> {
    const response = await apiClient.get(`${this.baseUrl}/analysis/scoreboard`, params);
    return response as any;
  }
}

export const gradeBookService = new GradeBookService();
export default gradeBookService;
