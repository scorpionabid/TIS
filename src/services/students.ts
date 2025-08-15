import { apiClient } from './api';

export interface Student {
  id: number;
  name: string;
  student_number: string;
  class_name: string;
  grade_level: string;
  first_name: string;
  last_name: string;
  age?: number;
}

export interface StudentFilters {
  grade_level?: string;
  class_name?: string;
  search?: string;
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
  private baseURL = '/assessment-students';

  /**
   * Get students by institution
   */
  async getStudentsByInstitution(
    institutionId: number,
    filters: StudentFilters = {}
  ): Promise<PaginatedStudents> {
    try {
      const params = new URLSearchParams();
      
      if (filters.grade_level) params.append('grade_level', filters.grade_level);
      if (filters.class_name) params.append('class_name', filters.class_name);
      if (filters.search) params.append('search', filters.search);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());

      const url = `${this.baseURL}/institutions/${institutionId}/students${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await apiClient.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagirdlər yüklənərkən xəta baş verdi');
    }
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
   * Get student count for institution
   */
  async getStudentCount(
    institutionId: number,
    filters: Omit<StudentFilters, 'per_page'> = {}
  ): Promise<StudentCount> {
    try {
      const params = new URLSearchParams();
      
      if (filters.grade_level) params.append('grade_level', filters.grade_level);
      if (filters.class_name) params.append('class_name', filters.class_name);

      const url = `${this.baseURL}/institutions/${institutionId}/count${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird sayı yüklənərkən xəta baş verdi');
    }
  }
}

export const studentService = new StudentService();