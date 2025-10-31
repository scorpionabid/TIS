import { apiClient } from '../api';

export interface ClassData {
  id: number;
  institution_id: number;
  institution?: {
    id: number;
    name: string;
    type: string;
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
  education_program?: string;
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
    capacity: number;
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

export interface ClassImportResult {
  success: boolean;
  message: string;
  data: {
    success_count: number;
    error_count: number;
    errors: string[];
    total_processed: number;
  };
}

export interface Institution {
  id: number;
  name: string;
  type: string;
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

    return response.data;
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

    return response.data;
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

    return response.data;
  }

  /**
   * Download Excel template for class import
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export/template`, {
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Export classes to Excel with filters
   */
  async exportClasses(filters?: ClassFilters): Promise<Blob> {
    const params = new URLSearchParams();

    if (filters?.institution_id) params.append('institution_id', filters.institution_id.toString());
    if (filters?.class_level) params.append('class_level', filters.class_level.toString());
    if (filters?.academic_year_id) params.append('academic_year_id', filters.academic_year_id.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const response = await apiClient.post(
      `${this.baseUrl}/export?${params.toString()}`,
      {},
      {
        responseType: 'blob',
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

    return response.data.data;
  }
}

export const regionAdminClassService = new RegionAdminClassService();
export default regionAdminClassService;
