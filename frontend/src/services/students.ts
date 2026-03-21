import { apiClient } from './api';
import { BaseEntity } from '@/components/generic/types';

// Enhanced Student interface that extends BaseEntity for GenericManagerV2 compatibility
export interface Student extends BaseEntity {
  id: number;
  student_number: string;
  student_id?: string; // For backward compatibility
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string | null;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  enrollment_date?: string | null;
  current_grade_level?: number | string;
  class_name?: string;
  status: 'active' | 'inactive' | 'transferred' | 'graduated' | 'dropped' | 'expelled';
  enrollment_status?: 'active' | 'inactive' | 'transferred' | 'graduated';
  institution_id: number;
  institution?: {
    id: number;
    name: string;
    type?: {
      name: string;
      key: string;
    };
  };
  current_class?: {
    id: number;
    name: string;
    grade_level: number;
  };
  grade_level?: number;
  is_active: boolean;
  grade?: {
    id: number;
    name: string;
    class_level: number;
  };
  
  // Academic performance fields
  gpa?: number;
  attendance_rate?: number;
  
  // Guardian information
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relation?: string;
  
  // Medical information
  medical_conditions?: string;
  allergies?: string;
  emergency_contact?: string;
  
  // Additional notes
  notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Unified StudentFilters interface
export interface StudentFilters {
  institution_id?: number;
  class_id?: number;
  grade_level?: number;
  status?: string;
  enrollment_status?: 'active' | 'inactive' | 'transferred' | 'graduated';
  gender?: 'male' | 'female' | 'other';
  search?: string;
  page?: number;
  per_page?: number;
  is_active?: boolean | string;
  academic_year?: string;
  _t?: number;
  enrollment_date_from?: string;
  enrollment_date_to?: string;
}

// Unified StudentCreateData interface
export interface StudentCreateData {
  first_name: string;
  last_name: string;
  student_number: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  enrollment_date?: string;
  current_grade_level?: number;
  class_id?: number;
  institution_id?: number;
  status?: 'active' | 'inactive';
  is_active?: boolean;
  
  // Guardian information
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relation?: string;
  
  // Medical information
  medical_conditions?: string;
  allergies?: string;
  emergency_contact?: string;
  
  // Additional notes
  notes?: string;
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

// Unified response type for GenericManagerV2 compatibility
export interface StudentServiceResponse {
  items?: Student[];
  data?: Student[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
  success: boolean;
  message?: string;
}

class StudentService {
  private baseURL = '/students';

