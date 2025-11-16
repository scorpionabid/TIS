import { apiClient } from '../api';

export interface ClassData {
  id: number;
  institution_id: number;
  institution?: {
    id: number;
    name: string;
    type: string;
    utis_code?: string;
    institution_code?: string;
  };
  academic_year_id: number;
  academicYear?: {
    id: number;
    year: string;
    is_current: boolean;
  };
  name: string;
  class_level: number;
  student_count: number;
  male_student_count: number;
  female_student_count: number;
  specialty?: string;
  grade_category?: string;
  grade_type?: string;
  class_type?: string;
  class_profile?: string;
  education_program?: string;
  teaching_language?: 'azərbaycan' | 'rus' | 'gürcü' | 'ingilis';
  teaching_week?: '5_günlük' | '6_günlük';
  teaching_shift?: string;
  description?: string;
  homeroom_teacher_id?: number;
  homeroomTeacher?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  room_id?: number;
  room?: {
    id: number;
    name: string;
    capacity?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassStatistics {
  total_classes: number;
  active_classes: number;
  total_students: number;
  classes_by_level: Array<{
    class_level: number;
    count: number;
    students: number;
  }>;
  classes_by_institution: Array<{
    id: number;
    name: string;
    class_count: number;
    student_count: number;
  }>;
}

export interface ClassFilters {
  search?: string;
  institution_id?: number;
  class_level?: number;
  academic_year_id?: number;
  is_active?: boolean;
  per_page?: number;
  page?: number;
}

export interface ImportError {
  row: number | null;
  field: string | null;
  value: any;
  error: string;
  suggestion: string | null;
  severity: 'error' | 'warning';
  context: {
    utis_code?: string | null;
    institution_code?: string | null;
    institution_name?: string | null;
    class_level?: number | null;
    class_name?: string | null;
  };
}

export interface ClassImportResult {
  success: boolean;
  message: string;
  data: {
    session_id?: string; // NEW: Session ID for progress tracking
    success_count: number;
    error_count: number;
    errors: string[]; // Simple string errors (backward compatible)
    structured_errors?: ImportError[]; // New: detailed error objects
    total_processed: number;
  };
}

export interface ImportProgress {
  status: 'initializing' | 'parsing' | 'validating' | 'importing' | 'complete';
  processed_rows: number;
  total_rows: number;
  success_count: number;
  error_count: number;
  current_institution?: string | null;
  elapsed_seconds: number;
  estimated_remaining_seconds: number;
  percentage: number;
  timestamp: string;
}

export interface Institution {
  id: number;
  name: string;
  type: string;
  utis_code?: string;
  institution_code?: string;
  parent_id?: number;
}

export interface InstitutionGrouped {
  sectors: Array<{
    id: number;
    name: string;
    type: string;
    schools: Institution[];
    school_count: number;
  }>;
  direct_schools: Institution[];
  all_schools: Institution[];
}

export interface AcademicYear {
  id: number;
  year: string;
  is_current: boolean;
  start_date?: string;
  end_date?: string;
}

class RegionAdminClassService {
  private baseUrl = '/regionadmin/classes';

  /**
   * Get all classes with filters and pagination
   */
  async getClasses(filters?: ClassFilters) {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.institution_id) params.append('institution_id', filters.institution_id.toString());
    if (filters?.class_level) params.append('class_level', filters.class_level.toString());
    if (filters?.academic_year_id) params.append('academic_year_id', filters.academic_year_id.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    const response = await apiClient.get<{
      success: boolean;
      data: {
        data: ClassData[];
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
        from: number;
        to: number;
      };
      region_name: string;
      total_institutions: number;
    }>(`${this.baseUrl}?${params.toString()}`);

    return response;
  }

  /**
   * Get specific class details
   */
  async getClass(id: number) {
    const response = await apiClient.get<{
      success: boolean;
      data: ClassData;
      statistics: {
        total_students: number;
        expected_students: number | null;
        class_level: number;
        specialty?: string;
      };
    }>(`${this.baseUrl}/${id}`);

    return response.data;
  }

  /**
   * Get class statistics for the region
   */
  async getStatistics() {
    const response = await apiClient.get<{
      success: boolean;
      data: ClassStatistics;
      region_name: string;
    }>(`${this.baseUrl}/statistics`);

    return response;
  }

  /**
   * Import classes from Excel/CSV file
   */
  async importClasses(file: File): Promise<ClassImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ClassImportResult>(
      `${this.baseUrl}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // apiClient returns the full backend response: { success, message, data }
    // We need to return the entire response as ClassImportResult
    return response as any as ClassImportResult;
  }

  /**
   * Get import progress for real-time tracking
   */
  async getImportProgress(sessionId: string): Promise<ImportProgress> {
    const response = await apiClient.get<{
      success: boolean;
      data: ImportProgress;
    }>(`${this.baseUrl}/import/progress/${sessionId}`);

    return response.data;
  }

  /**
   * Download CSV template aligned with Grades table structure
   */
  async downloadCsvTemplate(): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/export/template/csv`,
        undefined,
        {
          responseType: 'blob',
          cache: false,
        }
      );

      if (!response?.data) {
        throw new Error('API cavabında CSV məlumatı tapılmadı');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export classes to Excel with filters
   */
  async exportClasses(filters?: ClassFilters): Promise<Blob> {
    const params: Record<string, any> = {};

    if (filters?.institution_id) params.institution_id = filters.institution_id;
    if (filters?.class_level) params.class_level = filters.class_level;
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id;
    if (filters?.is_active !== undefined) params.is_active = filters.is_active;

    const response = await apiClient.post(
      `${this.baseUrl}/export`,
      params, // Send as request body
      undefined, // No query params
      {
        responseType: 'blob',
        cache: false,
      }
    );

    return response.data;
  }

  /**
   * Get available institutions for filters
   */
  async getAvailableInstitutions(): Promise<Institution[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: Institution[];
    }>(`${this.baseUrl}/filter-options/institutions`);

    // Handle both response formats: { data: { data: [] } } and { data: [] }
    return response.data?.data || response.data || [];
  }

  /**
   * Get institutions grouped by sector
   */
  async getInstitutionsGrouped(): Promise<InstitutionGrouped> {
    const response = await apiClient.get<{
      success: boolean;
      data: InstitutionGrouped;
      region_name: string;
    }>(`${this.baseUrl}/filter-options/institutions-grouped`);

    return response.data.data;
  }

  /**
   * Get available academic years
   */
  async getAvailableAcademicYears(): Promise<AcademicYear[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: AcademicYear[];
    }>(`${this.baseUrl}/filter-options/academic-years`);

    // Handle both response formats: { data: { data: [] } } and { data: [] }
    return response.data?.data || response.data || [];
  }
}

export const regionAdminClassService = new RegionAdminClassService();
export default regionAdminClassService;
