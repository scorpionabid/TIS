import { apiClient } from './api';

export interface Student {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  enrollment_date?: string | null;
  current_grade_level?: number | string;
  class_name?: string;
  status: string;
  institution_id: number;
  institution?: {
    id: number;
    name: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  institution_id?: number;
  class_id?: number;
  grade_level?: number;
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedStudents {
  students: Student[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
}

export interface GradeLevel {
  value: string;
  label: string;
}

export interface Class {
  grade_level: string;
  classes: string[];
}

export interface StudentCount {
  count: number;
  institution_id: number;
  institution_name: string;
}

class StudentService {
  private baseURL = '/students';

  /**
   * Get all students with role-based filtering
   */
  async getAll(filters: StudentFilters = {}): Promise<{ data: { students: Student[]; pagination: any }; success: boolean; message: string }> {
    try {
      const params = new URLSearchParams();
      
      if (filters.institution_id) params.append('institution_id', filters.institution_id.toString());
      if (filters.class_id) params.append('class_id', filters.class_id.toString());
      if (filters.grade_level) params.append('grade_level', filters.grade_level.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page) params.append('per_page', filters.per_page.toString());

      const url = `${this.baseURL}${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagirdlər yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get students by institution (legacy method)
   */
  async getStudentsByInstitution(
    institutionId: number,
    filters: Omit<StudentFilters, 'institution_id'> = {}
  ): Promise<{ data: { students: Student[]; pagination: any }; success: boolean; message: string }> {
    return this.getAll({ ...filters, institution_id: institutionId });
  }

  /**
   * Get grade levels for institution
   */
  async getGradeLevels(institutionId: number): Promise<string[]> {
    try {
      const url = `${this.baseURL}/institutions/${institutionId}/grade-levels`;
      const response = await apiClient.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Sinif səviyyələri yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get classes for institution
   */
  async getClasses(institutionId: number, gradeLevel?: string): Promise<Class[]> {
    try {
      const params = new URLSearchParams();
      if (gradeLevel) params.append('grade_level', gradeLevel);

      const url = `${this.baseURL}/institutions/${institutionId}/classes${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Siniflər yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get single student by ID
   */
  async getById(id: number): Promise<{ data: Student; success: boolean; message: string }> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird məlumatları yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Create new student
   */
  async create(studentData: any): Promise<{ data: Student; success: boolean; message: string }> {
    try {
      const response = await apiClient.post(this.baseURL, studentData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird yaradılarkən xəta baş verdi');
    }
  }

  /**
   * Update student
   */
  async update(id: number, studentData: any): Promise<{ data: Student; success: boolean; message: string }> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${id}`, studentData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird yenilənərkən xəta baş verdi');
    }
  }

  /**
   * Delete student
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird silinərkən xəta baş verdi');
    }
  }

  /**
   * Get student count for institution
   */
  async getStudentCount(
    institutionId: number,
    filters: Omit<StudentFilters, 'per_page'> = {}
  ): Promise<StudentCount> {
    try {
      const params = new URLSearchParams();
      
      if (filters.grade_level) params.append('grade_level', filters.grade_level.toString());
      if (filters.class_id) params.append('class_id', filters.class_id.toString());

      const url = `${this.baseURL}/institutions/${institutionId}/count${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird sayı yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Download student import template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/students/bulk/download-template`, {
      method: 'GET',
      headers: apiClient['getHeaders'](),
    });

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  /**
   * Import students from file
   */
  async importStudents(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiClient['baseURL']}/students/bulk/import`, {
      method: 'POST',
      headers: {
        Authorization: apiClient['getHeaders']().Authorization,
        // Don't set Content-Type for FormData
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Import failed');
    }

    return result;
  }

  /**
   * Export students with filters
   */
  async exportStudents(filters?: any): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/students/bulk/export`, {
      method: 'POST',
      headers: apiClient['getHeaders'](),
      body: JSON.stringify({
        filters: filters || {}
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Get export statistics
   */
  async getExportStats(filters?: any): Promise<any> {
    try {
      const response = await apiClient.get('/students/bulk/statistics', filters);
      
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data;
      }
      
      return {
        total_students: 0,
        active_students: 0,
        inactive_students: 0,
        by_class: {},
        by_institution: {}
      };
    } catch (error) {
      console.error('Error fetching export stats:', error);
      return {
        total_students: 0,
        active_students: 0,
        inactive_students: 0,
        by_class: {},
        by_institution: {}
      };
    }
  }
}

export const studentService = new StudentService();