  /**
   * Get all students with role-based filtering - Enhanced for GenericManagerV2
   */
  async get(filters: StudentFilters = {}, bypassCache = false): Promise<StudentServiceResponse | Student[]> {
    try {
      
      // Build query parameters as a plain object for apiClient
      const params: Record<string, any> = {};
      
      // Build query parameters with enhanced filter support
      if (filters.institution_id) params.institution_id = filters.institution_id;
      if (filters.class_id) params.class_id = filters.class_id;
      if (filters.grade_level) params.grade_level = filters.grade_level;
      if (filters.status) params.status = filters.status;
      if (filters.enrollment_status) params.enrollment_status = filters.enrollment_status;
      if (filters.gender) params.gender = filters.gender;
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = filters.page;
      if (filters.per_page) params.per_page = filters.per_page;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;
      if (filters.academic_year) params.academic_year = filters.academic_year;
      if (filters.enrollment_date_from) params.enrollment_date_from = filters.enrollment_date_from;
      if (filters.enrollment_date_to) params.enrollment_date_to = filters.enrollment_date_to;

      // Bypass cache by adding timestamp when explicitly requested or from filters
      if (bypassCache || (filters as any)._t) {
        params._t = (filters as any)._t || Date.now();
      }

      const response = await apiClient.get<any>(this.baseURL, params);
      
      // Let's add an explicit visual debug since console logs might be missed
      
      let finalResult = { items: [], raw: response.data } as any;
      
      if (response.data?.data?.students) {
        finalResult = {
          items: response.data.data.students,
          pagination: response.data.data.pagination,
          raw: response.data
        } as any;
      } else if (response.data?.students) {
        finalResult = {
          items: response.data.students,
          pagination: response.data.pagination || null,
          raw: response.data
        } as any;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        finalResult = { items: response.data.data, raw: response.data } as any;
      } else if (Array.isArray(response.data)) {
        finalResult = { items: response.data, raw: response.data } as any;
      }
      
      return finalResult;
    } catch (error: any) {
      console.error('StudentService.get error:', error);
      throw new Error(error.response?.data?.message || 'Şagirdlər yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Legacy getAll method for backward compatibility
   */
  async getAll(filters: StudentFilters = {}): Promise<{ data: { students: Student[]; pagination: any }; success: boolean; message: string }> {
    const getResult = await this.get(filters);
    const students = Array.isArray(getResult) ? getResult : (getResult.items || []);
    
    return {
      data: {
        students,
        pagination: !Array.isArray(getResult) && getResult.pagination ? getResult.pagination : {
          current_page: 1,
          per_page: students.length,
          total: students.length,
          last_page: 1,
          from: 1,
          to: students.length
        }
      },
      success: true,
      message: 'Şagirdlər uğurla yükləndi'
    };
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
      const response = await apiClient.get<any>(url);
      return (response as any).data?.data || [];
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
      const response = await apiClient.get<any>(url);
      return (response as any).data?.data || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Siniflər yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Get single student by ID
   */
  async getById(id: number): Promise<{ data: Student; success: boolean; message: string }> {
    try {
      const response = await apiClient.get<any>(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird məlumatları yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Create new student - Enhanced for GenericManagerV2
   */
  async create(studentData: Partial<StudentCreateData>): Promise<Student> {
    try {
      const response = await apiClient.post<any>(this.baseURL, studentData);
      
      // Handle different response formats
      if (response.data?.data) {
        return response.data.data;
      } else if (response.data?.student) {
        return response.data.student;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('StudentService.create error:', error);
      throw new Error(error.response?.data?.message || 'Şagird yaradılarkən xəta baş verdi');
    }
  }

  /**
   * Update student - Enhanced for GenericManagerV2
   */
  async update(id: number, studentData: Partial<StudentCreateData>): Promise<Student> {
    try {
      const response = await apiClient.put<any>(`${this.baseURL}/${id}`, studentData);
      
      // Handle different response formats
      if (response.data?.data) {
        return response.data.data;
      } else if (response.data?.student) {
        return response.data.student;
      }
      
      return response.data as unknown as Student;
    } catch (error: any) {
      console.error('StudentService.update error:', error);
      throw new Error(error.response?.data?.message || 'Şagird yenilənərkən xəta baş verdi');
    }
  }

  /**
   * Delete student - Enhanced for GenericManagerV2
   */
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/${id}`);
    } catch (error: any) {
      console.error('StudentService.delete error:', error);
      throw new Error(error.response?.data?.message || 'Şagird silinərkən xəta baş verdi');
    }
  }

  // Legacy methods for backward compatibility
  /**
   * Create new student (legacy)
   */
  async createLegacy(studentData: any): Promise<{ data: Student; success: boolean; message: string }> {
    const student = await this.create(studentData);
    return {
      data: student as Student,
      success: true,
      message: 'Şagird uğurla yaradıldı'
    };
  }

  /**
   * Update student (legacy)
   */
  async updateLegacy(id: number, studentData: any): Promise<{ data: Student; success: boolean; message: string }> {
    const student = await this.update(id, studentData);
    return {
      data: student,
      success: true,
      message: 'Şagird uğurla yeniləndi'
    };
  }

  /**
   * Delete student (legacy)
   */
  async deleteLegacy(id: number): Promise<{ success: boolean; message: string }> {
    await this.delete(id);
    return {
      success: true,
      message: 'Şagird uğurla silindi'
    };
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
      const response = await apiClient.get<any>(url);
      return response.data?.data || 0;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Şagird sayı yüklənərkən xəta baş verdi');
    }
  }

  /**
   * Download student import template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      '/students/bulk/download-template',
      undefined,
      { responseType: 'blob' }
    );
    return (response as any).data || response;
  }

  /**
   * Import students from file
   */
  async importStudents(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post<any>('/students/bulk/import', formData);
      return response;
    } catch (error: any) {
      console.error('Import error:', error);
      throw new Error(error.message || 'İdxal xətası');
    }
  }

  /**
   * Export students with filters
   */
  async exportStudents(filters?: any): Promise<Blob> {
    const response = await apiClient.post<Blob>(
      '/students/bulk/export',
      { filters: filters || {} },
      { responseType: 'blob' }
    );
    return (response as any).data || response;
  }

  /**
   * Get export statistics
   */
  async getExportStats(filters?: any): Promise<any> {
    try {
      const response = await apiClient.get<any>('/students/bulk/statistics', filters);
      
      if ((response as any).data && (response as any).data.data) {
        return (response as any).data.data;
      } else if ((response as any).data) {
        return (response as any).data;
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

  /**
   * Get students available for enrollment in a specific grade
   */
  async getAvailableForEnrollment(gradeId: number, filters?: StudentFilters): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString() 
      ? `${this.baseURL}/available-for-grade/${gradeId}?${params}`
      : `${this.baseURL}/available-for-grade/${gradeId}`;
    
    return apiClient.get<any>(url).then(res => (res as any).data?.data || res.data || res);
  }
}

export const studentService = new StudentService();
