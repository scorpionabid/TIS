import { apiClient } from './api';

export interface AssessmentType {
  id: number;
  name: string;
  description?: string;
  category: 'ksq' | 'bsq' | 'custom';
  is_active: boolean;
  criteria?: Record<string, number>;
  max_score: number;
  scoring_method: 'percentage' | 'points' | 'grades';
  grade_levels?: string[];
  subjects?: string[];
  created_by: number;
  institution_id?: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  institution?: {
    id: number;
    name: string;
  };
  category_label: string;
  scoring_method_label: string;
}

export interface AssessmentTypeFilters {
  category?: 'ksq' | 'bsq' | 'custom';
  is_active?: boolean;
  search?: string;
  per_page?: number;
  page?: number;
}

export interface CreateAssessmentTypeData {
  name: string;
  description?: string;
  category: 'ksq' | 'bsq' | 'custom';
  is_active?: boolean;
  criteria?: Record<string, number>;
  max_score: number;
  scoring_method: 'percentage' | 'points' | 'grades';
  grade_levels?: string[];
  subjects?: string[];
  institution_id?: number;
}

export interface UpdateAssessmentTypeData extends Partial<CreateAssessmentTypeData> {}

export interface PaginatedAssessmentTypes {
  data: AssessmentType[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface AssessmentTypeDropdownItem {
  id: number;
  name: string;
  category: string;
  institution_id?: number;
}

class AssessmentTypeService {
  private baseURL = '/assessment-types';

  /**
   * Get paginated list of assessment types with filters
   */
  async getAssessmentTypes(filters: AssessmentTypeFilters = {}): Promise<PaginatedAssessmentTypes> {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const queryString = params.toString();
      const url = queryString ? `${this.baseURL}?${queryString}` : this.baseURL;
      
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.message || 'Assessment types yüklənərkən xəta baş verdi');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching assessment types:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Assessment types yüklənərkən xəta baş verdi'
      );
    }
  }

  /**
   * Get single assessment type by ID
   */
  async getAssessmentType(id: number): Promise<AssessmentType> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Assessment type yüklənərkən xəta baş verdi');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching assessment type:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Assessment type yüklənərkən xəta baş verdi'
      );
    }
  }

  /**
   * Create new assessment type
   */
  async createAssessmentType(data: CreateAssessmentTypeData): Promise<AssessmentType> {
    try {
      const response = await apiClient.post(this.baseURL, data);

      if (!response.success) {
        throw new Error(response.message || 'Assessment type yaradılarkən xəta baş verdi');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error creating assessment type:', error);
      
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat().join(', ');
        throw new Error(`Validasiya xətası: ${errorMessages}`);
      }

      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Assessment type yaradılarkən xəta baş verdi'
      );
    }
  }

  /**
   * Update assessment type
   */
  async updateAssessmentType(id: number, data: UpdateAssessmentTypeData): Promise<AssessmentType> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${id}`, data);

      if (!response.success) {
        throw new Error(response.message || 'Assessment type yenilənərkən xəta baş verdi');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating assessment type:', error);
      
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat().join(', ');
        throw new Error(`Validasiya xətası: ${errorMessages}`);
      }

      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Assessment type yenilənərkən xəta baş verdi'
      );
    }
  }

  /**
   * Delete assessment type
   */
  async deleteAssessmentType(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Assessment type silinərkən xəta baş verdi');
      }
    } catch (error: any) {
      console.error('Error deleting assessment type:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Assessment type silinərkən xəta baş verdi'
      );
    }
  }

  /**
   * Toggle assessment type status
   */
  async toggleAssessmentTypeStatus(id: number): Promise<AssessmentType> {
    try {
      const response = await apiClient.post(`${this.baseURL}/${id}/toggle-status`);

      if (!response.success) {
        throw new Error(response.message || 'Status dəyişərkən xəta baş verdi');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error toggling assessment type status:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Status dəyişərkən xəta baş verdi'
      );
    }
  }

  /**
   * Get dropdown list of active assessment types
   */
  async getAssessmentTypesDropdown(category?: 'ksq' | 'bsq' | 'custom'): Promise<AssessmentTypeDropdownItem[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);

      const queryString = params.toString();
      const url = queryString ? `${this.baseURL}/dropdown?${queryString}` : `${this.baseURL}/dropdown`;
      
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.message || 'Assessment types dropdown yüklənərkən xəta baş verdi');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching assessment types dropdown:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Assessment types dropdown yüklənərkən xəta baş verdi'
      );
    }
  }

  /**
   * Get assessment type categories
   */
  getCategories() {
    return [
      { value: 'ksq', label: 'Kiçik Summativ Qiymətləndirmə' },
      { value: 'bsq', label: 'Böyük Summativ Qiymətləndirmə' },
      { value: 'custom', label: 'Xüsusi Qiymətləndirmə' }
    ];
  }

  /**
   * Get scoring methods
   */
  getScoringMethods() {
    return [
      { value: 'percentage', label: 'Faiz (%)' },
      { value: 'points', label: 'Bal' },
      { value: 'grades', label: 'Qiymət (A, B, C...)' }
    ];
  }

  /**
   * Get available grade levels
   */
  getGradeLevels() {
    return [
      { value: '1', label: '1-ci sinif' },
      { value: '2', label: '2-ci sinif' },
      { value: '3', label: '3-cü sinif' },
      { value: '4', label: '4-cü sinif' },
      { value: '5', label: '5-ci sinif' },
      { value: '6', label: '6-cı sinif' },
      { value: '7', label: '7-ci sinif' },
      { value: '8', label: '8-ci sinif' },
      { value: '9', label: '9-cu sinif' },
      { value: '10', label: '10-cu sinif' },
      { value: '11', label: '11-ci sinif' }
    ];
  }

  /**
   * Get available subjects
   */
  getSubjects() {
    return [
      { value: 'Riyaziyyat', label: 'Riyaziyyat' },
      { value: 'Azərbaycan dili', label: 'Azərbaycan dili' },
      { value: 'İngilis dili', label: 'İngilis dili' },
      { value: 'Ədəbiyyat', label: 'Ədəbiyyat' },
      { value: 'Tarix', label: 'Tarix' },
      { value: 'Coğrafiya', label: 'Coğrafiya' },
      { value: 'Biologiya', label: 'Biologiya' },
      { value: 'Kimya', label: 'Kimya' },
      { value: 'Fizika', label: 'Fizika' },
      { value: 'İnformatika', label: 'İnformatika' },
      { value: 'İncəsənət', label: 'İncəsənət' },
      { value: 'Musiqi', label: 'Musiqi' },
      { value: 'Bədən tərbiyəsi', label: 'Bədən tərbiyəsi' }
    ];
  }

  /**
   * Validate assessment type data
   */
  validateAssessmentTypeData(data: CreateAssessmentTypeData | UpdateAssessmentTypeData): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Assessment type adı mütləqdir');
    }

    if (data.name && data.name.length > 255) {
      errors.push('Assessment type adı 255 simvoldan çox ola bilməz');
    }

    if (!data.category) {
      errors.push('Kateqoriya seçilməlidir');
    }

    if (!data.scoring_method) {
      errors.push('Qiymətləndirmə metodu seçilməlidir');
    }

    if (!data.max_score || data.max_score < 1) {
      errors.push('Maksimum bal 1-dən böyük olmalıdır');
    }

    if (data.max_score && data.max_score > 1000) {
      errors.push('Maksimum bal 1000-dən çox ola bilməz');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Təsvir 1000 simvoldan çox ola bilməz');
    }

    // Validate criteria if provided
    if (data.criteria) {
      const totalWeight = Object.values(data.criteria).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight > 100) {
        errors.push('Meyarların ümumi çəkisi 100%-dən çox ola bilməz');
      }
    }

    return errors;
  }
}

export const assessmentTypeService = new AssessmentTypeService();
export default assessmentTypeService;